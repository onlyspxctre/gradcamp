#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <poll.h>
#include <signal.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/resource.h>
#include <sys/syscall.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>
#include <yyjson.h>

#define STUDENT_BIN "/workspace/bin/driver"
#define DEFAULT_OUT "/workspace/out/results.json"

#define TIMEOUT_SECONDS 3
#define TIMEOUT_MS (TIMEOUT_SECONDS * 1000)
#define MAX_OUTPUT_BYTES 4096

typedef struct {
    const char *name;
    char *const argv[5];  // e.g. {"main", "12", "5", NULL}
    const char *expected; // e.g. "17"
} TestCase;

// Portable file descriptor sanitation
static void close_extra_fds(void) {
#if defined(SYS_close_range)
    if (syscall(SYS_close_range, 3, ~0U, 0) == 0) return;
#endif
    for (int fd = 3; fd < 256; fd++) {
        close(fd);
    }
}

// Strip trailing whitespace/newlines from runner output
static void trim(char *s) {
    size_t len = strlen(s);
    while (len > 0 && (s[len - 1] == '\n' || s[len - 1] == '\r' || s[len - 1] == ' ')) {
        s[--len] = '\0';
    }
}

static int64_t monotonic_ms(void) {
    struct timespec ts;

    if (clock_gettime(CLOCK_MONOTONIC, &ts) != 0) {
        return -1;
    }

    return (int64_t) ts.tv_sec * 1000 + ts.tv_nsec / 1000000;
}

#define TERMINATE_DEADLINE_MS 1000
static bool terminate_and_reap(pid_t pid, bool reaped) {
    if (reaped) {
        return true;
    }

    if (kill(pid, SIGKILL) == -1 && errno != ESRCH) {
        return false;
    }

    int64_t start = monotonic_ms();
    if (start < 0) {
        return false;
    }

    int64_t deadline_ms = start + TERMINATE_DEADLINE_MS;

    for (;;) {
        int status;
        pid_t rc = waitpid(pid, &status, WNOHANG);

        if (rc == pid) {
            return true;
        }

        if (rc == -1 && errno != EINTR) {
            return false;
        }

        int64_t now = monotonic_ms();
        if (now < 0 || now >= deadline_ms) {
            return false;
        }

        int64_t remaining = deadline_ms - now;
        int delay_ms = remaining > 10 ? 10 : (int) remaining;
        
        if (poll(NULL, 0, delay_ms) == -1 && errno != EINTR)
            return false;
    }
}

enum child_exit_codes {
    CHILD_EXIT_SETUP_FAILED = 120,
    CHILD_EXIT_EXEC_FAILED = 121
};

enum monitor_result {
    MONITOR_COMPLETE,
    MONITOR_TIMEOUT,
    MONITOR_OUTPUT_LIMIT,
    MONITOR_ERROR
};

// Runs a single test case in a sandboxed child process
enum test_outcome {
    TEST_PASS,
    TEST_FAIL,
    TEST_ERR
};
static enum test_outcome run_test(const TestCase *tc, char *error_msg, size_t err_len) {
    memset(error_msg, '\0', err_len);

    int pipefd[2];
    if (pipe2(pipefd, O_CLOEXEC) < 0) {
        snprintf(error_msg, err_len, "Pipe creation failed: %s", strerror(errno));
        return TEST_ERR;
    }

    pid_t pid = fork();
    if (pid < 0) {
        snprintf(error_msg, err_len, "Fork failed: %s", strerror(errno));
        close(pipefd[0]);
        close(pipefd[1]);
        return TEST_ERR;
    }

    if (pid == 0) {
        // ==========================================
        // CHILD PROCESS (STUDENT RUNNER)
        // ==========================================

        // 1. Redirect stdout to pipe
        if (dup2(pipefd[1], STDOUT_FILENO) == -1) {
            _exit(CHILD_EXIT_SETUP_FAILED);
        }

        // 2. Close all sensitive file descriptors (>= 3)
        close_extra_fds();

        struct rlimit rl_fsize = {.rlim_cur = 0, .rlim_max = 0}; // no writing to disk
        if (setrlimit(RLIMIT_FSIZE, &rl_fsize) == -1) {
            _exit(CHILD_EXIT_SETUP_FAILED);
        }

        struct rlimit rl_cpu = {.rlim_cur = TIMEOUT_SECONDS, .rlim_max = TIMEOUT_SECONDS + 1}; // time limit on binary
        if (setrlimit(RLIMIT_CPU, &rl_cpu) == -1) {
            _exit(CHILD_EXIT_SETUP_FAILED);
        }

        struct rlimit rl_nproc = {.rlim_cur = 1, .rlim_max = 1}; // disable forks
        if (setrlimit(RLIMIT_NPROC, &rl_nproc) == -1) {
            _exit(CHILD_EXIT_SETUP_FAILED);
        }

        // The container already runs as the unprivileged evaluator user, and the
        // microVM/read-only/no-cap sandbox provides the isolation boundary. There
        // is no separate user to drop to, so just block any future privilege gain.
        if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) == -1) {
            _exit(CHILD_EXIT_SETUP_FAILED);
        }

        execv(STUDENT_BIN, tc->argv);
        _exit(CHILD_EXIT_EXEC_FAILED); // exec failed
    }

    // ==========================================
    // PARENT PROCESS (EVALUATOR - UID 1000)
    // ==========================================
    close(pipefd[1]); // Close write end in parent
    pipefd[1] = -1;

    enum test_outcome outcome = TEST_ERR;
    bool exited = false;
    bool eof = false;
    int status = 0;

    int flags = fcntl(pipefd[0], F_GETFL);
    if (flags == -1 || fcntl(pipefd[0], F_SETFL, flags | O_NONBLOCK) == -1) {
        close(pipefd[0]);
        pipefd[0] = -1;
        snprintf(error_msg, err_len, "Failure to configure nonblocking pipe");
        goto terminate;
    }

    const int64_t start_ms = monotonic_ms();
    if (start_ms < 0) {
        snprintf(error_msg, err_len, "Failure to read monotonic clock");
        goto terminate;
    }

    const int64_t deadline_ms = start_ms + TIMEOUT_MS;
    char buf[MAX_OUTPUT_BYTES + 1];
    size_t buf_len = 0;
    enum monitor_result result;
    for (;;) {
        int64_t now = monotonic_ms();

        if (now < 0) {
            result = MONITOR_ERROR;
            break;
        }
        if (now >= deadline_ms) {
            result = MONITOR_TIMEOUT;
            break;
        }

        if (!exited) {
            pid_t rc = waitpid(pid, &status, WNOHANG);

            if (rc == pid) {
                exited = true;
            } else if (rc == -1) {
                if (errno == EINTR) {
                    continue;
                }

                result = MONITOR_ERROR;
                break;
            }
        }

        if (exited && eof) {
            result = MONITOR_COMPLETE;
            break;
        }

        int64_t remaining_ms = deadline_ms - now;
        int wait_ms = remaining_ms > 25 ? 25 : (int) remaining_ms;

        struct pollfd pfd = {
            .fd = eof ? -1 : pipefd[0],
            .events = POLLIN};

        int ready = poll(&pfd, 1, wait_ms);

        if (ready == -1) {
            if (errno == EINTR) {
                continue;
            }

            result = MONITOR_ERROR;
            break;
        }

        if (ready == 0) {
            continue;
        }

        if (pfd.revents & (POLLERR | POLLNVAL)) {
            result = MONITOR_ERROR;
            break;
        }

        if (pfd.revents & (POLLIN | POLLHUP)) {
            char chunk[1024];
            ssize_t n = read(pipefd[0], chunk, sizeof(chunk));

            if (n > 0) {
                if ((size_t) n > MAX_OUTPUT_BYTES - buf_len) {
                    result = MONITOR_OUTPUT_LIMIT;
                    break;
                }

                memcpy(buf + buf_len, chunk, (size_t) n);
                buf_len += (size_t) n;
            } else if (n == 0) {
                eof = true;
            } else if (errno != EAGAIN && errno != EWOULDBLOCK && errno != EINTR) {
                result = MONITOR_ERROR;
                break;
            }
        }
    }

    close(pipefd[0]);
    pipefd[0] = -1;
    buf[buf_len] = '\0';

    switch (result) {
        case MONITOR_COMPLETE:
            if (memchr(buf, '\0', buf_len) != NULL) {
                snprintf(error_msg, err_len, "Invalid output: embedded NUL byte");
                return TEST_FAIL;
            }

            trim(buf); // trims out whitespace that may have been copied from the driver output

            // Check how the child exited
            if (WIFSIGNALED(status)) {
                int sig = WTERMSIG(status);
                if (sig == SIGXCPU || sig == SIGKILL) {
                    snprintf(error_msg, err_len, "Time Limit Exceeded");
                } else if (sig == SIGSEGV) {
                    snprintf(error_msg, err_len, "Segmentation Fault (SIGSEGV)");
                } else {
                    snprintf(error_msg, err_len, "Killed by signal %d", sig);
                }
                return TEST_FAIL;
            }

            if (WIFEXITED(status)) {
                int exit_code = WEXITSTATUS(status);
                if (exit_code != 0) {
                    snprintf(error_msg, err_len, "Exited with code %d", exit_code);
                    return TEST_FAIL;
                }
            }

            // Compare stdout with reference answer
            if (strcmp(buf, tc->expected) == 0) {
                return TEST_PASS;
            } else {
                snprintf(error_msg, err_len, "Expected '%s', got '%s'", tc->expected, buf);
                return TEST_FAIL;
            }
            break;
        case MONITOR_TIMEOUT:
            outcome = TEST_FAIL;
            snprintf(error_msg, err_len, "Time Limit Exceeded");
            goto terminate;
        case MONITOR_OUTPUT_LIMIT:
            outcome = TEST_FAIL;
            snprintf(error_msg, err_len, "Output Limit Exceeded");
            goto terminate;
        case MONITOR_ERROR:
            snprintf(error_msg, err_len, "Test Supervision Failed");
            goto terminate;
    }

terminate:
    if (pipefd[0] >= 0) {
        close(pipefd[0]);
        pipefd[0] = -1;
    }

    if (!terminate_and_reap(pid, exited)) {
        snprintf(error_msg, err_len, "Failed to terminate and reap child process");
        return TEST_ERR;
    }

    return outcome;
}

int main(int argc, char *argv[]) {
    const char *out_path = (argc > 1) ? argv[1] : getenv("RESULTS_FILE");
    if (!out_path) out_path = DEFAULT_OUT;

    // Define test cases (or load dynamically from /workspace/answers/tests.json)
    TestCase tests[] = {
        {.name = "Test One (12 + 5 = 17)",
         .argv = {(char *) STUDENT_BIN, "12", "5", NULL},
         .expected = "17"},
        {.name = "Test Two (-10 + 4 = -6)",
         .argv = {(char *) STUDENT_BIN, "-10", "4", NULL},
         .expected = "-6"},
        {.name = "Test Three (0 + 0 = 0)",
         .argv = {(char *) STUDENT_BIN, "0", "0", NULL},
         .expected = "0"},
    };
    size_t num_tests = sizeof(tests) / sizeof(tests[0]);

    yyjson_mut_doc *json = yyjson_mut_doc_new(NULL);
    yyjson_mut_val *json_root = json ? yyjson_mut_obj(json) : NULL;

    if (!json || !json_root) {
        if (json) yyjson_mut_doc_free(json);

        perror("Failed to create yyjson_mut_doc for output.json\n");
        return -1;
    }

    yyjson_mut_doc_set_root(json, json_root);

    yyjson_mut_val *json_tests_arr = yyjson_mut_obj_add_arr(json, json_root, "tests");

    char error_msg[256];
    for (size_t i = 0; i < num_tests; ++i) {
        enum test_outcome outcome = run_test(&tests[i], error_msg, sizeof(error_msg));

        if (outcome == TEST_ERR) {
            fprintf(stderr, "Server infrastructure failure: %s\n", error_msg);
            yyjson_mut_doc_free(json);
            return -1;
        }

        yyjson_mut_val *entry = yyjson_mut_arr_add_obj(json, json_tests_arr);
        yyjson_mut_obj_add_str(json, entry, "name", tests[i].name);
        yyjson_mut_obj_add_bool(json, entry, "passed", outcome == TEST_PASS);
        yyjson_mut_obj_add_strcpy(json, entry, "error", error_msg);
    }

    size_t len;
    char *json_str = yyjson_mut_write(json, YYJSON_WRITE_PRETTY, &len);
    
    if (!json_str) {
        yyjson_mut_doc_free(json);
        perror("Failed to write json to string");
        return -1;
    }

    FILE *f = fopen(out_path, "w");
    if (!f) {
        free(json_str);
        yyjson_mut_doc_free(json);
        perror("Failed to open results.json");
        return -1;
    }

    if (fwrite(json_str, sizeof(char), len, f) != len) {
        fclose(f);
        free(json_str);
        yyjson_mut_doc_free(json);
        perror("Failed to write to results.json");
        return -1;
    }

    free(json_str);
    fclose(f);
    yyjson_mut_doc_free(json);
    printf("Evaluator finished: successfully evaluated %zu tests.\n", num_tests);
    return 0;
}

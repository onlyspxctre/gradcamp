#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <signal.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/resource.h>
#include <sys/syscall.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>
#include <yyjson.h>

#define STUDENT_BIN "/workspace/bin/driver"
#define DEFAULT_OUT "/workspace/out/results.json"
#define RUNNER_UID 1001
#define RUNNER_GID 1001
#define TIMEOUT_SECONDS 3

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

// Runs a single test case in a sandboxed child process
static bool run_test(const TestCase *tc, char *error_msg, size_t err_len) {
    memset(error_msg, '\0', err_len);

    int pipefd[2];
    if (pipe2(pipefd, O_CLOEXEC) < 0) {
        snprintf(error_msg, err_len, "Pipe creation failed: %s", strerror(errno));
        return false;
    }

    pid_t pid = fork();
    if (pid < 0) {
        snprintf(error_msg, err_len, "Fork failed: %s", strerror(errno));
        close(pipefd[0]);
        close(pipefd[1]);
        return false;
    }

    if (pid == 0) {
        // ==========================================
        // CHILD PROCESS (STUDENT RUNNER)
        // ==========================================

        // 1. Redirect stdout to pipe
        dup2(pipefd[1], STDOUT_FILENO);

        // 2. Close all sensitive file descriptors (>= 3)
        close_extra_fds();

        struct rlimit rl_fsize = {.rlim_cur = 0, .rlim_max = 0}; // no writing to disk
        setrlimit(RLIMIT_FSIZE, &rl_fsize);

        struct rlimit rl_cpu = {.rlim_cur = TIMEOUT_SECONDS, .rlim_max = TIMEOUT_SECONDS + 1}; // time limit on binary
        setrlimit(RLIMIT_CPU, &rl_cpu);

        struct rlimit rl_nproc = {.rlim_cur = 1, .rlim_max = 1}; // disable forks
        setrlimit(RLIMIT_NPROC, &rl_nproc);

        // switch user to unprivileged
        if (setgid(RUNNER_GID) != 0 || setuid(RUNNER_UID) != 0) {
            _exit(125);
        }

        prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0); // prevent unprivileged user from ever obtaining privilege again

        execv(STUDENT_BIN, tc->argv);
        _exit(127); // exec failed
    }

    // ==========================================
    // PARENT PROCESS (EVALUATOR - UID 1000)
    // ==========================================
    close(pipefd[1]); // Close write end in parent

    char buf[256] = {0};
    size_t bytes = 0;

    ssize_t bytes_recv = 0;
    while ((bytes_recv = read(pipefd[0], buf + bytes, sizeof(buf) - 1 - bytes)) > 0) {
        bytes += (size_t) bytes_recv;
        if (bytes >= sizeof(buf) - 1) {
            break;
        }
    }

    close(pipefd[0]);
    buf[bytes] = '\0';

    trim(buf); // trims out whitespace that may have been copied from the driver output

    int status = 0;
    waitpid(pid, &status, 0);

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
        return false;
    }

    if (WIFEXITED(status)) {
        int exit_code = WEXITSTATUS(status);
        if (exit_code != 0) {
            snprintf(error_msg, err_len, "Exited with code %d", exit_code);
            return false;
        }
    }

    // Compare stdout with reference answer
    if (strcmp(buf, tc->expected) == 0) {
        return true;
    } else {
        snprintf(error_msg, err_len, "Expected '%s', got '%s'", tc->expected, buf);
        return false;
    }
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

    bool passed;
    char buf[256];
    for (size_t i = 0; i < num_tests; ++i) {
        passed = run_test(&tests[i], buf, 256);

        yyjson_mut_val *entry = yyjson_mut_arr_add_obj(json, json_tests_arr);
        yyjson_mut_obj_add_str(json, entry, "name", tests[i].name);
        yyjson_mut_obj_add_bool(json, entry, "passed", passed);
        yyjson_mut_obj_add_str(json, entry, "error", buf);
    }

    size_t len;
    const char *json_str = yyjson_mut_write(json, YYJSON_WRITE_PRETTY, &len);

    FILE *f = fopen(out_path, "w");
    if (!f) {
        yyjson_mut_doc_free(json);
        perror("Failed to open results.json");
        return -1;
    }

    if (fwrite(json_str, sizeof(char), len, f) != len) {
        fclose(f);
        yyjson_mut_doc_free(json);
        perror("Failed to write to results.json");
        return -1;
    }

    fclose(f);
    yyjson_mut_doc_free(json);
    printf("Evaluator finished: successfully evaluated %zu tests.\n", num_tests);
    return 0;
}

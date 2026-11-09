#define _GNU_SOURCE

#include <errno.h>
#include <fcntl.h>
#include <poll.h>
#include <signal.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

#include "container_stage.h"

#define COMMAND_TIMEOUT_MS 1000
#define REAP_TIMEOUT_MS 1000
#define COMMAND_REAP_RESERVE_MS 100

static int64_t monotonic_ms(void) {
    struct timespec ts;
    if (clock_gettime(CLOCK_MONOTONIC, &ts) != 0) return -1;
    return (int64_t) ts.tv_sec * 1000 + ts.tv_nsec / 1000000;
}

static int64_t earlier_deadline(int64_t deadline, int budget_ms) {
    int64_t now = monotonic_ms();
    if (now < 0) return -1;
    return now + budget_ms < deadline ? now + budget_ms : deadline;
}

enum wait_result { WAIT_EXITED, WAIT_TIMEOUT, WAIT_ERROR };

static enum wait_result wait_until(pid_t pid, int64_t deadline, int *status) {
    for (;;) {
        int64_t now = monotonic_ms();
        if (now < 0) return WAIT_ERROR;
        if (now >= deadline) return WAIT_TIMEOUT;

        pid_t rc = waitpid(pid, status, WNOHANG);
        if (rc == pid) {
            if (WIFEXITED(*status) || WIFSIGNALED(*status)) return WAIT_EXITED;
            errno = EPROTO;
            return WAIT_ERROR;
        }
        if (rc < 0 && errno != EINTR) return WAIT_ERROR;

        int delay = deadline - now > 25 ? 25 : (int) (deadline - now);
        if (poll(NULL, 0, delay) < 0 && errno != EINTR) return WAIT_ERROR;
    }
}

static bool terminate_and_reap(pid_t pid, int64_t deadline) {
    // Check ownership before signaling. ECHILD is not permission to signal a PID
    // that may already have been reaped and reused by another process.
    for (;;) {
        int status;
        pid_t rc = waitpid(pid, &status, WNOHANG);
        if (rc == pid) {
            if (WIFEXITED(status) || WIFSIGNALED(status)) return true;
            break;
        }
        if (rc == 0) break;
        if (errno != EINTR) return false;
        int64_t now = monotonic_ms();
        if (now < 0) return false;
        if (now >= deadline) {
            errno = ETIMEDOUT;
            return false;
        }
    }

    if (kill(pid, SIGKILL) != 0 && errno != ESRCH) return false;
    int status;
    enum wait_result result = wait_until(pid, deadline, &status);
    if (result == WAIT_TIMEOUT) errno = ETIMEDOUT;
    return result == WAIT_EXITED;
}

enum command_result { COMMAND_OK, COMMAND_FAILED, COMMAND_UNREAPED };

// Cleanup commands share the cleanup deadline. Reserve time to kill/reap a
// command that hangs, rather than letting it consume the entire budget.
static enum command_result run_cleanup_command(char *const args[], int64_t deadline,
                                               bool *has_output) {
    int64_t now = monotonic_ms();
    if (now < 0 || deadline - now < 2 * COMMAND_REAP_RESERVE_MS)
        return COMMAND_FAILED;
    int64_t budget = deadline - now - COMMAND_REAP_RESERVE_MS;
    if (budget > COMMAND_TIMEOUT_MS) budget = COMMAND_TIMEOUT_MS;
    int64_t command_deadline = now + budget;

    int pipefd[2] = {-1, -1};
    if (has_output && pipe2(pipefd, O_CLOEXEC | O_NONBLOCK) != 0)
        return COMMAND_FAILED;

    pid_t pid = fork();
    if (pid == 0) {
        if (has_output) {
            close(pipefd[0]);
            if (dup2(pipefd[1], STDOUT_FILENO) < 0) _exit(127);
            close(pipefd[1]);
        }
        execvp(args[0], args);
        perror("Cleanup command execvp failed");
        _exit(127);
    }
    if (has_output) close(pipefd[1]);
    if (pid < 0) {
        if (has_output) close(pipefd[0]);
        return COMMAND_FAILED;
    }

    int status = 0;
    enum wait_result waited = wait_until(pid, command_deadline, &status);
    enum command_result result = COMMAND_FAILED;
    if (waited != WAIT_EXITED) {
        int64_t reap_deadline = earlier_deadline(deadline, REAP_TIMEOUT_MS);
        if (!terminate_and_reap(pid, reap_deadline)) {
            fprintf(stderr, "Cleanup command PID %ld could not be reaped: %s\n",
                    (long) pid, strerror(errno));
            result = COMMAND_UNREAPED;
        }
    } else if (WIFEXITED(status) && WEXITSTATUS(status) == 0) {
        result = COMMAND_OK;
        if (has_output) {
            char byte;
            ssize_t n;
            do {
                n = read(pipefd[0], &byte, 1);
                if (n >= 0 || errno != EINTR) break;
                now = monotonic_ms();
            } while (now >= 0 && now < deadline);
            if (n < 0) result = COMMAND_FAILED;
            else *has_output = n > 0;
        }
    }
    if (has_output) close(pipefd[0]);
    return result;
}

static bool cleanup_container(char *name, bool creation_confirmed,
                               pid_t cli_pid, bool cli_reaped, int cleanup_ms) {
    int64_t now = monotonic_ms();
    int64_t deadline = now < 0 ? -1 : now + cleanup_ms;
    if (!cli_reaped && cli_pid > 0) {
        cli_reaped = terminate_and_reap(cli_pid, earlier_deadline(deadline, REAP_TIMEOUT_MS));
        if (!cli_reaped)
            fprintf(stderr, "Container %s CLI PID %ld cleanup incomplete: %s\n",
                    name, (long) cli_pid, strerror(errno));
    }
    if (now < 0) return false;

    char filter[128];
    snprintf(filter, sizeof(filter), "label=" CONTAINER_LABEL_PREFIX "%s", name);
    char *remove_args[] = {"docker", "rm", "--force", name, NULL};
    char *list_args[] = {"docker", "container", "ls", "--all", "--quiet",
                         "--filter", filter, NULL};

    for (;;) {
        now = monotonic_ms();
        if (now < 0 || now >= deadline) break;

        enum command_result removed = run_cleanup_command(remove_args, deadline, NULL);
        if (removed == COMMAND_UNREAPED) return false;
        bool absent = removed == COMMAND_OK;
        if (!absent) {
            // --rm may have already removed it. A successful empty listing is
            // evidence of absence; an inspect/rm error alone is not.
            bool present = true;
            enum command_result listed = run_cleanup_command(list_args, deadline, &present);
            if (listed == COMMAND_UNREAPED) return false;
            absent = listed == COMMAND_OK && !present;
        }
        // Removing the container may unblock a CLI whose first reap attempt
        // failed. Retry reaping even if creation itself remained unconfirmed.
        if (!cli_reaped && cli_pid > 0)
            cli_reaped = terminate_and_reap(cli_pid, earlier_deadline(deadline, REAP_TIMEOUT_MS));
        if (absent && creation_confirmed) return cli_reaped;

        // If create did not finish successfully, a request may still be in
        // flight inside the runtime. Even an empty listing cannot rule out a
        // container appearing later. Retry removal, but never report it clean.
        now = monotonic_ms();
        if (now < 0 || now >= deadline) break;
        int delay = deadline - now > 50 ? 50 : (int) (deadline - now);
        if (poll(NULL, 0, delay) < 0 && errno != EINTR) break;
    }
    fprintf(stderr, "Container %s cleanup unconfirmed%s\n", name,
            creation_confirmed ? "" : " (creation never confirmed)");
    return false;
}

static enum stage_result wait_stage_command(pid_t pid, const char *name,
                                            const char *operation, int64_t deadline,
                                            bool *reaped) {
    int status = 0;
    enum wait_result waited = wait_until(pid, deadline, &status);
    int wait_errno = errno;
    *reaped = waited == WAIT_EXITED;
    if (waited == WAIT_TIMEOUT) {
        fprintf(stderr, "Container %s %s timed out\n", name, operation);
        return STAGE_TIMED_OUT;
    }
    if (waited == WAIT_ERROR) {
        fprintf(stderr, "Container %s %s supervision failed: %s\n",
                name, operation, strerror(wait_errno));
        return STAGE_ERROR;
    }
    if (WIFEXITED(status)) {
        if (WEXITSTATUS(status) == 0) return STAGE_OK;
        fprintf(stderr, "Container %s %s exited with code %d\n",
                name, operation, WEXITSTATUS(status));
    } else if (WIFSIGNALED(status)) {
        fprintf(stderr, "Container %s %s killed by signal %d\n",
                name, operation, WTERMSIG(status));
    } else {
        fprintf(stderr, "Container %s %s unexpected wait status %#x\n",
                name, operation, status);
    }
    return STAGE_FAILED;
}

enum stage_result run_container_stage(const char *job_id, const char *question_id,
                                      char *container_name, container_create_fn create,
                                      int timeout_ms, int cleanup_ms) {
    if (timeout_ms <= 0 || cleanup_ms <= 0) {
        errno = EINVAL;
        return STAGE_ERROR;
    }
    int64_t start = monotonic_ms();
    if (start < 0) return STAGE_ERROR;
    int64_t deadline = start + timeout_ms;

    pid_t pid = fork();
    if (pid < 0) {
        perror("Container create fork failed");
        return STAGE_ERROR;
    }
    if (pid == 0) {
        create(job_id, question_id, container_name);
        _exit(127);
    }

    bool reaped = false;
    enum stage_result result = wait_stage_command(pid, container_name, "create", deadline, &reaped);
    bool creation_confirmed = result == STAGE_OK;
    if (creation_confirmed) {
        int64_t now = monotonic_ms();
        if (now < 0) result = STAGE_ERROR;
        else if (now >= deadline) result = STAGE_TIMED_OUT;
        else {
            pid = fork();
            if (pid < 0) {
                perror("Container start fork failed");
                result = STAGE_ERROR;
            } else if (pid == 0) {
                execlp("docker", "docker", "start", "--attach", container_name, (char *) NULL);
                perror("Container start exec failed");
                _exit(127);
            } else {
                result = wait_stage_command(pid, container_name, "start", deadline, &reaped);
            }
        }
    }

    // Cleanup precedes Redis publication, including successful stages: --rm
    // alone does not prove that the sandbox is gone when the CLI exits.
    if (!cleanup_container(container_name, creation_confirmed, pid, reaped, cleanup_ms))
        return STAGE_CLEANUP_FAILED;
    return result;
}

#define _DEFAULT_SOURCE
#define _GNU_SOURCE

#include <ctype.h>
#include <errno.h>
#include <ftw.h>
#include <hiredis.h>
#include <poll.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>
#include <yyjson.h>

#include "common/hiredis_client.h"
#include "common/questions.h"

static int valid_job_id(const char *id) {
    if (!id) return 0;
    size_t len = strlen(id);
    if (len == 0 || len > 128) return 0;
    for (size_t i = 0; i < len; ++i) {
        if (!(isalnum((unsigned char) id[i]) || id[i] == '-' || id[i] == '_')) return 0;
    }
    return 1;
}

struct container_names {
    char compiler[64];
    char executor[64];
};

static int make_container_names(struct container_names *containers) {
    unsigned char random_bytes[16];
    if (getentropy(random_bytes, sizeof(random_bytes)) != 0) return -1;

    // Client job IDs can be reused. Generate a fresh identity for each attempt,
    // before forking, so the supervising job process retains both stage names.
    static const char hex[] = "0123456789abcdef";
    char attempt_id[sizeof(random_bytes) * 2 + 1];
    for (size_t i = 0; i < sizeof(random_bytes); ++i) {
        attempt_id[i * 2] = hex[random_bytes[i] >> 4];
        attempt_id[i * 2 + 1] = hex[random_bytes[i] & 0x0f];
    }
    attempt_id[sizeof(attempt_id) - 1] = '\0';

    snprintf(containers->compiler, sizeof(containers->compiler), "gradcamp-compile-%s", attempt_id);
    snprintf(containers->executor, sizeof(containers->executor), "gradcamp-exec-%s", attempt_id);
    return 0;
}

static int make_jobdirs(const char *id, char *path, size_t path_len) {
    int n;
    int appended;

    n = snprintf(path, path_len, "/tmp/gradcamp-%s-XXXXXX", id);
    if (n < 0 || (size_t) n >= path_len) return -1;

    if (!mkdtemp(path)) return -1;

    char subpath[path_len];
    memcpy(subpath, path, (size_t) n);

    appended = snprintf(subpath + n, path_len - (size_t) n, "/src");
    if (appended < 0 || (size_t) (n + appended) >= path_len || (mkdir(subpath, 0755) != 0)) return -1;

    appended = snprintf(subpath + n, path_len - (size_t) n, "/bin");
    if (appended < 0 || (size_t) (n + appended) >= path_len || (mkdir(subpath, 0755) != 0)) return -1;

    appended = snprintf(subpath + n, path_len - (size_t) n, "/out");
    if (appended < 0 || (size_t) (n + appended) >= path_len || (mkdir(subpath, 0755) != 0)) return -1;

    return 0;
}

static int remove_cb(const char *path, const struct stat *st, int type, struct FTW *info) {
    (void) st;
    (void) type;
    (void) info;
    return remove(path);
}

static int64_t monotonic_ms(void) {
    struct timespec ts;

    if (clock_gettime(CLOCK_MONOTONIC, &ts) != 0) {
        return -1;
    }

    return (int64_t) ts.tv_sec * 1000 + ts.tv_nsec / 1000000;
}

enum wait_result {
    WAIT_EXITED,
    WAIT_TIMEOUT,
    WAIT_ERROR
};

static enum wait_result wait_for_exit(pid_t pid, int timeout_ms, int *status) {
    int64_t start = monotonic_ms();
    if (start < 0) {
        return WAIT_ERROR;
    }

    int64_t deadline = start + timeout_ms;

    for (;;) {
        pid_t rc = waitpid(pid, status, WNOHANG);

        if (rc == pid) return WAIT_EXITED;
        if (rc < 0 && errno != EINTR) return WAIT_ERROR;

        int64_t now = monotonic_ms();
        if (now < 0) return WAIT_ERROR;
        if (now >= deadline) return WAIT_TIMEOUT;

        int delay = (int) (deadline - now);
        if (delay > 25) delay = 25;

        if (poll(NULL, 0, delay) < 0 && errno != EINTR) return WAIT_ERROR;
    }
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

/**
 * @brief Marks a job in Redis as failed.
 *
 * @return Returns 0 on success, or 1 if `gradcamp_redis_run_cmd` or Redis operation fails.
 */
static int mark_job_failed(const char *id, const char *message) {
    redisReply *reply = gradcamp_redis_run_cmd("HSET job:%s status failed error %s", id, message);
    if (!reply) return 1;

    int failed = reply->type != REDIS_REPLY_INTEGER;
    freeReplyObject(reply);
    return failed;
}

static void run_container(const char *timeout_flag,
                          const char *mount1,
                          const char *mount2,
                          const char *mount3,
                          char *container_name,
                          char *image,
                          const char *err_label) {
    char *args[] = {
        "podman",
        "run",
        "--rm",
        (char *) timeout_flag,
        "--runtime=krun",
        "--network=none",
        "--cpus=1.0",
        "--annotation=krun.cpus=1",
        "--memory=256m",
        "--pids-limit=64",
        "--read-only",
        "--user=1000:1000",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges:true",
        "--tmpfs=/tmp:rw,noexec,nosuid,size=16m",
        "--mount",
        (char *) mount1,
        "--mount",
        (char *) mount2,
        "--mount",
        (char *) mount3,
        "--name",
        container_name,
        "--userns=keep-id",
        image,
        NULL,
    };
    execvp(args[0], args);

    perror(err_label);
    exit(1);
}

static int kill_container(const char *container_name) {
    char *args_rm[] = {
        "podman",
        "rm",
        "--force",
        "--ignore",
        (char *) container_name,
        NULL,
    };

    char *args_check[] = {
        "podman",
        "container",
        "exists",
        (char *) container_name,
        NULL,
    };

    pid_t pid = fork();
    if (pid < 0) {
        fprintf(stderr, "Kill fork failed for container %s\n", container_name);
        return -1;
    } else if (pid == 0) {
        execvp(args_rm[0], args_rm);
        fprintf(stderr, "Podman container force removal failed\n");
        _exit(127);
    }

    int status = 0;
    switch (wait_for_exit(pid, 1000 * 4, &status)) {
        case WAIT_TIMEOUT:
        case WAIT_ERROR:
            terminate_and_reap(pid, false);
            // TODO: enlist container for routine cleanup
            return -1;
        default:
            break;
    }

    pid = fork();
    if (pid < 0) {
        fprintf(stderr, "Check fork failed for container %s\n", container_name);
        return -1;
    } else if (pid == 0) {
        execvp(args_check[0], args_check);
        fprintf(stderr, "Podman force removal check failed\n");
        _exit(127);
    }

    switch(wait_for_exit(pid, 1000 * 1, &status)) {
        case WAIT_EXITED:
            if (WIFEXITED(status) && WEXITSTATUS(status) == 1) {
                // container no longer exists yay
                return 0;
            }
            fprintf(stderr, "Podman force removal check failed\n");
            return -1;
        case WAIT_TIMEOUT:
        case WAIT_ERROR:
            terminate_and_reap(pid, false);
            fprintf(stderr, "Podman force removal check timed out\n");
            return -1;
    }
}

static void executor(const char *jobdir, const char *question_dir, char *container_name) {
    char bin_mount[256], out_mount[256], tests_mount[256];
    snprintf(bin_mount, sizeof(bin_mount), "type=bind,src=%s/bin,dst=/workspace/bin,ro,relabel=private", jobdir);
    snprintf(out_mount, sizeof(out_mount), "type=bind,src=%s/out,dst=/workspace/out,rw,relabel=private", jobdir);
    snprintf(tests_mount, sizeof(tests_mount), "type=bind,src=./questions/%s/tests.json,dst=/workspace/tests.json,ro,relabel=shared", question_dir);

    run_container("--timeout=30",
                  bin_mount,
                  out_mount,
                  tests_mount,
                  container_name,
                  "executor:latest",
                  "Executor execvp failed");
}

static void compiler(const char *jobdir, const char *question_dir, char *container_name) {
    char src_mount[256], bin_mount[256], driver_mount[256];
    snprintf(src_mount, sizeof(src_mount), "type=bind,src=%s/src,dst=/workspace/src,ro,relabel=private", jobdir);
    snprintf(bin_mount, sizeof(bin_mount), "type=bind,src=%s/bin,dst=/workspace/bin,rw,relabel=private", jobdir);
    snprintf(driver_mount, sizeof(driver_mount), "type=bind,src=./questions/%s/driver.c,dst=/workspace/driver/driver.c,ro,relabel=shared", question_dir);

    run_container("--timeout=10",
                  src_mount,
                  bin_mount,
                  driver_mount,
                  container_name,
                  "compiler:latest",
                  "Compiler execvp failed");
}

static void job(const char *id, const char *question_dir) {
    // 1. Ensure scratch directories exist
    char jobdir[160];
    if (make_jobdirs(id, jobdir, sizeof(jobdir)) != 0) {
        fprintf(stderr, "Failed to create directory structure for job %s\n", id);
        mark_job_failed(id, "Failed to create job directories on worker");
        return;
    }

    // 2. Fetch submitted source from Redis
    redisReply *reply = gradcamp_redis_run_cmd("HGET job:%s source", id);
    if (!reply || reply->type != REDIS_REPLY_STRING) {
        fprintf(stderr, "Failed to fetch source for job %s from datastore\n", id);
        if (reply) freeReplyObject(reply);
        mark_job_failed(id, "Source code not found in datastore");
        return;
    }

    char src_file[sizeof(jobdir) + sizeof("/src/main.c") - 1];
    int n = snprintf(src_file, sizeof(src_file), "%s/src/main.c", jobdir);
    if (n < 0 || (size_t) n >= sizeof(src_file)) {
        fprintf(stderr, "Failed to build src_file path for job %s\n", id);
        freeReplyObject(reply);
        mark_job_failed(id, "Failed to build src_file path for job");
        return;
    }
    FILE *fp = fopen(src_file, "wb");
    if (!fp) {
        perror("Failed to create source file");
        freeReplyObject(reply);
        mark_job_failed(id, "Failed to create source file on worker");
        return;
    }

    if (fwrite(reply->str, 1, reply->len, fp) != (size_t) reply->len) {
        perror("Failed to write source file");
        fclose(fp);
        freeReplyObject(reply);
        mark_job_failed(id, "Failed to write source file on worker");
        return;
    }
    fclose(fp);
    freeReplyObject(reply);

    struct container_names containers;
    if (make_container_names(&containers) != 0) {
        int saved_errno = errno;
        fprintf(stderr, "Failed to generate container names for job %s: %s\n", id, strerror(saved_errno));
        mark_job_failed(id, "Failed to generate container names on worker");
        return;
    }
    fprintf(stderr, "Job %s containers: compiler=%s executor=%s\n", id, containers.compiler, containers.executor);

    // 3. Compile
    pid_t pid = fork();
    if (pid < 0) {
        fprintf(stderr, "Compiler fork failed for job %s\n", id);
        mark_job_failed(id, "Compiler process fork failed");
        return;
    } else if (pid == 0) {
        compiler(jobdir, question_dir, containers.compiler);
    }

    int status = 0;
    switch (wait_for_exit(pid, 10 * 1000, &status)) {
        case WAIT_EXITED:
            if (!WIFEXITED(status) || WEXITSTATUS(status) != 0) {
                if (WIFEXITED(status)) {
                    fprintf(stderr, "Compilation failed for job %s (exit code %d)\n", id, WEXITSTATUS(status));
                } else if (WIFSIGNALED(status)) {
                    fprintf(stderr, "Compilation killed by signal %d for job %s\n", WTERMSIG(status), id);
                } else {
                    fprintf(stderr, "Unexpected compilation wait status %#x for job %s\n", status, id);
                }
                mark_job_failed(id, "Compilation failed");
                return;
            }
            break;
        case WAIT_TIMEOUT: {
            fprintf(stderr, "Compilation timed out for job %s\n", id);
            terminate_and_reap(pid, false);
            kill_container(containers.compiler);
            mark_job_failed(id, "Compilation timed out");
            return;
        }
        case WAIT_ERROR: {
            int wait_errno = errno;
            fprintf(stderr, "Compilation supervision failed for job %s: %s\n", id, strerror(wait_errno));
            terminate_and_reap(pid, false);
            kill_container(containers.compiler);
            mark_job_failed(id, "Compilation failed");
            return;
        }
    }

    // 4. Run
    pid = fork();
    if (pid < 0) {
        fprintf(stderr, "Executor fork failed for job %s\n", id);
        mark_job_failed(id, "Runner process fork failed");
        return;
    } else if (pid == 0) {
        executor(jobdir, question_dir, containers.executor);
    }

    switch (wait_for_exit(pid, 30 * 1000, &status)) {
        case WAIT_EXITED:
            if (!WIFEXITED(status) || WEXITSTATUS(status) != 0) {
                if (WIFEXITED(status)) {
                    fprintf(stderr, "Evaluation failed for job %s (exit code %d)\n", id, WEXITSTATUS(status));
                } else if (WIFSIGNALED(status)) {
                    fprintf(stderr, "Evaluation killed by signal %d for job %s\n", WTERMSIG(status), id);
                } else {
                    fprintf(stderr, "Unexpected evaluation wait status %#x for job %s\n", status, id);
                }
                mark_job_failed(id, "Evaluation failed");
                return;
            }
            break;
        case WAIT_TIMEOUT:
            fprintf(stderr, "Evaluation timed out for job %s\n", id);
            terminate_and_reap(pid, false);
            kill_container(containers.executor);
            mark_job_failed(id, "Evaluation timed out");
            return;
        case WAIT_ERROR: {
            int wait_errno = errno;
            fprintf(stderr, "Evaluation supervision failed for job %s: %s\n", id, strerror(wait_errno));
            terminate_and_reap(pid, false);
            kill_container(containers.executor);
            mark_job_failed(id, "Evaluation failed");
            return;
        }
    }

    // 5. Read results.json
    char out_file[sizeof(jobdir) + sizeof("/out/results.json") - 1];
    n = snprintf(out_file, sizeof(out_file), "%s/out/results.json", jobdir);
    if (n < 0 || (size_t) n >= sizeof(out_file)) {
        fprintf(stderr, "Failed to build out_file path for job %s\n", id);
        mark_job_failed(id, "Failed to build out_file path for job");
        return;
    }
    FILE *rf = fopen(out_file, "rb");
    if (!rf) {
        fprintf(stderr, "Failed to open results file for job %s\n", id);
        mark_job_failed(id, "Results file not generated");
        return;
    }

    fseek(rf, 0, SEEK_END);
    long rlen = ftell(rf);
    rewind(rf);

    if (rlen <= 0) {
        fclose(rf);
        mark_job_failed(id, "Results file was empty");
        return;
    }

    char *results_buf = malloc((size_t) rlen + 1);
    if (!results_buf) {
        fclose(rf);
        mark_job_failed(id, "Memory allocation error");
        return;
    }

    size_t bytes_read = fread(results_buf, 1, (size_t) rlen, rf);
    fclose(rf);
    results_buf[bytes_read] = '\0';

    if (nftw(jobdir, remove_cb, 16, FTW_DEPTH | FTW_PHYS) != 0) {
        fprintf(stderr, "Failed to remove scratch directory %s: %s\n", jobdir, strerror(errno));
    }

    // 6. Save results and update status
    reply = gradcamp_redis_run_cmd("HSET job:%s status completed results %b", id, results_buf, bytes_read);
    if (reply) freeReplyObject(reply);
    free(results_buf);
}

static volatile sig_atomic_t g_stop = 0;

static void handle_shutdown_signal(int sig) {
    (void) sig;
    g_stop = 1;
}

int main(void) {
    signal(SIGCHLD, SIG_IGN);

    struct sigaction sa = {0};
    sa.sa_handler = handle_shutdown_signal;
    sigemptyset(&sa.sa_mask);
    if (sigaction(SIGINT, &sa, NULL) != 0 || sigaction(SIGTERM, &sa, NULL) != 0) {
        perror("sigaction");
        return 1;
    }

    if (gradcamp_redis_init() != 0) {
        return 1;
    }

    printf("Worker listening to jobs_pending queue...\n");

    while (!g_stop) {
        redisReply *res = gradcamp_redis_run_cmd("BRPOP jobs_pending 1");
        if (!res) {
            if (!g_stop) usleep(500000);
            continue;
        }

        if (res->type == REDIS_REPLY_NIL) {
            freeReplyObject(res);
            continue;
        }

        if (res->type == REDIS_REPLY_ERROR) {
            fprintf(stderr, "Valkey BRPOP error: %s\n", res->str ? res->str : "unknown");
            freeReplyObject(res);
            if (!g_stop) usleep(500000);
            continue;
        }

        if (res->type != REDIS_REPLY_ARRAY || res->elements != 2 ||
            !res->element[1] || res->element[1]->type != REDIS_REPLY_STRING) {
            freeReplyObject(res);
            continue;
        }

        redisReply *payload = res->element[1];
        yyjson_doc *res_json = yyjson_read(payload->str, payload->len, 0);
        yyjson_val *res_json_root = res_json ? yyjson_doc_get_root(res_json) : NULL;
        yyjson_val *res_json_uuid = res_json_root ? yyjson_obj_get(res_json_root, "uuid") : NULL;
        const char *res_json_uuid_str = yyjson_get_str(res_json_uuid);

        if (!valid_job_id(res_json_uuid_str) || strlen(res_json_uuid_str) != yyjson_get_len(res_json_uuid)) {
            if (res_json) yyjson_doc_free(res_json);
            freeReplyObject(res);
            continue;
        }

        char job_id[130];
        strncpy(job_id, res_json_uuid_str, sizeof(job_id) - 1);
        job_id[sizeof(job_id) - 1] = '\0';

        yyjson_val *question_id = yyjson_obj_get(res_json_root, "question");
        const struct grading_question *question = find_grading_question(yyjson_get_str(question_id), yyjson_get_len(question_id));

        yyjson_doc_free(res_json);
        freeReplyObject(res);

        if (!question) {
            fprintf(stderr, "Job %s has a missing or unknown question ID\n", job_id);
            mark_job_failed(job_id, "Missing or unknown question ID");
            continue;
        }

        printf("Dequeued job: %s (question %s)\n", job_id, question->id);

        redisReply *update_reply = gradcamp_redis_run_cmd("HSET job:%s status inprogress", job_id);
        if (update_reply) freeReplyObject(update_reply);

        pid_t pid = fork();
        if (pid < 0) {
            fprintf(stderr, "Job fork failed for %s\n", job_id);
            continue;
        } else if (pid == 0) {
            signal(SIGCHLD, SIG_DFL);
            signal(SIGINT, SIG_DFL);
            signal(SIGTERM, SIG_DFL);
            gradcamp_redis_free();
            if (gradcamp_redis_init() == 0) {
                job(job_id, question->directory);
                gradcamp_redis_free();
            }
            exit(0);
        }
    }

    gradcamp_redis_free();
    return 0;
}

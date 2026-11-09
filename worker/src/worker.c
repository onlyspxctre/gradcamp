#define _DEFAULT_SOURCE
#define _GNU_SOURCE

#include <ctype.h>
#include <errno.h>
#include <hiredis.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>
#include <yyjson.h>

#include "common/hiredis_client.h"
#include "container_stage.h"

#define COMPILER_TIMEOUT_MS 10000
#define EXECUTOR_TIMEOUT_MS 30000
#define CONTAINER_CLEANUP_MS 5000

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

static int ensure_job_dirs(const char *id) {
    char path[160];
    int n = snprintf(path, sizeof(path), "./job/%s", id);
    if (n < 0 || (size_t) n >= sizeof(path)) return -1;

    if (mkdir("./job", 0755) != 0 && errno != EEXIST) return -1;
    if (mkdir(path, 0755) != 0 && errno != EEXIST) return -1;

    n = snprintf(path, sizeof(path), "./job/%s/src", id);
    if (n < 0 || (size_t) n >= sizeof(path) || (mkdir(path, 0755) != 0 && errno != EEXIST)) return -1;

    n = snprintf(path, sizeof(path), "./job/%s/bin", id);
    if (n < 0 || (size_t) n >= sizeof(path) || (mkdir(path, 0755) != 0 && errno != EEXIST)) return -1;

    n = snprintf(path, sizeof(path), "./job/%s/out", id);
    if (n < 0 || (size_t) n >= sizeof(path) || (mkdir(path, 0755) != 0 && errno != EEXIST)) return -1;

    return 0;
}

static void create_executor(const char *id, const char *question_id, char *container_name) {
    char bin_mount[256], out_mount[256], eval_mount[256];
    snprintf(bin_mount, sizeof(bin_mount), "type=bind,src=./job/%s/bin,dst=/workspace/bin,ro,relabel=private", id);
    snprintf(out_mount, sizeof(out_mount), "type=bind,src=./job/%s/out,dst=/workspace/out,rw,relabel=private", id);
    snprintf(eval_mount, sizeof(eval_mount), "type=bind,src=./questions/%s/evaluator,dst=/workspace/evaluator,ro,relabel=shared", question_id);
    char label[128];
    snprintf(label, sizeof(label), CONTAINER_LABEL_PREFIX "%s", container_name);

    char *args[] = {
        "docker",
        "create",
        "--label",
        label,
        "--rm",
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
        bin_mount,
        "--mount",
        out_mount,
        "--mount",
        eval_mount,
        "--name",
        container_name,
        "-e",
        "RESULTS_FILE=/workspace/out/results.json",
        "--userns=keep-id",
        "executor:latest",
        NULL,
    };
    execvp(args[0], args);

    perror("Executor create execvp failed");
    _exit(127);
}

static void create_compiler(const char *id, const char *question_id, char *container_name) {
    char src_mount[256], bin_mount[256], driver_mount[256];
    snprintf(src_mount, sizeof(src_mount), "type=bind,src=./job/%s/src,dst=/workspace/src,ro,relabel=private", id);
    snprintf(bin_mount, sizeof(bin_mount), "type=bind,src=./job/%s/bin,dst=/workspace/bin,rw,relabel=private", id);
    snprintf(driver_mount, sizeof(driver_mount), "type=bind,src=./questions/%s/driver.c,dst=/workspace/driver/driver.c,ro,relabel=shared", question_id);
    char label[128];
    snprintf(label, sizeof(label), CONTAINER_LABEL_PREFIX "%s", container_name);

    char *args[] = {
        "docker",
        "create",
        "--label",
        label,
        "--rm",
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
        src_mount,
        "--mount",
        bin_mount,
        "--mount",
        driver_mount,
        "--name",
        container_name,
        "--userns=keep-id",
        "compiler:latest",
        NULL,
    };
    execvp(args[0], args);

    perror("Compiler create execvp failed");
    _exit(127);
}

static void record_stage_failure(const char *id, const char *stage, enum stage_result result) {
    const char *reason = "failed";
    if (result == STAGE_TIMED_OUT) reason = "timed out";
    else if (result == STAGE_ERROR) reason = "supervision failed";
    else if (result == STAGE_CLEANUP_FAILED) reason = "cleanup unconfirmed";

    char error[128];
    snprintf(error, sizeof(error), "%s %s", stage, reason);
    fprintf(stderr, "%s for job %s\n", error, id);
    redisReply *reply = gradcamp_redis_run_cmd("HSET job:%s status failed error %s", id, error);
    if (reply) freeReplyObject(reply);
}

static void job(const char *id, const char *question_id) {
    // 1. Ensure scratch directories exist
    if (ensure_job_dirs(id) != 0) {
        fprintf(stderr, "Failed to create directory structure for job %s\n", id);
        redisReply *reply = gradcamp_redis_run_cmd("HSET job:%s status failed error %s", id, "Failed to create job directories on worker");
        if (reply) freeReplyObject(reply);
        return;
    }

    // 2. Fetch submitted source from Redis
    redisReply *reply = gradcamp_redis_run_cmd("HGET job:%s source", id);
    if (!reply || reply->type != REDIS_REPLY_STRING) {
        fprintf(stderr, "Failed to fetch source for job %s from datastore\n", id);
        if (reply) freeReplyObject(reply);
        reply = gradcamp_redis_run_cmd("HSET job:%s status failed error %s", id, "Source code not found in datastore");
        if (reply) freeReplyObject(reply);
        return;
    }

    char src_file[160];
    snprintf(src_file, sizeof(src_file), "./job/%s/src/main.c", id);
    FILE *fp = fopen(src_file, "wb");
    if (!fp) {
        perror("Failed to create source file");
        freeReplyObject(reply);
        reply = gradcamp_redis_run_cmd("HSET job:%s status failed error %s", id, "Failed to create source file on worker");
        if (reply) freeReplyObject(reply);
        return;
    }

    if (fwrite(reply->str, 1, reply->len, fp) != (size_t) reply->len) {
        perror("Failed to write source file");
        fclose(fp);
        freeReplyObject(reply);
        reply = gradcamp_redis_run_cmd("HSET job:%s status failed error %s", id, "Failed to write source file on worker");
        if (reply) freeReplyObject(reply);
        return;
    }
    fclose(fp);
    freeReplyObject(reply);

    struct container_names containers;
    if (make_container_names(&containers) != 0) {
        int saved_errno = errno;
        fprintf(stderr, "Failed to generate container names for job %s: %s\n", id, strerror(saved_errno));
        reply = gradcamp_redis_run_cmd("HSET job:%s status failed error %s", id, "Failed to generate container names on worker");
        if (reply) freeReplyObject(reply);
        return;
    }
    fprintf(stderr, "Job %s containers: compiler=%s executor=%s\n", id, containers.compiler, containers.executor);

    // 3. Compile
    enum stage_result result = run_container_stage(id, question_id, containers.compiler,
                                                   create_compiler, COMPILER_TIMEOUT_MS,
                                                   CONTAINER_CLEANUP_MS);
    if (result != STAGE_OK) {
        record_stage_failure(id, "Compilation", result);
        return;
    }

    // 4. Run
    result = run_container_stage(id, question_id, containers.executor,
                                 create_executor, EXECUTOR_TIMEOUT_MS,
                                 CONTAINER_CLEANUP_MS);
    if (result != STAGE_OK) {
        record_stage_failure(id, "Evaluation", result);
        return;
    }

    // 5. Read results.json
    char out_file[160];
    snprintf(out_file, sizeof(out_file), "./job/%s/out/results.json", id);
    FILE *rf = fopen(out_file, "rb");
    if (!rf) {
        fprintf(stderr, "Failed to open results file for job %s\n", id);
        reply = gradcamp_redis_run_cmd("HSET job:%s status failed error %s", id, "Results file not generated");
        if (reply) freeReplyObject(reply);
        return;
    }

    fseek(rf, 0, SEEK_END);
    long rlen = ftell(rf);
    rewind(rf);

    if (rlen <= 0) {
        fclose(rf);
        reply = gradcamp_redis_run_cmd("HSET job:%s status failed error %s", id, "Results file was empty");
        if (reply) freeReplyObject(reply);
        return;
    }

    char *results_buf = malloc((size_t) rlen + 1);
    if (!results_buf) {
        fclose(rf);
        reply = gradcamp_redis_run_cmd("HSET job:%s status failed error %s", id, "Memory allocation error");
        if (reply) freeReplyObject(reply);
        return;
    }

    size_t bytes_read = fread(results_buf, 1, (size_t) rlen, rf);
    fclose(rf);
    results_buf[bytes_read] = '\0';

    // 6. Save results and update status
    reply = gradcamp_redis_run_cmd("HSET job:%s status completed results %b", id, results_buf, bytes_read);
    if (reply) freeReplyObject(reply);
    free(results_buf);
}

int main(void) {
    signal(SIGCHLD, SIG_IGN);

    if (gradcamp_redis_init() != 0) {
        return 1;
    }

    printf("Worker listening to jobs_pending queue...\n");

    while (1) {
        redisReply *res = gradcamp_redis_run_cmd("LPOP jobs_pending");
        if (!res) {
            usleep(50000);
            continue;
        }

        if (res->type != REDIS_REPLY_STRING) {
            freeReplyObject(res);
            usleep(50000);
            continue;
        }

        yyjson_doc *res_json = yyjson_read(res->str, res->len, 0);
        yyjson_val *res_json_root = res_json ? yyjson_doc_get_root(res_json) : NULL;
        yyjson_val *res_json_uuid = res_json_root ? yyjson_obj_get(res_json_root, "uuid") : NULL;
        const char *res_json_uuid_str = yyjson_get_str(res_json_uuid);

        if (!res_json_uuid_str || !valid_job_id(res_json_uuid_str)) {
            if (res_json) yyjson_doc_free(res_json);
            freeReplyObject(res);
            continue;
        }

        char job_id[130];
        strncpy(job_id, res_json_uuid_str, sizeof(job_id) - 1);
        job_id[sizeof(job_id) - 1] = '\0';

        yyjson_doc_free(res_json);
        freeReplyObject(res);

        printf("Dequeued job: %s\n", job_id);

        redisReply *update_reply = gradcamp_redis_run_cmd("HSET job:%s status inprogress", job_id);
        if (update_reply) freeReplyObject(update_reply);

        pid_t pid = fork();
        if (pid < 0) {
            fprintf(stderr, "Job fork failed for %s\n", job_id);
            continue;
        } else if (pid == 0) {
            signal(SIGCHLD, SIG_DFL);
            gradcamp_redis_free();
            if (gradcamp_redis_init() == 0) {
                job(job_id, "0000-0000-add-two-integers"); // TODO: currently only supports one question for now, this is a major point of issue to fix
                gradcamp_redis_free();
            }
            exit(0);
        }
    }

    gradcamp_redis_free();
    return 0;
}

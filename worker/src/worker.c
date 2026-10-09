#define _DEFAULT_SOURCE

#include <ctype.h>
#include <errno.h>
#include <hiredis.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>
#include <yyjson.h>

static int valid_job_id(const char *id) {
    if (!id) return 0;
    size_t len = strlen(id);
    if (len == 0 || len > 128) return 0;
    for (size_t i = 0; i < len; ++i) {
        if (!(isalnum((unsigned char)id[i]) || id[i] == '-' || id[i] == '_')) return 0;
    }
    return 1;
}

static int ensure_job_dirs(const char *id) {
    char path[160];
    int n = snprintf(path, sizeof(path), "./job/%s", id);
    if (n < 0 || (size_t)n >= sizeof(path)) return -1;

    if (mkdir("./job", 0755) != 0 && errno != EEXIST) return -1;
    if (mkdir(path, 0755) != 0 && errno != EEXIST) return -1;

    n = snprintf(path, sizeof(path), "./job/%s/src", id);
    if (n < 0 || (size_t)n >= sizeof(path) || (mkdir(path, 0755) != 0 && errno != EEXIST)) return -1;

    n = snprintf(path, sizeof(path), "./job/%s/bin", id);
    if (n < 0 || (size_t)n >= sizeof(path) || (mkdir(path, 0755) != 0 && errno != EEXIST)) return -1;

    n = snprintf(path, sizeof(path), "./job/%s/out", id);
    if (n < 0 || (size_t)n >= sizeof(path) || (mkdir(path, 0755) != 0 && errno != EEXIST)) return -1;

    return 0;
}

static void runner(const char *id) {
    char bin_mount[256], out_mount[256];
    snprintf(bin_mount, sizeof(bin_mount), "type=bind,src=./job/%s/bin,dst=/workspace/bin,ro,relabel=private", id);
    snprintf(out_mount, sizeof(out_mount), "type=bind,src=./job/%s/out,dst=/workspace/out,rw,relabel=private", id);

    char *args[] = {
        "docker",
        "run",
        "--rm",
        "--runtime=krun",
        "--network=none",
        "--cpus=1.0",
        "--memory=256m",
        "--pids-limit=64",
        "--read-only",
        "--user=1000:1000",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges:true",
        "--tmpfs=/tmp:rw,noexec,nosuid,size=16m",
        "--mount", bin_mount,
        "--mount", out_mount,
        "-e", "RESULTS_FILE=/workspace/out/results.json",
        "--userns=keep-id",
        "runner:latest",
        NULL,
    };
    execvp(args[0], args);

    perror("Runner execvp failed");
    exit(1);
}

static void compiler(const char *id) {
    char src_mount[256], bin_mount[256];
    snprintf(src_mount, sizeof(src_mount), "type=bind,src=./job/%s/src,dst=/workspace/src,ro,relabel=private", id);
    snprintf(bin_mount, sizeof(bin_mount), "type=bind,src=./job/%s/bin,dst=/workspace/bin,rw,relabel=private", id);

    char *args[] = {
        "docker",
        "run",
        "--rm",
        "--runtime=krun",
        "--network=none",
        "--cpus=1.0",
        "--memory=256m",
        "--pids-limit=64",
        "--read-only",
        "--user=1000:1000",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges:true",
        "--tmpfs=/tmp:rw,noexec,nosuid,size=16m",
        "--mount", src_mount,
        "--mount", bin_mount,
        "--userns=keep-id",
        "compiler:latest",
        NULL,
    };
    execvp(args[0], args);

    perror("Compiler execvp failed");
    exit(1);
}

static void job(const char *id) {
    redisContext *redis_ctx = redisConnect("127.0.0.1", 6379);
    if (!redis_ctx || redis_ctx->err) {
        fprintf(stderr, "Valkey connection failed for job %s\n", id);
        return;
    }

    redisReply *reply = redisCommand(redis_ctx, "AUTH foobarbaz");
    if (!reply || reply->type == REDIS_REPLY_ERROR) {
        fprintf(stderr, "Valkey authentication failed for job %s\n", id);
        if (reply) freeReplyObject(reply);
        redisFree(redis_ctx);
        return;
    }
    freeReplyObject(reply);

    // 1. Ensure scratch directories exist
    if (ensure_job_dirs(id) != 0) {
        fprintf(stderr, "Failed to create directory structure for job %s\n", id);
        reply = redisCommand(redis_ctx, "HSET job:%s status failed error %s", id, "Failed to create job directories on worker");
        if (reply) freeReplyObject(reply);
        redisFree(redis_ctx);
        return;
    }

    // 2. Fetch submitted source from Redis
    reply = redisCommand(redis_ctx, "HGET job:%s source", id);
    if (!reply || reply->type != REDIS_REPLY_STRING) {
        fprintf(stderr, "Failed to fetch source for job %s from datastore\n", id);
        if (reply) freeReplyObject(reply);
        reply = redisCommand(redis_ctx, "HSET job:%s status failed error %s", id, "Source code not found in datastore");
        if (reply) freeReplyObject(reply);
        redisFree(redis_ctx);
        return;
    }

    char src_file[160];
    snprintf(src_file, sizeof(src_file), "./job/%s/src/main.c", id);
    FILE *fp = fopen(src_file, "wb");
    if (!fp) {
        perror("Failed to create source file");
        freeReplyObject(reply);
        reply = redisCommand(redis_ctx, "HSET job:%s status failed error %s", id, "Failed to create source file on worker");
        if (reply) freeReplyObject(reply);
        redisFree(redis_ctx);
        return;
    }

    if (fwrite(reply->str, 1, reply->len, fp) != (size_t)reply->len) {
        perror("Failed to write source file");
        fclose(fp);
        freeReplyObject(reply);
        reply = redisCommand(redis_ctx, "HSET job:%s status failed error %s", id, "Failed to write source file on worker");
        if (reply) freeReplyObject(reply);
        redisFree(redis_ctx);
        return;
    }
    fclose(fp);
    freeReplyObject(reply);

    // 3. Compile
    pid_t pid = fork();
    if (pid < 0) {
        fprintf(stderr, "Compiler fork failed for job %s\n", id);
        reply = redisCommand(redis_ctx, "HSET job:%s status failed error %s", id, "Compiler process fork failed");
        if (reply) freeReplyObject(reply);
        redisFree(redis_ctx);
        return;
    } else if (pid == 0) {
        compiler(id);
    }

    int status = 0;
    waitpid(pid, &status, 0);
    if (!WIFEXITED(status) || WEXITSTATUS(status) != 0) {
        fprintf(stderr, "Compilation failed for job %s (exit code %d)\n", id, WEXITSTATUS(status));
        reply = redisCommand(redis_ctx, "HSET job:%s status failed error %s", id, "Compilation failed");
        if (reply) freeReplyObject(reply);
        redisFree(redis_ctx);
        return;
    }

    // 4. Run
    pid = fork();
    if (pid < 0) {
        fprintf(stderr, "Runner fork failed for job %s\n", id);
        reply = redisCommand(redis_ctx, "HSET job:%s status failed error %s", id, "Runner process fork failed");
        if (reply) freeReplyObject(reply);
        redisFree(redis_ctx);
        return;
    } else if (pid == 0) {
        runner(id);
    }

    waitpid(pid, &status, 0);

    // 5. Read results.json
    char out_file[160];
    snprintf(out_file, sizeof(out_file), "./job/%s/out/results.json", id);
    FILE *rf = fopen(out_file, "rb");
    if (!rf) {
        fprintf(stderr, "Failed to open results file for job %s\n", id);
        reply = redisCommand(redis_ctx, "HSET job:%s status failed error %s", id, "Results file not generated");
        if (reply) freeReplyObject(reply);
        redisFree(redis_ctx);
        return;
    }

    fseek(rf, 0, SEEK_END);
    long rlen = ftell(rf);
    rewind(rf);

    if (rlen <= 0) {
        fclose(rf);
        reply = redisCommand(redis_ctx, "HSET job:%s status failed error %s", id, "Results file was empty");
        if (reply) freeReplyObject(reply);
        redisFree(redis_ctx);
        return;
    }

    char *results_buf = malloc((size_t)rlen + 1);
    if (!results_buf) {
        fclose(rf);
        reply = redisCommand(redis_ctx, "HSET job:%s status failed error %s", id, "Memory allocation error");
        if (reply) freeReplyObject(reply);
        redisFree(redis_ctx);
        return;
    }

    size_t bytes_read = fread(results_buf, 1, (size_t)rlen, rf);
    fclose(rf);
    results_buf[bytes_read] = '\0';

    // 6. Save results and update status
    reply = redisCommand(redis_ctx, "HSET job:%s status completed results %b", id, results_buf, bytes_read);
    if (reply) freeReplyObject(reply);
    free(results_buf);

    redisFree(redis_ctx);
}

int main(void) {
    signal(SIGCHLD, SIG_IGN);

    redisContext *redis_ctx = redisConnect("127.0.0.1", 6379);
    if (!redis_ctx || redis_ctx->err) {
        fprintf(stderr, "Valkey error: %s\n", redis_ctx ? redis_ctx->errstr : "connection failure");
        exit(1);
    }

    redisReply *reply = redisCommand(redis_ctx, "AUTH foobarbaz");
    if (!reply || reply->type == REDIS_REPLY_ERROR) {
        fprintf(stderr, "Valkey error: %s\n", redis_ctx ? redis_ctx->errstr : "authentication failure");
        exit(1);
    }
    freeReplyObject(reply);

    printf("Worker queue listening to Valkey at 127.0.0.1:6379\n");

    while (1) {
        redisReply *res = redisCommand(redis_ctx, "LPOP jobs_pending");
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

        redisReply *update_reply = redisCommand(redis_ctx, "HSET job:%s status inprogress", job_id);
        if (update_reply) freeReplyObject(update_reply);

        pid_t pid = fork();
        if (pid < 0) {
            fprintf(stderr, "Job fork failed for %s\n", job_id);
            continue;
        } else if (pid == 0) {
            redisFree(redis_ctx);
            job(job_id);
            exit(0);
        }
    }

    redisFree(redis_ctx);
    return 0;
}

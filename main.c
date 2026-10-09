#include <hiredis.h>
#include <stdlib.h>
#include <unistd.h>
#include <yyjson.h>
#include <stdio.h>
#include <string.h>

#include <sys/wait.h>

void runner(const char *id) {
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

    perror("Runner failed");
    exit(1);
}

void compiler(const char *id) {
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

    perror("Compiler failed");
    exit(1);
}

void job(const char *id) {
    // TODO: error checking
    redisContext *redis_ctx = redisConnect("127.0.0.1", 6379);
    if (!redis_ctx || redis_ctx->err) return;
    redisReply *reply = redisCommand(redis_ctx, "AUTH foobarbaz");
    freeReplyObject(reply);
    reply = redisCommand(redis_ctx, "HSET job:%s status inprogress", id);
    freeReplyObject(reply);

    pid_t pid = fork();

    if (pid < 0) {
        // failed
        fprintf(stderr, "Compiler fork failed\n");
        return;
    } else if (pid == 0) {
        // forked process
        compiler(id);
    }

    int status;
    waitpid(pid, &status, 0);

    pid = fork();
    if (pid < 0) {
        fprintf(stderr, "Runner fork failed\n");
        return;
    } else if (pid == 0) {
        runner(id);
    }

    waitpid(pid, &status, 0);

    reply = redisCommand(redis_ctx, "HSET job:%s status completed", id);
    freeReplyObject(reply);
    redisFree(redis_ctx);
}

int main(void) {
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

    printf("Worker queue listening to Valkey at 127.0.0.1:6379\n");

    while (1) {
        redisReply *res = redisCommand(redis_ctx, "LPOP jobs_pending");

        if (!res) {
            continue;
        }

        if (res->type != REDIS_REPLY_STRING) {
            freeReplyObject(res);
            continue;
        }

        yyjson_doc *res_json = yyjson_read(res->str, res->len, 0);
        yyjson_val *res_json_root = res_json ? yyjson_doc_get_root(res_json) : NULL;

        yyjson_val *res_json_uuid = res_json_root ? yyjson_obj_get(res_json_root, "uuid") : NULL;
        const char *res_json_uuid_str = yyjson_get_str(res_json_uuid);
        if (!res_json_uuid_str) {
            if (res_json) yyjson_doc_free(res_json);
            freeReplyObject(res);
            continue;
        }

        if (strspn(res_json_uuid_str, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-") != strlen(res_json_uuid_str) || strlen(res_json_uuid_str) > 128) {
            yyjson_doc_free(res_json);
            freeReplyObject(res);
            continue;
        }

        fprintf(stdout, "Got!");

        redisReply *update_reply = redisCommand(redis_ctx, "HSET job:%s status inprogress", res_json_uuid_str);
        if (!update_reply || update_reply->type == REDIS_REPLY_ERROR) {
            yyjson_doc_free(res_json);
            freeReplyObject(res);
            if (update_reply) freeReplyObject(update_reply);
            continue;
        }

        pid_t pid = fork();
        if (pid < 0) {
            fprintf(stderr, "Job fork failed\n");
            freeReplyObject(res);
            continue;
        } else if (pid == 0) {
            job(res_json_uuid_str);
            exit(0);
        }

        yyjson_doc_free(res_json);

        freeReplyObject(res);
    }

    redisFree(redis_ctx);
    return 0;
}

#include <hiredis.h>
#include <stdio.h>

#include "hiredis_client.h"

static redisContext *g_redis_ctx = NULL;

int gradcamp_redis_init() {
    g_redis_ctx = redisConnect("127.0.0.1", 6379);

    if (!g_redis_ctx || g_redis_ctx->err) {
        fprintf(stderr, "Valkey error: %s\n", g_redis_ctx ? g_redis_ctx->errstr : "connection failure");
        if (g_redis_ctx) {
            redisFree(g_redis_ctx);
            g_redis_ctx = NULL;
        }
        return 1;
    }

    redisReply *reply = redisCommand(g_redis_ctx, "AUTH foobarbaz");
    if (!reply || reply->type == REDIS_REPLY_ERROR) {
        fprintf(stderr, "Valkey error: %s\n", g_redis_ctx ? g_redis_ctx->errstr : "authentication failure");

        if (reply) freeReplyObject(reply);
        redisFree(g_redis_ctx);
        g_redis_ctx = NULL;
        return 2;
    }
    freeReplyObject(reply);

    printf("Gradcamp::Backend listening to Valkey at 127.0.0.1:6379\n");
    return 0;
}

int gradcamp_redis_free() {
    if (!g_redis_ctx) return 1;

    redisFree(g_redis_ctx);
    g_redis_ctx = NULL;
    return 0;
}

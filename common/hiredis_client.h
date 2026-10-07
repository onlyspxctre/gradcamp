#ifndef GRADCAMP_HIREDIS_CLIENT_H
#define GRADCAMP_HIREDIS_CLIENT_H
#include <hiredis.h>

int gradcamp_redis_init();
redisReply* gradcamp_redis_run_cmd(const char *format, ...);
int gradcamp_redis_free();

#endif

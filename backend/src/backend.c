#define FIO_IO
#define FIO_HTTP
#define FIO_NO_TLS 1

#include <fio-stl.h>
#include <hiredis.h>
#include <yyjson.h>

static redisContext *redis_ctx;

#define fio_string_from_cstr(lit) .buf = "" lit "", .len = sizeof(lit) - 1

void on_request(fio_http_s *h) {
    fio_http_status_set(h, 200);
    fio_http_response_header_set(h,
                                 FIO_STR_INFO1("content-type"),
                                 FIO_STR_INFO1("text/plain; charset=utf-8"));

    fio_http_write(h,
                   fio_string_from_cstr("Hello world!\n"),
                   .finish = 1);
}

void on_fetch(fio_http_s *h) {
    if (!FIO_STR_INFO_IS_EQ(fio_http_method(h), FIO_STR_INFO1("GET"))) {
        fio_http_status_set(h, 405);
        fio_http_write(h, fio_string_from_cstr("Method Not Allowed\n"), .finish = 1);
        return;
    }

    fio_str_info_s query = fio_http_query(h);
    fio_buf_info_s res_buf = {0};

    if (query.len) {
        FIO_URL_QUERY_EACH(FIO_STR2BUF_INFO(query), i) {
            if (FIO_BUF_INFO_IS_EQ(i.name, FIO_BUF_INFO1("job"))) {
                res_buf = i.value;
            }
        }
    }

    if (!res_buf.len) {
        fio_http_status_set(h, 400);
        fio_http_write(h, fio_string_from_cstr("Not job specified!"), .finish = 1);
        return;
    }

    redisReply *res = redisCommand(redis_ctx, "HGET job:0 status");

    if (res->type == REDIS_REPLY_NIL) {
        fio_http_status_set(h, 404);
        fio_http_write(h, fio_string_from_cstr("No job found!"), .finish = 1);
        return;
    }
    if (res->type != REDIS_REPLY_STRING) {
        fio_http_status_set(h, 500);
        fio_http_write(h, fio_string_from_cstr("Something went wrong..."), .finish = 1);
        return;
    }

    yyjson_mut_doc *json = yyjson_mut_doc_new(NULL);
    yyjson_mut_val *json_root = yyjson_mut_obj(json);
    yyjson_mut_doc_set_root(json, json_root);

    if (strcmp(res->str, "completed") == 0) {
        yyjson_mut_obj_add_str(json, json_root, "status", "completed");

        yyjson_read_err err;
        yyjson_doc *results_json = yyjson_read_file("./job/out/results.json", 0, NULL, &err);

        yyjson_mut_val *mut_results_json_root = yyjson_val_mut_copy(json, yyjson_doc_get_root(results_json));
        yyjson_mut_obj_add_val(json, json_root, "results", mut_results_json_root);

        yyjson_doc_free(results_json);

    } else if (strcmp(res->str, "inprogress") == 0) {
        yyjson_mut_obj_add_str(json, json_root, "status", "inprogress");
    } else if (strcmp(res->str, "pending") == 0) {
        yyjson_mut_obj_add_str(json, json_root, "status", "pending");
    } else {
        fio_http_status_set(h, 500);
        fio_http_write(h, fio_string_from_cstr("Job is in an unknown state!"), .finish = 1);
        freeReplyObject(res);
        yyjson_mut_doc_free(json);
        return;
    }


    size_t len;
    char *buf = yyjson_mut_write(json, 0, &len);

    yyjson_mut_doc_free(json);
    freeReplyObject(res);

    if (!buf) {
        fio_http_status_set(h, 500);
        fio_http_write(h, fio_string_from_cstr("JSON serialization failed!"), .finish = 1);
        yyjson_mut_doc_free(json);
    } else {
        fio_http_status_set(h, 200);
        fio_http_response_header_set(h, FIO_STR_INFO1("content-type"), FIO_STR_INFO1("application/json"));

        fio_http_write(h, .buf = buf, .len = len, .dealloc = free, .finish = 1);
    }
}

void on_upload(fio_http_s *h) {
    if (!FIO_STR_INFO_IS_EQ(fio_http_method(h), FIO_STR_INFO1("POST"))) {
        fio_http_status_set(h, 405);
        fio_http_write(h, fio_string_from_cstr("Method Not Allowed\n"), .finish = 1);
        return;
    }

    size_t body_len = fio_http_body_length(h);
    if (!body_len) {
        fio_http_status_set(h, 400);
        fio_http_write(h, fio_string_from_cstr("Empty Body\n"), .finish = 1);
        return;
    }

    // TODO: magic byte checking
    FILE *fp = fopen("./job/src/main.c", "wb");
    if (!fp) {
        fio_http_status_set(h, 500);
        fio_http_write(h, fio_string_from_cstr("Failed to write\n"), .finish = 1);
        return;
    }

    fio_http_body_seek(h, 0);
    fio_str_info_s chunk = fio_http_body_read(h, (size_t) -1);
    if (chunk.buf && chunk.len) {
        fwrite(chunk.buf, 1, chunk.len, fp);
    }
    fclose(fp);

    redisReply *reply = redisCommand(redis_ctx, "HSET job:0 status pending");
    if (!reply || reply->type == REDIS_REPLY_ERROR) {
        fio_http_status_set(h, 500);
        if (reply) freeReplyObject(reply);
        fio_http_write(h, fio_string_from_cstr("Pushing job to worker queue failed!\n"), .finish = 1);
        return;
    }

    freeReplyObject(reply);
    reply = redisCommand(redis_ctx, "LPUSH jobs_pending %s", "{ \"uuid\": \"test\" }");
    if (!reply || reply->type == REDIS_REPLY_ERROR) {
        fio_http_status_set(h, 500);
        if (reply) freeReplyObject(reply);
        fio_http_write(h, fio_string_from_cstr("Pushing job to worker queue failed!\n"), .finish = 1);
        return;
    }
    freeReplyObject(reply);


    fio_http_status_set(h, 200);
    fio_http_write(h, fio_string_from_cstr("Uploaded\n"), .finish = 1);
}

void handle_sigint(int sig) {
    (void) sig;
    redisFree(redis_ctx);
    fio_io_stop();
}

int main(void) {
    signal(SIGINT, &handle_sigint);

    redis_ctx = redisConnect("127.0.0.1", 6379);

    if (!redis_ctx || redis_ctx->err) {
        fprintf(stderr, "Valkey error: %s\n", redis_ctx ? redis_ctx->errstr : "connection failure");
        exit(1);
    }

    redisReply *reply = redisCommand(redis_ctx, "AUTH foobarbaz");
    if (!reply || reply->type == REDIS_REPLY_ERROR) {
        fprintf(stderr, "Valkey error: %s\n", redis_ctx ? redis_ctx->errstr : "authentication failure");
        exit(1);
    }

    printf("Backend listening to Valkey at 127.0.0.1:6379\n");

    fio_http_listener_s *listener = fio_http_listen("0.0.0.0:3000", .on_http = on_request, .log = 1);
    fio_http_route(listener, "/fetch", .on_http = on_fetch);
    fio_http_route(listener, "/upload", .on_http = on_upload);
    fio_io_start(0);
}

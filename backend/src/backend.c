#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wstring-conversion"

#define FIO_IO
#define FIO_HTTP
#define FIO_NO_TLS 1

#include <fio-stl.h>
#include <hiredis.h>
#include <yyjson.h>
#include <ctype.h>
#include <errno.h>
#include <sys/stat.h>
#include <sys/types.h>

#include "common/hiredis_client.h"

#define fio_string_from_cstr(lit) .buf = "" lit "", .len = sizeof(lit) - 1

static int valid_job_id(const char *id, size_t len) {
    if (!id || !len || len > 128) return 0;
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
        fio_http_write(h, fio_string_from_cstr("No job specified!"), .finish = 1);
        return;
    }

    if (!valid_job_id(res_buf.buf, res_buf.len)) {
        fio_http_status_set(h, 400);
        fio_http_write(h, fio_string_from_cstr("Invalid job ID!"), .finish = 1);
        return;
    }

    printf("%.*s\n", (int) res_buf.len, res_buf.buf);

    redisReply *res = gradcamp_redis_run_cmd("HGET job:%b status", res_buf.buf, res_buf.len);
    if (!res) {
        fprintf(stderr, "HGET job status command failed\n");
        fio_http_status_set(h, 500);
        fio_http_write(h, fio_string_from_cstr("Internal Server Error"), .finish = 1);
        return;
    }

    if (res->type == REDIS_REPLY_NIL) {
        freeReplyObject(res);
        fio_http_status_set(h, 404);
        fio_http_write(h, fio_string_from_cstr("No job found!"), .finish = 1);
        return;
    }
    if (res->type != REDIS_REPLY_STRING) {
        fprintf(stderr, "HGET job status wasn't string...\n");
        freeReplyObject(res);
        fio_http_status_set(h, 500);
        fio_http_write(h, fio_string_from_cstr("Internal Server Error"), .finish = 1);
        return;
    }

    yyjson_mut_doc *json = yyjson_mut_doc_new(NULL);
    yyjson_mut_val *json_root = json ? yyjson_mut_obj(json) : NULL;

    if (!json || !json_root) {
        if (json) yyjson_mut_doc_free(json);
        freeReplyObject(res);
        fprintf(stderr, "Mutable JSON document instantation failed\n");
        fio_http_status_set(h, 500);
        fio_http_write(h, fio_string_from_cstr("Internal Server Error"), .finish = 1);
        return;
    }
    yyjson_mut_doc_set_root(json, json_root);

    if (strcmp(res->str, "completed") == 0) {
        if (!yyjson_mut_obj_add_str(json, json_root, "status", "completed")) {
            yyjson_mut_doc_free(json);
            freeReplyObject(res);
            fio_http_status_set(h, 500);
            fio_http_write(h, fio_string_from_cstr("Internal Server Error"), .finish = 1);
            return;
        }

        char results_path[160];
        snprintf(results_path, sizeof(results_path), "./job/%.*s/out/results.json", (int)res_buf.len, res_buf.buf);
        yyjson_doc *results_json = yyjson_read_file(results_path, 0, NULL, NULL);
        yyjson_val *results_json_root = results_json ? yyjson_doc_get_root(results_json) : NULL;

        if (!results_json || !results_json_root) {
            yyjson_mut_doc_free(json);
            freeReplyObject(res);
            if (results_json) yyjson_doc_free(results_json);

            fprintf(stderr, "Failure to read results JSON file\n");

            fio_http_status_set(h, 500);
            fio_http_write(h, fio_string_from_cstr("Internal Server Error"), .finish = 1);
            return;
        }

        yyjson_mut_val *mut_results_json_root = yyjson_val_mut_copy(json, results_json_root);
        if (mut_results_json_root) {
            yyjson_mut_obj_add_val(json, json_root, "results", mut_results_json_root);
        }

        yyjson_doc_free(results_json);
    } else if (strcmp(res->str, "inprogress") == 0) {
        if (!yyjson_mut_obj_add_str(json, json_root, "status", "inprogress")) {
            yyjson_mut_doc_free(json);
            freeReplyObject(res);
            fio_http_status_set(h, 500);
            fio_http_write(h, fio_string_from_cstr("Internal Server Error"), .finish = 1);
            return;
        }
    } else if (strcmp(res->str, "pending") == 0) {
        if (!yyjson_mut_obj_add_str(json, json_root, "status", "pending")) {
            yyjson_mut_doc_free(json);
            freeReplyObject(res);
            fio_http_status_set(h, 500);
            fio_http_write(h, fio_string_from_cstr("Internal Server Error"), .finish = 1);
            return;
        }
    } else {
        fio_http_status_set(h, 500);
        fio_http_write(h, fio_string_from_cstr("Job is in an unknown state!"), .finish = 1);
        freeReplyObject(res);
        yyjson_mut_doc_free(json);
        return;
    }

    size_t len = 0;
    char *buf = yyjson_mut_write(json, 0, &len);

    yyjson_mut_doc_free(json);
    freeReplyObject(res);

    if (!buf) {
        fio_http_status_set(h, 500);
        fio_http_write(h, fio_string_from_cstr("JSON serialization failed!"), .finish = 1);
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

    fio_str_info_s query = fio_http_query(h);
    fio_buf_info_s job_buf = {0};

    if (query.len) {
        FIO_URL_QUERY_EACH(FIO_STR2BUF_INFO(query), i) {
            if (FIO_BUF_INFO_IS_EQ(i.name, FIO_BUF_INFO1("job"))) {
                job_buf = i.value;
            }
        }
    }

    if (!job_buf.len) {
        fio_http_status_set(h, 400);
        fio_http_write(h, fio_string_from_cstr("No job specified!"), .finish = 1);
        return;
    }

    if (!valid_job_id(job_buf.buf, job_buf.len)) {
        fio_http_status_set(h, 400);
        fio_http_write(h, fio_string_from_cstr("Invalid job ID!"), .finish = 1);
        return;
    }

    // TODO: magic byte checking
    char job_id[129];
    memcpy(job_id, job_buf.buf, job_buf.len);
    job_id[job_buf.len] = '\0';
    if (ensure_job_dirs(job_id) != 0) {
        fio_http_status_set(h, 500);
        fio_http_write(h, fio_string_from_cstr("Failed to create job directory\n"), .finish = 1);
        return;
    }
    char source_path[160];
    snprintf(source_path, sizeof(source_path), "./job/%.*s/src/main.c", (int)job_buf.len, job_buf.buf);
    FILE *fp = fopen(source_path, "wb");
    if (!fp) {
        fio_http_status_set(h, 500);
        fio_http_write(h, fio_string_from_cstr("Failed to write\n"), .finish = 1);
        return;
    }

    fio_http_body_seek(h, 0);
    fio_str_info_s chunk = fio_http_body_read(h, (size_t) -1);
    if (chunk.buf && chunk.len) {
        if (fwrite(chunk.buf, 1, chunk.len, fp) != chunk.len) {
            fclose(fp);
            fio_http_status_set(h, 500);
            fio_http_write(h, fio_string_from_cstr("Failed to write\n"), .finish = 1);
            return;
        }
    }
    if (fclose(fp) != 0) {
        fio_http_status_set(h, 500);
        fio_http_write(h, fio_string_from_cstr("Failed to write\n"), .finish = 1);
        return;
    }


    redisReply *reply = gradcamp_redis_run_cmd("HSET job:%b status pending", job_buf.buf, job_buf.len);
    if (!reply || reply->type == REDIS_REPLY_ERROR) {
        fio_http_status_set(h, 500);
        if (reply) freeReplyObject(reply);
        fio_http_write(h, fio_string_from_cstr("Pushing job to worker queue failed!\n"), .finish = 1);
        return;
    }
    freeReplyObject(reply);

    reply = gradcamp_redis_run_cmd("LPUSH jobs_pending %s", "{ \"uuid\": \"%b\" }", job_buf.buf, job_buf.len);
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

static void cleanup(void *ignored) {
    (void) ignored;
    gradcamp_redis_free();
}

int main(void) {
    if (gradcamp_redis_init() != 0) {
        return 1;
    }

    fio_state_callback_add(FIO_CALL_AT_EXIT, cleanup, NULL);

    fio_http_listener_s *listener = fio_http_listen("0.0.0.0:3000", .on_http = on_request, .log = 1);
    if (!listener) {
        fprintf(stderr, "Failed to start HTTP listener on 0.0.0.0:3000\n");
        cleanup(NULL);
        exit(1);
    }
    fio_http_route(listener, "/fetch", .on_http = on_fetch);
    fio_http_route(listener, "/upload", .on_http = on_upload);
    fio_io_start(0);

    cleanup(NULL);
    return 0;
}

#pragma clang diagnostic pop

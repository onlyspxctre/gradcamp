#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wstring-conversion"

#define FIO_IO
#define FIO_HTTP
#define FIO_NO_TLS 1

#define IP "127.0.0.1"
#define PORT "3000"

#include <fio-stl.h>
#include <hiredis.h>
#include <yyjson.h>
#include <ctype.h>

#include "common/hiredis_client.h"
#include "common/questions.h"

#define fio_string_from_cstr(lit) .buf = "" lit "", .len = sizeof(lit) - 1

static int valid_job_id(const char *id, size_t len) {
    if (!id || !len || len > 128) return 0;
    for (size_t i = 0; i < len; ++i) {
        if (!(isalnum((unsigned char)id[i]) || id[i] == '-' || id[i] == '_')) return 0;
    }
    return 1;
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

    redisReply *res = NULL;
    yyjson_mut_doc *json = NULL;
    yyjson_doc *results_json = NULL;
    char *buf = NULL;
    size_t len = 0;
    int http_status = 500;
    const char *err_msg = "Internal Server Error";
    size_t err_len = sizeof("Internal Server Error") - 1;

    res = gradcamp_redis_run_cmd("HMGET job:%b status results error", res_buf.buf, res_buf.len);
    if (!res || res->type != REDIS_REPLY_ARRAY || res->elements != 3) {
        fprintf(stderr, "HMGET job fields command failed\n");
        goto cleanup;
    }

    redisReply *status_reply = res->element[0];
    redisReply *results_reply = res->element[1];
    redisReply *error_reply = res->element[2];

    if (status_reply->type == REDIS_REPLY_NIL) {
        http_status = 404;
        err_msg = "No job found!";
        err_len = sizeof("No job found!") - 1;
        goto cleanup;
    }
    if (status_reply->type != REDIS_REPLY_STRING) {
        fprintf(stderr, "HMGET job status wasn't string...\n");
        goto cleanup;
    }

    bool is_completed = strcmp(status_reply->str, "completed") == 0;
    bool is_failed = strcmp(status_reply->str, "failed") == 0;
    bool is_pending_or_inprogress =
        strcmp(status_reply->str, "pending") == 0 ||
        strcmp(status_reply->str, "inprogress") == 0;

    if (!is_completed && !is_failed && !is_pending_or_inprogress) {
        err_msg = "Job is in an unknown state!";
        err_len = sizeof("Job is in an unknown state!") - 1;
        goto cleanup;
    }

    json = yyjson_mut_doc_new(NULL);
    yyjson_mut_val *json_root = json ? yyjson_mut_obj(json) : NULL;
    if (!json || !json_root) {
        fprintf(stderr, "Mutable JSON document instantiation failed\n");
        goto cleanup;
    }
    yyjson_mut_doc_set_root(json, json_root);

    if (!yyjson_mut_obj_add_strncpy(json, json_root, "status", status_reply->str, status_reply->len)) {
        goto cleanup;
    }

    if (is_completed) {
        if (results_reply->type != REDIS_REPLY_STRING) {
            fprintf(stderr, "Failure to fetch results from datastore\n");
            goto cleanup;
        }

        results_json = yyjson_read(results_reply->str, results_reply->len, 0);
        yyjson_val *results_json_root = results_json ? yyjson_doc_get_root(results_json) : NULL;
        if (!results_json || !results_json_root) {
            fprintf(stderr, "Failure to parse results JSON\n");
            goto cleanup;
        }

        yyjson_mut_val *mut_results_json_root = yyjson_val_mut_copy(json, results_json_root);
        if (!mut_results_json_root ||
            !yyjson_mut_obj_add_val(json, json_root, "results", mut_results_json_root)) {
            goto cleanup;
        }
    } else if (is_failed && error_reply->type == REDIS_REPLY_STRING) {
        if (!yyjson_mut_obj_add_strncpy(json, json_root, "error", error_reply->str, error_reply->len)) {
            goto cleanup;
        }
    }

    buf = yyjson_mut_write(json, 0, &len);
    if (!buf) {
        err_msg = "JSON serialization failed!";
        err_len = sizeof("JSON serialization failed!") - 1;
    }

cleanup:
    if (results_json) yyjson_doc_free(results_json);
    if (json) yyjson_mut_doc_free(json);
    if (res) freeReplyObject(res);

    if (buf) {
        fio_http_status_set(h, 200);
        fio_http_response_header_set(h, FIO_STR_INFO1("content-type"), FIO_STR_INFO1("application/json"));
        fio_http_write(h, .buf = buf, .len = len, .dealloc = free, .finish = 1);
    } else {
        fio_http_status_set(h, http_status);
        fio_http_write(h, .buf = (char *) err_msg, .len = err_len, .finish = 1);
    }
}

void on_upload(fio_http_s *h) {
    if (!FIO_STR_INFO_IS_EQ(fio_http_method(h), FIO_STR_INFO1("POST"))) {
        fio_http_status_set(h, 405);
        fio_http_write(h, fio_string_from_cstr("Method Not Allowed\n"), .finish = 1);
        return;
    }

    size_t body_len = fio_http_body_length(h);
    // Handler-side: the vendored parser's size rejection can crash on chunked bodies.
    if (body_len > 1024 * 1024) { // Maximum source size: 1 MiB.
        fio_http_status_set(h, 413);
        fio_http_write(h, fio_string_from_cstr("Payload Too Large\n"), .finish = 1);
        return;
    }
    if (!body_len) {
        fio_http_status_set(h, 400);
        fio_http_write(h, fio_string_from_cstr("Empty Body\n"), .finish = 1);
        return;
    }

    fio_str_info_s query = fio_http_query(h);
    fio_buf_info_s job_buf = {0};
    fio_buf_info_s question_buf = {0};

    if (query.len) {
        FIO_URL_QUERY_EACH(FIO_STR2BUF_INFO(query), i) {
            if (FIO_BUF_INFO_IS_EQ(i.name, FIO_BUF_INFO1("job"))) {
                job_buf = i.value;
            } else if (FIO_BUF_INFO_IS_EQ(i.name, FIO_BUF_INFO1("question"))) {
                question_buf = i.value;
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

    const struct grading_question *question = find_grading_question(question_buf.buf, question_buf.len);
    if (!question) {
        fio_http_status_set(h, 400);
        fio_http_write(h, fio_string_from_cstr("Missing or unknown question ID\n"), .finish = 1);
        return;
    }

    fio_http_body_seek(h, 0);
    fio_str_info_s body = fio_http_body_read(h, (size_t) -1);
    if (!body.buf || !body.len) {
        fio_http_status_set(h, 400);
        fio_http_write(h, fio_string_from_cstr("Empty Body\n"), .finish = 1);
        return;
    }

    redisReply *reply = gradcamp_redis_run_cmd("HSET job:%b status pending source %b", job_buf.buf, job_buf.len, body.buf, body.len);
    if (!reply || reply->type == REDIS_REPLY_ERROR) {
        fio_http_status_set(h, 500);
        if (reply) freeReplyObject(reply);
        fio_http_write(h, fio_string_from_cstr("Failed to save job in datastore!\n"), .finish = 1);
        return;
    }
    freeReplyObject(reply);

    char queue_payload[256];
    int payload_len = snprintf(queue_payload, sizeof(queue_payload),
                               "{\"uuid\":\"%.*s\",\"question\":\"%s\"}",
                               (int)job_buf.len, job_buf.buf, question->id);
    if (payload_len < 0 || (size_t)payload_len >= sizeof(queue_payload)) {
        fio_http_status_set(h, 500);
        fio_http_write(h, fio_string_from_cstr("Failed to serialize queue payload!\n"), .finish = 1);
        return;
    }

    reply = gradcamp_redis_run_cmd("LPUSH jobs_pending %b", queue_payload, (size_t)payload_len);
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

    fio_http_listener_s *listener = fio_http_listen(IP ":" PORT, .on_http = on_request, .log = 1);
    if (!listener) {
        fprintf(stderr, "Failed to start HTTP listener on " IP ":" PORT "\n");
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

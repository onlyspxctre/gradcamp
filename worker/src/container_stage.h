#ifndef GRADCAMP_CONTAINER_STAGE_H
#define GRADCAMP_CONTAINER_STAGE_H

#define CONTAINER_LABEL_PREFIX "gradcamp.container="

enum stage_result {
    STAGE_OK,
    STAGE_FAILED,
    STAGE_TIMED_OUT,
    STAGE_ERROR,
    STAGE_CLEANUP_FAILED
};

// The callback execs `docker create` in a child, using this name and label.
typedef void (*container_create_fn)(const char *job_id, const char *question_id,
                                    char *container_name);

// timeout_ms covers create + start/attach together. Cleanup has its own budget.
// Only STAGE_OK permits consuming artifacts. STAGE_CLEANUP_FAILED means the
// caller must not assume the container or all local CLI children are gone.
enum stage_result run_container_stage(const char *job_id, const char *question_id,
                                      char *container_name, container_create_fn create,
                                      int timeout_ms, int cleanup_ms);

#endif

#define _DEFAULT_SOURCE
#define _GNU_SOURCE

#include <assert.h>
#include <poll.h>
#include <stdarg.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <time.h>
#include <unistd.h>

static char *test_mkdtemp(char *path);
static int test_mkdir(const char *path, mode_t mode);
static int test_execvp(const char *file, char *const argv[]);
static pid_t test_fork(void);
static int test_poll(struct pollfd *fds, nfds_t nfds, int timeout);
static int test_clock_gettime(clockid_t id, struct timespec *ts);

// Run the real job() and filesystem cleanup without launching Podman or Redis.
#define main worker_main
#define mkdtemp test_mkdtemp
#define mkdir test_mkdir
#define execvp test_execvp
#define fork test_fork
#define poll test_poll
#define clock_gettime test_clock_gettime
#undef _DEFAULT_SOURCE
#include "../src/worker.c"
#undef clock_gettime
#undef poll
#undef fork
#undef execvp
#undef mkdir
#undef mkdtemp
#undef main

enum scenario { SUCCESS, COMPILE_ERROR, EXECUTOR_TIMEOUT, UNKNOWN_CONTAINER, PARTIAL_SETUP };
static enum scenario scenario;
static char scratch[160];
static int forks, publications;
static pid_t timeout_pid;
static bool advance_clock;
static time_t clock_offset;
static const char source[] = "int add(int a, int b) { return a + b; }";
static const char results[] = "{\"tests\":[]}";

static char *test_mkdtemp(char *path) {
    char *dir = mkdtemp(path);
    assert(dir && strlen(dir) < sizeof(scratch));
    strcpy(scratch, dir);
    return dir;
}

static int test_mkdir(const char *path, mode_t mode) {
    size_t len = strlen(scratch);
    if (scenario == PARTIAL_SETUP && strcmp(path + len, "/bin") == 0) {
        errno = EIO;
        return -1;
    }
    return mkdir(path, mode);
}

static pid_t test_fork(void) {
    pid_t pid = fork();
    assert(pid >= 0);
    if (pid > 0 && ++forks == 2 && scenario == EXECUTOR_TIMEOUT) {
        timeout_pid = pid;
        advance_clock = true;
    }
    return pid;
}

static int test_poll(struct pollfd *fds, nfds_t nfds, int timeout) {
    if (advance_clock) {
        // Advance after wait_for_exit establishes the deadline, not before.
        advance_clock = false;
        clock_offset += 31;
        return 0;
    }
    return poll(fds, nfds, timeout);
}

static int test_clock_gettime(clockid_t id, struct timespec *ts) {
    int rc = clock_gettime(id, ts);
    if (rc == 0 && id == CLOCK_MONOTONIC) ts->tv_sec += clock_offset;
    return rc;
}

static int test_execvp(const char *file, char *const argv[]) {
    assert(strcmp(file, "podman") == 0);
    assert(access(scratch, F_OK) == 0);

    if (strcmp(argv[1], "run") == 0) {
        size_t last = 1;
        while (argv[last + 1]) ++last;
        if (strcmp(argv[last], "compiler:latest") == 0)
            _exit(scenario == COMPILE_ERROR ? 1 : 0);
        assert(strcmp(argv[last], "executor:latest") == 0);
        if (scenario == EXECUTOR_TIMEOUT) {
            for (;;) pause();
        }
        if (scenario == UNKNOWN_CONTAINER) _exit(1);
        char path[sizeof(scratch) + sizeof("/out/results.json") - 1];
        snprintf(path, sizeof(path), "%s/out/results.json", scratch);
        FILE *out = fopen(path, "w");
        assert(out && fputs(results, out) >= 0 && fclose(out) == 0);
        _exit(0);
    }

    if (strcmp(argv[1], "rm") == 0) {
        assert(strcmp(argv[2], "--force") == 0 && strcmp(argv[3], "--ignore") == 0);
        _exit(0);
    }

    assert(strcmp(argv[1], "container") == 0 && strcmp(argv[2], "exists") == 0);
    bool executor_name = strncmp(argv[3], "gradcamp-exec-", sizeof("gradcamp-exec-") - 1) == 0;
    assert(executor_name || strncmp(argv[3], "gradcamp-compile-", sizeof("gradcamp-compile-") - 1) == 0);
    if (scenario == EXECUTOR_TIMEOUT && executor_name) {
        // The worker must reap the timed-out CLI before checking absence.
        assert(timeout_pid > 0 && kill(timeout_pid, 0) == -1 && errno == ESRCH);
    }
    _exit(scenario == UNKNOWN_CONTAINER && !executor_name ? 125 : 1);
}

int gradcamp_redis_init(void) { abort(); }
int gradcamp_redis_free(void) { abort(); }

redisReply *gradcamp_redis_run_cmd(const char *format, ...) {
    redisReply *reply = calloc(1, sizeof(*reply));
    assert(reply);
    if (strcmp(format, "HGET job:%s source") == 0) {
        assert(scenario != PARTIAL_SETUP && access(scratch, F_OK) == 0);
        reply->type = REDIS_REPLY_STRING;
        reply->str = strdup(source);
        assert(reply->str);
        reply->len = strlen(source);
        return reply;
    }

    assert(++publications == 1);
    if (scenario == UNKNOWN_CONTAINER) {
        assert(access(scratch, F_OK) == 0);
    } else {
        assert(access(scratch, F_OK) == -1 && errno == ENOENT);
    }
    va_list args;
    va_start(args, format);
    assert(strcmp(va_arg(args, const char *), "scratch-regression") == 0);
    if (scenario == SUCCESS) {
        assert(strcmp(format, "HSET job:%s status completed results %b") == 0);
        assert(strcmp(va_arg(args, char *), results) == 0);
        assert(va_arg(args, size_t) == strlen(results));
    } else {
        assert(strcmp(format, "HSET job:%s status failed error %s") == 0);
        const char *expected = scenario == EXECUTOR_TIMEOUT ? "Evaluation timed out"
            : scenario == PARTIAL_SETUP ? "Failed to create job directories on worker"
            : scenario == UNKNOWN_CONTAINER ? "Evaluation failed"
            : "Compilation failed";
        assert(strcmp(va_arg(args, const char *), expected) == 0);
    }
    va_end(args);
    reply->type = REDIS_REPLY_INTEGER;
    return reply;
}

static void check_cleanup(enum scenario which, int expected_forks) {
    scenario = which;
    forks = publications = 0;
    timeout_pid = -1;
    advance_clock = false;
    clock_offset = 0;
    job("scratch-regression", "0000-0000-add-two-integers");
    assert(publications == 1 && forks == expected_forks);
    if (which == UNKNOWN_CONTAINER) {
        assert(nftw(scratch, remove_cb, 16, FTW_DEPTH | FTW_PHYS) == 0);
    }
    assert(access(scratch, F_OK) == -1 && errno == ENOENT);
}

int main(void) {
    check_cleanup(SUCCESS, 6);
    check_cleanup(COMPILE_ERROR, 3);
    check_cleanup(EXECUTOR_TIMEOUT, 6);
    check_cleanup(UNKNOWN_CONTAINER, 6);
    check_cleanup(PARTIAL_SETUP, 0);
    puts("Scratch cleanup tests passed (no runtime or datastore used).");
    return 0;
}

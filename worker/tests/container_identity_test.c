#define _DEFAULT_SOURCE
#define _GNU_SOURCE

#include <assert.h>
#include <sys/wait.h>
#include <unistd.h>

static int test_getentropy(void *buffer, size_t length);
static int test_execvp(const char *file, char *const argv[]);

// Include the implementation to test private helpers and stage arguments.
// Intercept execvp so these tests cannot launch real containers.
#define main worker_main
#define getentropy test_getentropy
#define execvp test_execvp
#undef _DEFAULT_SOURCE // libc normalizes it; worker.c defines it again.
#include "../src/worker.c"
#undef execvp
#undef getentropy
#undef main

static bool fail_entropy;
static const char *expected_name;
static const char *expected_image;

static int test_getentropy(void *buffer, size_t length) {
    if (fail_entropy) {
        errno = EIO;
        return -1;
    }
    return getentropy(buffer, length);
}

static int test_execvp(const char *file, char *const argv[]) {
    assert(strcmp(file, "docker") == 0);
    assert(strcmp(argv[1], "create") == 0);
    int labels = 0;
    int names = 0;
    bool auto_remove = false;
    size_t argc = 0;
    for (; argv[argc]; ++argc) {
        if (strcmp(argv[argc], "--name") == 0) {
            assert(argv[argc + 1]);
            assert(strcmp(argv[argc + 1], expected_name) == 0);
            ++names;
        }
        if (strcmp(argv[argc], "--label") == 0) {
            char expected_label[128];
            snprintf(expected_label, sizeof(expected_label), CONTAINER_LABEL_PREFIX "%s", expected_name);
            assert(argv[argc + 1]);
            assert(strcmp(argv[argc + 1], expected_label) == 0);
            ++labels;
        }
        if (strcmp(argv[argc], "--rm") == 0) auto_remove = true;
    }
    assert(names == 1);
    assert(labels == 1);
    assert(auto_remove);
    assert(strcmp(argv[argc - 1], expected_image) == 0);
    _exit(0);
}

static void check_name(const char *name, const char *prefix) {
    size_t prefix_len = strlen(prefix);
    assert(strncmp(name, prefix, prefix_len) == 0);
    assert(strlen(name) == prefix_len + 32);
    assert(strspn(name + prefix_len, "0123456789abcdef") == 32);
}

static void check_stage(void (*stage)(const char *, const char *, char *),
                        char *name, const char *image) {
    expected_name = name;
    expected_image = image;
    pid_t pid = fork();
    assert(pid >= 0);
    if (pid == 0) {
        stage("same-client-job", "0000-0000-add-two-integers", name);
        _exit(1);
    }
    int status = 0;
    pid_t rc;
    do {
        rc = waitpid(pid, &status, 0);
    } while (rc < 0 && errno == EINTR);
    assert(rc == pid);
    assert(WIFEXITED(status) && WEXITSTATUS(status) == 0);
}

int main(void) {
    struct container_names first, second;
    assert(make_container_names(&first) == 0);
    assert(make_container_names(&second) == 0);
    check_name(first.compiler, "gradcamp-compile-");
    check_name(first.executor, "gradcamp-exec-");
    assert(strcmp(first.compiler, first.executor) != 0);
    assert(strcmp(first.compiler, second.compiler) != 0);
    assert(strcmp(first.executor, second.executor) != 0);
    assert(strcmp(first.compiler + strlen("gradcamp-compile-"),
                  first.executor + strlen("gradcamp-exec-")) == 0);

    check_stage(create_compiler, first.compiler, "compiler:latest");
    check_stage(create_executor, first.executor, "executor:latest");

    fail_entropy = true;
    assert(make_container_names(&second) == -1);
    assert(errno == EIO);
    puts("Container identity tests passed (no runtime or datastore used).");
    return 0;
}

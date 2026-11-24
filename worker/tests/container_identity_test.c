#define _DEFAULT_SOURCE
#define _GNU_SOURCE

#include <assert.h>
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

static bool has_arg(char *const argv[], const char *flag) {
    for (size_t i = 0; argv[i]; ++i) {
        if (strcmp(argv[i], flag) == 0) return true;
    }
    return false;
}

static int test_execvp(const char *file, char *const argv[]) {
    assert(strcmp(file, "podman") == 0);
    assert(strcmp(argv[1], "run") == 0);

    static const char *const shared_flags[] = {
        "--rm",
        "--runtime=krun",
        "--network=none",
        "--cpus=1.0",
        "--annotation=krun.cpus=1",
        "--memory=256m",
        "--pids-limit=64",
        "--read-only",
        "--user=1000:1000",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges:true",
        "--tmpfs=/tmp:rw,noexec,nosuid,size=16m",
        "--userns=keep-id",
    };
    for (size_t i = 0; i < sizeof(shared_flags) / sizeof(shared_flags[0]); ++i) {
        assert(has_arg(argv, shared_flags[i]));
    }

    bool is_executor = strcmp(expected_image, "executor:latest") == 0;
    assert(has_arg(argv, is_executor ? "--timeout=30" : "--timeout=10"));

    int names = 0;
    int tests_mounts = 0;
    int driver_mounts = 0;
    size_t argc = 0;
    for (; argv[argc]; ++argc) {
        if (strcmp(argv[argc], "--name") == 0) {
            assert(argv[argc + 1]);
            assert(strcmp(argv[argc + 1], expected_name) == 0);
            ++names;
        }
        if (strcmp(argv[argc], "--mount") == 0 && argv[argc + 1]) {
            if (strcmp(argv[argc + 1], "type=bind,src=./questions/0000-0000-add-two-integers/tests.json,dst=/workspace/tests.json,ro,relabel=shared") == 0) {
                ++tests_mounts;
            }
            if (strcmp(argv[argc + 1], "type=bind,src=./questions/0000-0000-add-two-integers/driver.c,dst=/workspace/driver/driver.c,ro,relabel=shared") == 0) {
                ++driver_mounts;
            }
        }
    }
    assert(names == 1);
    assert(tests_mounts == (is_executor ? 1 : 0));
    assert(driver_mounts == (is_executor ? 0 : 1));
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
                        const char *question_dir, char *name, const char *image) {
    expected_name = name;
    expected_image = image;
    pid_t pid = fork();
    assert(pid >= 0);
    if (pid == 0) {
        stage("same-client-job", question_dir, name);
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

    const struct grading_question *question = find_grading_question("0", 1);
    assert(question);
    assert(find_grading_question(NULL, 0) == NULL);
    assert(find_grading_question("99", 2) == NULL);
    assert(find_grading_question("0\0x", 3) == NULL);
    check_stage(compiler, question->directory, first.compiler, "compiler:latest");
    check_stage(executor, question->directory, first.executor, "executor:latest");

    fail_entropy = true;
    assert(make_container_names(&second) == -1);
    assert(errno == EIO);
    puts("Container identity tests passed (no runtime or datastore used).");
    return 0;
}

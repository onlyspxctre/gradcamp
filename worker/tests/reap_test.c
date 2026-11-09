#define _GNU_SOURCE

#include <assert.h>
#include <signal.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

static int test_kill(pid_t pid, int signal);
static pid_t test_waitpid(pid_t pid, int *status, int options);
static int test_clock_gettime(clockid_t clock, struct timespec *ts);

#define kill test_kill
#define waitpid test_waitpid
#define clock_gettime test_clock_gettime
#include "../src/container_stage.c"
#undef clock_gettime
#undef waitpid
#undef kill

static int kill_calls;
static bool deny_kill, ignore_kill, interrupt_wait, fail_clock;

static int test_kill(pid_t pid, int signal) {
    ++kill_calls;
    if (deny_kill) { errno = EPERM; return -1; }
    return ignore_kill ? 0 : kill(pid, signal);
}

static pid_t test_waitpid(pid_t pid, int *status, int options) {
    if (interrupt_wait) {
        interrupt_wait = false;
        errno = EINTR;
        return -1;
    }
    return waitpid(pid, status, options);
}

static int test_clock_gettime(clockid_t clock, struct timespec *ts) {
    if (fail_clock) { errno = EIO; return -1; }
    return clock_gettime(clock, ts);
}

static pid_t sleeping_child(void) {
    pid_t pid = fork();
    assert(pid >= 0);
    if (pid == 0) { for (;;) pause(); }
    return pid;
}

static void finish_child(pid_t pid) {
    assert(kill(pid, SIGKILL) == 0);
    int status;
    pid_t rc;
    do { rc = waitpid(pid, &status, 0); } while (rc < 0 && errno == EINTR);
    assert(rc == pid);
}

int main(void) {
    pid_t pid = sleeping_child();
    interrupt_wait = true;
    assert(terminate_and_reap(pid, monotonic_ms() + 500));
    assert(kill_calls == 1);

    // A PID no longer owned by this process must never receive a signal.
    kill_calls = 0;
    assert(!terminate_and_reap(pid, monotonic_ms() + 500));
    assert(errno == ECHILD);
    assert(kill_calls == 0);

    pid = sleeping_child();
    deny_kill = true;
    assert(!terminate_and_reap(pid, monotonic_ms() + 500));
    assert(errno == EPERM);
    deny_kill = false;
    finish_child(pid);

    pid = sleeping_child();
    ignore_kill = true; // Model SIGKILL not producing an exit before the deadline.
    assert(!terminate_and_reap(pid, monotonic_ms() + 50));
    assert(errno == ETIMEDOUT);
    ignore_kill = false;
    finish_child(pid);

    pid = sleeping_child();
    int64_t deadline = monotonic_ms() + 500;
    fail_clock = true;
    assert(!terminate_and_reap(pid, deadline));
    assert(errno == EIO);
    fail_clock = false;
    // The signal was sent before the clock error; collect the child here.
    int status;
    assert(waitpid(pid, &status, 0) == pid);

    puts("CLI termination/reaping tests passed.");
    return 0;
}

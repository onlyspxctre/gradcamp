#define main worker_main
#include "../src/worker.c"
#undef main

int main(int argc, char *argv[]) {
    if (argc != 5) return 2;
    container_create_fn create = strcmp(argv[1], "compiler") == 0
        ? create_compiler : create_executor;
    enum stage_result result = run_container_stage("test-job", "test-question", argv[2],
                                                   create, atoi(argv[3]), atoi(argv[4]));
    printf("RESULT %d\n", result);
    return 0;
}

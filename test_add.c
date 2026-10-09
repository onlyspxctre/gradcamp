#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

// Function declared in student's static library (libadd.a)
int add(int a, int b);

int main(int argc, char *argv[]) {
    // Determine results file output path
    const char *out_path = NULL;
    if (argc > 1 && argv[1] != NULL && argv[1][0] != '\0') {
        out_path = argv[1];
    } else {
        out_path = getenv("RESULTS_FILE");
    }

    if (!out_path) {
        out_path = "/workspace/out/results.json";
    }

    // Evaluate the 3 test cases
    bool test1 = (add(12, 5) == 17);
    bool test2 = (add(-10, 4) == -6);
    bool test3 = (add(0, 0) == 0);

    FILE *f = fopen(out_path, "w");
    if (!f) {
        perror("Failed to open results.json for writing");
        return 1;
    }

    fprintf(f, "{\n");
    fprintf(f, "    \"tests\": [\n");
    fprintf(f, "        {\n");
    fprintf(f, "            \"name\": \"Test One (12 + 5 = 17)\",\n");
    fprintf(f, "            \"passed\": %s\n", test1 ? "true" : "false");
    fprintf(f, "        },\n");
    fprintf(f, "        {\n");
    fprintf(f, "            \"name\": \"Test Two (-10 + 4 = -6)\",\n");
    fprintf(f, "            \"passed\": %s\n", test2 ? "true" : "false");
    fprintf(f, "        },\n");
    fprintf(f, "        {\n");
    fprintf(f, "            \"name\": \"Test Three (0 + 0 = 0)\",\n");
    fprintf(f, "            \"passed\": %s\n", test3 ? "true" : "false");
    fprintf(f, "        }\n");
    fprintf(f, "    ]\n");
    fprintf(f, "}\n");

    fclose(f);
    return 0;
}

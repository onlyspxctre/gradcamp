#include <stdio.h>
#include <stdlib.h>

#define MAX_VALUES 20

int count_occurrences(const int values[], int n, int target);

int main(int argc, char *argv[]) {
    // Each test supplies the target first, followed by zero or more values.
    if (argc < 2 || argc > MAX_VALUES + 2) return 1;

    int target = atoi(argv[1]);
    int n = argc - 2;
    int values[MAX_VALUES] = {0};
    for (int i = 0; i < n; ++i) {
        values[i] = atoi(argv[i + 2]);
    }

    printf("%d\n", count_occurrences(values, n, target));
    return 0;
}

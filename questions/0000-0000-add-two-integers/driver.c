#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>

// Function declared in student's static library (libadd.a)
int add(int a, int b);

int main(int argc, char *argv[]) {
    if (argc != 3) {
        printf("Usage: %s <num1> <num2>\n", argv[0]);
        return 1;
    }

    int lhs = atoi(argv[1]);
    int rhs = atoi(argv[2]);

    printf("%d\n", add(lhs, rhs));

    return 0;
}

#include <stdio.h>
#include <stdlib.h>

int count_digits(int n);

int main(int argc, char *argv[]) {
    if (argc != 2) return 1;

    printf("%d\n", count_digits(atoi(argv[1])));
    return 0;
}

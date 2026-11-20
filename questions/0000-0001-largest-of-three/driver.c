#include <stdio.h>
#include <stdlib.h>

int max3(int a, int b, int c);

int main(int argc, char *argv[]) {
    if (argc != 4) return 1;

    printf("%d\n", max3(atoi(argv[1]), atoi(argv[2]), atoi(argv[3])));
    return 0;
}

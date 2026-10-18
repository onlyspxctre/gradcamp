.PHONY: all clean

all: evaluator

evaluator: evaluator.c
	gcc -static -Wall -Wextra -o $@ $< $(shell pkg-config --cflags --libs yyjson)

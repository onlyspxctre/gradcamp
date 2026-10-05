#!/bin/sh

set +xe

gcc -o main main.c $(pkg-config --cflags --libs hiredis yyjson)

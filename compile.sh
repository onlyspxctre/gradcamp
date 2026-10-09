#!/bin/sh
set -eu

SRC="${1:-/workspace/src/main.c}"
DEST_BIN="${2:-/workspace/bin/main}"
TEST_SRC="${TEST_SRC:-/usr/local/src/test_add.c}"

# If test_add.c is not at the default container path, check local repository locations
if [ ! -f "$TEST_SRC" ]; then
    SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
    if [ -f "$SCRIPT_DIR/test_add.c" ]; then
        TEST_SRC="$SCRIPT_DIR/test_add.c"
    elif [ -f "./test_add.c" ]; then
        TEST_SRC="./test_add.c"
    fi
fi

if [ ! -f "$SRC" ]; then
    echo "Error: Source file $SRC does not exist" >&2
    exit 1
fi

if [ ! -f "$TEST_SRC" ]; then
    echo "Error: Test runner harness $TEST_SRC does not exist" >&2
    exit 1
fi

# Create scratch directory for build artifacts
TMP_BUILD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/build.XXXXXX")"
cleanup() {
    rm -rf "$TMP_BUILD_DIR"
}
trap cleanup EXIT INT TERM

# 1. Compile student submission into object file
gcc -c -O2 -Wall -Wextra "$SRC" -o "$TMP_BUILD_DIR/solution.o"

# 2. Package object file into static library (libadd.a)
ar rcs "$TMP_BUILD_DIR/libadd.a" "$TMP_BUILD_DIR/solution.o"

# 3. Compile test harness and statically link against libadd.a
mkdir -p "$(dirname "$DEST_BIN")"
gcc -static -O2 "$TEST_SRC" -L"$TMP_BUILD_DIR" -ladd -o "$DEST_BIN"
chmod 0755 "$DEST_BIN"

echo "Successfully compiled student solution into static library and linked test runner: $DEST_BIN"

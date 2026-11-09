#!/bin/sh
set -eu

ROOT=$(CDPATH= cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
TEST_DIR=$(mktemp -d "${TMPDIR:-/tmp}/gradcamp-worker-tests.XXXXXX")
trap 'rm -rf "$TEST_DIR"' EXIT
trap 'exit 1' HUP INT TERM
CC=${CC:-clang}
CFLAGS="-std=c23 -Wall -Wextra -Wpedantic -Wimplicit-fallthrough -Werror -I."

# Keep artifacts outside the repo. None of these tests use Redis or a real runtime.
"$CC" $CFLAGS $(pkg-config --cflags hiredis yyjson) \
    worker/tests/container_identity_test.c worker/src/container_stage.c \
    common/hiredis_client.c -o "$TEST_DIR/identity" $(pkg-config --libs hiredis yyjson)
"$TEST_DIR/identity"

"$CC" $CFLAGS worker/tests/reap_test.c -o "$TEST_DIR/reap"
"$TEST_DIR/reap"

"$CC" $CFLAGS $(pkg-config --cflags hiredis yyjson) \
    worker/tests/stage_driver.c worker/src/container_stage.c common/hiredis_client.c \
    -o "$TEST_DIR/stage" $(pkg-config --libs hiredis yyjson)
python3 -B worker/tests/test_container_stage.py "$TEST_DIR/stage"

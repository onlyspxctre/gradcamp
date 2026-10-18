#!/bin/sh
set -eu

SRC="${1:-/workspace/src/main.c}"
DRIVER_SRC="${2:-/workspace/driver/driver.c}"
DEST_BIN="${3:-/workspace/bin/driver}"

if [ ! -f "$SRC" ]; then
    echo "Error: Source file $SRC does not exist" >&2
    exit 1
fi

if [ ! -f "$DRIVER_SRC" ]; then
    echo "Error: Driver source file $DRIVER_SRC does not exist" >&2
    exit 1
fi

mkdir -p "$(dirname "$DEST_BIN")"

gcc -static -O2 -Wall -Wextra "$SRC" "$DRIVER_SRC" -o "$DEST_BIN"
chmod 0755 "$DEST_BIN"

echo "Successfully compiled student solution and driver into executable: $DEST_BIN"

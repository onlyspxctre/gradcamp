#!/bin/sh
set -eu

BIN_PATH="${BIN_PATH:-/workspace/bin/main}"
RESULTS_FILE="${RESULTS_FILE:-/workspace/out/results.json}"

if [ ! -f "$BIN_PATH" ]; then
    echo "Error: Executable binary not found at $BIN_PATH" >&2
    exit 1
fi

chmod +x "$BIN_PATH" 2>/dev/null || true

# Execute test executable, passing output file path
exec "$BIN_PATH" "$RESULTS_FILE"

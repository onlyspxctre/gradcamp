#!/bin/sh
set -eu

TARGET_DIR="${1:?Usage: $0 <path_to_question_dir>}"
ABS_DIR="$(cd "$TARGET_DIR" && pwd)"

docker run --rm -v "$ABS_DIR":/work evalmaker
echo "==> Evaluator built successfully at $TARGET_DIR/evaluator"

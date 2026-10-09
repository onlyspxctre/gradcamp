#!/usr/bin/env bash
set -euo pipefail

# Ensure we run from the repository root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

CONTAINER_CMD="${CONTAINER_CMD:-docker}"

echo "=========================================="
echo " Building compiler:latest"
echo "=========================================="
"$CONTAINER_CMD" build -t compiler:latest -f Dockerfile.compiler .

echo ""
echo "=========================================="
echo " Building runner:latest"
echo "=========================================="
"$CONTAINER_CMD" build -t runner:latest -f Dockerfile.runner .

echo ""
echo "Successfully built compiler:latest and runner:latest images."

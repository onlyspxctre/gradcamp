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
echo " Building executor:latest"
echo "=========================================="
"$CONTAINER_CMD" build -t executor:latest -f Dockerfile.executor .

echo ""
echo "=========================================="
echo " Building evalmaker:latest"
echo "=========================================="
"$CONTAINER_CMD" build -t evalmaker:latest -f Dockerfile.build-evaluator .

echo ""
echo "Successfully built Docker images."

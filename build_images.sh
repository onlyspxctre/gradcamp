#!/usr/bin/env bash
set -euo pipefail

# Ensure we run from the repository root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "=========================================="
echo " Building compiler:latest"
echo "=========================================="
podman build -t localhost/compiler:latest -f Dockerfile.compiler .

echo ""
echo "=========================================="
echo " Building executor:latest"
echo "=========================================="
podman build -t localhost/executor:latest -f Dockerfile.executor .

echo ""
echo "Successfully built Podman images."

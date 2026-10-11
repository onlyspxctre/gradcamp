#!/usr/bin/env bash
set -euo pipefail

# Ensure script runs from the repository root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

BACKEND_BIN="$ROOT_DIR/build/backend"
WORKER_BIN="$ROOT_DIR/build/worker"

if [ ! -x "$BACKEND_BIN" ] || [ ! -x "$WORKER_BIN" ]; then
    echo "Binaries not found. Running make to compile backend and worker..."
    make
fi

BACKEND_PID=""
WORKER_PID=""
FRONTEND_PID=""

cleanup() {
    echo -e "\nShutting down dev services..."
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo "Stopping backend (PID $BACKEND_PID)..."
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$WORKER_PID" ] && kill -0 "$WORKER_PID" 2>/dev/null; then
        echo "Stopping worker (PID $WORKER_PID)..."
        kill "$WORKER_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo "Stopping frontend (PID $FRONTEND_PID)..."
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    wait 2>/dev/null || true
    echo "All services stopped."
}

trap cleanup EXIT INT TERM

echo "=========================================="
echo " Starting Gradcamp Development Services"
echo "=========================================="

# 1. Start Backend HTTP server (port 3000)
echo "[backend] Starting ./build/backend..."
"$BACKEND_BIN" &
BACKEND_PID=$!

# 2. Start Worker queue consumer
echo "[worker] Starting ./build/worker..."
"$WORKER_BIN" &
WORKER_PID=$!

# 3. Frontend
echo "[frontend] Starting pnpm run dev..."
(cd "$ROOT_DIR/frontend" && pnpm run dev) &
FRONTEND_PID=$!

echo "=========================================="
echo " Backend running at PID: $BACKEND_PID"
echo " Worker running at PID:  $WORKER_PID"
echo " Frontend running at PID:  $FRONTEND_PID"
echo " Press Ctrl+C to stop services"
echo "=========================================="

# Wait for background jobs to finish or until user interrupts
wait

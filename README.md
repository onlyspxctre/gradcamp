# Gradcamp

Gradcamp monorepo.

- `backend`: Backend API service (C)
- `worker`: Grader worker service (C)
- `common`: Shared library code (C)
- `frontend`: Web frontend (React + Vite + Tailwind CSS + shadcn/ui)
- `scripts`: Developer utilities and submission latency benchmarking

## JavaScript tooling

[Bun](https://bun.sh/) is the recommended JavaScript runtime and package manager for frontend development. Use `bun install` in `frontend`, and `bun --bun run dev` to run Vite with Bun. See the [frontend setup and testing guide](frontend/README.md) for build, unit test, and Playwright commands, including remaining Node.js requirements.

The backend and worker remain native C programs; Bun does not replace their build tools or runtime dependencies. After installing frontend dependencies and setting up the backend services, `./start_dev.sh` starts the backend, worker, and frontend together.

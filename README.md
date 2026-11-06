# Gradcamp

Gradcamp monorepo.

- `backend`: Backend API service (C)
- `worker`: Grader worker service (C)
- `common`: Shared library code (C)
- `frontend`: Web frontend (React + Bun + Tailwind CSS + shadcn/ui)
- `scripts`: Developer utilities and submission latency benchmarking

## JavaScript tooling

[Bun](https://bun.sh/) (1.4.4 or newer) is the frontend runtime, package manager, bundler, development server, and unit test runner. Use `bun install` in `frontend`, then `bun run dev`. Frontend tooling, including Playwright, runs on Bun without a separate Node.js installation. See the [frontend setup and testing guide](frontend/README.md) for build, preview, and test commands.

The backend and worker remain native C programs; Bun does not replace their build tools or runtime dependencies. After installing frontend dependencies and setting up the backend services, `./start_dev.sh` starts the backend, worker, and frontend together.

# Gradcamp

Gradcamp monorepo.

- `backend`: Backend API service (C)
- `worker`: Grader worker service (C + Podman + krun)
- `common`: Shared library code (C)
- `frontend`: Web frontend (React + Bun + Tailwind CSS + shadcn/ui)
- `scripts`: Developer utilities and submission latency benchmarking

## Coding questions

A question directory supplies `driver.c` (the adapter that calls the student's function) and `tests.json`. The `executor:latest` image runs the shared C evaluator and the worker mounts the question's test file read-only. See [the current question's test file](questions/0000-0000-add-two-integers/tests.json) for an example.

Each test has a `name`, an `args` array of strings passed to the driver as separate command-line arguments, and an `expected` string compared to stdout after stripping trailing spaces and line endings. The evaluator accepts up to 64 cases and 32 arguments per case in a 64 KiB file. The existing 3-second per-test and 30-second executor limits still apply, so keep the suite within the overall budget. The read-only mount prevents edits, not reads by code inside the same sandbox.

Run `./build_images.sh` before first use and after changing an image's Dockerfile, `compile.sh`, or the shared evaluator source. Use the same user account that runs the worker, since rootless Podman images are stored per user. `./start_dev.sh` checks the native binaries with `make` but does not rebuild images. No per-question evaluator build is needed. Run the native evaluator tests with `python3 evaluator/tests/test_evaluator.py` (requires a C compiler and `yyjson` development files).

A coding question's frontend `id` is its grading ID. The frontend sends it as `question` in `POST /upload?job=<job-id>&question=<grading-id>`. Register each ID and directory in `common/questions.h` and add its frontend catalog entry. The API rejects missing or unknown IDs, and the worker resolves the queued ID using the same registry. Add Two Integers is currently the only registered question (`0`).

## JavaScript tooling

[Bun](https://bun.sh/) (1.4.4 or newer) is the frontend runtime, package manager, bundler, development server, and unit test runner. Use `bun install` in `frontend`, then `bun run dev`. Frontend tooling, including Playwright, runs on Bun without a separate Node.js installation. See the [frontend setup and testing guide](frontend/README.md) for build, preview, and test commands.

The backend and worker remain native C programs; Bun does not replace their build tools or runtime dependencies. After installing frontend dependencies and setting up the backend services, `./start_dev.sh` starts the backend, worker, and frontend together.

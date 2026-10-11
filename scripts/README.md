# Gradcamp Latency Benchmark Suite

The [`benchmark.py`](file:///home/spxctre/devel/gradcamp/scripts/benchmark.py) script measures end-to-end code submission latency through the Gradcamp judge pipeline. It profiles each stage of the submission lifecycle with sub-millisecond precision, generates statistical summaries, and allows saving and comparing performance before and after system optimizations.

---

## Architecture & Lifecycle Stages

When a submission is tested, `benchmark.py` breaks the end-to-end execution down into distinct phases:

```
[ benchmark.py ]
       │
       │  1. Upload HTTP (POST /upload?job=<id>)
       ▼
 [ backend (fio) ] ── LPUSH ──► [ Redis (jobs_pending) ]
                                       │
                                       │  2. Queue Pickup (LPOP)
                                       ▼
                                [ worker (C) ]
                                       │
                                       │  3. Container & MicroVM Lifecycle
                                       ├─► podman run compiler:latest (compile.sh)
                                       └─► podman run runner:latest (grader.sh)
                                       │
                                       ▼
 [ benchmark.py ] ◄── GET /fetch ── [ backend (Redis results) ]
   (High-res polling)
```

### Metrics Measured

1. **Upload HTTP (`upload_ms`)**:
   - Time to send the C source code via `POST /upload?job=<id>`.
   - Includes backend HTTP processing, writing `job:<id>` metadata to Redis, and `LPUSH` into `jobs_pending`.

2. **Queue Pickup (`queue_pickup_ms`)**:
   - Time from upload completion until the worker dequeues the job and sets its status from `pending` to `inprogress`.
   - Quantifies the latency introduced by worker queue polling intervals (Issue #3).

3. **Container & MicroVM Execution (`execution_ms`)**:
   - Time elapsed from `inprogress` until the worker writes results and marks the job `completed`.
   - Measures the sequential cold-boot and execution lifecycle of `compiler:latest` and `runner:latest` (Issue #1 and Issue #2).

4. **Total End-to-End Latency (`total_e2e_ms`)**:
   - Total wall-clock time from the initial HTTP upload request to the final result retrieval.

5. **Simulated Frontend Perceived Latency (`frontend_sim_ms`)**:
   - Models the latency perceived by a web user under the frontend's current polling policy (initial 800ms sleep followed by 800ms polling intervals).
   - Demonstrates the quantization lag addressed by Issue #4.

---

## Prerequisites

Before running the benchmark, ensure the local Gradcamp stack is up and running:

1. **Redis / Valkey**:
   ```bash
   sudo systemctl start valkey   # or: redis-server &
   ```

2. **Backend & Worker**:
   ```bash
   ./start_dev.sh
   ```
   *(Or compile and start binaries manually: `./build/backend` on port 3000 and `./build/worker`)*

---

## Quick Start

### 1. Run a Standard Benchmark
From the repository root:
```bash
python3 scripts/benchmark.py --runs 5
```
Or use the Makefile shortcut:
```bash
make benchmark
```

---

## Baseline Tracking & Comparison

To benchmark optimizations before and after backend/worker changes:

### Step 1: Record Baseline
Run the benchmark on your baseline branch and save the output to a JSON file:
```bash
python3 scripts/benchmark.py --runs 10 --save baseline.json
```
The saved file records raw runs, percentile distributions (mean, p50, p95, min, max, std dev), and the current git commit.

### Step 2: Benchmark Optimizations & Compare
After making changes (e.g. switching to `BRPOP`, pre-compiling test harnesses, or consolidating microVMs), run with `--compare`:
```bash
python3 scripts/benchmark.py --runs 10 --compare baseline.json
```

This prints a side-by-side comparison table showing absolute deltas and speedup multipliers:

```text
=========================================================================
              BENCHMARK COMPARISON AGAINST BASELINE                      
=========================================================================
Metric                     | Baseline   | Current    | Delta (ms / %)      | Speedup
---------------------------+------------+------------+---------------------+--------
Total E2E (Mean)           | 3155.70 ms | 1450.20 ms | -1705.5 ms (-54.0%) | 2.18x  
Total E2E (Median)         | 3137.30 ms | 1435.00 ms | -1702.3 ms (-54.3%) | 2.19x  
Total E2E (p95)            | 3264.10 ms | 1510.00 ms | -1754.1 ms (-53.7%) | 2.16x  
Execution / MicroVM (Mean) | 3125.00 ms | 1445.00 ms | -1680.0 ms (-53.8%) | 2.16x  
Queue Pickup (Mean)        | 28.40 ms   | 1.20 ms    | -27.2 ms (-95.8%)   | 23.67x 
Upload HTTP (Mean)         | 2.30 ms    | 2.10 ms    | -0.2 ms (-8.7%)     | 1.10x  
Frontend Perceived (Mean)  | 3200.00 ms | 1600.00 ms | -1600.0 ms (-50.0%) | 2.00x  
-------------------------------------------------------------------------
```

---

## Test Submission Types

The script includes built-in test payloads and supports submitting custom source files:

| Option | Flag | Description |
|---|---|---|
| **Valid Solution** *(Default)* | `--test-type valid` | Correct `add()` implementation (passes 3/3 tests). |
| **Wrong Answer** | `--test-type wrong` | Subtracts instead of adds (fails test assertions). |
| **Compile Error** | `--test-type compile_error` | Syntax error (fails during `compiler:latest` phase). |
| **Custom File** | `--file <path/to/solution.c>` | Submits the specified C source file. |

Examples:
```bash
# Test how fast compilation failure is detected:
python3 scripts/benchmark.py --test-type compile_error

# Benchmark an arbitrary student submission:
python3 scripts/benchmark.py --file path/to/my_solution.c
```

---

## CLI Options Reference

| Argument | Shorthand | Default | Description |
|---|---|---|---|
| `--runs` | `-n` | `5` | Number of timed benchmark iterations. |
| `--warmup` | `-w` | `1` | Number of unrecorded warm-up runs to prime caches/runtime. |
| `--poll-ms` | | `25.0` | High-resolution polling interval in milliseconds. |
| `--timeout` | | `30.0` | Timeout in seconds before declaring a job hung or dead. |
| `--url` | | `http://localhost:3000` | Backend API base URL. |
| `--test-type` | | `valid` | Built-in test payload: `valid`, `wrong`, or `compile_error`. |
| `--file` | | `None` | Custom source file to benchmark instead of built-in payloads. |
| `--save` | `-s` | `None` | Path to save JSON benchmark baseline. |
| `--compare` | `-c` | `None` | Path to a previous JSON baseline for comparative analysis. |

---

## Troubleshooting

### "Unable to connect to Gradcamp backend at http://localhost:3000"
- Verify that `./start_dev.sh` (or `./build/backend`) is running.
- Confirm port 3000 is open: `curl http://localhost:3000/`.

### "Error: configure storage: kernel does not support overlay fs"
- On Linux distributions (e.g., Arch Linux / CachyOS), upgrading kernel packages requires a system reboot to match the running kernel version with the installed module directory (`/usr/lib/modules/$(uname -r)`).
- Reboot the host to load the `overlay` module cleanly for Podman.

#!/usr/bin/env python3
"""
Gradcamp Submission Latency Benchmark Suite
-------------------------------------------
Measures high-resolution end-to-end latency for code submissions through the
Gradcamp judge pipeline (Upload -> Redis Queue -> Worker Container -> Completion).

Features:
- Sub-millisecond timing for upload, queue pickup, execution, and total E2E latency.
- Statistical analysis (mean, median, min, max, std dev, p95).
- Frontend polling simulation (illustrating perceived latency with 800ms quantizing).
- Baseline export and side-by-side comparison (--save baseline.json / --compare baseline.json).
- Verification of test correctness (3/3 passed tests).
"""

import argparse
import json
import math
import os
import statistics
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from typing import Any, Dict, List, Optional, Tuple

DEFAULT_URL = "http://localhost:3000"
DEFAULT_POLL_INTERVAL_MS = 25.0
DEFAULT_TIMEOUT_SEC = 30.0

SAMPLE_VALID_SOLUTION = """
int add(int a, int b) {
    return a + b;
}
"""

SAMPLE_WRONG_SOLUTION = """
int add(int a, int b) {
    return a - b;
}
"""

SAMPLE_COMPILE_ERROR = """
int add(int a, int b) {
    this_is_a_syntax_error();
}
"""

# ANSI formatting helpers
USE_COLOR = sys.stdout.isatty() and os.environ.get("NO_COLOR") is None

def color(text: str, code: str) -> str:
    return f"\033[{code}m{text}\033[0m" if USE_COLOR else text

def bold(text: str) -> str: return color(text, "1")
def green(text: str) -> str: return color(text, "32")
def red(text: str) -> str: return color(text, "31")
def yellow(text: str) -> str: return color(text, "33")
def cyan(text: str) -> str: return color(text, "36")
def dim(text: str) -> str: return color(text, "2")

def get_git_info() -> Dict[str, str]:
    try:
        commit = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            stderr=subprocess.DEVNULL
        ).decode().strip()
        branch = subprocess.check_output(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            stderr=subprocess.DEVNULL
        ).decode().strip()
        return {"commit": commit, "branch": branch}
    except Exception:
        return {"commit": "unknown", "branch": "unknown"}

def check_backend_health(base_url: str) -> bool:
    try:
        req = urllib.request.Request(f"{base_url}/", method="GET")
        with urllib.request.urlopen(req, timeout=3.0) as res:
            return res.status in (200, 404)
    except Exception:
        return False

def run_single_submission(
    base_url: str,
    source_code: str,
    poll_interval_sec: float,
    timeout_sec: float
) -> Dict[str, Any]:
    job_id = uuid.uuid4().hex[:16]
    upload_url = f"{base_url}/upload?job={job_id}"
    fetch_url = f"{base_url}/fetch?job={job_id}"

    # 1. Measure Upload Phase
    t_start = time.perf_counter()
    req = urllib.request.Request(
        upload_url,
        data=source_code.encode("utf-8"),
        headers={"Content-Type": "text/plain"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            upload_status = resp.status
    except Exception as e:
        return {
            "job_id": job_id,
            "error": f"Upload failed: {e}",
            "status": "upload_error",
            "total_e2e_ms": 0.0
        }

    t_upload_done = time.perf_counter()
    upload_ms = (t_upload_done - t_start) * 1000.0

    if upload_status != 200:
        return {
            "job_id": job_id,
            "error": f"Upload returned HTTP {upload_status}",
            "status": "upload_error",
            "total_e2e_ms": upload_ms
        }

    # 2. Poll for Completion with High-Resolution Timer
    t_queue_pickup = None
    final_status = "unknown"
    job_results = None
    error_msg = None

    while (time.perf_counter() - t_start) < timeout_sec:
        poll_req = urllib.request.Request(fetch_url, method="GET")
        try:
            with urllib.request.urlopen(poll_req, timeout=5.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            # 404 if not yet committed
            time.sleep(poll_interval_sec)
            continue
        except Exception as e:
            time.sleep(poll_interval_sec)
            continue

        status = data.get("status")
        now = time.perf_counter()

        if status in ("inprogress", "completed") and t_queue_pickup is None:
            t_queue_pickup = now

        if status == "completed":
            final_status = "completed"
            job_results = data.get("results")
            t_completed = now
            break
        elif status == "failed":
            final_status = "failed"
            error_msg = data.get("error", "Job failed")
            t_completed = now
            break

        time.sleep(poll_interval_sec)
    else:
        return {
            "job_id": job_id,
            "error": f"Timed out after {timeout_sec:.1f}s",
            "status": "timeout",
            "upload_ms": upload_ms,
            "total_e2e_ms": (time.perf_counter() - t_start) * 1000.0
        }

    total_e2e_ms = (t_completed - t_start) * 1000.0
    if t_queue_pickup is None:
        t_queue_pickup = t_completed

    queue_pickup_ms = max(0.0, (t_queue_pickup - t_upload_done) * 1000.0)
    execution_ms = max(0.0, (t_completed - t_queue_pickup) * 1000.0)

    # Simulated frontend perceived latency:
    # Frontend waits 800ms up front, then polls every 800ms.
    # Therefore, completed jobs are seen at the next multiple of 800ms >= total_e2e_ms.
    fe_intervals = max(1, math.ceil(total_e2e_ms / 800.0))
    frontend_perceived_ms = fe_intervals * 800.0

    # Test case evaluation
    passed_tests = 0
    total_tests = 0
    if job_results and "tests" in job_results:
        tests = job_results["tests"]
        total_tests = len(tests)
        passed_tests = sum(1 for t in tests if t.get("passed") is True)

    return {
        "job_id": job_id,
        "status": final_status,
        "upload_ms": upload_ms,
        "queue_pickup_ms": queue_pickup_ms,
        "execution_ms": execution_ms,
        "total_e2e_ms": total_e2e_ms,
        "frontend_sim_ms": frontend_perceived_ms,
        "passed_tests": passed_tests,
        "total_tests": total_tests,
        "error": error_msg
    }

def compute_stats(values: List[float]) -> Dict[str, float]:
    if not values:
        return {"mean": 0.0, "median": 0.0, "min": 0.0, "max": 0.0, "std_dev": 0.0, "p95": 0.0}
    vals = sorted(values)
    mean = statistics.mean(vals)
    median = statistics.median(vals)
    std_dev = statistics.stdev(vals) if len(vals) > 1 else 0.0
    p95_idx = min(len(vals) - 1, int(math.ceil(0.95 * len(vals))) - 1)
    return {
        "mean": mean,
        "median": median,
        "min": vals[0],
        "max": vals[-1],
        "std_dev": std_dev,
        "p95": vals[p95_idx]
    }

def print_table(headers: List[str], rows: List[List[str]]) -> None:
    col_widths = [len(h) for h in headers]
    for row in rows:
        for idx, cell in enumerate(row):
            # Strip ANSI escape codes when computing length
            raw_len = len(cell.replace("\033[0m", "").replace("\033[1m", "").replace("\033[32m", "").replace("\033[31m", "").replace("\033[33m", "").replace("\033[36m", "").replace("\033[2m", ""))
            col_widths[idx] = max(col_widths[idx], raw_len)

    header_line = " | ".join(h.ljust(col_widths[i]) for i, h in enumerate(headers))
    sep_line = "-+-".join("-" * col_widths[i] for i in range(len(headers)))
    print(header_line)
    print(sep_line)
    for row in rows:
        formatted_cells = []
        for i, cell in enumerate(row):
            raw_len = len(cell.replace("\033[0m", "").replace("\033[1m", "").replace("\033[32m", "").replace("\033[31m", "").replace("\033[33m", "").replace("\033[36m", "").replace("\033[2m", ""))
            padding = " " * (col_widths[i] - raw_len)
            formatted_cells.append(cell + padding)
        print(" | ".join(formatted_cells))

def format_diff(base_val: float, curr_val: float, lower_is_better: bool = True) -> Tuple[str, str]:
    delta = curr_val - base_val
    pct = ((curr_val - base_val) / base_val * 100.0) if base_val > 0 else 0.0

    if abs(delta) < 0.01:
        return f"{delta:+.1f} ms ({pct:+.1f}%)", "1.00x"

    speedup = base_val / curr_val if curr_val > 0 else float("inf")
    speedup_str = f"{speedup:.2f}x"

    improved = (delta < 0) if lower_is_better else (delta > 0)
    diff_text = f"{delta:+.1f} ms ({pct:+.1f}%)"

    if improved:
        return green(diff_text), green(speedup_str)
    else:
        return red(diff_text), red(speedup_str)

def print_comparison(baseline: Dict[str, Any], current: Dict[str, Any]) -> None:
    print("\n" + bold("========================================================================="))
    print(bold("              BENCHMARK COMPARISON AGAINST BASELINE                      "))
    print(bold("========================================================================="))
    print(f" Baseline: {baseline.get('git', {}).get('commit', 'unknown')} ({baseline.get('timestamp', 'unknown')})")
    print(f" Current:  {current.get('git', {}).get('commit', 'unknown')} ({current.get('timestamp', 'unknown')})")
    print("-------------------------------------------------------------------------")

    headers = ["Metric", "Baseline", "Current", "Delta (ms / %)", "Speedup"]
    rows = []

    metrics = [
        ("Total E2E (Mean)", "total_e2e_ms", "mean"),
        ("Total E2E (Median)", "total_e2e_ms", "median"),
        ("Total E2E (p95)", "total_e2e_ms", "p95"),
        ("Execution / MicroVM (Mean)", "execution_ms", "mean"),
        ("Queue Pickup (Mean)", "queue_pickup_ms", "mean"),
        ("Upload HTTP (Mean)", "upload_ms", "mean"),
        ("Frontend Perceived (Mean)", "frontend_sim_ms", "mean")
    ]

    base_summary = baseline.get("summary", {})
    curr_summary = current.get("summary", {})

    for label, group, stat in metrics:
        b_val = base_summary.get(group, {}).get(stat, 0.0)
        c_val = curr_summary.get(group, {}).get(stat, 0.0)
        diff_str, speedup_str = format_diff(b_val, c_val, lower_is_better=True)
        rows.append([
            label,
            f"{b_val:.2f} ms",
            f"{c_val:.2f} ms",
            diff_str,
            speedup_str
        ])

    print_table(headers, rows)
    print("-------------------------------------------------------------------------\n")

def main():
    parser = argparse.ArgumentParser(
        description="Gradcamp End-to-End Submission Latency Benchmark",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  # Quick 5-run baseline benchmark:
  python3 scripts/benchmark.py --runs 5 --save baseline.json

  # Compare future optimization against saved baseline:
  python3 scripts/benchmark.py --runs 5 --compare baseline.json

  # Test custom source code:
  python3 scripts/benchmark.py --file my_solution.c
"""
    )
    parser.add_argument("--url", default=DEFAULT_URL, help=f"Backend base URL (default: {DEFAULT_URL})")
    parser.add_argument("--runs", "-n", type=int, default=5, help="Number of benchmark iterations (default: 5)")
    parser.add_argument("--warmup", "-w", type=int, default=1, help="Warmup runs before recording (default: 1)")
    parser.add_argument("--poll-ms", type=float, default=DEFAULT_POLL_INTERVAL_MS,
                        help=f"Polling interval in ms (default: {DEFAULT_POLL_INTERVAL_MS}ms)")
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT_SEC,
                        help=f"Per-job timeout in seconds (default: {DEFAULT_TIMEOUT_SEC}s)")
    parser.add_argument("--file", type=str, default=None, help="Custom C source file to submit")
    parser.add_argument("--test-type", choices=["valid", "wrong", "compile_error"], default="valid",
                        help="Pre-configured test submission type")
    parser.add_argument("--save", "-s", type=str, default=None, help="Save benchmark results to JSON file")
    parser.add_argument("--compare", "-c", type=str, default=None, help="Compare results against a saved JSON baseline")

    args = parser.parse_args()

    # Pre-flight health check
    if not check_backend_health(args.url):
        print(red(f"\n[!] Error: Unable to connect to Gradcamp backend at {args.url}"), file=sys.stderr)
        print(yellow("    Please ensure the services are running:"), file=sys.stderr)
        print("      1. Start Redis/Valkey: sudo systemctl start valkey  (or redis-server &)")
        print("      2. Start Backend & Worker: ./start_dev.sh\n", file=sys.stderr)
        sys.exit(1)

    # Determine source code payload
    if args.file:
        with open(args.file, "r") as f:
            source_code = f.read()
        test_desc = f"File: {args.file}"
    elif args.test_type == "wrong":
        source_code = SAMPLE_WRONG_SOLUTION
        test_desc = "Wrong Answer (adds instead of subtracts)"
    elif args.test_type == "compile_error":
        source_code = SAMPLE_COMPILE_ERROR
        test_desc = "Compile Error (syntax error)"
    else:
        source_code = SAMPLE_VALID_SOLUTION
        test_desc = "Valid Solution (3/3 passing tests)"

    git_info = get_git_info()
    poll_sec = args.poll_ms / 1000.0

    print("\n" + bold("========================================================================="))
    print(bold("             GRADCAMP SUBMISSION LATENCY BENCHMARK                       "))
    print(bold("========================================================================="))
    print(f" Target URL:        {cyan(args.url)}")
    print(f" Git Commit:        {cyan(git_info['commit'])} ({git_info['branch']})")
    print(f" Payload:           {test_desc}")
    print(f" Iterations:        {args.runs} runs (Warmup: {args.warmup})")
    print(f" Poll Resolution:   {args.poll_ms:.1f} ms")
    print("-------------------------------------------------------------------------")

    # Warmup runs
    if args.warmup > 0:
        print(dim(f"Performing {args.warmup} warm-up run(s)..."))
        for w in range(args.warmup):
            res = run_single_submission(args.url, source_code, poll_sec, args.timeout)
            if res.get("error"):
                print(yellow(f"  Warmup {w+1} error: {res['error']}"))
            else:
                print(dim(f"  Warmup {w+1}: completed in {res['total_e2e_ms']:.1f}ms"))

    # Active Benchmark runs
    results: List[Dict[str, Any]] = []
    print("\n" + bold("Running benchmark iterations:"))

    for i in range(1, args.runs + 1):
        res = run_single_submission(args.url, source_code, poll_sec, args.timeout)
        if res.get("status") in ("completed", "failed"):
            status_tag = green("PASS") if res.get("status") == "completed" and res.get("passed_tests") == res.get("total_tests") else yellow(res.get("status").upper())
            test_info = f"({res.get('passed_tests')}/{res.get('total_tests')} tests)" if res.get("total_tests") else ""
            print(f"  Run {i}/{args.runs} [{res['job_id']}]: {bold(f'{res['total_e2e_ms']:.1f}ms')} "
                  f"[Upload: {res['upload_ms']:.1f}ms | Queue: {res['queue_pickup_ms']:.1f}ms | VM/Exec: {res['execution_ms']:.1f}ms] "
                  f"-> {status_tag} {test_info}")
            results.append(res)
        else:
            print(red(f"  Run {i}/{args.runs} [{res.get('job_id')}]: FAILED - {res.get('error')}"))

    if not results:
        print(red("\nAll benchmark iterations failed. Check worker and container logs."))
        sys.exit(1)

    # Compute Statistics
    summary = {
        "total_e2e_ms": compute_stats([r["total_e2e_ms"] for r in results]),
        "execution_ms": compute_stats([r["execution_ms"] for r in results]),
        "queue_pickup_ms": compute_stats([r["queue_pickup_ms"] for r in results]),
        "upload_ms": compute_stats([r["upload_ms"] for r in results]),
        "frontend_sim_ms": compute_stats([r["frontend_sim_ms"] for r in results])
    }

    # Print Summary Table
    print("\n" + bold("========================================================================="))
    print(bold("                         LATENCY SUMMARY (ms)                            "))
    print(bold("========================================================================="))
    headers = ["Lifecycle Stage", "Mean", "Median (p50)", "Min", "Max", "p95", "StdDev"]
    rows = [
        [
            bold("1. Upload HTTP"),
            f"{summary['upload_ms']['mean']:.2f}",
            f"{summary['upload_ms']['median']:.2f}",
            f"{summary['upload_ms']['min']:.2f}",
            f"{summary['upload_ms']['max']:.2f}",
            f"{summary['upload_ms']['p95']:.2f}",
            f"{summary['upload_ms']['std_dev']:.2f}",
        ],
        [
            bold("2. Queue Pickup (Redis)"),
            f"{summary['queue_pickup_ms']['mean']:.2f}",
            f"{summary['queue_pickup_ms']['median']:.2f}",
            f"{summary['queue_pickup_ms']['min']:.2f}",
            f"{summary['queue_pickup_ms']['max']:.2f}",
            f"{summary['queue_pickup_ms']['p95']:.2f}",
            f"{summary['queue_pickup_ms']['std_dev']:.2f}",
        ],
        [
            bold("3. Container & VM Exec"),
            f"{summary['execution_ms']['mean']:.2f}",
            f"{summary['execution_ms']['median']:.2f}",
            f"{summary['execution_ms']['min']:.2f}",
            f"{summary['execution_ms']['max']:.2f}",
            f"{summary['execution_ms']['p95']:.2f}",
            f"{summary['execution_ms']['std_dev']:.2f}",
        ],
        [
            cyan(bold("Total End-to-End Latency")),
            cyan(f"{summary['total_e2e_ms']['mean']:.2f}"),
            cyan(f"{summary['total_e2e_ms']['median']:.2f}"),
            cyan(f"{summary['total_e2e_ms']['min']:.2f}"),
            cyan(f"{summary['total_e2e_ms']['max']:.2f}"),
            cyan(f"{summary['total_e2e_ms']['p95']:.2f}"),
            cyan(f"{summary['total_e2e_ms']['std_dev']:.2f}"),
        ],
        [
            dim("Simulated Frontend (800ms)"),
            dim(f"{summary['frontend_sim_ms']['mean']:.2f}"),
            dim(f"{summary['frontend_sim_ms']['median']:.2f}"),
            dim(f"{summary['frontend_sim_ms']['min']:.2f}"),
            dim(f"{summary['frontend_sim_ms']['max']:.2f}"),
            dim(f"{summary['frontend_sim_ms']['p95']:.2f}"),
            dim(f"{summary['frontend_sim_ms']['std_dev']:.2f}"),
        ]
    ]
    print_table(headers, rows)
    print("-------------------------------------------------------------------------")

    # Key Bottleneck Insight
    exec_pct = (summary["execution_ms"]["mean"] / summary["total_e2e_ms"]["mean"]) * 100.0 if summary["total_e2e_ms"]["mean"] > 0 else 0.0
    queue_pct = (summary["queue_pickup_ms"]["mean"] / summary["total_e2e_ms"]["mean"]) * 100.0 if summary["total_e2e_ms"]["mean"] > 0 else 0.0
    print(f" Container & MicroVM lifecycle accounts for {bold(f'{exec_pct:.1f}%')} of total submission time.")
    print(f" Redis queue polling delay accounts for {bold(f'{queue_pct:.1f}%')} of total submission time.")

    current_data = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "git": git_info,
        "config": {
            "runs": args.runs,
            "warmup": args.warmup,
            "poll_interval_ms": args.poll_ms,
            "test_type": args.test_type
        },
        "summary": summary,
        "runs_raw": results
    }

    # Save to JSON if requested
    if args.save:
        with open(args.save, "w") as f:
            json.dump(current_data, f, indent=2)
        print(f"\n[+] Baseline results saved to: {green(args.save)}")

    # Compare with existing baseline if requested
    if args.compare:
        if not os.path.exists(args.compare):
            print(red(f"\n[!] Baseline file not found: {args.compare}"))
        else:
            with open(args.compare, "r") as f:
                baseline_data = json.load(f)
            print_comparison(baseline_data, current_data)

if __name__ == "__main__":
    main()

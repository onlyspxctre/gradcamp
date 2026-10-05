#!/bin/sh
set -eu

# ==============================================================================
# Runner Sandbox Entrypoint & Test Harness
# ==============================================================================
# Executes untrusted compiled student code against a test suite in a secure
# sandbox. Emits structured JSON results to stdout and $RESULTS_FILE.
# ==============================================================================

BIN_PATH="${BIN_PATH:-/workspace/bin/main}"
TESTS_DIR="${TESTS_DIR:-/workspace/tests}"
TIMEOUT_SEC="${TIMEOUT_SEC:-2}"
MAX_OUTPUT_BYTES="${MAX_OUTPUT_BYTES:-1048576}" # 1MB limit for output
DIFF_FLAGS="${DIFF_FLAGS:--q -b -B}"
TMP_DIR="${TMPDIR:-/tmp}"
RESULTS_FILE="${RESULTS_FILE:-$TMP_DIR/results.json}"

# Mode 1: Direct pass-through execution if command arguments are provided
if [ "$#" -gt 0 ]; then
    exec "$@"
fi

# Mode 2: Direct execution if no test directory is mounted/present
if [ ! -d "$TESTS_DIR" ]; then
    if [ -x "$BIN_PATH" ]; then
        exec "$BIN_PATH"
    else
        echo "{\"error\": \"Neither tests directory ($TESTS_DIR) nor executable ($BIN_PATH) found.\"}" >&2
        exit 1
    fi
fi

# Verify executable binary
if [ ! -f "$BIN_PATH" ]; then
    echo "{\"error\": \"Executable binary not found at $BIN_PATH\"}" >&2
    exit 1
fi

if [ ! -x "$BIN_PATH" ]; then
    chmod +x "$BIN_PATH" 2>/dev/null || true
    if [ ! -x "$BIN_PATH" ]; then
        echo "{\"error\": \"Binary at $BIN_PATH is not executable\"}" >&2
        exit 1
    fi
fi

# Discover test cases (pairs of .in and .out/.ans)
TEST_BASES=$(find "$TESTS_DIR" -maxdepth 1 \( -name "*.in" -o -name "*.out" -o -name "*.ans" \) -exec basename {} \; 2>/dev/null | sed -E 's/\.(in|out|ans)$//' | sort -u)

# If no test cases are found in tests dir, run binary directly
if [ -z "$TEST_BASES" ]; then
    if [ -x "$BIN_PATH" ]; then
        exec "$BIN_PATH"
    else
        echo "{\"error\": \"No test cases found in $TESTS_DIR\"}" >&2
        exit 1
    fi
fi

TOTAL=0
PASSED=0
FAILED=0
JSON_TESTS=""

for base in $TEST_BASES; do
    [ -z "$base" ] && continue
    TOTAL=$((TOTAL + 1))

    # Standard input file
    IN_FILE="/dev/null"
    if [ -f "$TESTS_DIR/$base.in" ]; then
        IN_FILE="$TESTS_DIR/$base.in"
    fi

    # Expected output file (.out or .ans)
    EXPECTED_OUT=""
    if [ -f "$TESTS_DIR/$base.out" ]; then
        EXPECTED_OUT="$TESTS_DIR/$base.out"
    elif [ -f "$TESTS_DIR/$base.ans" ]; then
        EXPECTED_OUT="$TESTS_DIR/$base.ans"
    fi

    # Optional expected exit code (default: 0)
    EXPECTED_EXIT=0
    if [ -f "$TESTS_DIR/$base.exit" ]; then
        EXPECTED_EXIT=$(cat "$TESTS_DIR/$base.exit" | tr -d ' \r\n')
    fi

    # Optional command line arguments
    ARGS=""
    if [ -f "$TESTS_DIR/$base.args" ]; then
        ARGS=$(cat "$TESTS_DIR/$base.args")
    fi

    ACTUAL_OUT="$TMP_DIR/actual_${base}.out"
    ACTUAL_ERR="$TMP_DIR/actual_${base}.err"

    # Measure execution time via /proc/uptime for sub-second precision
    T1=0; T2=0
    read -r T1 _ < /proc/uptime 2>/dev/null || T1=0

    EXIT_CODE=0
    # Run with timeout to prevent infinite loops (kills with SIGKILL after 1s grace)
    timeout -k 1 "${TIMEOUT_SEC}" "$BIN_PATH" $ARGS < "$IN_FILE" > "$ACTUAL_OUT.tmp" 2> "$ACTUAL_ERR.tmp" || EXIT_CODE=$?

    read -r T2 _ < /proc/uptime 2>/dev/null || T2=0
    DURATION_MS=$(awk "BEGIN { printf \"%d\", ($T2 - $T1) * 1000 }" 2>/dev/null || echo 0)
    if [ "$DURATION_MS" -lt 0 ]; then
        DURATION_MS=0
    fi

    # Truncate output to prevent disk/memory exhaustion from runaway printing
    head -c "$MAX_OUTPUT_BYTES" "$ACTUAL_OUT.tmp" > "$ACTUAL_OUT" 2>/dev/null || true
    head -c "$MAX_OUTPUT_BYTES" "$ACTUAL_ERR.tmp" > "$ACTUAL_ERR" 2>/dev/null || true
    rm -f "$ACTUAL_OUT.tmp" "$ACTUAL_ERR.tmp"

    STATUS="UNKNOWN"
    DETAIL=""

    if [ "$EXIT_CODE" -eq 143 ] || [ "$EXIT_CODE" -eq 137 ] || [ "$EXIT_CODE" -eq 124 ]; then
        STATUS="TIMEOUT"
        DETAIL="Time limit exceeded (${TIMEOUT_SEC}s)"
    elif [ "$EXIT_CODE" -gt 128 ]; then
        SIG=$((EXIT_CODE - 128))
        STATUS="CRASHED"
        case "$SIG" in
            6) DETAIL="Aborted (SIGABRT)" ;;
            8) DETAIL="Floating point exception (SIGFPE)" ;;
            9) DETAIL="Killed (SIGKILL)" ;;
            11) DETAIL="Segmentation fault (SIGSEGV)" ;;
            *) DETAIL="Terminated by signal $SIG" ;;
        esac
    elif [ "$EXIT_CODE" -ne "$EXPECTED_EXIT" ]; then
        STATUS="RUNTIME_ERROR"
        DETAIL="Exited with code $EXIT_CODE (expected $EXPECTED_EXIT)"
    elif [ -n "$EXPECTED_OUT" ]; then
        if diff $DIFF_FLAGS "$EXPECTED_OUT" "$ACTUAL_OUT" >/dev/null 2>&1; then
            STATUS="PASSED"
            DETAIL="Output matched"
        else
            STATUS="WRONG_ANSWER"
            DETAIL="Output differed from expected"
        fi
    else
        STATUS="PASSED"
        DETAIL="Completed successfully"
    fi

    if [ "$STATUS" = "PASSED" ]; then
        PASSED=$((PASSED + 1))
    else
        FAILED=$((FAILED + 1))
    fi

    # Format JSON test entry
    TEST_JSON=$(printf '{"name":"%s","status":"%s","exit_code":%d,"duration_ms":%d,"message":"%s"}' \
        "$base" "$STATUS" "$EXIT_CODE" "$DURATION_MS" "$DETAIL")

    if [ -z "$JSON_TESTS" ]; then
        JSON_TESTS="    $TEST_JSON"
    else
        JSON_TESTS="$JSON_TESTS,
    $TEST_JSON"
    fi

    # Clean up test output files
    rm -f "$ACTUAL_OUT" "$ACTUAL_ERR"
done

# Calculate score
SCORE="0.00"
if [ "$TOTAL" -gt 0 ]; then
    SCORE=$(awk "BEGIN { printf \"%.2f\", ($PASSED * 100.0) / $TOTAL }")
fi

# Build final JSON report
REPORT=$(printf '{\n  "total": %d,\n  "passed": %d,\n  "failed": %d,\n  "score_percent": %s,\n  "tests": [\n%s\n  ]\n}\n' \
    "$TOTAL" "$PASSED" "$FAILED" "$SCORE" "$JSON_TESTS")

# Output clean JSON to stdout
echo "$REPORT"

# Also save report to results file if writable
echo "$REPORT" > "$RESULTS_FILE" 2>/dev/null || true

exit 0

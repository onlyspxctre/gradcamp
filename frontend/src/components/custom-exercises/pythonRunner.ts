import type { ExerciseDraft } from "./customExercises"

const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/"
const LOAD_TIMEOUT_MS = 45_000
const RUN_TIMEOUT_MS = 8_000

export interface PythonResult {
    stdout: string
    error: string
    returned: string | null
    matchesReturn: boolean
    returnTypeError: string
}

const harness = `
import contextlib
import io
import json
import math
import traceback

class LimitedOutput(io.StringIO):
    def write(self, text):
        if self.tell() + len(text) > 16000:
            raise ValueError("Output limit exceeded (16,000 characters)")
        return super().write(text)

def same_json(actual, expected):
    # Python treats True == 1, but JSON booleans and numbers are distinct.
    if type(actual) is not type(expected):
        return type(actual) in (int, float) and type(expected) in (int, float) and actual == expected
    if isinstance(actual, list):
        return len(actual) == len(expected) and all(same_json(a, b) for a, b in zip(actual, expected))
    if isinstance(actual, dict):
        return actual.keys() == expected.keys() and all(same_json(actual[k], expected[k]) for k in actual)
    return actual == expected

python_types = {
    "int": (int,), "float": (float,), "number": (int, float), "str": (str,), "bool": (bool,),
    "list": (list,), "dict": (dict,), "none": (type(None),),
}

def checked_fixture(value, expected_type, label):
    # JSON has one numeric kind. Normalize authored literals to the declared
    # Python numeric type. The learner's actual return is never coerced.
    if expected_type == "int" and type(value) is float and value.is_integer():
        value = int(value)
    elif expected_type == "float" and type(value) is int:
        value = float(value)
    if type(value) not in python_types[expected_type]:
        raise TypeError(f"{label} must be {expected_type}.")
    if expected_type == "int" and abs(value) > 2**53 - 1:
        raise ValueError(f"{label} must be a safe integer.")
    if type(value) is float and not math.isfinite(value):
        raise ValueError(f"{label} must be finite.")
    return value

def run_case(source, text, expected, function_name, signature_json):
    stdout = LimitedOutput()
    stderr = LimitedOutput()
    error = ""
    returned = None
    matches_return = False
    return_type_error = ""
    try:
        args = json.loads(text)
        signature = json.loads(signature_json)
        arg_types = signature["arguments"]
        if not isinstance(args, list) or len(args) != len(arg_types):
            raise TypeError(f"Test case must supply {len(arg_types)} argument(s).")
        args = [checked_fixture(value, kind, f"Argument {i + 1}")
                for i, (value, kind) in enumerate(zip(args, arg_types))]
        expected_type = signature["returns"]
        expected_value = checked_fixture(json.loads(expected), expected_type, "Expected return")
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            namespace = {"__name__": "__exercise__"}
            exec(compile(source, "<exercise>", "exec"), namespace)
            function = namespace.get(function_name)
            if not callable(function):
                raise NameError(f"Define a callable named {function_name}.")
            value = function(*args)
            if type(value) not in python_types[expected_type]:
                return_type_error = f"Expected return type {expected_type}, got {type(value).__name__}."
                returned = repr(value)[:1000]
            else:
                encoded = json.dumps(value, ensure_ascii=False, allow_nan=False)
                if len(encoded) > 16000:
                    raise ValueError("Return value limit exceeded (16,000 characters)")
                returned = encoded
                matches_return = same_json(json.loads(encoded), expected_value)
    except SystemExit:
        error = "Program exited before returning a value."
    except BaseException as exc:
        error = "".join(traceback.format_exception_only(type(exc), exc)).rstrip()
    return json.dumps({
        "stdout": stdout.getvalue(), "error": error[:2000],
        "returned": returned, "matchesReturn": matches_return, "returnTypeError": return_type_error[:2000],
    })

run_case
`

const workerScript = `
    self.onmessage = async ({ data: { source, cases, functionName, signature } }) => {
        try {
            importScripts(${JSON.stringify(`${PYODIDE_URL}pyodide.js`)});
            const pyodide = await loadPyodide({ indexURL: ${JSON.stringify(PYODIDE_URL)} });
            const runCase = pyodide.runPython(${JSON.stringify(harness)});
            self.postMessage({ type: 'ready' });
            const signatureJson = JSON.stringify(signature);
            const results = cases.map(({ input, expectedOutput }) =>
                JSON.parse(runCase(source, input, expectedOutput, functionName, signatureJson)));
            self.postMessage({ type: 'results', results });
        } catch (error) {
            self.postMessage({ type: 'error', message: String(error).slice(0, 300) });
        }
    };
`

// The opaque iframe prevents Python's JS bridge from sharing the app origin.
// Its blob worker inherits this CSP: allow runtime assets, not app/API requests.
const runnerPage = `<!doctype html>
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval' ${PYODIDE_URL}; connect-src ${PYODIDE_URL}; worker-src blob:">
    <script>
        window.addEventListener('message', event => {
            if (event.source !== parent || !event.ports[0]) return;
            const port = event.ports[0];
            try {
                const script = ${JSON.stringify(workerScript).replace(/</g, "\\u003c")};
                const url = URL.createObjectURL(new Blob([script], { type: 'text/javascript' }));
                const worker = new Worker(url);
                URL.revokeObjectURL(url);
                worker.onmessage = ({ data }) => port.postMessage(data);
                worker.onerror = () => port.postMessage({ type: 'error', message: 'Python worker failed.' });
                port.onmessage = () => worker.terminate();
                worker.postMessage(event.data);
            } catch (error) {
                port.postMessage({ type: 'error', message: String(error).slice(0, 300) });
            }
        }, { once: true });
    </script>`

export function runPython(
    source: string,
    {
        cases,
        functionName,
        signature,
    }: Pick<ExerciseDraft, "cases" | "functionName" | "signature">,
    signal: AbortSignal,
    onReady: () => void
): Promise<PythonResult[]> {
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(new DOMException("Run stopped", "AbortError"))
            return
        }

        const frame = document.createElement("iframe")
        const channel = new MessageChannel()
        let connected = false
        let timer = window.setTimeout(
            () =>
                fail(
                    "Python took too long to load. Check your internet connection and try again."
                ),
            LOAD_TIMEOUT_MS
        )

        function cleanup() {
            window.clearTimeout(timer)
            signal.removeEventListener("abort", abort)
            if (connected) channel.port1.postMessage("stop")
            else channel.port2.close()
            channel.port1.close()
            frame.remove() // Dispose of the worker's owning document, even if the worker is stuck.
        }

        function fail(message: string, name = "Error") {
            cleanup()
            reject(new DOMException(message, name))
        }

        function abort() {
            cleanup()
            reject(new DOMException("Run stopped", "AbortError"))
        }

        frame.hidden = true
        frame.title = "Isolated Python runner"
        frame.setAttribute("sandbox", "allow-scripts")
        frame.srcdoc = runnerPage
        frame.addEventListener(
            "load",
            () => {
                frame.contentWindow?.postMessage(
                    { source, cases, functionName, signature },
                    "*",
                    [channel.port2]
                )
                connected = true
            },
            { once: true }
        )
        channel.port1.onmessage = ({ data }) => {
            if (data?.type === "ready") {
                window.clearTimeout(timer)
                timer = window.setTimeout(
                    () =>
                        fail(
                            "Run exceeded the 8-second time limit.",
                            "TimeoutError"
                        ),
                    RUN_TIMEOUT_MS
                )
                onReady()
            } else if (
                data?.type === "results" &&
                isResultList(data.results, cases.length)
            ) {
                cleanup()
                resolve(data.results)
            } else {
                fail(
                    typeof data?.message === "string"
                        ? `Python runner: ${data.message.slice(0, 300)}`
                        : "Invalid response from the Python runner."
                )
            }
        }
        signal.addEventListener("abort", abort, { once: true })
        document.body.append(frame)
    })
}

function isResultList(value: unknown, count: number): value is PythonResult[] {
    return (
        Array.isArray(value) &&
        value.length === count &&
        value.every(
            (item) =>
                typeof item?.stdout === "string" &&
                item.stdout.length <= 32_000 &&
                typeof item.error === "string" &&
                item.error.length <= 4000 &&
                (item.returned === null ||
                    (typeof item.returned === "string" &&
                        item.returned.length <= 32_000)) &&
                typeof item.matchesReturn === "boolean" &&
                typeof item.returnTypeError === "string" &&
                item.returnTypeError.length <= 4000
        )
    )
}

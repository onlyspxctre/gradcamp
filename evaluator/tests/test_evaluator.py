import json
from pathlib import Path
import shlex
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
QUESTION = ROOT / "questions/0000-0000-add-two-integers"


class EvaluatorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        temp = tempfile.TemporaryDirectory()
        cls.addClassCleanup(temp.cleanup)
        directory = Path(temp.name)
        driver = directory / "driver"
        solution = directory / "solution.c"
        solution.write_text("int add(int a, int b) { return a + b; }\n")
        cls.evaluator = directory / "evaluator"
        flags = shlex.split(subprocess.check_output(
            ["pkg-config", "--cflags", "--libs", "yyjson"], text=True
        ))
        subprocess.run(["cc", "-o", driver, QUESTION / "driver.c", solution], check=True)
        subprocess.run([
            "cc", "-Wall", "-Wextra", "-Werror", f'-DSTUDENT_BIN="{driver}"',
            "-o", cls.evaluator, ROOT / "evaluator/evaluator.c", *flags,
        ], check=True)

    def grade(self, test_file, results):
        return subprocess.run(
            [self.evaluator, test_file, results], capture_output=True, text=True, timeout=5
        )

    def test_existing_addition_suite_retains_result_shape(self):
        cases = json.loads((QUESTION / "tests.json").read_text())
        with tempfile.TemporaryDirectory() as temp:
            results = Path(temp) / "results.json"
            run = self.grade(QUESTION / "tests.json", results)
            self.assertEqual(run.returncode, 0, run.stderr)
            self.assertEqual(json.loads(results.read_text()), {"tests": [
                {"name": case["name"], "passed": True, "error": ""} for case in cases
            ]})

    def test_different_suite_reuses_same_binary_and_reports_mismatch(self):
        with tempfile.TemporaryDirectory() as temp:
            config = Path(temp) / "tests.json"
            results = Path(temp) / "results.json"
            config.write_text(json.dumps([
                {"name": "New inputs", "args": ["40", "2"], "expected": "41"}
            ]))
            run = self.grade(config, results)
            self.assertEqual(run.returncode, 0, run.stderr)
            self.assertEqual(json.loads(results.read_text()), {"tests": [
                {"name": "New inputs", "passed": False, "error": "Expected '41', got '42'"}
            ]})

    def test_invalid_suites_do_not_write_results(self):
        valid = {"name": "Addition", "args": ["1", "2"], "expected": "3"}
        invalid_inputs = {
            "missing": None,
            "invalid JSON": "[",
            "wrong root": "{}",
            "empty suite": "[]",
            "too many cases": json.dumps([valid] * 65),
            "missing args": '[{"name":"Test","expected":""}]',
            "non-array args": json.dumps([{**valid, "args": 1}]),
            "non-string arg": json.dumps([valid, {**valid, "args": [1]}]),
            "NUL in arg": json.dumps([{**valid, "args": ["1\x002"]}]),
            "too many args": json.dumps([{**valid, "args": ["0"] * 33}]),
            "oversized expected": json.dumps([{**valid, "expected": "a" * 4097}]),
            "oversized file": " " * (64 * 1024) + "[]",
        }
        for label, content in invalid_inputs.items():
            with self.subTest(label=label), tempfile.TemporaryDirectory() as temp:
                config = Path(temp) / "tests.json"
                results = Path(temp) / "results.json"
                if content is not None:
                    config.write_text(content)
                run = self.grade(config, results)
                self.assertNotEqual(run.returncode, 0)
                self.assertIn("tests.json", run.stderr)
                self.assertFalse(results.exists())


if __name__ == "__main__":
    unittest.main()

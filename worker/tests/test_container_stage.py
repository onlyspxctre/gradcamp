#!/usr/bin/env python3
"""Exercise the real supervisor with a fake runtime, never the host runtime."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest

DRIVER = str(Path(sys.argv.pop(1)).resolve())
FAKE_RUNTIME = Path(__file__).with_name("fake_docker.py").resolve()
STAGE_OK, STAGE_FAILED, STAGE_TIMED_OUT, STAGE_ERROR, STAGE_CLEANUP_FAILED = range(5)


class ContainerStageTests(unittest.TestCase):
    def run_stage(self, config=None, *, stage="compiler", timeout=1000, cleanup=700):
        with tempfile.TemporaryDirectory(prefix="gradcamp-fake-runtime-") as directory:
            root = Path(directory)
            (root / "config.json").write_text(json.dumps(config or {}))
            docker = root / "docker"
            docker.write_text(f'#!/bin/sh\nexec "{sys.executable}" "{FAKE_RUNTIME}" "$@"\n')
            docker.chmod(0o700)
            env = dict(os.environ, PATH=f"{root}:{os.environ['PATH']}",
                       GRADCAMP_TEST_RUNTIME=str(root))
            start = time.monotonic()
            completed = subprocess.run(
                [DRIVER, stage, "gradcamp-test-attempt", str(timeout), str(cleanup)],
                env=env, capture_output=True, text=True,
                timeout=(max(timeout, 0) + max(cleanup, 0)) / 1000 + 5,
            )
            elapsed = time.monotonic() - start
            self.assertEqual(completed.returncode, 0, completed.stderr)
            result = int(completed.stdout.split("RESULT ")[-1].strip())
            log = root / "commands.jsonl"
            commands = [json.loads(line) for line in log.read_text().splitlines()] if log.exists() else []
            # Every fake CLI should have been killed/reaped, even when the fake
            # container cannot be removed. Check PIDs while the temp state exists.
            for command in commands:
                with self.assertRaises(ProcessLookupError, msg=f"surviving CLI {command}"):
                    os.kill(command["pid"], 0)
            return result, (root / "container").exists(), commands, elapsed, completed.stderr

    def test_success_and_auto_removal_for_both_stages(self):
        for stage in ("compiler", "executor"):
            with self.subTest(stage=stage):
                result, exists, commands, _, _ = self.run_stage(stage=stage)
                self.assertEqual(result, STAGE_OK)
                self.assertFalse(exists)
                self.assertEqual(commands[0]["args"][0], "create")
                self.assertEqual(commands[1]["args"], ["start", "--attach", "gradcamp-test-attempt"])
                self.assertTrue(any(c["args"][:2] == ["container", "ls"] for c in commands))

    def test_explicit_removal_even_after_success(self):
        result, exists, _, _, _ = self.run_stage({"keep_container": True})
        self.assertEqual(result, STAGE_OK)
        self.assertFalse(exists)

    def test_nonzero_exit_is_failure_not_success(self):
        result, exists, _, _, log = self.run_stage({"start": "fail"})
        self.assertEqual(result, STAGE_FAILED)
        self.assertFalse(exists)
        self.assertIn("exited with code 1", log)

    def test_signaled_cli_still_requires_container_removal(self):
        result, exists, _, _, log = self.run_stage({"start": "signal"})
        self.assertEqual(result, STAGE_FAILED)
        self.assertFalse(exists)
        self.assertIn("killed by signal", log)

    def test_timeout_removes_container_that_survives_cli_kill(self):
        result, exists, commands, _, _ = self.run_stage({"start": "hang"}, timeout=250)
        self.assertEqual(result, STAGE_TIMED_OUT)
        self.assertFalse(exists)
        self.assertTrue(any(c["args"] == ["rm", "--force", "gradcamp-test-attempt"] for c in commands))

    def test_removal_failure_is_retried(self):
        result, exists, commands, _, _ = self.run_stage({"keep_container": True, "remove": "retry"})
        self.assertEqual(result, STAGE_OK)
        self.assertFalse(exists)
        self.assertGreaterEqual(sum(c["args"][0] == "rm" for c in commands), 2)

    def test_unremovable_container_is_not_reported_as_success(self):
        result, exists, _, elapsed, _ = self.run_stage({"keep_container": True, "remove": "fail"})
        self.assertEqual(result, STAGE_CLEANUP_FAILED)
        self.assertTrue(exists)
        self.assertLess(elapsed, 3)

    def test_hanging_remove_command_is_bounded(self):
        result, exists, _, elapsed, _ = self.run_stage({"keep_container": True, "remove": "hang"})
        self.assertEqual(result, STAGE_CLEANUP_FAILED)
        self.assertTrue(exists)
        self.assertLess(elapsed, 3)

    def test_hanging_state_query_is_bounded(self):
        result, _, _, elapsed, _ = self.run_stage({"remove": "fail", "list": "hang"})
        self.assertEqual(result, STAGE_CLEANUP_FAILED)
        self.assertLess(elapsed, 3)

    def test_query_failure_is_not_mistaken_for_absence(self):
        result, exists, _, _, _ = self.run_stage({"remove": "fail", "list": "fail"})
        self.assertFalse(exists)
        self.assertEqual(result, STAGE_CLEANUP_FAILED)

    def test_unconfirmed_creation_cannot_be_reported_as_clean(self):
        for create in ("hang-before", "hang-after", "fail"):
            with self.subTest(create=create):
                result, exists, commands, _, log = self.run_stage({"create": create}, timeout=150)
                self.assertEqual(result, STAGE_CLEANUP_FAILED)
                self.assertFalse(exists)
                self.assertFalse(any(c["args"][0] == "start" for c in commands))
                self.assertIn("creation never confirmed", log)

    def test_create_and_start_share_one_deadline(self):
        result, exists, _, _, _ = self.run_stage({"create_delay": 0.25, "start_delay": 0.55}, timeout=700)
        self.assertEqual(result, STAGE_TIMED_OUT)
        self.assertFalse(exists)

    def test_invalid_budgets_launch_nothing(self):
        result, exists, commands, _, _ = self.run_stage(timeout=0)
        self.assertEqual(result, STAGE_ERROR)
        self.assertFalse(exists)
        self.assertEqual(commands, [])


if __name__ == "__main__":
    unittest.main()

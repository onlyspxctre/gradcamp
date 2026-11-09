#!/usr/bin/env python3
"""A fake runtime: container state survives CLI termination, but no VM is run."""
import json
import os
from pathlib import Path
import signal
import sys
import time

root = Path(os.environ["GRADCAMP_TEST_RUNTIME"])
config = json.loads((root / "config.json").read_text())
args = sys.argv[1:]
with (root / "commands.jsonl").open("a") as log:
    log.write(json.dumps({"args": args, "pid": os.getpid()}) + "\n")
container = root / "container"


def hang():
    while True:
        time.sleep(60)


if args[0] == "create":
    name = args[args.index("--name") + 1]
    assert args[args.index("--label") + 1] == "gradcamp.container=" + name
    assert "--rm" in args
    mode = config.get("create", "ok")
    if mode == "fail":
        sys.exit(125)
    if mode == "hang-before":
        hang()
    container.write_text(name)
    if mode == "hang-after":
        hang()
    time.sleep(config.get("create_delay", 0))
    print("fake-container-id")
    sys.exit(0)
elif args[0] == "start":
    assert args[1] == "--attach"
    assert container.read_text() == args[2]
    mode = config.get("start", "ok")
    if mode == "hang":
        hang()
    if mode == "signal":
        os.kill(os.getpid(), signal.SIGTERM)
    time.sleep(config.get("start_delay", 0))
    if not config.get("keep_container", False):
        container.unlink()
    sys.exit(1 if mode == "fail" else 0)
elif args[:2] == ["rm", "--force"]:
    mode = config.get("remove", "ok")
    if mode == "hang":
        hang()
    if mode == "fail":
        sys.exit(1)
    if mode == "retry":
        count_file = root / "remove-count"
        count = int(count_file.read_text()) if count_file.exists() else 0
        count_file.write_text(str(count + 1))
        if count == 0:
            sys.exit(1)
    if not container.exists():
        sys.exit(1)  # --rm already removed it; not proof by itself.
    assert container.read_text() == args[2]
    container.unlink()
    sys.exit(0)
elif args[:2] == ["container", "ls"]:
    assert args[2:5] == ["--all", "--quiet", "--filter"]
    assert args[5].startswith("label=gradcamp.container=")
    mode = config.get("list", "ok")
    if mode == "fail":
        sys.exit(125)
    if mode == "hang":
        hang()
    if container.exists():
        assert args[5] == "label=gradcamp.container=" + container.read_text()
        print("fake-container-id")
    sys.exit(0)
else:
    raise AssertionError(f"Unexpected runtime command: {args}")

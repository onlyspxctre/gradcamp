# Worker container stages

`src/worker.c` supplies the compiler/executor container configuration and records
job results. `src/container_stage.c` supervises each stage:

1. Run `docker create` with a unique attempt name and matching
   `gradcamp.container` label, retaining all existing sandbox flags.
2. Only after creation succeeds, run `docker start --attach <name>`.
3. Use one monotonic deadline for creation plus execution: currently 10 seconds
   for compilation and 30 seconds for evaluation.
4. Before recording any stage result, clean up its container and CLI processes.
   Only `STAGE_OK` allows advancing to execution or consuming results.

Cleanup has a separate five-second budget. It terminates/reaps an outstanding
stage CLI, attempts `docker rm --force <name>`, and retries failed removal within
that budget. If automatic `--rm` removal already happened, a successful empty
`docker container ls` filtered by the exact attempt label confirms absence.
A failed runtime command is never interpreted as proof of absence. Cleanup
commands have their own capped waits within the shared cleanup deadline, including
reserved time to terminate/reap a stuck cleanup CLI. Reaping is retried after
container removal, which may unblock an outstanding stage CLI.

If creation never completed successfully, absence cannot rule out a delayed
creation request inside the runtime. Cleanup still attempts removal but returns
`STAGE_CLEANUP_FAILED`, even if the container currently appears absent. This is
intentionally conservative. Failure to confirm CLI reaping also produces
`STAGE_CLEANUP_FAILED`; it is not discarded in favor of the original timeout.

**Remaining integration:** the queue parent still ignores job-child exits and
continues dequeuing after cleanup uncertainty. Stopping intake and draining an
unhealthy worker is the next change. This stage supervisor alone is not a complete
worker quarantine mechanism. Redis operations are also still synchronous; stage
cleanup runs before result publication so Redis cannot delay sandbox termination.

## Tests

From the repository root:

```sh
make -C worker test
```

Requires Clang (or `CC`), pkg-config, hiredis, yyjson, and Python 3. Tests build in a
temporary directory and never connect to Redis or invoke the real container
runtime. The fake runtime retains container state independently of its CLI, so
killing the CLI alone cannot satisfy timeout tests. Coverage includes attempt
identities, exit/signal failures, stage deadlines, cleanup retries, hanging cleanup
commands, failed queries, uncertain creation, and injected termination/reaping
errors. Real Docker/Podman/krun integration remains a separate smoke check.

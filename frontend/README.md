# Frontend

Gradcamp frontend sub-project built with React, Bun, TypeScript, Tailwind CSS, shadcn/ui, and Lucide icons.

## Getting Started

[Bun](https://bun.sh/) supplies the package manager, runtime, bundler, development server, and unit test runner. Use Bun 1.4.4 or newer. All commands below run on Bun, including TypeScript, ESLint, and Playwright; a separate Node.js installation is not required. Playwright still needs a browser and its OS libraries.

From the `frontend` directory:

```bash
# Install dependencies
bun install

# Start development server using the Bun runtime
bun run dev

# Type check and build for production using Bun
bun run build

# Lint
bun run lint

# Workspace state, pointer grading, and progress regression tests using Bun
bun run test

# Install Chromium once, then run browser layout/navigation regressions
bunx --bun playwright install chromium
bun run test:e2e
```

### Development and production

- `bun run dev` starts `scripts/dev.ts` on `http://127.0.0.1:5173`, with React Fast Refresh and CSS hot reloading. `bun --hot` also reloads server-code changes.
- `bun run build` type-checks the browser and tooling code with TypeScript, then uses `scripts/build.ts` to generate minified static HTML, JavaScript, CSS, and assets in `dist/`. Bun transpiles TypeScript but the separate type check remains required.
- `bun run preview` serves the existing `dist/` build on `http://127.0.0.1:4173`; build first. Unknown HTML navigation paths fall back to the SPA, while missing assets return 404. This is a local preview, not a hardened production server.
- Both servers forward `/upload` and `/fetch`, including query strings and request bodies, to the C backend at `http://localhost:3000`. An unreachable backend returns HTTP 502.
- Set `HOST` and `PORT` to override the bind address and port, e.g. `HOST=0.0.0.0 PORT=5174 bun run dev`. Servers fail if their port is occupied rather than silently switching ports. Only expose them to trusted networks.

`bunfig.toml` enables `bun-plugin-tailwind` for the dev server; the build script loads the same plugin explicitly. Import aliases come from `tsconfig.json`. HTML-referenced assets (including the favicon in `public/`) are bundled and fingerprinted; `public/` is not automatically copied or exposed as a directory. Reference new assets from HTML/CSS/JavaScript so they enter the build.

Package scripts explicitly select Bun for CLI tools that otherwise have Node shebangs. Keep `bun.lock` as the sole maintained lockfile and use `bun install --frozen-lockfile` for reproducible installs.

### Test runners

Use `bun run test` or plain `bun test` for unit tests and `bun run test:e2e` for browser tests. `bunfig.toml` limits Bun's test discovery to `tests/`, keeping Playwright's `e2e/*.spec.ts` files in their own runner.

Playwright downloads its browser separately from JavaScript dependencies. If it reports that a browser executable is missing, rerun `bunx --bun playwright install chromium`.

The browser tests start their own Bun development server on port 4173 and cover the lecture, quiz, and code submission workflow at six desktop-to-mobile viewport sizes. Submission tests mock the judge API, so they do not require the backend or worker. Lecture and quiz tests click recorded screen coordinates (without Playwright's automatic scrolling) and check that controls do not move across steps, questions, feedback, retries, or completion. To use an existing Chromium installation instead of downloading one, run `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium bun run test:e2e`.

To run the same browser suite against a production build instead of the development server:

```bash
bun run build
FRONTEND_PREVIEW=1 bun run test:e2e
```

TypeScript, ESLint, Prettier, and Playwright remain separate dependencies because Bun's bundler/test runner does not replace their type checking, linting, formatting, or browser automation.

## Code submissions

Use **Submit** (or **Ctrl/Cmd + Enter**) to evaluate a code solution against the backend's entire test suite. The console shows the submission status, all returned test results, or compiler errors, and the submission is added to history. There is no separate Run action or single-test evaluation mode.

### Grading response consumption

`src/services/judgeContract.ts` validates the current `/fetch` response before `judgeService.ts` creates a submission. Pending/in-progress responses contain a lifecycle status; failed jobs may contain a top-level `error`. Completed responses must contain a nonempty `results.tests` array whose entries have a string `name`, boolean `passed`, and string `error` (empty for a passing test). Additional fields are ignored. Malformed JSON or invalid response fields produce an explicit protocol-error message instead of a fabricated test result.

Per-test diagnostics are retained in history and rendered as plain text in both result panes. The evaluator does not currently emit separate `output`, `expected`, or timing fields. This consumer change does not alter backend behavior, polling budgets, or existing verdict labels: failed tests still map to Wrong Answer and failed jobs to Compile Error. Diagnostic strings are not parsed to infer verdicts; authoritative typed verdicts remain deferred.

`tests/judgeContract.test.ts` and `tests/judgeService.test.ts` cover response validation and diagnostic preservation. `e2e/grading-diagnostics.spec.ts` checks both result views, including safe rendering of HTML-like output and malformed responses.

### Workspace code layout

- `src/context/WorkspaceContext.tsx` owns the active assignment, per-problem code drafts, submission history, and selected submission ID. `src/lib/workspaceState.ts` defines the state transitions and derives the active code/result; `App.tsx` owns only top-level page navigation and passes the selected code assignment into `ProblemWorkspace.tsx`.
- `src/components/problem/CodeEditorPane.tsx` composes the editor pane and owns shared toolbar/context-menu state (language, font size, copy feedback, fullscreen).
- `src/components/problem/editor/EditorToolbar.tsx` and `EditorContextMenu.tsx` render controls using the same action callbacks.
- `src/components/problem/editor/CodeEditor.tsx` owns Monaco configuration, theme integration, and its single resize observer.
- `src/components/problem/editor/EditorConsole.tsx` owns console resizing and tab presentation. `TestCasesPanel.tsx` retains example selection and custom input while tabs change or the console is collapsed.
- `src/components/submissions/SubmissionResult.tsx` is the shared result renderer for the console and `ProblemLeftPane.tsx`. Its history variant also shows the timestamp, submitted code snapshot, and Back to list action. Both panes receive the same selected submission derived from context history, rather than keeping separate submission objects. `ProblemLeftPane.tsx` owns only whether its history list or detail is visible: Back to list and switching detail tabs do not clear the console result. The shared renderer does not fetch or manage submissions.

Changing assignments clears submission selection but preserves code drafts and history. A submission that completes after navigation is always recorded, but is selected only if its code assignment is still active. `tests/workspace.test.ts` covers these transitions; `e2e/workspace-state.spec.ts` covers shared pane selection, Back to list, and completion after code/lecture/quiz navigation.

## Assignment types

The Assignments page includes three formats:

- **Code** — the existing Add Two Integers workspace and backend judge.
- **Lecture** — Pointers: the basics, with five stepped/optional-playback sections, code traces, animated memory cells, and an explicit completion action.
- **Quiz** — Pointers: memory lab, with six questions using address sliders, selectable memory cells, numeric answers, and multiple choice. Each answer has feedback and retries. Results distinguish the first-try score from eventual completion.

For a demo, open **Assignments → Pointers: the basics**, step through the sections, then select **Open memory lab**. The quiz can also be opened directly without completing the lecture. Its **Review this concept** action returns to the relevant lecture section without losing answers.

Lecture/quiz progress is stored locally under `gradcamp.learning.v1`, survives refreshes, and contributes to the catalog completion count. Retaking the quiz clears only quiz progress. Lessons and quizzes continue to work if browser storage is unavailable, but progress will not survive reloads. These are browser-graded practice activities: scores are not authenticated, sent to the backend, or mixed into code submission history.

Assignment metadata and format discriminators live in `src/data/assignments.ts` and `src/types/index.ts`. Pointer content, memory models, and pure grading functions are in `src/data/pointers.ts`; progress validation/reducers are in `src/lib/learningProgress.ts`. `tests/pointers.test.ts` covers grading, retries, completion, and persisted-state validation. Animation respects reduced-motion preferences, including changes while the page is open.

Learning navigation uses overlapping CSS grid items to reserve the tallest content and feedback at the current viewport width, rather than hard-coded heights. Inactive items are invisible, inert, and hidden from assistive technology; inactive quiz controls are also disabled. This leaves some extra space on shorter questions but keeps action buttons stationary. Sequential navigation preserves the scroll position; selecting a section/question in the sidebar explicitly reveals it. Quiz question headings receive focus without scrolling on sequential navigation.

## Adding shadcn/ui Components

To add more UI components from shadcn:

```bash
bunx --bun shadcn@latest add <component-name>
```

Components are placed in `src/components/ui/`.

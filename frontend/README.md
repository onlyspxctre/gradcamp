# Frontend

Gradcamp frontend sub-project built with React, Vite, TypeScript, Tailwind CSS, shadcn/ui, and Lucide icons.

## Getting Started

From the `frontend` directory:

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Type check and build for production
pnpm build

# Lint
pnpm lint

# Pointer grading and progress regression tests (Node.js 22.18+)
pnpm test

# Install Chromium once, then run browser layout/navigation regressions
pnpm exec playwright install chromium
pnpm test:e2e
```

The browser tests start their own Vite server on port 4173 and cover the lecture and quiz at six desktop-to-mobile viewport sizes. They click recorded screen coordinates (without Playwright's automatic scrolling) and check that controls do not move across steps, questions, feedback, retries, or completion. To use an existing Chromium installation instead of downloading one, run `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium pnpm test:e2e`.

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
pnpm dlx shadcn@latest add <component-name>
```

Components are placed in `src/components/ui/`.

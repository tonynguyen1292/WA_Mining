# WA Mining — working agreements

A WA mining-sites data platform: SQL/Power BI analysis that grew into a
FastAPI + PostgreSQL + React app, plus a Unity/C# prototype. Portfolio
project with a live Jira board (project key **WMDP2**), so the written
record matters as much as the code.

## Layout

| Path | What lives there |
|---|---|
| `backend/` | FastAPI + SQLAlchemy API, pytest suite |
| `frontend/` | React + Vite + TypeScript, vitest suite |
| `netlify/` | Functions that mirror the FastAPI contract for the live demo |
| `prototypes/unity-shift-supervisor-demo/` | Unity/C# prototype (own README, DECISIONS, TROUBLESHOOTING_LOG) |
| `SQL/`, `DATABASES/`, `POWER_BI/` | The original analysis layer |
| `JIRA_BACKLOG.md` | Mirror of the board + dated sync logs |
| `WA_MINING_PROJECT_PLAN.md` | Numbered plan items the board and commits refer back to |

Live: [wa-mining.netlify.app](https://wa-mining.netlify.app) (app),
[wa-mining-unity.netlify.app](https://wa-mining-unity.netlify.app) (Unity demo).

## How we work

**Ask before committing and again before pushing.** Never bundle the two
into one approval. A directive to "proceed with X" covers X's commits and
pushes; it does not cover merges, force-pushes, or anything destructive —
ask separately for those.

**Split commits by concern.** A bug fix, the feature it was found in, and
the docs describing it are three commits, not one. Message format:

```
Short imperative subject

What:
- the concrete changes

Why:
- the reason this was worth doing, including what broke without it

Verification:
- what was actually run, with real numbers/outcomes (not "should work")
```

**Lockstep.** Code, the Jira board, and the docs move in the same sitting.
Shipping a story means: commits pushed, the board item transitioned with a
closing comment, and `JIRA_BACKLOG.md` (dated sync log) plus
`WA_MINING_PROJECT_PLAN.md` updated to match. A board state the docs
contradict is a bug.

**Report abnormal behavior** rather than routing around it quietly — the
troubleshooting logs are part of the portfolio's value.

## Traps that have actually bitten

- **Literal U+FEFF (BOM)** appears in files this project edits — six
  occurrences so far, each read as a mystery syntax or render bug. A
  pre-commit hook scans staged files; CI re-checks. Use the `\ufeff`
  escape in code, never the raw character. Verify at codepoint level with
  Python, not by eye.
- **Jira single-key shortcuts** (`c` create, `i` assign, `m` comment) fire
  whenever a click misses its input target, silently mutating items.
  Protocol: click → screenshot to confirm focus → only then type. The
  renderer also freezes; retry the screenshot rather than re-clicking.
- **`gh run list --commit` needs the full 40-char SHA** — a short SHA
  matches nothing and reports no runs, which reads as "CI didn't run".
- **Unity**: see `.claude/skills/unity-webgl-release/` — the editor
  lockfile, the `-quit` flag truncating test runs, and the repo-root
  `npx` EPERM each cost a rebuild cycle before being written down.

## Commands

```bash
cd backend && python -m pytest          # backend suite
cd frontend && npm test                 # frontend suite (npm ci if node_modules looks gutted)
```

Unity build/test/deploy: use the `unity-webgl-release` skill — the chain
has traps that are not obvious from the command lines.

Closing an increment or story: `/increment-close`.

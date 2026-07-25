---
description: Close an increment or story - verify DoD, split commits, move the board, sync the docs, check CI
argument-hint: [increment or story, e.g. "I3" or "WMDP2-76"]
---

Close out **$ARGUMENTS** end to end. This is the ceremony that keeps the
code, the Jira board, and the written record from drifting apart; work
through it in order and stop at the approval gates rather than batching
them.

## 1. Verify before claiming

Find the definition of done for this increment — for Inspection Round work
it is section 6 of `prototypes/unity-shift-supervisor-demo/FEATURE_INSPECTION_ROUND.md`;
for app stories it is the acceptance criteria on the Jira item. List each
criterion and state how it was actually satisfied.

Run the suites the change can affect (`backend` pytest, `frontend` vitest,
or the Unity chain via the `unity-webgl-release` skill) and quote the real
counts. If the change is observable in a browser, verify it there — a
green build is not a verified build.

## 2. Prepare the commits

Scan every touched text file for a literal U+FEFF and stray non-ASCII at
codepoint level with Python, not by eye. Discard line-ending-only churn
(Unity's `ProjectSettings` often shows as modified with no real diff).

Group the changes into commits **by concern** — a bug fix, the feature it
surfaced in, and the docs describing it are separate commits. Each message
carries What / Why / Verification, with the Verification section quoting
what was actually run.

**Ask before committing. Then ask again before pushing.**

## 3. Move the board

Open the Jira item and post a closing comment covering: scope delivered,
the commit SHAs, what was verified and how, and anything left open.
Transition the status.

Jira's single-key shortcuts (`c`, `i`, `m`) fire on any click that misses
its input target and silently mutate items, so click, screenshot to
confirm focus, and only then type. If a screenshot times out the renderer
is frozen — retry the screenshot rather than re-clicking, which is how
stray edits happen.

## 4. Sync the written record

In the same sitting, update `JIRA_BACKLOG.md` (a dated sync-log entry plus
the affected item's bullet) and `WA_MINING_PROJECT_PLAN.md` where the item
is referenced. If a decision was made during the work, add it to the
relevant DECISIONS.md; if an error cost real time, add it to the
TROUBLESHOOTING_LOG. Commit this as its own docs commit.

## 5. Confirm CI

Check the run for the pushed commit using the **full 40-character SHA** —
a short SHA silently matches nothing and reads as "CI never ran".

```bash
gh run list --commit "$(git rev-parse HEAD)" --limit 3
```

## 6. Milestone gate

If this increment sits on a merge gate defined in the spec, say so and ask
the owner whether to merge — that decision is theirs, not yours. Once it
is answered, make sure no document still describes the decision as
pending.

# Troubleshooting Log — Shift Supervisor Demo

Real errors hit while building this prototype, with full detail on cause
and fix. Kept as a record, not cleaned up after the fact — the point of
this document is to be honest about what actually went wrong, since
that's a more useful signal than a changelog that reads like nothing
ever broke.

---

## 1. `CS0234` / `CS0246` — `UnityEngine.UI` namespace not found

**When:** first time the project was opened in the Unity Editor and
scripts compiled, before any scene existed.

**Full error, from Unity's `Editor.log`:**
```
Assets\_ShiftSupervisorDemo\Scripts\ShiftSupervisorUIController.cs(3,19): error CS0234:
The type or namespace name 'UI' does not exist in the namespace 'UnityEngine'
(are you missing an assembly reference?)

Assets\_ShiftSupervisorDemo\Scripts\ShiftSupervisorUIController.cs(22,34): error CS0246:
The type or namespace name 'Text' could not be found
(are you missing a using directive or an assembly reference?)

Assets\_ShiftSupervisorDemo\Scripts\ShiftSupervisorUIController.cs(23,34): error CS0246:
The type or namespace name 'Text' could not be found
(are you missing a using directive or an assembly reference?)
```

**How it was found:** file presence alone (the script existed, had a
`.meta` file, no import failure logged) didn't surface this — it only
showed up by actually grepping Unity's `Editor.log` for `error CS`.
Worth calling out because "the files are all there" and "it compiles"
are different claims, and only checking the first would have missed a
real, blocking error.

**Root cause:** `ShiftSupervisorUIController.cs` uses `using UnityEngine.UI;`
and `UnityEngine.UI.Text`. That namespace ships in a separate package,
`com.unity.ugui`, which Unity normally adds to `Packages/manifest.json`
automatically **the first time a UI element is placed in a scene through
the Editor**. Since no scene existed yet (scripts were written before any
scene-building step), that implicit trigger never fired, so the package
was never added, so the script referencing it couldn't compile.

Contributing factor: the original design note (now corrected — see
`DECISIONS.md`) incorrectly assumed this namespace ships with every
Unity project by default. That was true prior to roughly Unity 2019.2
and isn't anymore.

**Fix applied:** added the dependency directly to `Packages/manifest.json`
instead of waiting for the Editor to add it implicitly:
```json
"com.unity.ugui": "1.0.0"
```
Confirmed fixed by re-checking `Editor.log` for `error CS` after Unity
regained focus and re-resolved packages — zero matches after the fix,
versus the errors above appearing on every compile pass before it.

**Take-away for next time:** when a project has no scene yet, don't
assume any package that's normally "added implicitly by an Editor action"
is present. If a script references it before that Editor action has ever
happened, add it to the manifest explicitly up front.

---

## 2. (informational, not an error) Concurrent Unity instance risk, avoided

**Context:** the original plan to build the scene was to run Unity in
`-batchmode -executeMethod` from the command line. Before doing that,
`tasklist` was checked and found `Unity.exe` already running (the Editor
was open on this project).

**Why this mattered:** a second Unity process against the same project
path would contend over the project's lock file
(`Temp/UnityLockfile`) and risk either the batch run failing outright or,
worse, both processes writing to the same `Library/`/`Temp/` state
concurrently. Rather than risk that, the same scene-building code was
instead exposed as an Editor menu item (`Tools → WA Mining Demo →
Build Shift Supervisor Scene`) and run inside the already-open Editor
session — same result, zero risk of a second-instance conflict.

No error actually occurred here; recorded because it's the kind of
silent-corruption risk that's worth having checked for rather than
gotten lucky on.

## 3. WebGL Build Support module: four failed installs for 2022.3.50f1 (2026-07-22)

**Goal:** produce the first WebGL build (feature spec's "Ship the link"
story). 2022.3.50f1 was installed with only Windows Standalone support.

**Failure sequence, in order:**

1. **Headless install, unattended** (`"Unity Hub.exe" -- --headless
   install-modules --version 2022.3.50f1 -m webgl`): the ~1 GB download
   completed to 100%, then:
   `[WebGL Build Support] failed to install. Error given: The Windows
   elevation prompt was cancelled or timed out.`
   The UAC dialog appears on Windows' secure desktop; in an unattended
   run nothing can click it, and it expires. The Hub exits "Completed
   with errors" but with the download cached.
2. **Headless retry with the owner nearby:** same elevation timeout —
   the prompt fired before the owner saw it.
3. **Manual Hub GUI install:** progress completed visually, but no
   `WebGLSupport` folder appeared under the 2022.3.50f1 editor — and the
   6000.5.4f1 editor's module folder timestamp also stayed at its
   original 2026-07-17 install date. Conclusion: the GUI queue swallows
   the elevation failure invisibly; "it finished" and "it installed"
   are different claims (the same lesson as entry #1's "the files are
   all there" vs "it compiles").
4. **Headless attempt while the Hub GUI was open:** produced only
   Chromium quota-database errors and no module action at all — the Hub
   is single-instance, and the headless run lost to the GUI's lock.

**Diagnosis method:** never trust the installer's word — verify
`Editor/Data/PlaybackEngines/WebGLSupport` exists (and check its
timestamp) after every attempt. The build log's
`Native extension for WindowsStandalone target not found` +
`Targeting platform: WebGL` combination is the on-disk signature of
"module missing for the requested target."

**Resolution:** reversed the editor pin and built with the
already-installed Unity 6000.5.4f1 (WebGL support present, license
verified in earlier logs) — see DECISIONS.md, "Editor version for the
WebGL build." Also relevant: two batch builds aborted on
`It looks like another Unity instance is running with this project
open` while the owner's Editor session held `Temp/UnityLockfile` —
entry #2's predicted risk, observed for real, resolved by a
close-detection watcher rather than ever killing the live session.

---
name: unity-webgl-release
description: Headless build, test, and WebGL release chain for the Unity shift-supervisor prototype in prototypes/unity-shift-supervisor-demo. Use this whenever the work involves building, rebuilding, testing, verifying, or deploying the Unity prototype or its WebGL demo — including EditMode tests, the ScenarioUiBuilder scene rebuild, an Inspection Round increment (I1-I4), or a Netlify deploy of the Unity site. Use it before claiming any Unity change works: each trap documented here (the -quit flag silently truncating test runs, the editor lockfile aborting a build, npx EPERM at the repo root) has already cost a full rebuild cycle in this project.
---

# Unity WebGL release chain

Everything here runs headless from the command line. The Editor is never
required, and the point of the committed Editor scripts
(`WebGLBuildScript.cs`, `ScenarioUiBuilder.cs`) is that a release is
reproducible rather than a sequence of remembered menu clicks.

**Paths** (Windows; use forward slashes in Git Bash):

- Editor: `C:\Program Files\Unity\Hub\Editor\6000.5.4f1\Editor\Unity.exe`
- Project: `<repo>/prototypes/unity-shift-supervisor-demo`
- Netlify site id (Unity demo only): `eddecb01-a54a-4d3f-8d0a-f2290602b9b6`

The project is pinned to **Unity 6000.5.4f1**, not the 2022.3 LTS also
installed on this machine. That pin was a reversal forced by four failed
WebGL-module installs on 2022.3; the reasoning is in the prototype's
DECISIONS.md and TROUBLESHOOTING_LOG.md #3. Building with 2022.3 will
fail on the missing WebGL module, so always pass the 6000.x path.

## Preflight: is the Editor open?

Unity holds an exclusive lock on the project. If the user has it open,
every headless command aborts with "another Unity instance is running".

Check before starting, and if it is genuinely locked, **ask the user to
close it and wait** — never kill their Editor process, since they may have
unsaved scene work. A watcher loop that polls until the lock clears is the
polite version of waiting.

**The lockfile alone does not prove the Editor is open.** An unclean
shutdown leaves it behind, and the stale file then blocks every headless
run while the user is correctly telling you they closed Unity. Confirm
against the process list before refusing to run, and check the file's age —
a lockfile dated days ago is the giveaway:

```bash
ls -l "<project>/Temp/UnityLockfile" 2>/dev/null
tasklist //FI "IMAGENAME eq Unity.exe" //NH 2>/dev/null | grep -i "^Unity.exe"
```

No matching process plus an old lockfile means stale: delete it and carry
on. `Temp/` is gitignored, so removing it has no repo impact.
`scripts/unity-chain.sh` now performs this check automatically.

## The chain

Run `scripts/unity-chain.sh` (bundled with this skill) for the whole
sequence with exit-code checking, or run the stages individually as below.
Each stage is independent: skip the ones your change cannot affect.

### 1. Rebuild the scenario UI — only if the UI hierarchy changed

```bash
"$UNITY" -batchmode -nographics -quit -projectPath "$PROJ" \
  -executeMethod WAMining.ShiftSupervisorDemo.EditorTools.ScenarioUiBuilder.Build
```

`ScenarioUiBuilder` is idempotent: it destroys any prior ScenarioUI and
ScenarioController before recreating and rewiring them, then self-checks
the wiring and exits non-zero in batchmode if a reference came out null.
That self-check is the reason this script stays committed rather than
being deleted after one use like the original SceneBuilder — regenerating
the UI is a routine operation now, not a one-off.

Skip this stage for pure logic or test changes; it rewrites the scene file
and produces noisy diffs for no reason.

### 2. EditMode tests

```bash
"$UNITY" -batchmode -nographics -projectPath "$PROJ" \
  -runTests -testPlatform EditMode \
  -testResults "<absolute path>/editmode-results.xml"
```

**Do not add `-quit` to this command.** With `-quit` Unity exits as soon
as the run is queued, so you get a green exit code and either no results
file or a truncated one — it looks like a passing suite that never ran.
The test runner exits on its own when finished.

Read the actual counts out of the XML rather than trusting the exit code:

```bash
grep -o 'total="[0-9]*" passed="[0-9]*" failed="[0-9]*"' editmode-results.xml | head -1
```

The suite covers the pure-C# scenario core (`Scripts/Scenario/`), which has
zero UnityEngine dependencies precisely so it can be tested this way —
same philosophy as the backend's SQLite-backed tests. If a change to
scenario rules is not expressible as an EditMode test, that is a signal
the rule leaked into the view layer.

### 3. WebGL build

```bash
"$UNITY" -batchmode -nographics -quit -projectPath "$PROJ" \
  -buildTarget WebGL \
  -executeMethod WAMining.ShiftSupervisorDemo.EditorTools.WebGLBuildScript.Build
```

Output lands in `Builds/WebGL/` (gitignored). A successful build leaves
`WebGL.data`, `WebGL.framework.js`, `WebGL.loader.js`, `WebGL.wasm`;
compression is disabled so Netlify serves the files without extra headers.
Takes several minutes — run it in the background and expect the wait.

### 4. Verify before deploying

A green build proves it compiled, not that it works. The prototype's real
bugs — a click-through that spun the orbit camera behind every UI panel,
font glyphs rendering blank — were invisible in the Editor and only
appeared in the built artifact.

See `references/webgl-verification.md` for the browser-driving method,
including the coordinate discipline that makes UGUI clicks land. Read it
whenever you are about to verify or screenshot a build.

### 5. Deploy

```bash
cd "<scratchpad dir>" && npx --yes netlify-cli deploy --prod \
  --dir "<project>/Builds/WebGL" \
  --site eddecb01-a54a-4d3f-8d0a-f2290602b9b6
```

**Run this from the scratchpad directory, not the repo root.** At the repo
root, `npx` tries to tidy `frontend/node_modules` and hits EPERM unlinking
`@esbuild/win32-x64/esbuild.exe` while a dev server holds it open. The
failure is confusing because it names esbuild, not Netlify. Running from
outside the repo sidesteps it entirely.

The Unity demo has its **own** Netlify site, deliberately separate from the
main app's, so the two release cadences never couple. Deploying the Unity
build to the app's site (or vice versa) would replace a live site with the
wrong artifact — always pass the site id explicitly.

Finish by loading the live URL and confirming the new build is actually
being served; Netlify reports "Deploy is live" before propagation
completes.

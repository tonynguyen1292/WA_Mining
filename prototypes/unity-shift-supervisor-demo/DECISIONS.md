# Technical Decisions — Shift Supervisor Demo

Short reasoning log for the non-obvious calls made building this prototype.
Written for a reviewer who wants the "why," not just the "what" — each of
these was a real choice with a rejected alternative, not the only option.

## Repo placement: `prototypes/unity-shift-supervisor-demo/`, not repo root

**Decision:** nest under a `prototypes/` parent rather than adding
`unity-demo/` as a sibling of `backend/`/`frontend/`.

**Why:** this repo's main narrative is a SQL pipeline + FastAPI/React app.
Putting a Unity project at the same tree depth as those would visually
imply it's a peer component of the same product. `prototypes/` signals
"separate, exploratory" before you've read a single file — the folder
name itself carries the scope statement, which matters more than it
sounds like for a repo meant to be skimmed by a reviewer in 30 seconds.

## Branch strategy: `feature/unity-shift-supervisor-demo`, not straight to `main`

**Decision:** all of this happened on its own branch; nothing touched
`main` until explicitly asked to merge.

**Why:** this was genuinely uncertain territory (new stack, first Unity
project in this repo) with a real chance of dead ends. A branch means a
false start costs nothing — delete it, `main` never knew it happened.
Commits within the branch are also kept atomic and single-purpose
(scaffold → scripts → docs → root README reference → generated project
files), so the history reads as a sequence of deliberate steps rather
than one large "add unity stuff" commit.

## Render pipeline: Built-in, not URP/HDRP

**Decision:** use Unity's Built-in Render Pipeline; never added a render
pipeline package.

**Why:** URP/HDRP earn their cost when you need controllable lighting,
post-processing, or mobile/console performance targets. Five colored
cubes and a UI panel need none of that. Adding one would mean a package
dependency, a Pipeline Asset, and material upgrades — three moving parts
whose only job would be making a primitive-cube demo look exactly the
same as it already does with zero of them.

## UI: legacy UGUI `Text`, not TextMeshPro — and a real mistake here

**Decision:** `UnityEngine.UI.Text`/`Image`, not TMP.

**Why (intended):** TMP requires an "Import TMP Essentials" step the
first time you touch it in a fresh project — one more thing that can go
wrong in a from-scratch setup, for text rendering quality this demo
doesn't need.

**What actually happened:** I initially wrote in this README that UGUI
"ships with every Unity project by default." That was true through
roughly Unity 2019.1 and stopped being true after — the `UnityEngine.UI`
namespace lives in a separate package (`com.unity.ugui`) that only gets
added automatically the first time a UI element is placed in a scene
through the Editor. Since this project's scene didn't exist yet when the
scripts were written, the package was never pulled in, and
`ShiftSupervisorUIController.cs` failed to compile with:

```
error CS0234: The type or namespace name 'UI' does not exist in the namespace 'UnityEngine'
error CS0246: The type or namespace name 'Text' could not be found
```

Fixed by adding `"com.unity.ugui": "1.0.0"` to `Packages/manifest.json`
directly, rather than waiting for the Editor to add it implicitly. Full
detail in [TROUBLESHOOTING_LOG.md](TROUBLESHOOTING_LOG.md). Worth keeping
in this document specifically because it's the kind of "the tutorial
you half-remember is for an older version" mistake that's genuinely easy
to make picking up a stack — the honest fix mattered more than not
having made it.

## Click detection: `OnMouseDown()`, not a hand-rolled raycast

**Decision:** each `SiteMarker` implements Unity's `OnMouseDown()` message
(which requires a `Collider`, already present on any primitive) instead
of a `Physics.Raycast` against `Input.mousePosition` in an `Update()` loop.

**Why:** Unity already does this — `OnMouseDown` is the engine performing
exactly that raycast and calling your method when it hits this object's
collider. Writing a custom version would be re-solving a solved problem
for no behavioral difference, the opposite of what a five-marker demo
should spend effort on.

## Data: static bundled JSON, no networking

**Decision:** `sites_sample.json` is a hand-edited, checked-in file loaded
once at startup. No HTTP client, no call to the FastAPI backend's
`/api/sites`.

**Why:** this demo's job is to show a spatial take on site data and to
demonstrate Unity/C#, not to prove the two halves of this repo can talk
to each other over a network — that's a different, larger claim (CORS,
auth if the API ever needs it, error handling for a down backend, a
runtime dependency between two otherwise-independent projects) that
wasn't asked for and isn't earned by a 5-marker prototype. If this ever
becomes a real requirement, it's an explicit, scoped follow-up, not
something to sneak in via "well, `UnityWebRequest` is right there."

## Scene generation: a one-time Editor script, not hand-authored YAML or manual clicking

**Decision:** rather than hand-writing `ShiftSupervisorDemo.unity` as raw
Unity YAML, or walking through the Editor menu-by-menu, the scene was
built by a temporary `SceneBuilder.cs` (`Assets/_ShiftSupervisorDemo/Editor/`,
invoked once via `Tools → WA Mining Demo → Build Shift Supervisor Scene`,
then deleted).

**Why this over hand-authored YAML:** Unity scene files are GUID-linked,
version-and-internals-specific documents. Reproducing that format
correctly by hand is realistic to get subtly wrong in a way that looks
fine in a text diff and breaks (or silently drops references) when
opened in the Editor — exactly the failure mode that would undermine a
"clean, credible" demo rather than build confidence in it.

**Why this over manual GameObject/Inspector clicking:** the end result is
identical, but the *steps* are executable code (`GameObject.CreatePrimitive`,
`PrefabUtility.SaveAsPrefabAsset`, `SerializedObject.FindProperty(...).objectReferenceValue = ...`,
`EditorSceneManager.SaveScene`) instead of a sequence of mouse clicks that
leave no trace if done wrong. That code is in this repo's git history —
anyone can read exactly how every field got wired, and it's trivially
re-runnable if the scene ever needs to be rebuilt from scratch. The
script was deleted after one run because it's a build step, not part of
the runtime demo; keeping it around would be exactly the kind of leftover
tooling clutter this project is trying to avoid.

**Verification, not assumption:** after running it, the wiring was
confirmed by reading the actual generated `.unity` file and checking that
fields like `siteMarkerPrefab` referenced a real GUID rather than
`{fileID: 0}` (Unity's "unassigned" value) — not just trusting that the
script ran without throwing.

## Editor version for the WebGL build: Unity 6 (6000.5.4f1), reversing the 2022.3 pin

**Decision (2026-07-22):** the v2 branch's WebGL builds run on Unity
6000.5.4f1, migrating the project off the original 2022.3.50f1 pin. The
owner initially chose to stay on 2022.3 LTS (avoiding a project
migration); that decision was reversed on evidence after the 2022.3 path
consumed four failed attempts at installing its missing WebGL Build
Support module:

1. Two headless `Unity Hub -- --headless install-modules` runs downloaded
   the ~1 GB module successfully but failed at the install step with
   "The Windows elevation prompt was cancelled or timed out" — in an
   unattended run, nobody is there to click the UAC dialog, which appears
   on the secure desktop and expires quietly.
2. A manual Hub GUI install reported visual completion but landed no
   module for 2022.3.50f1 anywhere on disk (both editors'
   `PlaybackEngines` folder timestamps stayed at their original install
   date) — the Hub's queue swallows the elevation failure in a way that
   is indistinguishable from success in its UI.
3. A further headless attempt while the Hub GUI was open did nothing at
   all: the Hub is single-instance, and the headless invocation lost to
   the running GUI's lock.

**Why reversal was right:** 6000.5.4f1 was already installed *with*
WebGL support, needs zero downloads and zero elevation, and the
migration risk for this project is minimal — five small scripts on
Built-in RP + legacy UGUI + legacy Input, all still supported in Unity 6.
The change is confined to this branch (`main` keeps the 2022.3 project
untouched) and is a `git checkout` away from reverting. The pin's
remaining value did not justify a fifth attempt at a module installer
that fails invisibly.

**Trace:** the full failure sequence with timestamps lives in
TROUBLESHOOTING_LOG.md; the headless build command itself is
`Assets/_ShiftSupervisorDemo/Editor/WebGLBuildScript.cs`, so the build
is reproducible regardless of which editor version future maintainers
have installed — the script pins nothing version-specific.

## Scenario core: pure C# behind assembly definitions, not MonoBehaviour logic

**Decision (2026-07-23, increment I1):** the Inspection Round's rules
(`Scripts/Scenario/InspectionRound.cs` + `RoundTypes.cs`) are plain C#
with zero `UnityEngine` dependencies — time arrives via `Tick(delta)`
from whoever drives the round — and the project gained its first
assembly definitions: `WAMining.ShiftSupervisorDemo` over `Scripts/`
and an Editor-only test assembly over `Tests/Editor/`.

**Why pure C#:** the scenario's correctness (sequencing, decision
validation, the win condition, free-roam re-sequencing) is exactly the
kind of logic that silently rots inside a MonoBehaviour where only
play-mode clicking exercises it. As plain C# it runs under the Unity
Test Framework's EditMode runner in milliseconds with no scene — the
same philosophy as the main repo's backend testing against SQLite:
test the rules, not the engine. Presentation stays in I2's
controllers, which will be thin enough to verify visually.

**Why asmdefs became necessary now:** an EditMode test assembly cannot
reference Unity's predefined `Assembly-CSharp`, so testable code must
live in a named assembly — no asmdef, no tests, full stop. One
consequence to know about: a custom runtime asmdef no longer
auto-references package assemblies, so `UnityEngine.UI` had to be
listed explicitly for `ShiftSupervisorUIController` to keep compiling —
the same UGUI dependency that bit as entry #1 in TROUBLESHOOTING_LOG,
resurfacing structurally. `Editor/WebGLBuildScript.cs` deliberately
stays outside any asmdef (predefined `Assembly-CSharp-Editor` is fine
for it, and it references nothing of ours).

**Why the placeholder UI is an Editor-gated IMGUI driver:**
`DebugRoundDriver.cs` is wrapped in `#if UNITY_EDITOR` and self-spawns
via `RuntimeInitializeOnLoadMethod` only when the scene contains a
`SiteDatabase`. That makes the round demonstrable end-to-end in play
mode with **zero scene edits and zero WebGL-build impact** — the
committed scene stays untouched until I2 builds the real UGUI flow,
and a debug panel can never ship to the live site by accident.
*(I2 note: the driver was deleted when the real UI landed, exactly as
this entry promised.)*

## I2 UI: view/bridge controller split, runtime wiring, and a builder that stays

**Decision (2026-07-23, increment I2):** the playable loop ships as two
MonoBehaviours — `ScenarioUIController` (pure view: panel references and
render methods, never touches `InspectionRound`) and
`ShiftScenarioController` (the bridge: owns the round, ticks it, maps
button presses to decisions) — with the UGUI itself generated into the
scene by a **committed, idempotent** Editor script
(`Editor/ScenarioUiBuilder.cs`) and all button listeners attached **at
runtime** in the bridge's `Start()`.

**Why the split:** spec §5's structure, for the same reason the core is
pure — the view can be restyled (or replaced with asset-store UI in I4)
without the scenario logic noticing, and the bridge stays a thin,
readable mapping from clicks to core calls.

**Why runtime listeners, not persistent UnityEvents:** persistent
listeners live inside the scene YAML, where they are invisible in code
review and silently break when the scene is regenerated. Wiring in
`Start()` costs a few lines and makes every connection greppable — and
scene regeneration (which I2 does and I3 will do again) can never
orphan them.

**Why the builder is committed rather than deleted:** the original
SceneBuilder was a one-shot and deleting it was right (see the scene-
generation entry above). v2's increments keep reshaping the scene, so
the builder is now part of the toolchain — idempotent (replaces its own
previous output wholesale), runnable headless for CI-style pipelines,
and ending with a wiring self-check instead of assuming success. The
same evolution the WebGL build script went through: one-off steps
become committed tooling the moment they stop being one-off.

**Why the flag flow is two-step:** F3 says flagging *asks for* a
reason. A single row of four buttons (the debug driver's layout) works
but reads as a quiz; choice-then-reason mirrors how a real inspection
form behaves and keeps the primary row to the two calls a supervisor
actually makes.

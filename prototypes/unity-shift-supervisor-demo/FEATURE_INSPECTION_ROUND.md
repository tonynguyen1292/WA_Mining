# Feature Specification — "Inspection Round" (v1.0, approved 2026-07-22)

The concrete feature this branch builds next: a guided **shift-inspection
training scenario** on top of the existing five-site scene. This document
is the solution artifact that [DISCOVERY.md](DISCOVERY.md) promised — every
requirement below traces to an elicited fact there, not to enthusiasm.

**Status: approved by the owner 2026-07-22** (same day WMDP2-73 "Ship
the link" closed with the live URL at wa-mining-unity.netlify.app).
Implementation begins with increment I1 in the next work session; the
board story lives under epic WMDP2-72.

## 1. The feature in one paragraph

The viewer stops being a passive map and becomes a **playable inspection
round**: the player starts a shift, is guided site-to-site in sequence,
makes a status call at each one ("Log OK" / "Flag issue" with a reason),
and receives an end-of-shift summary — decisions recapped, time taken,
and whether the genuinely troubled site was caught. Sixty seconds, mouse
only, zero instructions needed. It is a training simulation in miniature:
the exact shape (procedure → decision → assessment) of the VR safety
training Viewport XR builds for mining clients, delivered as a WebGL link.

## 2. Business decision (the WHY, traceable)

| Driver | Trace |
|---|---|
| **Skill alignment.** Viewport's published work is interactive training sims and digital twins with Unity as the assembly layer. A scenario loop with state, scoring, and assessment demonstrates *simulation thinking* — the competency DISCOVERY.md's WHAT names as the gap — not just scene scripting. | DISCOVERY 5W: WHAT, WHY |
| **Freelance product story.** "A branded, data-driven inspection-training demo, deployable as a link" is a sellable template: swap the JSON, swap the logo, same engine. The demo doubles as the pitch. | DISCOVERY WHO: freelance clients; §8 below |
| **Demonstrability.** A complete loop with a beginning, decisions, and a summary screen demos itself in under a minute — no narration needed, which is what a link sent to a client must survive. | Elicitation Q4 (shareable link) |
| **Right-sized.** Four increments of ≤3 hours each fit the 2–3 h/week capacity with every increment ending demoable — no half-built state ever published. | Elicitation Q3 (capacity) |
| **Rejected alternatives.** *Digital-twin visual upgrade first* (assets/terrain): higher wow-per-screenshot but demonstrates art integration more than engineering, and its cost is open-ended — it stays as the follow-up feature, where its Could-scope items can decorate an already-working scenario. *Live API sync*: explicitly out of scope in DISCOVERY (networking exclusion holds); it would couple the demo to backend uptime for zero training-sim signal. | DISCOVERY decisions #3, HOW |

## 3. Current state (as of 2026-07-22)

- **Branch:** `feature/unity-shift-supervisor-v2` — DISCOVERY.md committed
  (`c43235b`), pushed. This spec + the headless build script are working-tree
  changes pending commit.
- **Scene:** five clickable markers (4 real MINEDEX sites + 1 demo
  Care-and-Maintenance entry), static JSON via serialized `TextAsset`,
  orbit camera, UGUI info panel. All scripts WebGL-safe (no file I/O, no
  platform-conditional code).
- **Toolchain:** Unity 2022.3.50f1 LTS with WebGL Build Support (module
  installed 2026-07-22 after two headless-elevation failures — Hub GUI
  route succeeded). `WebGLBuildScript.cs` provides the repeatable
  `-executeMethod` build; first baseline build in progress at the time of
  writing — its result is recorded in the story (WMDP2-73) and the
  README's build section when it lands.
- **Board:** epic WMDP2-72 (In Progress) / story WMDP2-73 "Ship the link"
  (In Progress). This feature becomes the next story under WMDP2-72 upon
  approval.

## 4. Requirements

### Functional (MoSCoW)

**Must**
- F1. Scenario state machine: `Briefing → Inspecting(site i of N) → Summary`,
  driven by the site list order; exactly one active site at a time.
- F2. Start-of-shift briefing card: one sentence of instruction + Start button.
- F3. Per-site decision: when the active site is opened, the info panel
  offers **Log OK** and **Flag issue**; flagging asks for a reason (three
  fixed options: Safety / Equipment / Output). Decision advances the round.
- F4. Progress HUD: "Site i of N" + running shift timer, always visible
  during inspection.
- F5. End-of-shift summary: table of site → decision (+ reason), total
  time, and a correctness line — the seeded data contains one genuinely
  non-operating site (the Care & Maintenance entry); catching it is the
  "win" condition the summary calls out.
- F6. Restart from the summary without reloading the page.
- F7. Mouse-only; every Must runs in the WebGL build.

**Should**
- F8. Camera focus: smooth tween to frame the active site (orbit stays
  available); active marker visually highlighted (pulse/emissive), others
  dimmed until visited.
- F9. Best-time persistence across sessions via `PlayerPrefs` (WebGL:
  IndexedDB-backed — survives refresh, no backend).
- F10. Skip guidance: clicking any unvisited site out of order is allowed
  and re-sequences the round (free-roam tolerance — trainees do this).

**Could**
- F11. Audio cues on decision/summary (free SFX, asset-store now permitted).
- F12. Visual set-dressing from free asset-store props (headframe, truck).
- F13. Dataset widened from 5 to ~10 real sites from the repo's cleaned CSV.

**Won't (this feature)**
- Networking/live `/api/sites` sync; VR hardware; auth; server-side
  anything; analytics. (DISCOVERY exclusions hold.)

### Non-functional
- N1. **Testable core:** all scenario logic (sequencing, decision
  recording, timing, scoring) lives in a plain C# class with zero
  `UnityEngine` dependencies, covered by Unity Test Framework EditMode
  tests — the same test-first discipline as the repo's backend.
- N2. **WebGL budget:** build ≤ 50 MB uncompressed; loads to interactive
  ≤ 15 s on ordinary broadband; 60 fps on integrated graphics (it's five
  cubes — the budget exists to keep Could-scope honest).
- N3. **Docs discipline:** DECISIONS.md and TROUBLESHOOTING_LOG.md updated
  every increment; this spec's requirement IDs referenced from commits.
- N4. **Code standard:** existing namespace (`WAMining.ShiftSupervisorDemo`),
  XML doc comments on public API, no scene-coupled god objects — scenario
  (logic) / presentation (UI, camera) / data (JSON) stay separate.

## 5. Solution design (component level)

```
InspectionRound            (pure C#, EditMode-tested: owns F1/F3/F5 logic,
  ├─ RoundState              site order, decisions, timer values, score)
  ├─ SiteDecision enum/record
  └─ RoundSummary
ShiftScenarioController    (MonoBehaviour: bridges InspectionRound to the
                            scene — spawns/highlights markers via existing
                            SiteMarker, feeds decisions in, listens for
                            state changes out)
ScenarioUIController       (briefing card, decision buttons, HUD, summary
                            panel — extends the existing UGUI canvas)
CameraFocusController      (F8 tween; composes with CameraOrbitController)
```
Existing `SiteDatabase` / `SiteInfo` / `SiteMarker` are reused unchanged
except one addition: a highlight state on `SiteMarker`. The prototype's
static-viewer behavior remains available as a "free explore" mode after
the summary (zero-cost: it's the current behavior).

## 6. SDLC plan (increments sized to 2–3 h each, every one demoable)

| Incr | Scope | Exit criteria (Definition of Done) |
|---|---|---|
| I1 | `InspectionRound` core + EditMode tests; briefing → sequence → decisions → summary data flow with debug UI | Tests green in Editor; round completable end-to-end with placeholder UI; committed with docs |
| I2 | Real UI: briefing card, decision buttons + reasons, HUD, summary table, restart (F2–F6) | Full loop playable in Editor + WebGL smoke build; screenshots in README |
| I3 | Camera focus + marker highlight/dimming + scoring line + best time (F8, F9, F5-score) | WebGL build verified in browser; DECISIONS updated (tween + PlayerPrefs choices) |
| I4 | Could-scope by remaining appetite: SFX, props, wider dataset (F11–F13) + final polish pass | Published build refreshed at the shareable URL; feature story closed on the board |

Per-increment loop (the SDLC in practice): requirement IDs → code + tests
→ local run → headless WebGL build (`WebGLBuildScript`) → browser smoke of
the built output → docs → commit on the branch (house message style) →
publish refresh. Merge to `main` only at I2 and I4 (milestone quality,
per DISCOVERY decision #1).

## 7. Maintainability

The pure-C# core is the load-bearing decision: scenario rules become
regression-testable without a scene, UI can be reskinned without touching
logic, and the next feature (digital-twin visuals) changes presentation
only. Data stays config-driven (JSON), so content changes are not code
changes. The documentation trio (README scope, DECISIONS, TROUBLESHOOTING)
continues as the contract for future maintainers — including future-you
after three months at Viewport.

## 8. Client deployability (the freelance template story)

A client engagement reuses this as: fork → replace `sites_sample.json`
with the client's sites/assets/checklist reasons → swap one accent color
+ logo slot in the UI → `WebGLBuildScript` → static host of their choice
(Netlify/S3/intranet — it's a folder of files, no server). The Won't-list
is the honesty clause: anything needing accounts, live data, or analytics
is a scoped paid extension, not a hidden promise.

## 9. Risks

| Risk | Mitigation |
|---|---|
| WebGL-specific input/perf surprises late | Every increment ends with a browser smoke of the *built* output, not just the Editor |
| Scope creep from asset-store freedom | Could-scope quarantined to I4; N2 budget caps it |
| Capacity weeks shorter than 2 h | Increments are independently shippable; the published link never shows a half-state |
| Editor/CLI drift (the module saga) | All builds via the committed script; environment facts logged in TROUBLESHOOTING |

## 10. Approval gate

Implementation starts when the owner approves this spec. On approval:
create the story under WMDP2-72 ("Inspection Round scenario — I1+I2"),
transition when work starts, and begin I1. Amendments to this spec after
approval get dated edits, not silent rewrites.

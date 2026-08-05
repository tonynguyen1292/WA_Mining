# Discovery — Shift Supervisor v2 (validated 2026-07-21)

The requirements-discovery record for evolving the [shift-supervisor
prototype](README.md) into a simulation-focused Unity/C# showcase. This
document is the *what and why*; it deliberately contains no feature
design — the solution proposal builds on it as a separate step, so scope
decisions stay traceable to elicited facts rather than enthusiasm.

Process followed: as-is analysis (repo + PR #1 history) → stakeholder
interview (structured questionnaire, answered by the owner 2026-07-21) →
document/context research (Viewport XR public materials) → this validated
5W1H + stakeholder register → solution proposal (next artifact).

## The trigger

The owner starts at **Viewport XR (Perth) on 2026-08-03** — an immersive-
technology studio building VR/AR training simulations, 3D visualisation,
and digital twins for mining and resources clients (Rio Tinto, BHP, Alcoa
among published case studies), with Unity as the interactive/VR assembly
layer of their production pipeline. Alongside the role, the owner will
take **freelance work**, for which this prototype becomes a portfolio
piece. Both facts were elicited before any scope was set; they reshape the
prototype's purpose from "get an interview" to **"arrive fluent, and show
freelance clients a finished thing."**

## Elicitation record (Q → A, 2026-07-21)

| # | Question | Answer |
|---|----------|--------|
| 1 | Target skills / JD | Simulation tools as practiced at Viewport XR: Unity-based interactive training sims, digital twins, XR-adjacent work (researched from their public materials — no formal JD document exists for this) |
| 2 | Deadline | None formal. Start date 2026-08-03 is the natural "arrive prepared" milestone; after that, the piece serves freelance marketing indefinitely |
| 3 | Capacity | **2–3 hours per week** on this platform |
| 4 | Demo channel | **Shareable link preferred** → WebGL build, published (Netlify already hosts this repo's web app; a second static site fits the existing toolchain) |
| 5 | Repo topology | **Option A**: long-lived feature branch in this repo (`feature/unity-shift-supervisor-v2`); reviewers will look at the GitHub repo first |
| 6 | Tracking | **New epic on the WMDP2 board** — Unity work tracked, but never mixed into web-app sprint velocity |
| 7 | Scope exclusions to lift | **Asset-store content now allowed** (matches how real studios work — Viewport's own pipeline imports modelled assets rather than hand-building primitives). Networking/VR-headset exclusions stay until a solution decision says otherwise |

## 5W1H — validated v1.0

- **WHO** — *Owner/builder:* Vy Nguyen, BA/DA crossing into C#/Unity, with
  this repo as evidence of shipping discipline. *Primary audiences:* (1)
  Viewport XR colleagues/supervisor — the people the owner wants to be
  fluent in front of from day one; (2) freelance clients evaluating the
  owner's Unity capability via a link; (3) GitHub-first reviewers (per
  elicitation, the repo is the first thing they see — branch hygiene and
  this documentation standard are part of the product).
- **WHAT** — Evolve the five-marker static prototype into a small
  **simulation-flavoured** showcase: the competency signal is no longer
  generic Unity ("I can script a scene") but Viewport-aligned ("I think in
  training scenarios, interactivity, and site-as-digital-twin terms").
  Today's evidence: component architecture, JSON loading, prefab
  instantiation, camera/input, UGUI. The gap to close is *simulation
  texture* — scenario flow, richer interactivity, presentable assets, and
  a build people can actually open.
- **WHERE** — *Dev:* owner's Windows machine, Unity 2022.3.50f1 LTS.
  *Code:* this folder, on `feature/unity-shift-supervisor-v2` (merges to
  `main` only at milestone quality; the branch is the workshop, `main` is
  the showroom). *Distribution:* WebGL build at a shareable URL.
  *Tracking:* a dedicated epic on the WMDP2 Jira board.
- **WHEN** — Two horizons. **Horizon 1 (now → 2026-08-03):** at 2–3 h/week
  there are roughly 4–6 working hours available — enough for exactly one
  small, finished increment, chosen for maximum day-one confidence.
  **Horizon 2 (post start-date):** ongoing 2–3 h/week as a freelance
  portfolio artefact, scope steered by what the role actually rewards.
  Consequence for the web app, stated honestly: its Sprint 4 (contract
  tests + custom domain) yields priority and moves behind this.
- **WHY** — The role's stack is Unity simulation; the owner's public
  portfolio is data/web. This piece converts an existing strength (the WA
  mining dataset, already cleaned, already understood) into evidence of
  the *target* skill — same domain, new medium. The growth arc (static
  five-cube prototype → scoped v2 with decision logs) also demonstrates
  the engineering habit studios actually want: shipping small things
  deliberately, and writing down why.
- **HOW / constraints** — Solo dev + AI pair; Unity Personal; ~zero
  budget (free-tier asset-store items allowed, paid ones a per-case
  decision); 2–3 h/week hard cap; WebGL as target platform constrains
  choices (build size, no compute shaders extravagance, Built-in pipeline
  stays unless a solution decision justifies URP); the existing
  documentation standard (DECISIONS.md, TROUBLESHOOTING_LOG.md) is
  mandatory — for this audience the logs are as load-bearing as the code.

## Stakeholder register — v1.0

| Stakeholder | Interest / influence | What they need to see | Engagement |
|---|---|---|---|
| Vy Nguyen (owner, PO, dev) | High / decisive | Day-one fluency; a closeable, unembarrassing artefact | Owns every scope decision; this process |
| Viewport XR supervisor & team | High / high (indirect) | Simulation instincts, Unity fluency, asset handling | Proxy via their public work — no direct elicitation channel; revisit after 2026-08-03 with real knowledge of their pipeline |
| Freelance clients | High / medium | A link that opens and impresses in 60 seconds | WebGL build + one-paragraph pitch; zero install friction |
| GitHub-first reviewers | Medium / medium | Clean branch, readable commits, decision logs | Branch hygiene; this document; house commit style |
| WMDP2 board integrity | Low / process | Unity effort visible but separated | Dedicated epic; never sprint-mixed with web-app stories |

## Decisions taken at validation (2026-07-21)

1. **Topology A** — long-lived `feature/unity-shift-supervisor-v2` branch
   in this repo. Extraction to a dedicated repo stays on the table if
   freelance work makes Unity the headline (revisit after Horizon 1).
2. **New Jira epic** for Unity work on the WMDP2 board. *(Creation pending
   a live browser session; the epic spec lives with the solution proposal.)*
3. **Asset-store unbanned** — [README.md](README.md)'s scope section is
   superseded on this point as of v2; the other exclusions (networking,
   VR hardware) hold until a solution decision addresses them.
4. **WebGL shareable build** is the delivery format for Horizon 1.

## Next artifact

The solution proposal: MoSCoW-scoped options sized to Horizon 1's 4–6
hours and Horizon 2's drip capacity, each traceable to a WHO/WHY line
above. Chosen option becomes the epic's first stories.

*(Fulfilled 2026-07-22 by [FEATURE_INSPECTION_ROUND.md](FEATURE_INSPECTION_ROUND.md),
approved the same day; its I1+I2 scope became WMDP2-74.)*

---

# Horizon 2 — opened 2026-08-04 (**DRAFT**, pending week-one elicitation)

Horizon 1 closed on 2026-08-03, the Viewport XR start date this document
was written around. This section opens its successor.

It is deliberately **incomplete**. The input Horizon 2 turns on — what the
role actually rewards — is two days old, and this document's whole premise
is that scope traces to elicited facts rather than enthusiasm. Writing
speculative answers here would break the standard the rest of the file is
held to. So the questions are posed and the answers are blank until there
is something real to put in them. **The 5W1H and the stakeholder register
above stay at v1.0 until this table is filled**; nothing below supersedes
them yet.

## What Horizon 1 actually delivered

| Planned (WHEN, 2026-07-21) | Delivered |
|---|---|
| "roughly 4–6 working hours available — enough for exactly one small, finished increment" | The headless WebGL build pipeline and a Unity 6 migration (WMDP2-73, live at wa-mining-unity.netlify.app), the approved feature spec, **two** increments of the Inspection Round (I1: pure-C# core + 23 EditMode tests; I2: the playable loop) closing WMDP2-74, the About-page referral card (WMDP2-75), and the I2 milestone merge to `main` |

Three findings follow. None of them is congratulation — they are inputs to
re-planning:

1. **Output beat the estimate; the capacity *model* did not describe what
   happened.** All nine Unity commits landed on **two calendar days**
   (2026-07-22 and 2026-07-23), with the I2 merge on the 24th and the
   repo silent from 2026-07-26 to 2026-08-03. That is not a 2–3 h/week
   drip — it is a concentrated burst followed by a stop, which is a
   different planning object with different risks: it front-loads
   delivery, and it means a fortnight of silence is normal rather than
   alarming. Horizon 2 should model the pattern that actually occurs, not
   re-assert the one that was assumed. **Q12 exists to measure this
   rather than guess again.**
2. **The cost prediction held exactly.** WHEN warned that the web app's
   Sprint 4 "yields priority and moves behind this". It did: Sprint 4 ran
   2026-07-23 → 16 Aug with zero commits against either of its stories,
   and was descoped on 2026-08-04 citing this document. The trade was
   real, was called in advance, and was paid — worth noting as evidence
   the horizon framing works, not just as an apology for the sprint.
3. **Increments I3 and I4 never started.** Verified on the branch: no
   camera-focus controller, no `PlayerPrefs` best-time persistence, no
   marker highlight/dimming — F8, F9 and the F5 scoring line are all
   still open, and I4's Could-scope (SFX, props, wider dataset) behind
   them. The Horizon 1 estimate of "one increment" was beaten on volume
   while the *planned* next increments went untouched, because the work
   that happened was the link and the loop.

## What is now structurally different

**The biggest change is a stakeholder, not a feature.** The register above
records "Viewport XR supervisor & team" as *"Proxy via their public work —
no direct elicitation channel; revisit after 2026-08-03 with real
knowledge of their pipeline."* That channel now exists. The primary
audience this entire piece was aimed at has moved from **inferred** to
**askable**, which is a bigger input than anything on the backlog: every
WHAT and WHY line above was derived from published marketing materials and
can now be checked against the actual job.

Two Horizon-1 decisions come due with it:

- **Decision 1 (repo topology)** parked extraction to a dedicated repo,
  "on the table if freelance work makes Unity the headline — revisit after
  Horizon 1". That is now. The question is no longer hypothetical: this
  prototype is a subfolder of a data-portfolio repo, and if Unity is the
  headline skill, that placement buries it.
- **Decision 3 (asset-store unbanned)** was made for a Could-scope that
  never arrived, since I4 did not start. It costs nothing to leave
  standing, but it has not been tested by use.

## Elicitation record v2 — questions posed 2026-08-04, answers pending

Same format as the 2026-07-21 table above, which stays as the v1 record.

| # | Question | Answer |
|---|---|---|
| 8 | What does Viewport's Unity pipeline actually look like week to week, and which part of it is the realistic place for a new person to add value first? | *pending* |
| 9 | Which competency signals in this prototype proved relevant, and which were aimed at the wrong target? (The bet was: scenario logic + testable core + a shareable link.) | *pending* |
| 10 | Does the role reward **depth** in Unity, or **breadth** across the pipeline — assets, data plumbing, tooling, build/release? | *pending* |
| 11 | Has the freelance premise survived contact with the role — is "a sellable, rebrandable training-demo template" still the point, or does the portfolio piece now serve something else? | *pending* |
| 12 | What is the real weekly capacity, measured against actual working weeks rather than estimated before any? (See finding 1: the observed pattern was a burst, not a drip.) | *pending* |
| 13 | Has anything at Viewport made a Won't-list exclusion worth revisiting — networking/live data, or VR hardware? | *pending* |
| 14 | Is a Unity + mining-domain artifact still the right showcase, or does week one point at a different one? | *pending* |
| 15 | Does the repo-topology answer change (decision 1)? Standalone repo, stay nested, or extract only if a client asks? | *pending* |

## Carried forward unchanged until the answers say otherwise

- **Documentation standard** — DECISIONS.md and TROUBLESHOOTING_LOG.md
  updated every increment. For this audience the logs are as load-bearing
  as the code, and nothing about the start date changes that.
- **Board separation** — Unity work stays on epic WMDP2-72, never mixed
  into web-app sprint velocity.
- **Branch discipline** — `feature/unity-shift-supervisor-v2` is the
  workshop, `main` the showroom; milestone-quality merges only. (The
  branch was fast-forwarded to `main` on 2026-08-04 after sitting 19
  commits behind, so I3 starts from current tooling.)
- **Won't-list** — networking, VR hardware, auth, analytics all hold
  until Q13 says otherwise.
- **WebGL at a shareable URL** as the delivery format.

## What filling this in will change

Named up front so the answers have somewhere to land, rather than becoming
a second document:

- **5W1H → v2.0**, with WHO's "primary audiences" and WHY rewritten
  against direct knowledge instead of inference.
- **Stakeholder register → v2.0**, moving the Viewport row from proxy to
  direct and re-rating the freelance row on the Q11 answer.
- **Decision 1** resolved on Q15 (repo extraction).
- **WMDP2-74's successor**: whether the next story is I3 as specced, a
  re-scoped increment aimed at whatever Q9/Q10 reveal, or a different
  artifact entirely under Q14.
- **The web app's remaining scope** (WMDP2-76's contract test, WMDP2-20's
  custom domain) gets a real priority instead of an indefinite yield.

**Owner: fill the v2 table before scoping any I3 work.** The whole point
of the Horizon 1 process was that the spec came after the elicitation, not
before it; starting I3 on the strength of a spec written from proxy
knowledge would spend the one advantage the start date just bought.

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

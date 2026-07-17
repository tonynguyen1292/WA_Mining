# WA Mining — Shift Supervisor Demo (Unity/C# Prototype)

A small, single-scene Unity prototype exploring what a spatial/3D view of
the same mining-site data (from the [main app](../../README.md)) could look
like, for industrial and XR-adjacent visualization. **This is a learning
and portfolio prototype, not a product build** — see Scope below for
exactly what it is and isn't.

## Why this exists

The rest of this repository is a data pipeline and a FastAPI + React web
app. This folder is a deliberately separate, deliberately small experiment
in a different stack (Unity/C#), to demonstrate picking up that stack and
thinking about the same problem — "what's the status of my sites?" —
spatially instead of as a dashboard. It does not replace, wrap, or depend
on the web app.

## Scope

**What this is:**
- One scene, five clickable 3D markers representing sample mining sites
- Marker color reflects `stage` (Operating / Care and Maintenance / other)
- Click a marker → see its details (name, type, stage, commodity, region) in a UI panel
- Simple mouse-drag orbit + scroll zoom camera
- Site data is a small bundled static JSON snapshot (`Assets/_ShiftSupervisorDemo/Data/sites_sample.json`) — four real site names/attributes from the public MINEDEX dataset already in this repo, plus one clearly-labeled demo entry for the "Care and Maintenance" color

**What this deliberately is not** (per project scope — ask before assuming any of this should be added):
- No backend, API calls, or networking of any kind
- No login/auth, no multiplayer, no database
- No VR/AR headset integration — desktop mouse/keyboard only
- No procedural terrain, advanced shaders, or asset-store content
- Not a live sync with the FastAPI backend's `/api/sites` — the JSON here is a static snapshot, edited by hand

## Structure

```
unity-shift-supervisor-demo/
├── README.md                 # this file
├── SCENE_SETUP.md            # one-time manual steps to assemble the .unity scene
├── .gitignore                # Unity-specific, scoped to this folder only
├── ProjectSettings/
│   └── ProjectVersion.txt    # pins Unity 2022.3 LTS
└── Assets/
    └── _ShiftSupervisorDemo/ # underscore keeps custom content sorted above package folders in the Editor
        ├── Scripts/
        │   ├── SiteInfo.cs                   # plain data class (+ JSON wrapper)
        │   ├── SiteDatabase.cs                # loads sites_sample.json at startup
        │   ├── SiteMarker.cs                  # clickable marker, colored by stage
        │   ├── ShiftSupervisorUIController.cs # spawns markers, shows the info panel
        │   └── CameraOrbitController.cs       # mouse-drag orbit + scroll zoom
        ├── Data/
        │   └── sites_sample.json
        ├── Scenes/            # ShiftSupervisorDemo.unity goes here (see SCENE_SETUP.md)
        └── Prefabs/           # SiteMarker.prefab goes here (see SCENE_SETUP.md)
```

`Packages/manifest.json` and the rest of `ProjectSettings/` aren't
committed yet — they're generated correctly by the Unity Editor the first
time this folder is opened as a project (see `SCENE_SETUP.md`), rather than
hand-authored here.

## Running it

See [SCENE_SETUP.md](SCENE_SETUP.md) — Unity Hub → Open this folder →
follow the one-time scene-assembly checklist → Play.

## Tech choices, briefly

- **Built-in render pipeline**, not URP/HDRP — a handful of primitives and
  a UI panel don't need a render pipeline package.
- **Legacy UGUI `Text`**, not TextMeshPro — ships by default, no extra
  package import for a demo this small.
- **`OnMouseDown()`** for click detection — Unity's built-in mouse-event
  system already does the raycast-against-collider work; no reason to
  hand-roll one.

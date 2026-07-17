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
- One scene (`ShiftSupervisorDemo.unity`), five clickable 3D markers representing sample mining sites
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
├── README.md                   # this file
├── DECISIONS.md                # why each non-obvious technical choice was made
├── TROUBLESHOOTING_LOG.md       # real errors hit while building this, with full detail
├── SCENE_SETUP.md               # how the scene was assembled (kept for reference/reproducibility)
├── .gitignore                   # Unity-specific, scoped to this folder only
├── ProjectSettings/              # Unity-generated on first open (see DECISIONS.md)
├── Packages/manifest.json        # Unity-generated + one manual addition (com.unity.ugui, see TROUBLESHOOTING_LOG.md)
└── Assets/
    └── _ShiftSupervisorDemo/     # underscore keeps custom content sorted above package folders in the Editor
        ├── Scripts/
        │   ├── SiteInfo.cs                   # plain data class (+ JSON wrapper)
        │   ├── SiteDatabase.cs                # loads sites_sample.json at startup
        │   ├── SiteMarker.cs                  # clickable marker, colored by stage
        │   ├── ShiftSupervisorUIController.cs # spawns markers, shows the info panel
        │   └── CameraOrbitController.cs       # mouse-drag orbit + scroll zoom
        ├── Data/
        │   └── sites_sample.json
        ├── Scenes/
        │   └── ShiftSupervisorDemo.unity
        └── Prefabs/
            └── SiteMarker.prefab
```

## Running it

1. Unity Hub → **Open** → select this folder.
2. Open `Assets/_ShiftSupervisorDemo/Scenes/ShiftSupervisorDemo.unity`.
3. Press **Play**. Left-click a marker for its details; left-drag to orbit; scroll to zoom.

## Further reading

- **[DECISIONS.md](DECISIONS.md)** — the reasoning behind each non-obvious
  technical choice (render pipeline, UI framework, click detection, data
  approach, and how the scene itself was generated).
- **[TROUBLESHOOTING_LOG.md](TROUBLESHOOTING_LOG.md)** — real errors hit
  building this, with root cause and fix.
- **[SCENE_SETUP.md](SCENE_SETUP.md)** — how the scene in this repo was
  assembled (a one-time Editor script, not manual clicking — see
  DECISIONS.md for why).

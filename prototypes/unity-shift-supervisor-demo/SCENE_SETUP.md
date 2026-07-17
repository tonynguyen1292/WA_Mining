# Scene setup — how the scene was assembled

**Status: done.** `ShiftSupervisorDemo.unity` and `SiteMarker.prefab`
already exist in this repo — you don't need to follow these steps to run
the demo, just open the scene and press Play (see the root
[README](README.md#running-it)).

This document is kept for reference and reproducibility. In practice, the
steps below were executed by a temporary Unity Editor script
(`SceneBuilder.cs`, run once via a menu command, then deleted) rather than
by clicking through the Editor by hand — see
[DECISIONS.md](DECISIONS.md#scene-generation-a-one-time-editor-script-not-hand-authored-yaml-or-manual-clicking)
for why. The steps themselves are still accurate: that script does exactly
what's described here, just as code instead of mouse clicks. If the scene
ever needs to be rebuilt from scratch, redo this checklist manually, or
recreate a similar Editor script from `DECISIONS.md`'s description of it.

## 0. Open this folder as a Unity project

1. Install **Unity 2022.3 LTS** (any recent patch) via Unity Hub if you don't have it.
2. Unity Hub → **Open** → select `prototypes/unity-shift-supervisor-demo/` (this folder, the one with `Assets/` and `ProjectSettings/` in it).
3. Unity will detect the existing `Assets/` folder and generate the missing `Packages/manifest.json` and the rest of `ProjectSettings/` automatically. Let it finish importing.
4. Confirm the four scripts compile with no errors (Console window, bottom of the Editor).

## 1. Create the scene

1. `File → New Scene` → **Basic (Built-in)** template.
2. `File → Save As...` → `Assets/_ShiftSupervisorDemo/Scenes/ShiftSupervisorDemo.unity` (overwrite the `.gitkeep` placeholder there — delete the placeholder file once the real scene is saved).

## 2. Ground plane

1. `GameObject → 3D Object → Plane`, name it `Ground`, position `(0, 0, 0)`, scale it up a bit (e.g. `(3, 1, 2)`) so there's room for 5 markers in a row.

## 3. Site marker prefab

1. `GameObject → 3D Object → Cube`, name it `SiteMarkerTemplate`.
2. Add component **Site Marker** (`SiteMarker.cs`) — this auto-adds a `Box Collider`, which is what makes it clickable.
3. Drag it into `Assets/_ShiftSupervisorDemo/Prefabs/` to create a prefab (delete the `.gitkeep` there once the prefab exists).
4. Delete the instance from the scene (the controller in step 5 spawns copies at runtime).

## 4. UI canvas

1. `GameObject → UI → Canvas` (this also adds an EventSystem — needed for UI, not for the 3D marker clicks).
2. Under the Canvas: `GameObject → UI → Panel`, name it `InfoPanel`. Anchor it to a corner (e.g. bottom-left), size ~350×200.
3. Under `InfoPanel`: two `GameObject → UI → Text` elements — `TitleText` and `DetailsText`. Stack them vertically inside the panel.
4. Select `InfoPanel` in the Hierarchy and untick its checkbox (starts hidden) — the controller calls `SetActive(true)` on first click.

## 5. Controller object

1. `GameObject → Create Empty`, name it `ShiftSupervisorController`.
2. Add component **Site Database** (`SiteDatabase.cs`) — drag `Assets/_ShiftSupervisorDemo/Data/sites_sample.json` into its **Sites Json** field.
3. Add component **Shift Supervisor UI Controller** (`ShiftSupervisorUIController.cs`) and wire its fields:
   - `Site Database` → the `SiteDatabase` component you just added (same object, drag from Hierarchy)
   - `Site Marker Prefab` → the prefab from step 3
   - `Site Marker Parent` → the `Ground` object (or another empty transform if you'd rather keep markers un-parented from it)
   - `Info Panel` → the `InfoPanel` from step 4
   - `Title Text` / `Details Text` → the two `Text` objects from step 4

## 6. Camera

1. Select `Main Camera`. Add component **Camera Orbit Controller** (`CameraOrbitController.cs`).
2. Leave `Target` empty — it creates its own pivot at the origin on `Start()`. Default position ends up looking at the row of markers from a reasonable distance.

## 7. Press Play

You should see 5 colored cubes in a row (green = Operating, yellow = Care and
Maintenance, red = everything else in this small sample). Left-click a cube
to see its details in the bottom-left panel; left-drag elsewhere to orbit;
scroll to zoom.

This matches what's already committed in this repo — 3 green (Operating:
Abra Underground, Admiral, Bibra), 1 yellow (Care and Maintenance: the demo
entry), 1 red (Anketell Port, Proposed — falls into the catch-all "other"
color bucket, see `SiteMarker.cs`).

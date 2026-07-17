# Scene setup — one-time manual steps

The C# scripts and sample data in this repo are ready to use. The `.unity`
scene file itself is not — Unity scene/prefab files are GUID-linked binary-
adjacent formats that need to be created by the actual Editor, not hand-
written as text. This is a short, one-time checklist to assemble them.

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

## After this works

Commit the newly-generated `ProjectSettings/`, `Packages/manifest.json`,
the `.unity` scene, the prefab, and their `.meta` files as one commit:

```
git add prototypes/unity-shift-supervisor-demo
git commit -m "Add Unity-generated project settings, prefab, and demo scene"
```

# Floor-plan → Interactive 3D Walkthrough: Project Handoff

_Last updated: 17 Nov 2026. Everything learned so far, so work can continue in an environment that can reach fal.ai's file servers (`fal.media`)._

---

## 1. The product

Take a client's **2D floor plan plus their photos or renders**, and deliver a **hosted, phone-friendly web page** where a buyer can:

1. See the house in an angled **top-down "dollhouse" cutaway** (ceilings off), with a floor switcher for multi-storey homes.
2. **Hover or tap a room** to highlight it, with a side panel showing specs and a room list.
3. **Fly in** to standing height inside the room.
4. **Walk around** in first person: drag to look, WASD or joystick to move, tap the floor to glide there, stairs walkable, no clipping through walls.
5. See each room's **reference photo** alongside the model, toggle **upgrade options** (e.g. kitchen cabinet colour), and open a **drawing check** (the traced data laid over the original plan).

**Target buyers:** home builders and developers selling off-plan, architects, interior designers, kitchen and bath remodellers. **Sales motion:** send a free sample of *their own plan* before pitching, then charge per plan for their catalogue. (The "$5k–10k per plan" figure came from a social post and is unverified. Test real prices.)

---

## 2. What we took from each source

Sources reviewed: an Instagram reel (ALAULA tower site), a YouTube walkthrough (Maison Aurelle, built with Higgsfield and similar tools), a Blender→Unreal "explorable world" guide, the "Fable" business prompt, a kitchen-to-3D PDF, a Hyliox three.js tower PDF and the Omnya/SAMAR blueprint.

There are two families of approach:

| | **AI image / video ("Higgsfield" approach)** | **Real geometry (3D model)** |
|---|---|---|
| Examples | ALAULA, Maison Aurelle, Omnya/SAMAR | Blender→Unreal guide, Fable prompt, kitchen PDF, Hyliox |
| Strength | Looks photographed; sells | Faithful to the plan; truly walkable; editable |
| Weakness | Drifts from the plan (rooms, proportions change between shots); you only go where a clip exists | Looks "3D" unless lighting is baked |

**Elements kept in the combined product**
- **Fable prompt:** trace the plan into **one data file** of walls, openings and rooms, then **overlay it on the drawing** before any 3D work. Build in code. Deliver a hosted page, not a video. A **fresh critic** reviews each room (the builder never grades its own work). Upgrade options with a lead form.
- **Kitchen PDF:** all dimensions in one readable file; **never guess a size, flag it**; correct the model from paired renders.
- **Hyliox:** a judge threshold with a round cap (e.g. ≥ 8/10, at most 10 rounds), crop-based feedback.
- **Omnya, Maison Aurelle and the reels:** the UX (hover to highlight, click to fly in, side panel, "Back to tower"), plus luxury polish via AI images and video.
- **Blender→Unreal guide:** staged checkpoints and an approval gate on the top-down view. **Dropped Unreal:** a packaged game can't be opened from a phone link, and it adds heavy build and packaging work.

**Combined pipeline (the plan)**
1. Trace the plan into a data file, then run the overlay check.
2. Build the 3D model in code (three.js now; Blender Python with baked lighting later).
3. Dollhouse view with floor switcher, hotspots and side panel.
4. Fly-in, then first-person walk.
5. **AI layer:** render a still from the 3D model at each room's exact page viewpoint, then have an **image model** restyle it photoreal (the 3D still fixes layout; the client photo sets materials only). A critic compares it to the 3D still. A **video model** makes the dollhouse → room fly-in (first frame = dollhouse, last frame = photoreal room).
6. In the page: tap a room, the fly-in video plays, it settles on the photoreal still, and **"Walk around" crossfades to the 3D view at the same spot**.

---

## 3. What has been built

### v1: proof of concept (Hill "Copthorne", 3-bed semi, ground floor)
- Link (private to Osaro): https://claude.ai/artifact/E4NHUsV3TNaRPvtznFfYvB
- Only the room sizes were real (Kitchen 3.35 × 3.05 m, Living/Dining 5.55 × 5.50 m). The drawing itself was unreachable, so the layout, finishes and furniture were reconstructed. Superseded by v2.

### v2: Modern Two-Bedroom House (from the uploaded PDF `Modern_Two_Bedroom_House_Plans.pdf`)
- Link (private to Osaro): https://claude.ai/artifact/U6ED8ZMJjQGoEESm599QqR
- Source code: `site/index.html` plus `site/assets/` (in the bundle).
- **Geometry extracted from the PDF's vector drawing** (pdfplumber, 1:50 scale → **56.693 pt per metre**), not traced by eye. The overlay check (`checks/overlay.png`) shows walls aligned on both floors.
- Features: intro drop → dollhouse, **floor switcher** (the first floor lifts away to show the ground floor), hotspots and hover highlight, side panel with room list, **kitchen cabinet option** (sage / charcoal / oak, no prices), **Drawing check** modal (original drawing plus traced overlay toggle), fly-in, first-person walk, **walkable stairs between floors**, **reference render thumbnail per room** (tap to enlarge), phone layout (bottom sheet, joystick, compact panel).
- Materials follow the PDF's materials page: buff brick, charcoal frames, pale oak, sage kitchen, quartz, terracotta accents. Textures are procedural (canvas); nothing is downloaded.
- Site: 10 × 22 m plot, 6.80 × 2.75 m rear terrace, lawn, fences, multi-stem trees, grasses, street and houses opposite.

---

## 4. The house data (v2): coordinate system and key facts

- **Units:** metres. **x:** 0 → 6.80 (left → right as drawn). **z:** 0 = rear (garden) outer face → 9.00 = street outer face.
- External walls 0.28 m thick (inner faces at x 0.28 / 6.52 and z 0.28 / 8.72). Internal walls 0.12 m.
- **Floor levels (assumed):** ground 0, first 2.75 (2.5 m ceilings + 0.25 m floor zone). **Not on the drawing.**
- **Stairs:** x 0.28–1.44, bottom at z 7.34 (by the entry), top at z 4.22, 14 risers. Same void on the first floor with a balustrade along x = 1.44.

**Ground-floor openings:** rear window x 0.70–2.10; rear sliding doors x 2.58–6.15; front door x 0.58–1.56; front kitchen window x 3.40–5.90; WC door x 1.70–2.52 (in wall z 5.80–5.92).
**First-floor openings:** rear bath window (frosted) x 0.72–1.66; rear primary window x 3.68–5.96; front bedroom 2 window x 3.40–5.90; doors: bath x 1.36–2.22 and primary x 2.66–3.54 (in wall z 3.28–3.40), bedroom 2 x 2.71–3.57 (in wall z 5.12–5.24).

**Rooms (first-person viewpoint = `eye` → `look`)**

| Floor | Room | Zone (x0, z0, x1, z1) | Eye → look |
|---|---|---|---|
| G | Living | 0.28, 0.28, 6.52, 3.30 | (3.55, 3.20) → (3.20, 0.10) |
| G | Dining | 2.93, 3.30, 6.52, 5.30 | (3.25, 4.95) → (6.20, 3.60) |
| G | Kitchen | 2.93, 5.30, 6.52, 8.72 | (3.40, 5.70) → (5.60, 8.70) |
| G | WC | 1.54, 4.22, 2.81, 5.80 | (2.20, 6.35) → (2.25, 4.20) |
| G | Entry hall | 0.28, 5.92, 2.81, 8.72 | (2.25, 8.30) → (0.90, 5.40) |
| 1 | Primary bedroom 4.07 × 3.00 | 2.45, 0.28, 6.52, 3.28 | (3.05, 2.95) → (5.00, 0.60) |
| 1 | Bathroom 2.05 × 3.00 | 0.28, 0.28, 2.33, 3.28 | (1.80, 3.05) → (1.10, 0.40) |
| 1 | Bedroom 2 4.07 × 3.48 + nook | 2.45, 5.24, 6.52, 8.72 (+ nook 0.28, 7.46, 2.45, 8.72) | (3.15, 5.75) → (4.60, 8.70) |
| 1 | Landing | 1.44, 3.40, 6.52, 5.12 (+ corridor 1.44, 5.12, 2.33, 7.34) | (1.95, 6.90) → (2.60, 3.40) |

Eye height is 1.6 m above the floor. Every furniture position is in `site/index.html`, section 7, taken from the drawing.

**Assumptions (stated on the page):** ceiling heights, sill heights, lighting, and the sage shelving beside the dining table (it's in the reference render, not on the drawing).

**Discrepancy to raise with any real client:** the PDF's **kitchen reference render is mirrored** relative to the plan. The plan has the cabinets on the right-hand (x = 6.52) wall; the render shows them on the left. The build follows the plan.

---

## 5. Technical notes

- **Viewer:** three.js **0.169.0** via importmap from `cdn.jsdelivr.net` (allowed by the artifact CSP). Addons: OrbitControls, RoomEnvironment, RoundedBoxGeometry.
- **Artifact constraints (claude.ai artifacts):** images and media must be **data: / blob: URIs or the artifact's own files** (remote media URLs are blocked; fetch to other hosts is blocked). Publish with `publish_files`, giving each file a relative path (`assets/...`). **Generated fal media must therefore be downloaded and shipped as files in `site/assets/`.**
- **Lighting:** ACES tone mapping; RoomEnvironment PMREM (env 0.55 dollhouse, 0.62 walk); hemisphere light; sun with PCF soft shadows from the rear; **warm point lights on only in walk mode** (this fixed grey, flat interiors). Ceilings are down-facing planes, so they're invisible from the dollhouse and visible inside. Light fittings are hidden with the ceilings.
- **Walk logic:** circle-vs-box collision per floor (radius 0.22), sliding along walls. **Stairs state machine:** level 0 / 1 / `'s'`. You can enter the stairs only from the bottom (ground) or the top (first floor); height is interpolated along z. A safeguard stops anyone spawning stuck inside a collider. The room title updates once you've moved more than 0.4 m.
- **Test hooks** (`window.__app`): `enterRoom`, `toDollhouse`, `setFloor`, `teleport(x,z,level,yaw)`, `walk(code,on)`, `sim(seconds)` (fixed-step walking without rendering), `ortho(level)` (straight-down orthographic render for the overlay check).
- **Testing:** Playwright + Chromium with SwiftShader (`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`), routing the jsdelivr three.js URLs to a local `node_modules/three` (`npm i three@0.169.0`). Software rendering is slow, so wait on `__app.mode` instead of fixed timeouts. Scripts are in `tests/`; paths inside them point to the old workspace, so adjust them.
- **Verified:** stairs up (ground → first) and down; walls, cabinets and the stair void block correctly; no page errors; desktop and phone layouts. **Not yet verified on a real phone.**

### Review log (issues found by render review and fixed)
- The Dining jump landed in the Living zone, so its viewpoint was moved.
- An oversized kitchen pendant blocked the view, so it was removed.
- Interiors were too grey, then washed out, so warm interior lights were added and exposure tuned.
- On phones the panel covered the house, so the view was offset and the panel collapses.
- The SVG plan didn't size, so it was fixed.
- Ceiling lights blocked the beds from above, so they now hide with the ceilings.
- Landing was detected as Bedroom 2, so room zones were split.
- The WC view was too close, so it now looks in from the hall doorway.
- Cabinet shadow lines were too black, and the oven read as a black hole, so both were toned down.
- The houses opposite were too close to the kitchen window, so they were pushed back.
- On phones the joystick and hint overlapped other UI, so both were moved.

---

## 6. The AI step: blocked here, ready to run

**Blocker in the old environment:** the workspace proxy refused `v3b.fal.media` (403 on CONNECT), so stills couldn't be uploaded and results couldn't be downloaded. **Nothing was generated, and no credits were spent.** Fix: allow `fal.media` (and subdomains) in the environment's network settings, or work in an environment with open egress.

**Inputs ready (in `frames/`, 1344 × 768):**
- `kitchen3d.png`: the kitchen from the page's exact walk-mode viewpoint (FOV 60, eye (3.40, 5.70) → (5.60, 8.70)).
- `doll.png`: the ground-floor dollhouse view (first frame for the fly-in).
- `refkitchen.jpg`: the client's kitchen render (**use for materials only; it's mirrored**).

**Image step:** fal recommended **`google/nano-banana-2.1/edit`** (inputs: `image_urls` with up to 14 images, `prompt`, `aspect_ratio` "16:9", `resolution` "1K"/"2K"/"4K", `num_images`). Fallbacks: `fal-ai/nano-banana-pro/edit`, `bytedance/seedream/v5/pro/edit`, `openai/gpt-image-2.5/sunburst/edit`. Always copy endpoint IDs from `recommend_model`; don't guess them.

Draft prompt (image_urls = [kitchen3d, refkitchen]):
> Turn the first image, a 3D render, into a photorealistic interior photograph of the same kitchen. Keep the camera, perspective and the position and size of every element exactly as in the first image: the L-shaped run of base cabinets, the black induction hob on the left run, the stainless sink under the wide two-pane window, the floating oak shelf on the left wall, the window frame and the wall corners. Do not add, remove or move anything. Use the second image only as a guide to materials and mood: matte sage-green handleless cabinets, pale quartz worktops and upstand, wide-plank pale oak floor, warm white walls, charcoal window frame, soft natural daylight. Ignore the layout of the second image. Natural, high-end real-estate photograph.

**Check before using it** (a fresh critic, or a side-by-side and 50% overlay with `kitchen3d.png`): window position and size, sink under the window, hob position, cabinet run lengths and the corner, the shelf, wall corners, camera height and angle. If anything moved, regenerate with the failing item named in the prompt.

**Video step:** first/last-frame image-to-video (ask `recommend_model` with operation `image-to-video`, a first_frame and a last_frame; Seedance or Kling class). First frame = `doll.png`, last frame = the approved photoreal kitchen. Prompt idea:
> Smooth cinematic camera move: start on the elevated cutaway view of the house, glide down and forward through the open top into the kitchen, ending exactly on the final frame. Architecture and objects stay fixed; no new objects; steady, elegant motion.
Use the shortest duration available; the page can trim or speed it to roughly 1.5–2 s.

**Page integration (to do):**
1. Download the outputs into `site/assets/` (`kitchen-photo.jpg`, `fly-kitchen.mp4`, ideally H.264 at around 2–4 MB for phones).
2. Add an overlay layer: when Kitchen is chosen from the dollhouse, play the video full-screen (muted, `playsinline`), then hold on the photoreal still with a **"Walk around"** button.
3. "Walk around" crossfades (around 0.6 s) from the still to the live 3D view at the same viewpoint (the 3D camera already sits at that eye position).
4. Republish with `publish_files` (patch mode, same slug, `base_version` from `get_artifact`).

**Cost per plan:** roughly one image per room (more per upgrade option shown photoreal), one video per fly-in and one exterior hero shot. Check prices with `estimate_cost` before batch runs.

---

## 6b. AI step: done for the kitchen (17 Nov 2026, later session)

`fal.media` was reachable, so the kitchen loop has been run and shipped in **v2, version 2 of the artifact** (same link).

**Image**, `google/nano-banana-2.1/edit`, 2K, 16:9, inputs `[kitchen3d.png, refkitchen.jpg]`:
- Round 1 (`ai/kitchen-photo-v1.png`, git-ignored): good look, but the window sill was raised (bottom edge at 53% of frame height vs 59%) and the left run became drawers. Rejected.
- Round 2 (`ai/kitchen-photo-v2.png`): the prompt named both faults ("do not raise the sill or shrink the window"; "full-height doors ... not drawers"). It passes the checklist: window, sink, hob, cabinet runs and corner, shelf, wall corners, camera. `ai/check-v2.png` is the 50% overlay. Approved.
- Known residue: the model slightly **straightened the perspective** of the window head (about 20 px at the window's top-left on the 1344-px frame; nothing at worktop level). It added a quartz splashback under the shelf, and the light is cooler and more overcast than the reference.
- Shipped as `site/assets/kitchen-photo.jpg` (1920 × 1097, 185 KB).

**Video**, `alibaba/wan-3.0-prime/image-to-video` (first + last frame), 3 s, 1080p, no audio, at $0.045 per second, so about $0.14. fal recommended LTX 2.5 Pro, but its pricing unit wasn't stated, so Wan, also on fal's published pick list, was used for its clear price. Its minimum is 2 s, so no trimming was needed.
- The output follows the path dollhouse → glide over dining → kitchen; frames are in `ai/video-strip.png`. The last frame differs from the still by a mean of 4.6/255.
- Re-encoded to H.264 at 1280 × 720, no audio, faststart: `site/assets/fly-kitchen.mp4` (0.87 MB). The page plays it at 1.5×, so about 2 s.

**Page** (`site/index.html`):
- `CINE` map (per room: video, still, render FOV and aspect, rate, required cabinet option) plus an `#cine` overlay.
- Entering Kitchen **from the dollhouse with Sage selected** plays the video, holds on the still, then shows "Walk around" (0.6 s crossfade to the live 3D view) or "← Plan". There is a Skip button during the video. If autoplay is blocked or the video errors, it falls straight to the still.
- The still is sized to the live camera: box height = `innerHeight · tan(30°) / tan(fov/2)`, where fov is 60 on desktop and 70 in portrait. The view therefore registers on any screen; spare area is filled with a blurred copy.
- Charcoal or Oak cabinets skip the overlay, because the photo is sage.
- Test hook: `__app.cine` → `{open, still}`.

**Tested** (`tests/cine.js`, Node Playwright + SwiftShader, three.js routed to a local copy): desktop 1344 × 768 and phone 390 × 844. The video plays (H.264 works in this Chromium). Still → walk registration is in `checks/desk-sheet.png` and `checks/phone-sheet.png`. The Charcoal option skips the overlay. No page errors. **Not tested on a real phone yet.**

**Spend so far:** 2 edit images + 1 video.

**Next:** roll the same loop out to the other rooms (render each room's walk-mode frame at FOV 60 and 1344 × 768, then repeat). Consider adding "keep the converging perspective of the window head exactly as in image 1; do not straighten lines" to the image prompt. Option: generate per-option stills (charcoal and oak kitchens) so the overlay works for every upgrade.

---

## 7. Open items and next steps

1. **Run the kitchen AI loop** (section 6), judge it, and if it works, roll it out to every room.
2. **Baked lighting** (Blender + Cycles, bake to lightmaps, export glTF) is the biggest realism upgrade for walk mode. Blender wasn't available in the old workspace.
3. **Real-phone test** of v2 (performance, joystick, video playback).
4. **Lead capture:** form plus a record of which rooms and options the buyer explored (the Fable prompt's idea). Needs a state or storage capability to be useful.
5. **Productise the trace step:** the pdfplumber extraction works for **vector** PDFs (this one). Raster plans will need a different route (vision-assisted tracing plus the overlay check).
6. **Outreach** (Fable prompt): the lead sheet and draft emails need human approval before anything is sent. Only plain requests to public pages; never work around bot checks.

---

## 8. Files in this bundle

```
HANDOFF.md                     ← this document
site/index.html                ← v2 walkthrough page (three.js, single file)
site/assets/plan-g.png, plan-f.png        ← drawing crops for the overlay check
site/assets/ref-*.jpg          ← reference render thumbnails (living, kitchen, wc, primary, bed2, bath)
frames/kitchen3d.png, doll.png ← inputs for the AI step
frames/refkitchen.jpg          ← full-size client kitchen render (materials reference)
checks/overlay.png             ← drawing vs top-down render vs 50% overlay, both floors
source/Modern_Two_Bedroom_House_Plans.pdf ← the original plan PDF
v1/index.html                  ← v1 Copthorne proof of concept (superseded)
tests/                         ← Playwright scripts (update paths for the new environment)
```

## 9. Prompt to start the next session

> Read HANDOFF.md in the attached bundle. Continue from section 6: upload `frames/kitchen3d.png` and `frames/refkitchen.jpg` to fal, run the kitchen image step with the recommended edit model, check the result against the 3D frame, then make the dollhouse→kitchen fly-in video, add both to `site/` as described, test it, and republish to the existing artifact (https://claude.ai/artifact/U6ED8ZMJjQGoEESm599QqR), or publish a new one if it isn't reachable from there. Check cost before the video step.

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

## 6c. Photoreal 360° panoramas for every room (drag to look around)

A single still can't pan, so photoreal mode is now **a cylindrical 360° panorama per room**, centred on the room's start view with a level horizon. You can drag to look around. **Walk around** crossfades into the 3D walk view at the current heading, and the **Photoreal 360°** button in walk mode goes back.

**Pipeline, per room** (all scripts are in `tests/`):
1. `node pano3d.js shoot <out> <ids…>`: renders the 3D panorama, 4032 × 1728 (21:9), with `__app.panoShot()`. It stitches 72 slices of 5° each, giving a cylinder accurate to under 1 px. It also captures `doll-g.png` and `doll-f.png`, the dollhouse start frames.
2. Restyle with `google/nano-banana-2.1/edit`, 4K, aspect 21:9. Inputs: [3D pano, client reference render(s)]. The prompt starts with "STRICT GEOMETRY … must overlay it exactly, edge for edge", lists what to keep, says the left and right edges must join, and says "Add nothing".
3. `panoproc.sh <url> <id> <work>`: fits the result to 4032 × 1728, writes the red 3D-edges overlay and the seam strip, and runs a drift check. **Critic gate:** reject if anything is added, moved or resized, then regenerate with the fault named.
4. Seam repair if needed: `panoroll.py roll` puts the seam in the centre. Edit that with [rolled photo, rolled 3D template] and the prompt "repair only a narrow centre band". `panoroll.py merge` then blends back only a feathered 16% band, so no other pixel changes.
5. `node pano3d.js endframes <out> id=assets/pano-id.jpg …`: renders the pano's start view at FOV 60, 1344 × 768. That is the fly-in's last frame.
6. Fly-in video: `alibaba/wan-3.0-prime/image-to-video`, 3 s, 1080p, no audio. Start = `doll-g` or `doll-f`, end = that end frame. `vidproc.sh` encodes it to 720p H.264, makes a 6-frame strip, and diffs the last frame against the end frame.

**Viewer:** a full-screen shader reprojects the pano for the live camera, using its projection inverse and rotation; `pScene`/`pMat` in `index.html`. Checked against the un-restyled 3D pano at four headings: mean difference under 2/255, so the viewer, the 3D view and the crossfade register exactly. Pitch is clamped to the pano's vertical coverage, about ±53° minus half the FOV. Kitchen, dining and living show photoreal only with **Sage** cabinets, because the photos show sage.

**Results (17 Nov):** all 9 rooms passed.
- Kitchen: the pilot needed a seam repair (the model had invented a hallway opening).
- Living: needed round 2. Round 1 added a window, shifted the sofa and table, and turned the tub chair into a wingback.
- Everything else passed in round 1.
- Small additions accepted: a few recessed downlights, two small plants beside the living-room sofa, and a framed picture that flashes up mid-move in the hall fly-in.
- Videos: the kitchen fly-in shows a fridge for a moment mid-move.

**Spend this session:** 13 4K edit images (9 rooms, 1 kitchen pilot seam fix, 1 living retry, plus the 2 earlier stills) and 10 videos at about $0.14 each. The edit model's per-image price wasn't exposed by the pricing API; Nano Banana-class 4K is roughly $0.30.

**Known limits:**
- Software rendering here is slow: about 1 fps for 3D, so tests use long timeouts. A real GPU is fine.
- The 4032-px pano is a little soft on large desktop screens. 6336-px masters are available from fal if needed, but they are wider than some phones' maximum texture size of 4096.
- End-to-end tested (`tests/cine.js`): desktop kitchen and phone (390 × 844) bedroom 2. Video → pano → drag → Walk around (heading kept) → Photoreal 360° → Plan all pass, the Charcoal gate works and there are no page errors. Screens are in `checks/e2e-*.jpg`. Published as **artifact version 3** at the same link. Not yet tested on a real phone.

---

## 6d. Visual fidelity upgrade: the 3D model as an architectural-visualisation walkthrough (18 Nov)

**Plan data is untouched:** walls, openings, room rects, stairs, floor levels, every furniture footprint and every collider. Builders fill the traced boxes. The overlay check (`checks/overlay-after.png`) and `tests/verify.js` confirm walls, stairs and collisions. three@0.169.0 from the same CDN. All textures are drawn in code (seeded, so every load is identical).

**Lighting**
- Neutral tone mapping, replacing ACES.
- Per-room auto-exposure: `EXPO_ROOM` targets inside the house, 0.95 outdoors and in the dollhouse. Exposure, environment and hemisphere intensity ease as you move.
- Procedural sky shader (gradient, fbm clouds, sun glow, HDR sun disc). It is both the visible background (a sphere that follows the camera) and `scene.environment` via PMREM.
- Sun shadows: 4096 maps (2048 on phones), PCFSoft, frustum fitted to the house, terrace and garden. `shadowMap.autoUpdate = false`, re-rendered only when the first floor lifts, ceilings toggle, or on load.
- **Baked AO + sky bounce**: a Web Worker (Blob URL; main-thread fallback) builds a BVH over about 165k triangles and casts 20 cosine-weighted rays per unique receiver vertex. Short rays give occlusion; escaping rays give sky light through windows, which is warmer and brighter near glazing. The result is written into vertex colours of the architecture, cabinets and wardrobes, and fades in (`uBake` uniform injected with `onBeforeCompile`). Walls, floors and ceilings are tessellated (0.2–0.3 m grid) so there are vertices to bake into. It took about 18 s in this software-rendered container; faster on a real CPU.
- Fixtures: emissive downlight discs on a grid in every room ceiling, glowing lamp and pendant shades, and an LED strip under the kitchen shelf.

**Post-processing** (desktop only; **HD on/off** button top right):
- `EffectComposer` → GTAO (radius 0.4 m, half resolution, denoised; glass, sky and small light fittings excluded) → UnrealBloom (threshold = 2 / exposure) → OutputPass → vignette and film grain.
- Watchdog: if HD drops below 30 fps for 2 s, it switches to fast mode and shows a toast.
- Pixel ratio is capped at 1.75 (HD) and 1.2 (fast).
- The planar floor reflection (optional) was **not** done.

**Materials:**
- Oak: 2048 plank texture with a seam normal map; MeshPhysical with clearcoat.
- Brick: buff stretcher bond, 215 × 65 mm with 10 mm recessed joints and a normal map.
- Also 600 mm floor tile, bath wall tile, sage splashback, quartz with veining, a fabric-weave normal shared by all upholstery, jute, paving, grass, a leaf texture, a leafy hedge normal map, joinery oak, door timber, and abstract art canvases.
- World-space planar UVs on every textured surface (by face normal, divided by the texture's real size).

**Detail:**
- Skirting generated from the wall data on every interior face, clipped at the stair void.
- Linings plus casings on both faces of every doorway.
- Window boards inside, sills outside, glazing beads, thresholds.
- Lever handles on both sides of every door leaf.
- Stairs with nosings, painted risers, rounded handrails and newels.

**Furniture builders** (`framed()` local frame):
- **Sofa / armchair:** plinth, arms, per-seat cushions, leaning backs, angled pillows, legs.
- **Bed:** channel-tufted or oak headboard, folded-back duvet, pillows, throw.
- **Dining:** chairs with tapered legs, oval extruded table tops with bevels and pedestals.
- **Kitchen:** carcass, toe kick, door and drawer fronts with bar pulls, inset sink, swan-neck tap, hob rings, oven housing.
- **Bathroom:** lathe toilets and basins, hollow bath, screen and fittings.
- **Storage:** shaker wardrobes.
- **Decor:** books, vases, bowls, fruit, art, lamps.
- **Plants and site:** leaf-cloud plants and trees (alpha-tested double-sided leaf quads), grass tufts, leafy hedges.
- **Wall snapping:** `snapBox()` closes gaps of 3 cm or less to a wall face, logged in `__app.snaps`. With this drawing nothing needed moving (`[]`).

**Performance:** everything is merged per (material, shadow casting, ceiling, bake): 1,148 meshes became 109. That gives 64–67 draw calls per view and about 115–135k triangles.

**Not done or changed from the brief:**
- No wall units in the kitchen, because the drawing has none. The LED strip went under the existing floating shelf instead.
- No planar reflections.
- Frame rate not measured on real hardware (this container has software rendering only).
- The photoreal panoramas and fly-in videos were generated from the old renders. They still register geometrically, but the styling differs slightly at the crossfade, so regenerate them if wanted.

**Published:** artifact version 4 (same link). **Tests:**
- `tests/views.js`: before/after screenshots, in `checks/before-after.jpg`.
- `tests/verify.js`: hotspots, drawing-check modal, reference render, kitchen colours, collisions, stairs up and down, console errors, and the top-down renders for the overlay.
- `tests/cine.js`: photoreal mode end to end.

---

## 6e. Editable model, minimap, guided tour, HD toggle, "Change something" (18 Nov, later session)

**Editable model (section 8 of `site/index.html`).** Furniture, decor and finishes are one JSON document, `ORIGINAL_MODEL`:
`{ units, levels, walls, doorLeaves, rooms, stairs, finishes, furniture }`. Each furniture entry is
`{ id, type, level, room, x, z, w, d, h?, facing N|S|E|W, color?, material?, ...type-specific }`, where x/z is the centre of the
footprint and `facing` is where its front points (N = garden, -z). There is one builder per type in `BUILDERS`. `finishes` holds
wall paint, ceiling, floors per room, kitchen cabinets (the sage/charcoal/oak switch writes here), brick, roof and window frames.
- Walls, ceilings, stairs and site are built and merged once (`archMerged`, `archColliders`).
- `rebuild(model)` disposes the previous floors, downlights and furniture, builds them again, merges them per material and re-bakes AO in the worker. Stale bakes are dropped by generation.
- Before/after check: `checks/model-before-after.jpg`. At most 3.6 % of pixels differ.
- The one intended change is the living-room slider. It is now drawn with the right pane slid open behind the left, so you can walk out to the terrace.
- Ground-floor walking now covers the whole garden plot. Trees and the front hedge have colliders.

**Minimap** (bottom-left 300 px; on phones, top-right 160 px).
- Drawn from the plan and the model: rooms, walls at true thickness, glazing in blue, and footprints of the larger furniture.
- The background is cached in an offscreen canvas, keyed by floor, size and model version. The overlay redraws only when its state key changes.
- The current room is tinted orange. Hover shows "Go to" with the room's size.
- Click walks you there: nearest clear point in the room, then turn to face the room centre. M or ⤢ enlarges the map and adds room names.

**Routes and the tour.**
- A 0.1 m occupancy grid per floor, made with `hitBoxR` (R + 5 cm clearance). A* links the floors through the stairs.
- Each doorway crossing keeps three A* points: before, through and after. The rest is string-pulled into a centripetal CatmullRom at eye height.
- Route samples are checked against the colliders. Any hit adds the A* points around it, then the route is checked again.
- Tour: hall → living → dining → kitchen → WC → landing → primary → bath → bed 2 → terrace. Moves at 1.25 m/s with a lagged turn, slight sway and a 2.4 s hold at each stop.
- The tour button and T start it; Space pauses. Any drag, click or key ends it.
- `ROOM_GRAPH` lists doorways, the slider, open-plan boundaries and the stairs.

**HD.**
- Defaults: on for desktops with 6 or more cores, off on touch devices.
- HD on: GTAO, bloom, vignette and grain, a 4096 shadow map and pixel ratio up to 1.75.
- Fast mode: plain render, a 2048 shadow map and pixel ratio up to 1.2.
- Automatic fallback, once: if HD averages over 42 ms per frame across 90 frames after the bake, the page switches to fast mode. It never switches after the user has chosen.

**Change something** (side panel; the Change button opens it in walk mode).
- Calls Claude through the artifact `sample` capability: `claude.use('sample')`, published with `capabilities:{sample:{images:true}}`.
- The prompt is the agreed wording plus the compact model (about 30 KB).
- Before applying a reply, the page strips code fences, parses the JSON and takes out `changes`. It rejects the reply if any of these changed: walls, doorLeaves, rooms, stairs or levels. It also rejects unknown types and missing or non-finite numbers.
- A new or moved item is clamped inside its room. An item that can't fit is dropped, with a note.
- Undo history holds 30 changes. The model and its history are saved in localStorage (`house-walkthrough-model-v1`). Reset restores the original design.
- Photoreal 360° and fly-ins only show while that floor's furniture and the finishes match the rendered originals.
- Outside the Claude app or claude.ai, the panel shows "Open this page in the Claude app or on claude.ai to make changes".

**Tests.**
- `tests/features.js` checks the minimap in every room, outside and on the stairs, and the slider. It runs the full tour and checks for clipping. It also covers HD on/off, the change pipeline with mocked Claude replies (all five example requests, malformed replies, cancel, undo, reload, reset) and phone layout.
- `tests/views.js` takes `PAGE=` to compare against an older copy of the page.

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

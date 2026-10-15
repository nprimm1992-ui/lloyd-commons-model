# Phase 1 finish-up plan (fork continuation)

State found: tiers, CC0 texture streaming, facade detail, Photo mode, quality badge, loading chip and the Gaussian-splat loader + "no capture yet" placeholder toggle are already in the code. Remaining work is visual alignment, polish and verification.

## Step 1: Baseline (verify the build still works)
- `python build_viewer.py` and `python tools/check_invariants.py` (collision gate PASS, 18-floor cap, 64.5 m depth).
- `tools/shot.py` captures of `refaerial` and `plazaref`, next to `references/renders/aerial.jpg` / `plaza.jpg`.
- Test: the build runs with no errors, the invariants pass, and both shots render with no page errors.

## Step 2: Lighting and atmosphere match (aerial)
- Set the golden-hour default sun (doy/hour), sun and hemisphere intensities, fog density and colour, and sky warmth so the haze deepens with distance as in ref_04.
- Test: shot vs aerial.jpg side by side. Check the shadow direction, the warmth and the distance haze.

## Step 3: Material and colour pass, building by building
- Precast warm grey (not white), brick red/brown, bronze fins, dark glass, timber venue, copper canopy, dark parapets and solar arrays. Tune tints and texture repeats in commons.js.
- Test: refaerial + plazaref shots compared with the references.

## Step 4: Plaza-level polish
- Fountain, umbrellas, benches, trees and people density, and the warm shopfront glow at plazaref.
- Test: plazaref shot.

## Step 5: UI polish
- Tour, explore, walk and compare transitions, the quality badge menu, the loading chip, the photo darkroom overlay and the splat placeholder status.
- Test: testing_agent frontend run on /model/index.html (all data-testids).

## Step 6: Clean-up and documentation
- Consolidate the lighting and material constants, and update docs/CONTEXT.md and /app/memory/PRD.md.

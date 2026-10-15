# Living context: Lloyd Commons model

## Coordinates
- Site axes: **x = east, y = north**, in metres, local frame. Three.js mapping: `W(x,y,h) = Vector3(x, h, -y)`, so north points to -Z.
- Building records: `fp` (footprint), `inset` (roof inset), `z0` (base height), `h` (**absolute top height**), `fl` (floors), `mat`, `roof`, `kind`, `prog` (resi / office / retail split).
- Floor-to-floor height is 3.3 m. Ground floors with `base=True` are 5 m.
- OpenStreetMap to scene affine fit: see `osm_fit.json` (rms 0.12 m).

## Fixed street lines (mapped OSM data; do not move)
Halsey y≈781 · Multnomah y≈543 · 9th x≈633 · 10th x≈712 · 13th x≈949 · 14th x≈1030.

## Hard invariants (enforced by asserts in gen_layout.py)
- Collision gate: no overlap between any ground footprints.
- Height cap: `REF_CAP_FL = 18` floors.
- North assemblies are at most **64.5 m** deep (`NORTH_TARGET_DEPTH`).
- Routes:
  - Commons route `[[633.4,677],[1093,677]]`, 6 m wide: one straight spine.
  - Multnomah connector `SE_ROUTE [[1093,541.6],[1093,677]]`, 7 m wide: meets the spine at a T-junction.
  - 10th lane `[[712.4,677],[712.4,781.13]]`, 9 m; Pyramid lane `[[950,677],[950,779.97]]`, 9 m; keep strip x 737.5–746.5.
  - Route ∩ buildings = 0.
- North parcels: at least 3.5 m of sidewalk to the Commons route (south face y ≥ 683.9); at least 4 m from the core.
- Pyramid Court Building:
  - Angled diamond attached to the hall's NE chamfer by a 14 m glass connector.
  - `PYR_TILT=-8°`, `PYR_BACK=(4,0)`, standoff 2.5–9 m, north tip ≤ 673.
  - It is the only building attached to the core on the north side.
- The six park-side bases stay attached, except the entrance slot (x 867, w 8). No internal rear road.
- Road paint comes from OSM lane tags only. No paint on concept routes or on the curved perimeter road.

## Core geometry
- Hall octagon: (869,587) (921,587) (931,597) (931,641) (921,651) (869,651) (859,641) (859,597).
- Vaults `[[714,859,627],[931,1076,611]]`. `POD_H = 14`.
- Reference camera `refaerial`: pos [518.6,568.7,166.0], tgt [827.3,635.7,0], fov 45.6.

## Design directives (from the client, newest first)
1. North perimeter blocks should match the fidelity of the reference images.
2. Focus only on the megablock: off-site infill is disabled (`CTX_INFILL = []`).
3. Bring back the street network visuals, but correct: paint driven by OSM lane tags.
4. Pyramid Court: keep the angled diamond, built onto the side of the core; set back and tilted away from it.
5. Copy the reference directly; 18-floor cap; north depth cap of 64.5 m.

## North perimeter redesign (latest)
The block `# NORTH PERIMETER REDESIGN` in `gen_layout.py`, the `_nstack()` helper, and records flagged `north_ref=True`. It contains 11 buildings in 5 groups:
- Halsey Bronze Tower (18 floors) with its Halsey wing.
- Tenth Avenue Brick Slab.
- Halsey Precast Tower, Commons Garden Bar, Halsey Brick Courts.
- Commons Brick Tower, Commons Low Bar, Halsey Glass Bar.
- NE Terrace Block, NE Bronze Tower (18 floors), Halsey East Courts.

Facade materials in `commons.js`: `refBronze` (dark glass with bronze fins), `refBrick`, `refPrecast`, `refSand`.

## Fix log
- Parkside southeast broad slab floated at 16.5 m over 226 m² of empty ground and a 1.6 m gap above its 14.9 m base. Now:
  - a matching 4-floor north bay fills the void;
  - the slab sits at 14.9 m;
  - a 0.9 m transfer deck bridges the core band roof (14.0 m).
  - Found by `tools/check_invariants.py`.

## Open issues
- **Density:** the redesign raised FAR from 2.59 to 3.28 (3.29 after the SE fix) and units from 1,530 to 2,040. Trim option: about 3 floors off the Halsey courtyard blocks and 2 off the Commons Garden Bar.
- Building positions in the middle of the north row (x 820–900) are judged by eye against ref_04. Check them with `make overlay`.
- Facades: bronze fins need real geometric depth (about 3 m fins, not a texture). Precast reads too white; the reference is warm grey.
- Roofs: caps are flat white. The reference has thin dark parapets and edge-to-edge solar panels.
- The dark venue roof material (0x3f4347) does not show in renders.
- 11th Ave needs 11.7 m; the model has 11 m.
- Phase 3 (hall roof shape) and the venue massing rebuild are deferred.

## Working method
- After any geometry change: run `make layout`, which must print `collision gate: PASS`. Then run `make view-refaerial` and compare with `references/site_ref/ref_04.jpg`.
- Trust the numeric checks over visual impressions; vision models misread these renders.
- Do not keep `*_before_*.py` backups in the repo. Use git branches or commits instead.

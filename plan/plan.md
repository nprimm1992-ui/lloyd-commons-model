# Lloyd Commons: Photoreal Refinement of the 3D Model

This is a large refinement pass on the existing Lloyd Commons model page at lloydcommons.org/model. The aim is for the buildings, landscape and light to read as close to the client renderings as a live browser model allows. A new Photo mode produces near-photographic stills.

The live model should match the aerial and plaza renderings in massing, materials, detail and atmosphere. It must stay usable on ordinary office PCs and modern phones.

## Realistic expectation (agreed basis)
- **Live model:**
  - From the aerial angle it can get very close to the renderings: high-end architectural-visualisation quality.
  - At street and plaza level it will look like a very well-made 3D model, not a photograph. The renderings are single painted images, while the live model redraws every frame.
- **Photo mode:** this is the route past that limit. The browser spends extra time (seconds on a strong PC, longer on an office PC) refining one still with physically based light, soft shadows and reflections, which gets close to photographic.
- **Gaussian splats:** they only apply to things that physically exist and can be captured, such as the surrounding Lloyd District. The proposed buildings have to be modelled.

## Who it's for
- **Public visitors:** residents, consultation participants and press, on office PCs, laptops and phones.
- **Stakeholders and investors:** they need convincing views and high-quality stills for decks.
- **The design team:** the generator and its rule checks stay the source of truth for massing.

## Core features and experience
1. **Automatic quality tiers.** The page picks a tier based on the device, and the visitor can override it.
   - **Ultra (powerful desktop):** full shadows, ambient occlusion, reflections, the densest foliage, and all facade and street detail.
   - **High (normal office PC):** the same look with lighter shadows and effects. It must stay smooth.
   - **Mobile (modern phones and tablets):** simplified detail, fewer trees and people, lower resolution. Same materials and colours.
2. **Photographic materials.** Real scanned textures with surface relief and the right shine:
   - red and brown brick with mortar;
   - warm-grey and beige precast concrete;
   - vertical warm-timber boards (the venue);
   - charcoal metal panel, bronze metal, copper canopy;
   - dark tinted curtain-wall glass;
   - paving, terracotta brick bands, asphalt with wear, lawn, sedum and meadow roofs.

   They load in stages: the model appears fast with simple materials, then sharpens as the photo textures arrive. The total page stays under about 30–40 MB.
3. **Real 3D facade detail** in place of painted-on windows:
   - recessed windows with frames, mullions and sills;
   - floor slab edges;
   - bronze fins and brick piers with real depth;
   - balconies with railings and planters on the precast farm block;
   - glazed shopfront ground floors with warm interior light;
   - thin dark parapets, rooftop plant, and edge-to-edge solar arrays.

   Detail is simplified with distance so it stays fast.
4. **Building-by-building match to the renderings.** Each named building is checked against the aerial and plaza renderings for material, colour, window pattern and roof treatment.
   - The venue gets a charcoal box, stacked timber volumes, a glazed base, a café terrace and a copper canopy.
   - The precast farm block gets planted balcony boxes and a rooftop farm under a pergola grid.
   - The dark curtain-wall towers get brick and bronze piers.
   - The glazed barrel vaults get a visible rib and lattice rhythm.
   - The low faceted octagonal hall roof is refined, never turned into a pyramid.
5. **Landscape realism:**
   - full, layered tree canopies built from leaf clusters, in natural summer greens, with street trees lining the east road;
   - shrubs and planting beds, and meadow-style green roofs with tufts and variation;
   - people shown as figures rather than tokens, at a believable density;
   - a fountain with moving water and jets;
   - café umbrellas, benches, bike racks and lamp posts as in the plaza rendering.
6. **Atmosphere and light:**
   - a golden-hour sky and haze that deepen with distance, as in the aerial;
   - soft sun shadows, ambient occlusion and subtle glow on bright glass;
   - a gentle colour grade matched to the renderings, and a tilt-shift depth-of-field option for aerial stills.
7. **Photo mode.** A shutter button freezes the current view and progressively refines it to a near-photoreal still. It shows a progress bar, can be cancelled, and downloads at up to 4K. On phones it renders at a lower resolution.
8. **Realistic Lloyd District context.**
   - Neighbouring buildings get proper facades, roofs and rooftop plant by height class.
   - Streets get markings, curbs and parked cars.
   - Gaussian-splat support remains ready for a future photoreal capture.
9. **Kept from the current draft and polished:**
   - hero orbit, guided tour (seven chapters), free explore and walking the Commons spine;
   - Compare mode (fade and swipe against the aerial, plaza and site plan);
   - building info cards, metrics, the sun and shadow slider, share links and still capture.

## User flow
1. The visitor lands on a slow golden-hour aerial orbit. The model appears within seconds and sharpens as materials stream in.
2. They choose "Start the tour" or "Explore freely".
3. In Explore they orbit, click buildings, open the numbers, drag the sun or walk the spine.
4. Compare shows any rendering against the live model at the same angle.
5. Photo mode turns any view into a near-photoreal still to download. Share copies a link to the exact view.

## UI/UX feel
- The editorial architecture-studio look of the current draft stays: minimal translucent panels, serif display type, and a palette of charcoal, timber, terracotta, precast and bronze.
- A small quality badge (Ultra / High / Mobile) can be changed by hand.
- A material-loading indicator appears only while textures stream in.
- Photo mode has a calm darkroom-style overlay with a progress ring.

## Implementation phases
**Phase 1 — MVP (built now)**
- Quality tiers with automatic device detection, so it is smooth on office PCs and modern phones.
- Photographic material library with staged loading.
- 3D facade detail for all megablock buildings, with a building-by-building pass against the aerial and plaza renderings.
- Landscape, people, fountain, atmosphere and colour-grade upgrade.
- Photo mode for near-photoreal stills.
- Realistic context buildings and streets.
- The existing tour, explore, walk, compare, info, metrics, sun, share and capture features are polished and kept working.
- Generator rules and invariant checks still pass. The page still drops into `/model` as static files.

**Phase 2 — Interiors and real-world capture**
- Walk-in hall interior (ice rink, curved balconies, glulam arches, hanging sign, shopfronts) matching the hall and rink renderings.
- Walk-in galleria interior.
- Photoreal Lloyd District context from a drone or phone Gaussian-splat capture, or Google Photorealistic 3D Tiles (this needs a Google Maps API key).
- Compare mode for the interior renderings.

**Phase 3 — Public engagement**
- Community feedback pins with moderation.
- Scenario toggles, such as the density trim option.
- Multilingual narration and accessibility (keyboard tour, captions).

## Assumptions
- **Photo-mode timing:** stills take seconds on a strong desktop and up to a minute or so on an office PC. A lower-resolution version runs on phones.
- **Textures:** they come from free, openly licensed scanned material libraries (CC0, such as ambientCG / Poly Haven), compressed and kept within the 30–40 MB budget. Credits are listed in the page footer.
- **Rendering precedence:** when the renderings and the repo layout disagree on materials, landscape or detail, the renderings win. On building position, height and street lines, the repo rules win: fixed street lines, the 18-floor cap, the 64.5 m north depth and route clearances.
- **People:** figures are simple, stylised human shapes, not photographic cut-outs. They read correctly from the aerial and plaza views without heavy downloads.
- **Updating the 3D engine:** the underlying engine may be updated to a newer version to enable Photo mode and better lighting. This is invisible to visitors.
- **Testing:** visual checks are done at reduced frequency, because the test environment has no graphics card. The page is tuned for real GPUs.
- **Unchanged from before:** tour text comes only from the two source PDFs, metrics come from the generated layout (FAR 3.29, ≈2,040 homes), and the page is public, read-only and has no login.

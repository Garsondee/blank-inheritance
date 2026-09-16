# Map Generation — real-data city, procedurally editable

The campaign map: a real Japanese city, taken as **input data rather than as an
answer**, then rotated, renamed, fictionalised, extended with sci-fi structures,
and scarred by the campaign as it goes. Delivered as a 3×3 grid of 8K tiles the
players can zoom into.

This supersedes the fully-procedural city design that preceded it. Stages 1–2 of
that work (erosion, transgression, amplification) are still in the repo and
partly still useful — §9 is the honest accounting of what survives.

Provenance and decision history:
[`ideas/entries/procedural-city-map-generator.json`](../ideas/entries/procedural-city-map-generator.json).

**Confidence markers are literal.** **Measured** = benchmarked on this machine.
**Verified** = read out of a primary source. **Proposed** = a design decision not
yet validated.

---

## 1. The two constraints that shape everything

**Generation happens in a separate offline app, not in Foundry.** Foundry only
ever receives finished images plus a scene manifest. Nothing generates or mutates
during a session.

**The map changes only between sessions.** Fighting is logged as it happens; the
map is updated afterwards.

Together these remove essentially every runtime constraint. Generation may take
an hour. Any language, any library. The only thing that must stay fast is
**line-of-sight queries** at the table.

---

## 2. What is already proven

A spike (2026-08-23) took real Kobe waterfront data end to end: fetched from OSM
Overpass, projected to JGD2011 / Japan Plane Rectangular CS zone VI (EPSG:6674),
clipped, rotated 31°, rendered in our own style at 1.64 m/px, then damaged.

**Measured:** 6,958 buildings, full road hierarchy, rail, water, port, 84 street
lamps over ~8 km². A crater applied as a boolean subtract destroyed 22 buildings,
clipped 14 more where it caught their edge, and produced **18 severed road ends**
— detected by asking the road graph, not by any bespoke system.

Three things that settled:

- **The edit model works on real data.** Damage is geometry, not paint.
- **Roads import as a topological graph**, so barricades, diversions and new-road
  synthesis are graph queries rather than features to invent.
- **Street lamps are just in the data** (`highway=street_lamp`), and map onto
  Foundry `AmbientLight` documents.

Toolchain verified here: Python 3.11.3, `shapely` 2.1.2, `pyproj` 3.7.2, network
access to Overpass, pip wheels installing at 27 MB/s.

---

## 3. Data sources

| source | gives | licence |
|---|---|---|
| **OpenStreetMap** (Geofabrik regional PBF) | road graph with classes, rail, tram, waterways, landuse, POIs, street lamps, building footprints | ODbL 1.0 |
| **Project PLATEAU** (MLIT) | surveyed building heights, storey counts, **building usage**, **legal zoning (用途地域)** via CityGML i-UR; also ships GeoJSON/Shapefile/MVT | CC BY 4.0 |
| **GSI 基盤地図情報** | 5 m airborne-LiDAR DEM (DEM5A/5B), 10 m fallback (DEM10B) | GSI terms, attribution |

Verified: PLATEAU covers 250+ cities under CC BY 4.0 via the G-Spatial
Information Center, carrying semantic attributes including usage, year of
construction and urban-planning data.

> **Correction, 2026-09-11 — PLATEAU does not cover Kobe, so none of the
> above applies to this map.** Checked three independent ways: the full
> G-Spatial CKAN package list (17,296 packages, 525 `plateau-*`, none
> containing `28100` or `kobe`), direct `package_show` probes for every
> plausible year (all 404), and MLIT's own city index, where Hyōgo's covered
> cities are Himeji, Kakogawa, Miki, Asago and Tatsuno. The neighbours this
> frame clips (Akashi, Nishinomiya, Ashiya, Amagasaki) are absent too. There
> is no data year to wait for. The "250+ cities" figure above is true in
> general and simply does not reach this city — a good reminder that national
> coverage claims need checking against the specific tile you need.
>
> What replaced it, both now built (`tools/city-map/citymap/external.py`):
> **legal zoning** comes from 国土数値情報 A29 instead (a 10 MB zip, GeoJSON
> per municipality, carrying 用途地域 name plus 建蔽率 and 容積率), and
> **evacuation sites** from GSI's 指定緊急避難場所 GeoJSON. Still unbuilt but
> verified as the right source for **building heights**: Hyōgo's own
> prefecture-wide 1 m LiDAR DSM/DEM (CC BY 4.0) — nDSM = DSM − DEM gives a
> real height for ~71% of buildings, against the 0.08% of OSM buildings here
> that carry a `height` tag at all. GSI's own documentation notes **NoData
areas exist mainly in lakes and coastal areas** — the sea floor is precisely
where real data has a hole, which is where the existing procedural bathymetry
earns its place (§9).

**Attribution is a real obligation** for all three. ODbL's share-alike binds only
if a derived *database* is redistributed; rendered images are a "Produced Work"
needing attribution only. This project is private and non-commercial, which keeps
it simple — the attribution goes in the map cartouche regardless.

**Area.** The spike used Overpass, fine for a few km². The real extent — ~20 km,
city plus surrounding towns plus coast — needs a **Geofabrik regional PBF**
clipped locally; Overpass will not serve that politely.

---

## 4. Pipeline

```
  A  ACQUIRE      Geofabrik PBF + GSI DEM + PLATEAU, cached in a gitignored tree
  B  NORMALISE    one CRS, one rotation, stable IDs, real names stripped
  C  GRAMMAR      measure the city's own statistics   <-- the key idea, §5
  D  NAME         invent our toponymy from the real structure
  E  OPERATE      the edit log + consistency engine, §6
  F  RENDER       SVG per tile -> raster, §7
  G  EXPORT       3x3 tiles + Foundry scene manifest
  H  DERIVE       DSM -> line of sight; zones -> biomes and cover
```

### Stage B is where the fiction starts

Rotation by an arbitrary angle, translation into our own world frame, and **every
real name stripped**. From that point nothing downstream knows or cares that the
data was ever real.

**Stable IDs are load-bearing.** Every feature gets a deterministic id derived
from its source and geometry, never a counter and never OSM's own id. The
operation log references those ids for the life of the campaign, so a re-import
must reproduce them or every recorded scar detaches from what it damaged.

**IDs are assigned in source CRS, before rotation** (implementation note added
2026-08-24, `tools/city-map/citymap/ids.py`). Deriving an id from post-rotation
geometry would satisfy the letter of "stable" and still break it in practice:
rotation and extent are exactly the frame parameters an art-direction session
sweeps, so a geometry-derived id computed after rotation would silently rename
every feature in the city the next time the frame gets nudged for framing.

---

## 5. The grammar — how edits stay convincing

**This is the central idea of the tool**, and the answer to "how do edits stay
consistent."

Real city data is not just geometry. It is geometry that **obeys rules** — rules
nobody wrote down, which emerged from a century of people building under
constraints. A hand-placed road looks wrong because it violates rules the viewer
cannot articulate but can absolutely see.

So: **measure those rules from the imported data, then require edits to satisfy
them.** The city teaches the editor how to extend the city.

All of this is measurable from what we already import:

**Road network**
- Class-adjacency matrix — what actually connects to what. Residential meets
  service and residential constantly, primary occasionally, motorway never.
- Junction spacing distribution, per class.
- Curve radius and deflection-angle distribution, per class.
- Carriageway width by class.
- Dead-end frequency — rare, and meaningful when present.

**Buildings against roads**
- Setback from road centreline, by road class and building usage.
- **Orientation**: angular deviation between a building's long axis and its
  fronting road. Tight in Japanese cities, and getting it wrong is the single
  most visible tell of generated content.
- Footprint area distribution, by zone.
- Frontage width distribution ("eel bed" lots in old merchant districts).

**Land use**
- Adjacency matrix — industrial abuts port and rail, seldom residential.
- Block size distribution by zone.

Stored as `grammar.json` beside the world model. Every generative edit samples
these distributions rather than invented constants. **When the tool routes an
access road to a new mech facility, that road's width, curve radius, junction
angle and class are drawn from what this city actually does.**

It also gives a *validator*: an edit landing far outside the measured
distributions gets flagged. Same philosophy as the battle simulator's rules
engine — reject illegal moves rather than trusting the author not to propose one.

---

## 6. The operation log and the consistency engine

Every change is an entry in an ordered, append-only log. Render = import the base
world, then replay the log. Never a destructive edit.

**Op coordinates are lon/lat, not world-frame `[x,y]`** (pinned down
2026-08-24, superseding the ambiguous `at: [x,y]` shorthand below — polygons
follow the same rule, as lon/lat rings). The frame has already been
re-centred, re-rotated and re-sized more than once per render session in
practice; world-frame metre coordinates would silently detach every recorded
operation from its intended location the next time the frame moves, which is
exactly the failure stable ids exist to prevent, just for coordinates instead
of identity.

```
{ op: "construct", template: "mech-facility-a", anchor: {lon, lat}, rotation, when: "s09" }
{ op: "trace",     footprint: [{lon,lat},...], height, usage, when: "s09" }
{ op: "crater",    at: {lon, lat}, radiusM, depthM, when: "s14", cause: "claimant-sweep" }
{ op: "excavate",  polygon: [{lon,lat},...], depthM, benches: 3, when: "s11" }
{ op: "reclaim",   polygon: [{lon,lat},...], toElevationM, seawall: true }
{ op: "rezone",    polygon: [{lon,lat},...], to: "industrial" }
{ op: "rename",    id: "...", name: "..." }
{ op: "override",  id: "...", patch: {...} }
```

Construction and destruction share one mechanism, which is what lets players
*plan*: an unapplied operation list is a speculative branch you can render
without committing.

### Invariants, checked after every operation

- The road network is connected — or the disconnection is deliberate and logged.
- No building overlaps another building.
- No building stands in water unless tagged for it (piers, boathouses).
- Every building is within *N* metres of road access.
- No road exceeds the maximum grade for its class.
- No road passes through a building.
- Terrain edits produce no impossible geometry.

Violations either auto-repair where the fix is unambiguous, or surface for a
decision. That is what "roads stay consistent" means in code.

### What each operation triggers

**Construct / trace** → find the host block; demolish what it overlaps (as
recorded ops, never silent deletions); route an access road by A* over a cost
surface (terrain grade + water crossing + demolition cost + preference for
existing rights-of-way), smoothed to the grammar's curve-radius distribution;
orient the structure to its frontage; bench a level platform into the slope.

**Crater** → boolean-subtract buildings, cut road edges, detect severed ends,
**then re-run connectivity**. Barricade the severed ends. Compute the diversion
around the hole and mark it. If no diversion exists, that district is cut off —
dramatically interesting rather than a bug. Subtract a bowl from the terrain.
Scatter rubble derived from the destroyed buildings' actual volume.

**Excavate (dig site)** → subtract a volume, generate exposed cut-face polygons
at the rim (visually essential), destroy everything above, synthesise a switchback
access ramp down into it — road synthesis again.

**Reclaim** → add land, set fill elevation, generate a seawall along the
perimeter; it becomes buildable.

---

## 7. Rendering — the technical-drawing look

**REVISED 2026-08-24: raster is canonical, not SVG-then-rasterise.** The
original plan below was overtaken by what the look actually turned out to
need — terrain self-shadowing, colour-temperature grading between direct and
occluded light, dappled cloud-shadow noise, paper grain — which is
fundamentally per-pixel numerical work (numpy arrays, PIL compositing) that an
SVG filter pipeline cannot express at the same quality, certainly not at
implementation speed. `tools/city-map/citymap/render.py` draws directly with
PIL onto a supersampled canvas.

**What this costs, and what it doesn't.** The *picture* is raster-only; deep
zoom and print now mean a higher base resolution, not a vector asset, and the
plan's real-text-along-a-curved-centreline label rendering (§8's original
intent) is not achievable this way — labels become raster text placed and
rotated per-glyph, which is what `_spike8_reference.py`'s cartouche/label code
already does, adequately but not as cleanly as real `textPath`. Everything
else this doc treats as load-bearing is untouched: the *model* underneath the
picture — the operation log, feature geometry, stable ids, the road graph,
building footprints exported as Foundry walls — was never SVG-shaped to begin
with and stays exactly as designed. Re-rendering the same log at a different
supersample factor or output size remains a pure function of the model, which
is the property that actually matters for “edit the model, re-render.”

### Depth without breaking the grid — a real design call

We have building heights, so we can have depth. But **footprints must stay true
to the ground**, because this is a VTT battle map and tokens align to what is
drawn. Any oblique extrusion puts roofs where the ground is not, and every token
placement is then subtly wrong.

So: **cast shadows, do not extrude.** Offset each footprint by
`height × shadowVector`, fill it dark and translucent *beneath* the building.
Nearly free, reads as instant 3D depth, and the building still sits exactly on
its own ground. Tall buildings throw long shadows and the skyline becomes legible
from directly above.

### The rest of the look

- **Paper** — subtle fibre texture multiplied over everything, slight edge
  vignetting, a faint colour-temperature drift across the sheet.
- **Ink hierarchy** — consistent hairline weights, heavier strokes with a little
  bleed, so linework reads as drawn rather than plotted.
- **Hatching** — cross-hatch industrial, stipple parks, dot-fill tidal flat.
  Hatching is what makes a map read as a *technical drawing* rather than a
  screenshot.
- **Contours** from the DEM at survey intervals with elevation labels: 1 m on the
  flats, 5 m in the hills.
- **Grid, ticks, registration marks, legend, cartouche** — including attribution.
- **Type** — Noto Sans/Serif JP for Japanese, a condensed grotesque for road
  labels, glyph-by-glyph placement along curved road centrelines. Label placement
  with collision avoidance is classically annoying; budget real time.

Style lives in a data file, not in code, so it can be tuned without a rebuild.

---

## 8. Export and Foundry

- **Tiles**: 3×3 at 8192² = 24,576 px across. At a 20 km extent that is
  **0.81 m/px** — a house ~7 px, an alley ~4 px.
- **WebP** for delivery. KTX2 exported alongside at no extra cost.
- **Walls** generated from building footprints — infeasible by hand for a whole
  city, near-free from the vector model.
- **Lights** from `highway=street_lamp` → `AmbientLight`.
- **Notes** from named features.

---

## 9. What survives from the procedural work

- **Erosion simulation — largely redundant.** We take real terrain now.
- **Amplification — survives, directly useful.** GSI ships 5 m; the map wants
  ~1 m, and `amplify.mjs` covers exactly that gap.
- **Bathymetry — more valuable than before.** GSI has NoData at the coast, so
  offshore is the one place with no real data, and it is where the sea fort goes.
- **Exact Euclidean distance transform, marching squares, Int16 DTM packing,
  hierarchical seeding** — all still used.
- **The operation-log design — now the centre of the project**, because once the
  base map is real it is the only source of campaign-specific geography.

---

## 10. Risks

- **Art direction is the schedule risk**, not the technique. Everything in §7 is
  well understood; making it look *good* is a long tuning loop. A fast preview is
  not optional.
- **Label placement** is the most annoying rendering sub-problem.
- **Coordinate systems** bite silently — Japan has 19 plane-rectangular zones and
  the wrong one misplaces everything without erroring.
- **Stable IDs across re-imports.** If OSM is refreshed and ids shift, accumulated
  scars detach from their targets.
- **Data volume** needs the gitignored-bulk-tree treatment, like `reference/` and
  the Foundry trees.
- **Recognisability.** Rotation and renaming help; compositing districts from two
  or three cities would settle it, and also delivers the "all three blending
  together" already asked for.
- **Scope.** Weeks, not days. Each stage being independently useful is the
  mitigation.

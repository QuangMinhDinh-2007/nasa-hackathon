# Earth Missions: Mission Lab

A browser-based space mission design game for students. You are the Flight Director of an Earth-observation satellite. You design the spacecraft under mass and budget limits, pass a launch readiness review, then run the mission for 24 simulated hours through four connected challenges.

Built for the NASA Space Apps 2026 challenge "Space Mission Design Game".

## Mission design loop (v7.2)

Every mission now runs: **short briefing → choose one measurable target → build → Design Check + launch compatibility → launch → four challenges → requirements verification → Improve My Mission → re-fly with the same Mission Code → compare.** Wildfire Watch also offers two orbits that change the simulation. Details: `docs/V7_MISSION_DESIGN.md`.

Added files: `game/mission-design.js` (requirements, targets, launch profiles, Design Check, verification, records; pure, no DOM) and `game/design-ui.js` (screens and panels). Added tests: `node tools/design_tests.js` (37), `node tools/example_run.js`, and `node tools/e2e_design_loop.js` (headless browser, needs Playwright).

## Missions

| Mission | Orbit | Scenario | Goal |
|---|---|---|---|
| **Storm Watch** | Geostationary, 35,786 km | A hurricane strengthens over the Atlantic | Image the storm's phases, and get a fresh critical update to forecasters by hour 24 |
| **Wildfire Watch** | Near-polar LEO, 824 km | Fires reported in a forest with a community nearby | Detect fires on 4 passes, and send alerts and the final image to responders in time |
| **Flood Watch** | Sun-synchronous LEO, 747 km | A river breaks its banks in a valley | Map all three zones with an optical camera or radar, and deliver a fresh map of the town |

Each mission has four challenges. Battery, storage and undelivered data carry from one challenge to the next. The final report shows your score, the outcome, the trade-offs behind each decision, and a "change one thing" comparison.

## Running the game

No install and no internet connection are needed for the game itself.

1. Open `game/index.html` in Chrome or Edge.
2. Pick a mission, build the satellite, pass the readiness review, launch, and operate.

The launch sequence uses Three.js, loaded from cdnjs. If the CDN or WebGL is unavailable, the game falls back to a simple 2D launch.

### Mission codes

- `STORM-PRACTICE`, `FIRE-PRACTICE`, `FLOOD-PRACTICE`: baseline conditions with no surprises.
- Any five-character code, for example `STORM-7K3QX`: the same conditions for everyone who types it. Codes are shareable and reproducible.

The code controls the scenario (events, timing, weather). The same code always produces the same scenario and the same procedural map.

## Repository layout

```
game/                  the game (open index.html)
  index.html           screens, UI, and the three missions' flow
  engine.js            Storm Watch simulation and scoring
  wildfire-engine.js   Wildfire Watch simulation and scoring
  flood-engine.js      Flood Watch simulation and scoring
  scenario.js          mission codes: seeded, reproducible conditions
  provenance.js        source and class (A/B/C/D) for every number
  nasa-data.js         real NASA fire observations (generated, do not edit)
  nasa-s1.js           real radar water maps (generated, do not edit)
  launch3d.js          3D launch sequence (Three.js)
  viz.js               procedural storm, wildfire and flood map renderers
  viz-prototype.html   gallery of seeded visual variants
  upgrade.js, rescue.js, final.js, fun.js, fireplus.js,
  builder.js, review.js, look.js, stepper.js
                       UI layers added over the versions (see game/README.txt)
  assets/              images
docs/                  game guide, specs, balancing report, data provenance
tools/                 tests, balance checks, and data build scripts
```

## Tests

Requires Node 18 or later. Run from the repository root.

```
node tools/test_engine.js
node tools/seed_tests.js
node tools/ix_tests.js
node tools/wildfire_balance_check.js
node tools/flood_balance_check.js
node tools/builder_tests.js
node tools/fireplus_tests.js
```

`tools/replay_record.js` replays a copied mission record and checks that it gives the same score.

## Data and sources

Every number in the game has a class:

- **A: observed NASA data.** Fire detections (FIRMS, Maui 2023), a precipitation product (GPM IMERG, 2022), and optical and radar water maps (OPERA DSWx, Texas 2025). Processed by `tools/build_nasa_data.py` and `tools/build_opera_s1.py`. File hashes are in `docs/data-provenance.json`.
- **B: published specifications** from NASA, NOAA and JPL, such as orbit altitudes and instrument masses.
- **C: derived** values, such as orbital periods.
- **D: game values**, such as component costs, science points and fault sizes. These are never presented as NASA figures.

Real observations appear in reports and quizzes. They do not drive any scenario or score. All maps are labelled as simulated training scenarios, not real imagery.

To rebuild `game/nasa-data.js` you need Python with numpy, h5py and tifffile:

```
python3 -I tools/build_nasa_data.py <firms_dir> <imerg.HDF5> <opera_0702.tif> <opera_0705.tif> game/nasa-data.js docs/data-provenance.json
```

## Documentation

- `docs/GAME_GUIDE_v6.md`: start here. Rules, scoring, sources and limits.
- `docs/EARTH_MISSIONS_v5_SPEC.md`: mission codes and the number-class system.
- `docs/V5.1_UX_RESCUE.md`: interaction changes after classroom feedback.
- `docs/BALANCING_REPORT.md`: the Storm Watch score fix, before and after.
- `game/README.txt`: file-by-file notes and rollback steps for each version layer.

## Limits

- Storm, wildfire and flood coverage in the game uses simplified geometric models. The yellow observation box and region geometry are the scoring footprint. The cloud, smoke and water art is illustrative and does not change the scoring.
- Fire events and flood extent are hidden until the engine reports them as detected or delivered.
- Flood Watch and Wildfire Watch are scored on simplified rules. They teach trade-offs; they are not a forecast or operational tool.

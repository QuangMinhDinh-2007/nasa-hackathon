EARTH MISSIONS — MISSION LAB  v6.3   (NASA Space Apps 2026, Space Mission Design Game)

RUN
  Open index.html in Chrome or Edge. No install, no internet needed
  (fonts fall back to system fonts when offline).

FILES
  index.html            the game (screens, art, the three missions' UI)
  engine.js             Storm Watch simulation + scoring      (storm-3.6.0)
  wildfire-engine.js    Wildfire Watch simulation + scoring   (fire-3.2.1)
  flood-engine.js       Flood Watch simulation + scoring      (flood-4.3.0)
  scenario.js           Mission Codes (seeded, reproducible conditions)
  provenance.js         every number: class A/B/C/D, source, link, date checked
  nasa-data.js          real NASA observations (generated — do not edit)
  upgrade.js            journey playback, Pip + crew chat, readiness review,
                        what-if replay, timeline, mission record, sources panel
  rescue.js             v5.1: Storm Watch direct controls (scan box, data sorting, hour plan,
                        downlink order), no mascot/voice, no flicker, background music
  final.js              v6.0: score explainer, badges, debrief quiz, how-to-play,
                        Wildfire region tasking, Flood pass aiming
  fun.js                v6.1: hover cards, satellite HUD, quick calls, XP/ranks, stars,
                        mission patches, folding report
  fireplus.js           v6.2: Wildfire map key, shape-coded states, region freshness,
                        pass-not-imaged notes, keyboard/touch markers, run announcements,
                        12 px minimum text, reduced motion, data-delivery check
  builder.js            v6.3: builder redesign for all three missions (accordion,
                        side-by-side option cards, arrow trade-offs, warnings)
  review.js             v6.3: readiness review wording (Ready / Caution / Not Ready) and summary
  look.js               v6.3: launch-site background, Join Class Mission tiles, fewer helper lines
  stepper.js            v6.3: Build/Launch/Operate/Report steps behind a "Step n of 4" button
  nasa-s1.js            real radar water maps of Kerr County (generated — do not edit)
  assets/               images

MISSION CODES
  STORM-PRACTICE / FIRE-PRACTICE / FLOOD-PRACTICE  = baseline, no surprises
  Any 5-character code, e.g. STORM-7K3QX           = same conditions for everyone who types it

TESTS  (need Node 18+)
  node tools/test_engine.js
  node tools/seed_tests.js
  node tools/ix_tests.js          (22 tests: every direct control changes the real mission state)
  node tools/wildfire_balance_check.js
  node tools/flood_balance_check.js
  node tools/builder_tests.js     (9 checks: builder numbers, arrows, warnings, a11y)
  node tools/fireplus_tests.js    (10 checks: v6.2 Wildfire map, accessibility, warning)
  node tools/replay_record.js rec.json   (replays a copied mission record)

REBUILD nasa-data.js  (needs Python with numpy, h5py, tifffile)
  python3 -I tools/build_nasa_data.py <firms_dir> <imerg.HDF5> <opera_0702.tif> <opera_0705.tif> game/nasa-data.js docs/data-provenance.json

DOCS
  docs/GAME_GUIDE_v6.md            START HERE: what the game is, rules, scoring, sources, tests, limits
  docs/V5.1_UX_RESCUE.md           what changed after the v5 feedback, checklist, tests, open items
  docs/EARTH_MISSIONS_v5_SPEC.md   Mission Codes, sources, number classes (v5.0 base)
  docs/data-provenance.json        NASA source files, hashes, processing steps
  docs/BALANCING_REPORT.md         Storm Watch score fix (before/after)

ROLLBACK
  Remove the builder.js line to return to v6.2, the fireplus.js line to return to v6.1, the fun.js line to return to v6.0, the final.js line to return to v5.1, and the rescue.js line to return to v5.0.
  Remove the upgrade.js line as well to return to the plain three-mission game.
  The engines run unchanged without them.

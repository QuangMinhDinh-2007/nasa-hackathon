# Earth Missions — Mission Lab · v6.3 game guide

NASA Space Apps 2026 · challenge "Space Mission Design Game" · built 15 Nov 2026.
**v7.0 note:** the design loop added in v7.0 (briefing, student target, Design Check with launch compatibility, requirements verification, Improve My Mission, Wildfire orbit choice) is described in `V7_MISSION_DESIGN.md`. Everything below still applies, except: the build screen is now reached through a briefing; the "Readiness review" button is "Design Check" and is always enabled (the check itself blocks an unlaunchable design); the report's "Redesign satellite" button is "Improve My Mission"; Wildfire is engine `fire-3.3.0`.

Older notes: `V5.1_UX_RESCUE.md` (interaction redesign), `EARTH_MISSIONS_v5_SPEC.md` (Mission Codes, sources), `BALANCING_REPORT.md` (Storm score fix).

## 1. The game in one paragraph

The player is the Flight Director of an Earth-observation satellite. They design the spacecraft under mass and budget limits, pass a readiness review of the launch, space, ground and user segments, then operate the mission for 24 hours through four connected challenges. Battery, storage and undelivered data carry over from one challenge to the next. A final report shows the score, the outcome, what one different move would have changed, and what real NASA satellites saw in a comparable event.

Three missions: **Storm Watch** (geostationary, hurricane), **Wildfire Watch** (polar orbit, fires), **Flood Watch** (polar orbit, radar and optical flood mapping).

## 2. What the player does with their hands

| Mission | Challenge 1 | Challenge 2 | Challenge 3 | Challenge 4 |
|---|---|---|---|---|
| Storm Watch | drag and resize the scan box over the forecast track and cone | mark stored images Send first / Keep / Discard | set each hour to Full / One image / Eco / Rest with a battery forecast | reorder the downlink queue; each image shows its arrival time |
| Wildfire Watch | click regions on the map to target them (1 region 115% sensitivity, 2 regions 100%, 3 regions 85%) + options | region targeting + options | region targeting + options | region targeting + options |
| Flood Watch | aim each of the two passes at a zone or at all three (100% or 80% detail) + options | pass aiming + options | pass aiming + options | pass aiming (first pass is a fixed emergency request for the town) + options |

Every control changes the simulation. The mission record copied from the report replays to the same score in Node (tested for all three missions).

## 3. Scoring (same rule shape in all three missions)

Score = four parts, 35 + 35 + 20 + 10 = 100. The report shows each part with the player's own numbers.

| Part | Max | Storm Watch | Wildfire Watch | Flood Watch |
|---|---|---|---|---|
| Science / mapping | 35 | 60% points collected per storm phase (3 fills a phase) + 40% phases covered | 50% collected per pass + 25% passes covered + 25% fires detected | 60% map quality per zone + 40% zones mapped |
| Delivery | 35 | 85% points delivered per phase, weighted by age (≤3 h 100%, ≤6 h 75%, ≤12 h 50%, older 25%) + 15% critical update | 70% delivered per pass + 15% hotspot alert within 2 h + 15% final update | 85% maps delivered per zone + 15% fresh town map |
| Efficiency | 20 | (goal achieved, capped at 1) × (50% share of optional energy that became delivered data + 50% share of generated data that was delivered) | same | same |
| Reliability | 10 | ½ × powered hours ÷ 24 + ½ × health; 0 after critical failure | ½ × operating hours ÷ 24 + ½ × health; 0 after critical failure | ½ × (essential hours − ½ safe-mode hours) ÷ 24 + ½ × health; 0 after critical failure |

**Health** starts at 100%. It falls 20 for each hour the essential systems are unpowered (two in a row is a critical failure, health 0) and 5 for each hour the battery dips below 25%, because deep discharge wears a lithium-ion battery (NASA guidance: avoid over-discharge; shallower cycling gives longer life). Safe mode costs no health: it is the spacecraft protecting itself, and its cost is lost science time. Health counts for half of Reliability.

Outcome is decided separately by four requirements per mission:

| | Storm | Wildfire | Flood |
|---|---|---|---|
| G1 | delivered science ≥ 12 | delivered science ≥ 3 | delivered maps ≥ 5 |
| G2 | ≥ 3 storm phases covered | new-hotspot alert within 2 h | all 3 zones mapped |
| G3 | critical update delivered by 24:00 | final update delivered | fresh town update delivered |
| G4 | no critical failure | no critical failure | no critical failure |

Mission Success: all four. Mission Failure: critical failure, or delivered amount below the failure floor. Partial Success: everything else. A high score with a missed requirement is still a Partial Success.

## 4. What is real and what is a game value

Every number in the game is listed in the in-game "Data & sources" panel with a class:

- **A, observed NASA data** (files downloaded by the team, processed by `tools/build_nasa_data.py` and `tools/build_opera_s1.py`, hashes in `data-provenance.json`): FIRMS VIIRS detections for Maui, 8–10 Aug 2023; one GPM IMERG half-hour, 27 Sep 2022; OPERA DSWx-HLS optical water maps, central Texas, 2 and 5 July 2025; OPERA DSWx-S1 radar water maps, Kerr County, 4 and 11 July 2025.
- **B, published specifications** checked on NASA / NOAA / JPL pages on 15 Nov 2026: geostationary altitude, GOES-R mass and instrument, GOES eclipse length, NHC advisory cycle, VIIRS 375 m product, NISAR orbit, mass, power and orbits per day.
- **C, derived**: orbital periods by Kepler's third law, computed live.
- **D, game values**: component masses and costs, science points, fault sizes, timeliness weights, tracking and tasking rules. Never presented as NASA figures.

Real observations are shown in the report and used in the quiz. They do not drive any mission scenario or score. The mission maps are labelled as training scenarios.

## 5. Learning features

- Readiness review by mission segment before launch.
- Engine-run forecast before every Storm Watch decision; a one-line "what happened" after.
- "Change one thing" replay table in every report.
- Score explainer with the player's numbers; six badges with stated conditions.
- Three debrief questions per mission. Each answer explains the fact and links to its source.
- Mission Codes: the same code gives every student the same conditions, so results can be compared.

## 5b. Added in v6.1 (less reading, more doing)

| Feature | What it does | Grounding |
|---|---|---|
| Hover cards | Hovering or focusing a part, option, dashboard label or HUD value opens a short card: what it is, and a real-mission fact where one exists. Option descriptions moved from the screen into these cards. | Facts are the class A and B entries of the registry |
| Satellite camera HUD | The mission map shows altitude, orbital speed and orbit period | Speed from v = √(μ/r), period from Kepler's third law, computed live (class C). GEO 3.07 km/s and 1,436 min; 747 km 7.48 km/s and 100 min. The 824 km JPSS altitude is still unverified and shown with "~". |
| Quick call | Once per challenge, playback pauses with an 8-second question about this flight's own battery or storage. The answer is read from the finished simulation. | Not scored in the mission; gives XP only |
| XP, ranks, streaks | XP from quick calls, debrief answers and stars. Five ranks, Cadet to Mission Legend. Saved in the browser. | Separate from the mission score by design |
| Stars and reference flight | The report flies all 256 standard option combinations for the player's satellite and Mission Code and shows the best score as the reference flight. Three stars need Mission Success within 3 points of it. | Computed by the real engines |
| Mission patch | Each Mission Code gives its own patch (shape and colours from the code). Patches are kept in a locker. | Cosmetic |
| Folding report | Report sections open on click, so the first screen is the patch, stars and score. | — |

The pre-run prediction chips were replaced by the quick call.

## 5c. Added in v6.2 (Wildfire clarity and accessibility)

Loaded from `game/fireplus.js`. Nothing in it changes a simulation result or a score. Remove its line in `index.html` to return to v6.1.

| Feature | What it does |
|---|---|
| Map key | A legend under the Wildfire map, on the mission and report screens. |
| States by shape, not only colour | Fire with alert sent = filled dot; detected but alert not yet sent = ring with "!"; missed = dashed ring with "×" (report only). |
| Region freshness | Each region shows ✓ Observed hh:mm, ⚠ Update needed (last image more than 6 h old) or ○ Never observed, at the time being played back. |
| Pass not imaged | After a run, the map says why a pass had no image (your plan, battery reserve, full storage, safe mode), or that an extra image was not taken. |
| Keyboard and touch | Fire markers and region badges take keyboard focus; their hover card opens on focus or tap. |
| Screen readers | Each finished 6-hour run is announced ("Challenge 1 complete. Scan complete: 1 new hotspot detected. Dashboard updated."), in all three missions. |
| Readable text, motion | No text below 12 px anywhere in the game; a visible focus ring; "reduce motion" turns off all animation. |
| Data delivery check | On the Wildfire build screen, Advanced imager + Standard comms shows a card comparing image size with the downlink rate. It does not name a better build. |

Engine change (additive): each Wildfire image record also stores `regions` and `strength`, used only for the map. Wildfire is now `fire-3.2.1`; all 5,376 baseline runs give the same scores as before.

Results are held until playback ends or is skipped, as in v6.1's live playback.

## 5d. Added in v6.3 (builder redesign, all three missions)

Loaded from `game/builder.js`; presentation only. Remove its line in `index.html` to return to v6.2.

- The five parts are accordion sections, one open at a time. A collapsed section shows the part, the selected option and its cost.
- An open section asks one short question and shows the two options as side-by-side cards: name and selection mark, one-line description, labelled spec blocks, and 2–3 trade-offs with arrows (↑/↓ = more/less; green helps, orange costs). Optical vs Radar uses capability labels instead of arrows.
- Every number is read from each mission's own part table; every arrow is computed from the two options' values (no arrow when they are equal).
- Selecting a card uses the existing actions, so `S.design`, `S.fdesign` and `S.ldesign` remain the only configuration state.
- One compact warning appears only when the current build fails a cross-part check the readiness review already makes: Storm storage fills in under 12 h at full cadence; Wildfire one pass makes more data than one contact can send; Flood storage holds fewer than two passes of maps.
- Launch readiness (total mass and mission budget) sits above the first part; the Readiness review button stays at the bottom of the build panel. Part headers have no hover card.
- The Build · Launch · Operate · Report steps left the top bar: a "Step n of 4" button beside How to play expands the full stepper (`game/stepper.js`).
- Build-screen look (`game/look.js`): the build screen sits in front of a drawn launch-site landscape with the rocket standing on its pad; the top bar has no outline; the helper sentences under the title, under the totals and in the nose cone are gone; collapsed parts show only the chosen option; the "Earth · Mission N" label left the top bar; the mission scenario panel is now **Choose How to Play** with two cards: *Start a Mission* (Practice Mission, or Random Mission with its shareable code and Copy; the random code is made once and kept until "New random mission") and *Use a Mission Code* (code box, one line of explanation, Continue; wrong-format and wrong-mission codes show an inline error). The code input and a generated code are never shown together. Codes are reproducible scenario identifiers, not multiplayer: same code, same simulated events, different choices and scores.
- Mission Readiness Review (`game/review.js`): no Segment column; statuses read ✓ Ready (check passes), ⚠ Caution (possible problem, launch allowed) and ✕ Not Ready (requirement not met, launch blocked); plainer check names with the same numbers and thresholds; a summary above the launch button ("Ready to launch with 2 cautions" plus the biggest risk in plain words).
- Keyboard: Tab to a section header (Enter opens it) or to a card; arrow keys switch between the two cards. Cards are a radio group with `aria-checked`; headers carry `aria-expanded`; each arrow has hidden text for screen readers. Cards stack below 760 px.

## 6. Tests run on this build

| Test | Result |
|---|---|
| Storm engine and scoring (`test_engine.js`) | 12 pass |
| Mission Codes (`seed_tests.js`) | 10 pass |
| Direct controls and tasking, all three engines (`ix_tests.js`) | 22 pass |
| Baseline balance with no direct control used | unchanged: Storm 6,292 / 1,544 / 100 · Wildfire 740 / 3,484 / 1,152 · Flood 2,215 / 3,177 / 496 |
| Headless Chrome, full playthrough of each mission using the direct controls | no page errors; copied record replays to the same score and outcome in Node |
| v6.2 Wildfire checks (`fireplus_tests.js`) | 10 pass |
| v6.3 builder checks (`builder_tests.js`) | 9 pass |
| Mission record replay (`replay_record.js`) on v6.2 playthrough records | Fire 67 Partial, Storm 98 Success, Flood 55 Failure: all replay exactly |
| Engines against the earlier Storm v3.4 and Wildfire spec v3.0 engines | 0 of 7,936 Storm and 0 of 5,376 Wildfire runs differ |

## 7. Known limits

1. Wildfire and Flood have one direct control (targeting) repeated in each challenge; their other decisions, marked "options", are still two-choice buttons. Only Storm Watch has a different direct control in each of the four challenges.
2. Balance with the new controls was fully enumerated only for the original options. The scan box was sampled (see `V5.1_UX_RESCUE.md`). Wildfire region tasking and Flood pass aiming were tested for correctness, not for balance across all designs.
3. In Storm Watch, aiming well changes the final score by only 1–2 points on average.
4. Not tested: phones and narrow windows, Safari, Firefox, real touch devices, real screen readers (v6.2 adds the markup for them, checked in headless Chrome only).
5. XP and patches are saved in the browser; mission progress is not. No leaderboard; English only. Background music is a simple generated loop.
6. Data gaps: IMERG is one half-hour; the JPSS altitude and the Landsat 9 / Sentinel-1 figures are still unverified and marked so in the game.
7. Hover cards open on mouse, keyboard focus or (for Wildfire markers and badges) tap; other hover cards were not tested on touch screens. The "satellite view" is a camera-style frame and HUD over the same map, not a 3D view from orbit.
8. Whether the game is fun is not something a test can show. The team should play it before submitting.

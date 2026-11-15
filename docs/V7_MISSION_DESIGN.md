# Earth Missions v7.0 — Mission Design Expansion

Baseline: v6.3. This document describes only what is playable in this build. Start here; `GAME_GUIDE_v6.md` still describes the unchanged v6.3 features (challenges, scoring, data, accessibility).

## 1. The player loop (all three missions)

**Briefing → choose one target → build → Design Check + launch compatibility → launch → four challenges → requirements verification → Improve My Mission → re-fly with the same Mission Code → compare.**

| Step | Where | What the student does | Engine / module behind it |
|---|---|---|---|
| Briefing | new screen before the builder | reads 4 short cards (what is happening, who needs it, why timing/coverage matters, what to do and what is hard); each has an optional "technical term" | `MissionDesign.BRIEFING` |
| Target | same screen | picks one of three numeric targets | `MissionDesign.TARGETS`, stored in `S.target`, `M.requirement` and the mission record |
| Builder | existing five-part builder | sees the target, a one-line note after each part change, and for the open part: what it gives, what it uses, what it supports, what it makes harder | `partLink()` reads the engines' part tables; `changeNote()` flies 256 standard decision plans in the real engine under practice conditions |
| Design Check | existing Mission Readiness Review | feasibility (hard) checks, risk (caution) checks, launch compatibility | `MissionDesign.designCheck()`, rendered by `review.js` |
| Operate | unchanged | four challenges and all direct controls | unchanged engines |
| Verification | top of the Final Report | per requirement: threshold, measured value, evidence, status, why, design choices, operational decisions, causal chain | `MissionDesign.verify()` reads the engine ledgers |
| Improve My Mission | report button | returns to the builder with the design kept and the Mission Code locked; then "Fly my earlier decisions" (instant, fair test) or "Make new decisions" | `carry()`, the engines' `runChallenge`, `compare()` |

## 2. Student targets (class D: educational thresholds, not scientific limits)

| Mission | ID | Target | Measured from |
|---|---|---|---|
| Storm | S1 | first fresh final-phase image on the ground by mission hour 20:00 | `deliveredAt` of delivered phase-4 qualifying image records |
| Storm | S2 | a qualifying image delivered from all 4 storm phases | phase of delivered qualifying records |
| Storm | S3 | mean capture-to-delivery delay ≤ 2 h | `deliveredAt − t` of delivered records |
| Wildfire | F1 | detect ≥ 6 of the 8 fire events | detection ledger `M.detected` |
| Wildfire | F2 | every alert delivered ≤ 2 h after detection | `deliveredAt − t` of every alert item |
| Wildfire | F3 | a qualifying image delivered from all 4 passes | pass of delivered qualifying images |
| Flood | L1 | a clear map of all 3 zones delivered | `zoneScore` of delivered maps |
| Flood | L2 | fresh town map ≤ 30 min old at delivery | `deliveredAt − t` of delivered `townQual` maps |
| Flood | L3 | ≥ 6 clear maps delivered | count of delivered qualifying maps |

Rules enforced by test: the target adds no points, changes no gate and no score; missing evidence is never "Met"; a met target never turns a missed mandatory requirement into success. `alertOnTimeH` (a configuration threshold) is never reported as a result: alert times are computed from real capture and delivery timestamps.

## 3. Launch compatibility (one fixed profile per mission, no rocket selection)

| Mission | Profile | Max spacecraft mass | Basis |
|---|---|---|---|
| Storm | GTO-class delivery | 5,192 kg | class D limit set equal to the GOES-R launch mass (class B, NOAA) |
| Wildfire | LEO delivery | 1,150 kg | class D, chosen for balance |
| Flood | LEO delivery | 2,380 kg | class D limit set equal to the NISAR launch mass (class B, NASA JPL) |

What was verified in v6.3: every engine already enforced a mass limit and a budget limit (`limits.kg`, `limits.costM/credits`); the builder simply disabled the review button. The launch profile now reads that same engine limit, so the two can never disagree. No launch-vehicle payload figure is used anywhere, so none can be applied to the wrong orbit. **Launch cost is not modelled**: the budget covers the spacecraft only, so nothing is double-counted. With the existing Storm parts the heaviest satellite is 5,145 kg, so in Storm the mass check always passes and budget is the binding limit.

## 4. Redesign & retry rules

- The retry re-runs the real engine challenge by challenge. Same code + same design + same decisions gives an identical result (tested in Node and in the browser).
- Mission Code is locked while improving. Scenario generation depends only on mission and seed.
- The original record is deep-copied and kept for the whole improvement chain.
- Incompatible decisions: Storm's Challenge 2 Send first / Discard marks and Challenge 4 hand-ordered queue point at image numbers that depend on the hardware. When hardware changes they are reset to automatic and the player is told before the flight. Scan box, hour plan, Wildfire region tasking and Flood pass aiming do not depend on hardware and are kept.
- Records are `recordVersion: 2` (target, launch profile, architecture, run summary, attempt info). v6.3 records still replay (9 fixtures in `tools/fixtures/records_v63.json`).

## 5. Traceability

| Requirement / decision | Hardware | Operations | Engine measurement | Final verification |
|---|---|---|---|---|
| Storm G1 delivered science ≥ 12 | imager, cadence, comms, storage | C1 scan, C2 storage, C4 downlink | `derive().deliveredScience` (age-weighted) | pts, images delivered, GB made vs sent, biggest loss |
| Storm G2 ≥ 3 phases | imager, cadence, power, storage | C1–C3 | `coveredSet` from the image ledger | first qualifying image time per phase |
| Storm G3 critical update | comms, power, storage | C4, C3 | delivered phase-4 record | capture and delivery time, GB still queued |
| Storm G4 no failure | power | C3 | `M.failed`, `essentialHours`, incident events | powered hours, unpowered hours |
| Wildfire G1 science ≥ 3 | imager, comms, storage | C1, C2, C4 | `deliveredScience` | images delivered, events detected |
| Wildfire G2 hotspot alert ≤ 2 h | imager, comms | C4 footprint, C2 order | critical alert `t`, `deliveredAt`; final-pass image `regions`, `strength` | detection and delivery time, or why not detected |
| Wildfire G3 final update | comms, imager, storage | C4, C2 | final-pass image status | capture/delivery time or GB left |
| Wildfire G4 no failure | power | C3 | `M.failed`, `minBatt`, safe-mode events | lowest battery, safe-mode times |
| Flood G1 maps ≥ 5 | instrument, targeting, comms, storage | C1, C2, C4 | `derive().delivered`, `M.skipped` | maps delivered, GB made vs sent, maps not taken and why |
| Flood G2 all zones | instrument, targeting | C1, C2 | `zonesQ`, per-zone `zoneScore` | best score and map per zone |
| Flood G3 fresh town map | comms, instrument, power | C4, C3 | delivered `townQual` map | capture and delivery time |
| Flood G4 no failure | power | C3 | `M.failed`, `minBatt`, `safeHours` | lowest battery, safe-mode hours |
| Student target (9 options) | listed per target in the builder | listed per target | see section 2 | Met / Not met with evidence |
| Part choice (existing) | the part | — | engine part table | Design Check rows, report design choices, comparison |
| Improve My Mission (new) | changed parts | carried or new decisions | full engine re-run, same code | Original vs revised table |

## 6. Science and data integrity

No new dataset. New numbers are class D (targets, launch limits, Design Check limits) or class C (45% propellant share from two NOAA masses) and are listed in the in-game Data & sources panel. Simulation values are never shown as NASA measurements.

## 7. Wildfire Watch architecture choice (P1)

`wildfire-engine.js` (now `fire-3.3.0`) reads its observation passes, ground contacts and eclipse cycle from a versioned profile (`WF.ARCH`, `newMission(design, scn, archId)`, `runFull(..., archId)`).

| | Option 1 `pm-sso` 1.0 (default) | Option 2 `dawn-dusk-sso` 1.0 |
|---|---|---|
| Passes (mission time) | 02:00, 08:00, 14:00, 20:00 | 03:30, 09:30, 15:30, 21:30 |
| Ground contacts | 5 × 1 h (5 h) | 1 h after each pass + last hour of the day; the last two overlap, so 22:30–24:00 (4.5 h) |
| Eclipse | 30 of every 100 min | none |
| Detection | identical | identical |
| Launch profile | LEO, 1,150 kg | same (re-checked for the selected profile) |

- Option 1 is the same arrays the engine used before. All 26,880 baseline runs (21 designs × 256 decisions × 5 codes) give an identical hash.
- Option 2 is a hand-made teaching schedule, **not a propagated orbit**. Grounded idea: a dawn-dusk sun-synchronous orbit stays in near-continuous sunlight and crosses a place at a different local time than an afternoon orbit (general orbit fact; not verified on a primary source in this build, and marked so in the game). Educational assumptions (class D): zero eclipse, the 90-minute shift, the contact rule.
- **No time-of-day detection advantage is modelled**, and the game says so.
- The 90-minute shift was chosen by sweeping the engine so neither orbit dominates. Over 5,376 paired flights per code: practice, dawn-dusk scores higher in 617 and lower in 648, outcome up 18 / down 128; code 7K3QX, higher 1,098 / lower 1,174, outcome up 40 / down 64. (A 2-hour shift with four contacts was never better in outcome and was rejected; a 1-hour shift was never worse and was rejected.)
- Mission Code events attach to the Nth pass, the Nth contact and fixed mission hours, so the parameters the engine receives are identical in both orbits. Only the displayed clock time of an event follows the schedule (`WF.scenarioView`).
- Storm and Flood keep one architecture each, with a "why this orbit" note on the briefing.

## 8. Feature status

| Feature | Status |
|---|---|
| §2 Mission briefing (3 missions) | Implemented |
| §3 Student numeric target (3 missions, 9 targets) | Implemented |
| §4 Builder connected to requirements | Implemented |
| §5 Design Check + launch compatibility | Implemented |
| §6 Requirements verification in the Final Report | Implemented |
| §7 Post-mission Redesign & Retry with comparison | Implemented |
| §8 Wildfire architecture, two options | Implemented (changes engine inputs; tested) |
| §9.1 Requirement status before/during/after each challenge | Not implemented. The existing dashboard and Pip's "Are we on track?" still show gate progress. |
| §9.2 Extra balancing | Not implemented, apart from choosing the option-2 schedule by sweep. No existing balance number changed. |

## 9. Engine modules and functions changed

- `game/wildfire-engine.js`: added `ARCH`, `DEFAULT_ARCH`, `archProfile()`, `scenarioView()`; `newMission`, `runFull` take an optional `archId`; `inContact`, `sunlit` and the pass lookup in `step` read `M.A`. `VERSION` `fire-3.3.0`. No formula changed.
- `game/engine.js`, `game/flood-engine.js`, `game/scenario.js`: **not changed**.
- New: `game/mission-design.js` (pure), `game/design-ui.js` (UI).
- Edited: `index.html` (briefing route, Design Check button always enabled, Improve My Mission button, Wildfire times read from the flown profile), `upgrade.js` (record v2, `replayRun`, `S.arch`, challenge text per orbit), `review.js` (renders `designCheck`), `provenance.js` (new rows), `final.js`, `fun.js`, `fireplus.js` (one-line changes to pass the architecture).

## 10. Tests run on this build

| Suite | Result |
|---|---|
| `test_engine.js` | 12 pass, output identical to v6.3 |
| `seed_tests.js` | 10 pass, output identical |
| `builder_tests.js` | 9 pass |
| `ix_tests.js` | 22 pass, output identical |
| `fireplus_tests.js` | 10 pass |
| `wildfire_balance_check.js`, `flood_balance_check.js` | output identical to v6.3 |
| `design_tests.js` (new) | 37 pass |
| `e2e_design_loop.js` (new, headless Chromium) | 70 checks pass, no page errors |
| `replay_record.js tools/fixtures/records_v63.json` | 9 of 9 v6.3 records replay |

No existing assertion was changed or removed. Unresolved failures: none.

## 11. Remaining limitations

1. All new thresholds (targets, launch limits, option-2 schedule) are educational assumptions. NASA data is still shown as reference only and drives no scenario or score.
2. Launch limits are spacecraft reference masses, not rocket capacities. In Storm Watch the mass check can never fail with the existing parts (maximum 5,145 kg of 5,192 kg); budget is the real limit there.
3. Wildfire target F2 and gate G2 depend strongly on the pass-to-contact gap, which hardware barely changes; downlink order and the footprint matter more.
4. Flood target L3 cannot be met by the all-Standard satellite; L1 is easy. This is intended as a spread of ambition, and the game does not say which design reaches which target.
5. The builder's "easier / harder" note is a paired test of 256 standard decision plans under practice conditions. It ignores direct controls and Mission Code events and is labelled as not a prediction.
6. "Fly my earlier decisions" replays the report without the live playback, quick call or per-challenge narration; Storm's challenge labels then show the option names rather than the hand-set box/schedule descriptions (the values flown are the recorded ones).
7. The older "Change one decision" table still tests preset options only, as in v6.3.
8. The two orbit facts and the JPSS altitude are still not verified on a primary source (sites not reachable from the build environment); they are marked so in Data & sources.
9. Not tested: phones, Safari, Firefox, real screen readers. Whether students find the loop engaging needs a play test.

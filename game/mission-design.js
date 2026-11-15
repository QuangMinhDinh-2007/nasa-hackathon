/* Earth Missions v7.0 — Mission Design module (pure, deterministic, no DOM; browser: window.MissionDesign, Node: module.exports).
 * ONE central place for: mission briefings, mandatory requirements, student targets, launch profiles, the Design Check,
 * requirements verification, run summaries, redesign comparison, decision carry-over and mission records (v2).
 * It never re-implements simulation physics: every measured value is read from the engines' own mission state
 * (timestamps, ledgers, derive(), score()), and every hardware number is read from the engines' part tables.
 * Thresholds marked class D are EDUCATIONAL design choices, not scientific facts.
 */
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const SW = node ? require('./engine.js') : root.SWEngine;
  const WF = node ? require('./wildfire-engine.js') : root.WFEngine;
  const FL = node ? require('./flood-engine.js') : root.FLEngine;
  const Sc = node ? require('./scenario.js') : root.Scenario;
  const DEF_VERSION = 'req-1.0', RECORD_VERSION = 2, GAME_VERSION = '7.0';
  const MISSIONS = ['storm', 'fire', 'flood'], PARTS = ['instrument', 'observation', 'power', 'comms', 'storage'];
  const NAME = { storm: 'Storm Watch', fire: 'Wildfire Watch', flood: 'Flood Watch' };
  const EPS = 1e-9;
  const n1 = x => (Math.round(x * 10) / 10).toString(), n2 = x => (Math.round(x * 100) / 100).toString();
  const hm = h => { const t = Math.round(h * 60); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
  const mins = h => Math.round(h * 60) + ' min';
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  /* ---------- engine access (the only place that knows the three engines' call shapes) ---------- */
  const CFG = { storm: () => SW.makeConfig('v34'), fire: () => WF.CONFIG, flood: () => FL.makeConfig('v41') };
  const fireArch = id => (WF.archProfile ? WF.archProfile(id) : { id: 'pm-sso', version: '1.0', passes: WF.CONFIG.passes, contacts: WF.CONFIG.contacts, eclipse: WF.CONFIG.eclipse });
  const DEFAULT_ARCH = { storm: null, fire: 'pm-sso', flood: null };
  function totals(m, design) {
    if (m === 'storm') { const t = SW.designTotals(design, CFG.storm()); return { kg: t.kg, cost: t.costM, unit: '$M', valid: t.valid }; }
    if (m === 'fire') { const t = WF.totals(design); return { kg: t.kg, cost: t.credits, unit: 'credits', valid: t.valid }; }
    const t = FL.totals(design, CFG.flood()); return { kg: t.kg, cost: t.costM, unit: '$M', valid: t.valid };
  }
  const costText = (m, v) => m === 'fire' ? `${v} credits` : `$${v}M`;
  const limits = m => { const C = CFG[m](); return { kg: C.limits.kg, cost: m === 'fire' ? C.limits.credits : C.limits.costM }; };
  const part = (m, design, k) => CFG[m]().parts[k][design[k]];
  function runFull(m, design, decisions, scn, ext, arch) {
    if (m === 'storm') return SW.runFull(design, decisions, 'v34', scn, ext);
    if (m === 'fire') return (arch && arch !== DEFAULT_ARCH.fire) ? WF.runFull(design, decisions, scn, ext, arch) : WF.runFull(design, decisions, scn, ext);
    return FL.runFull(design, decisions, 'v41', scn, ext);
  }
  const score = (m, M) => (m === 'storm' ? SW : m === 'fire' ? WF : FL).score(M);
  const challenges = m => m === 'storm' ? SW.CHALLENGES : m === 'fire' ? WF.CHALLENGES : FL.challengesFor(CFG.flood());
  const engineVersion = m => (m === 'storm' ? SW : m === 'fire' ? WF : FL).VERSION;

  /* ---------- 1. briefings (plain language first, technical term second) ---------- */
  const BRIEFING = {
    storm: { title: 'A hurricane is growing over the Atlantic', cards: [
      ['What is happening on Earth?', 'A tropical storm is turning into a hurricane and moving toward the coast over the next 24 hours.', 'Hurricanes are tracked in stages. This mission splits the day into four 6-hour storm phases.'],
      ['Who needs the information?', 'Weather forecasters. They use fresh pictures of the storm to warn people on the coast.', 'Forecast centres issue full advisories every 6 hours (NOAA National Hurricane Center).'],
      ['Why does timing matter?', 'Your satellite can only help once its pictures reach Earth. A picture that arrives hours late is worth less to a forecaster.', 'Sending data to the ground is called downlink. The delay between taking a picture and delivering it is its latency.'],
      ['What must you do, and what makes it hard?', 'Photograph the storm in at least 3 of its 4 phases, deliver enough useful pictures, and get one fresh picture down in the last 6 hours. Pictures fill the on-board memory faster than the radio can send them, and a power fault will hit mid-mission.', 'The satellite sits in geostationary orbit (35,786 km): it always sees the storm, so the limits are storage, downlink rate and power, not viewing time.'] ] },
    fire: { title: 'A wildfire is burning near a community', cards: [
      ['What is happening on Earth?', 'A wildfire is active in dry forest. It can spread and start new fires close to homes.', 'Satellites find fires by their heat. Each detection is a hot pixel, not a map of the fire edge.'],
      ['Who needs the information?', 'Fire responders. They need to know where the fire is active and to be warned quickly when a new hotspot appears.', 'A short warning message is called an alert. It is tiny compared with a full image.'],
      ['Why do timing and coverage matter?', 'Your satellite flies over the fire only a few times a day, and it can only send data when it has a connection to Earth. A fire outside the area you look at is not seen at all.', 'A fly-over is an observation pass. A connection to an antenna on Earth is a ground-station contact (downlink window). The area the camera covers is its footprint.'],
      ['What must you do, and what makes it hard?', 'Deliver enough useful fire images, get the new-hotspot alert to responders within 2 hours of spotting it, and deliver a final update before the day ends. You get four passes and a handful of contacts, and a power fault will hit mid-mission.', 'The satellite is in low Earth orbit (about 100 minutes per lap). Looking wide sees more regions but detects weak fires less well.'] ] },
    flood: { title: 'A river valley is flooding', cards: [
      ['What is happening on Earth?', 'Heavy rain has pushed a river over its banks. Water is spreading across a valley, farmland and toward a town.', 'A map of where water covers the ground is a surface-water extent map.'],
      ['Who needs the information?', 'Emergency teams. They need maps of all three zones, and a fresh map of the town before the flood peak arrives.', 'A map is "fresh" here when it was taken in the last 6 hours of the mission.'],
      ['Why do coverage and observation quality matter?', 'A camera cannot see through cloud or in the dark, and the storm that causes the flood also brings cloud. A map of clouds does not show the water.', 'Optical sensors need sunlight and clear sky. Radar (SAR) makes its own signal, so it works through cloud and at night, with bigger files and more power.'],
      ['What must you do, and what makes it hard?', 'Map all three zones, deliver enough useful maps, and deliver a fresh town map. You get eight passes, eight 10-minute contacts, cloud, night, and a power fault.', 'The satellite is in low Earth orbit. Eight passes in one day is a teaching simplification: a real single satellite returns to one place every few days.'] ] },
  };
  const BRIEF = {
    storm: { what: 'A hurricane is heading for the coast.', who: 'Forecasters need fresh storm pictures.', hard: 'Pictures pile up faster than the radio can send them, and a power fault is coming.', req: ['12 science points delivered', '3 of 4 storm phases imaged', 'Fresh image delivered after 18:00', 'Satellite survives'] },
    fire: { what: 'A wildfire is burning near homes.', who: 'Responders need fire locations and fast alerts.', hard: 'Only four passes and a few contacts with Earth, and a power fault is coming.', req: ['3 science points delivered', 'Hotspot alert within 2 h', 'Final image delivered by 24:00', 'Satellite survives'] },
    flood: { what: 'A river is flooding a valley and a town.', who: 'Emergency teams need flood maps.', hard: 'Cloud, night, 10-minute contacts, and a power fault.', req: ['5 map points delivered', 'All 3 zones mapped', 'Fresh town map delivered', 'Satellite survives'] },
  };
  const WHY_ORBIT = {
    storm: 'Why this orbit: a geostationary satellite circles Earth once a day, as fast as Earth turns, so it stays over the same region and can watch a storm without a break. This mission has one fixed architecture.',
    fire: 'Why this orbit: fire detection needs fine detail, so the satellite flies low (about 824 km). The price is that it only passes over the fire a few times a day.',
    flood: 'Why this orbit: detailed flood maps need a low orbit (747 km, like the real NISAR radar satellite). The price is short passes and short ground contacts. This mission has one fixed architecture.',
  };

  /* ---------- 1b. mission architecture options (only Wildfire Watch has a choice) ---------- */
  function contactWindows(A) { const w = A.contacts.map(c => c.slice()).sort((a, b) => a[0] - b[0]), out = []; for (const c of w) { const l = out[out.length - 1]; if (l && c[0] <= l[1] + EPS) l[1] = Math.max(l[1], c[1]); else out.push(c); } return out; }
  const ARCH_COPY = {
    'pm-sso': { short: 'Mid-afternoon orbit', plain: 'The original schedule.',
      gain: 'Earlier looks, more contact time.', cost: 'No solar power in Earth\'s shadow, every lap.' },
    'dawn-dusk-sso': { short: 'Dawn-dusk orbit', plain: 'Flies along the day/night line.',
      gain: 'Sunlight all the time: more battery margin.', cost: 'Every look comes 90 minutes later; less time to send at the end.' },
  };
  function archOptions(m) { if (m !== 'fire' || !WF.ARCH) return [];
    return Object.keys(WF.ARCH).map(id => { const A = WF.ARCH[id], w = contactWindows(A), ecl = A.eclipse.eclipseSteps.length * WF.CONFIG.stepMin, cyc = A.eclipse.cycleSteps * WF.CONFIG.stepMin, hours = w.reduce((a, c) => a + c[1] - c[0], 0);
      return Object.assign({ id, version: A.version, name: A.name, isDefault: id === WF.DEFAULT_ARCH,
        passes: A.passes.map(p => hm(p.h)), windows: w.map(c => `${hm(c[0])}–${hm(c[1])}`), contactHours: hours, eclipseMin: ecl, orbitMin: cyc,
        facts: [`Passes over the fire at ${A.passes.map(p => hm(p.h)).join(', ')}`, `Ground contacts ${w.map(c => `${hm(c[0])}–${hm(c[1])}`).join(', ')} (${n1(hours)} h in total)`, ecl ? `In Earth's shadow ${ecl} of every ${cyc} minutes` : 'No eclipse: in sunlight all the time (simplified)'],
        detection: 'Fire detection works exactly the same in both orbits. This game does not model fires being more active at some times of day.',
        label: 'Both schedules are simplified teaching schedules (class D), not computed orbits.' }, ARCH_COPY[id]); }); }
  const archInfo = (m, id) => archOptions(m).find(a => a.id === (id || DEFAULT_ARCH[m])) || null;

  /* ---------- 2. shared measurement helpers: read the engines' ledgers, never recompute physics ---------- */
  const stormDel = M => M.records.filter(r => r.status === 'delivered');
  const fireImgs = M => M.items.filter(i => i.kind === 'image'), fireAlerts = M => M.items.filter(i => i.kind === 'alert');
  const floodMaps = M => M.items.filter(i => i.kind === 'map');
  const floodQual = (M, i, z) => (i.zoneScore[z] || 0) >= M.C.qualify - EPS;
  const partName = (m, M, k) => M.P[k].name;
  const fmtLat = h => h >= 1 ? `${n2(h)} h` : mins(h);

  /* ---------- 3. mandatory requirements (the engines' own gates) ---------- */
  // Each gate: text, threshold, relevant parts and challenges, and evidence(M, sc) -> { measured, evidence[], why, constraint }
  const GATES = {
    storm: [
      { id: 'G1', text: 'Deliver useful science', threshold: 'at least 12 science points delivered (age-weighted)', parts: ['instrument', 'observation', 'comms', 'storage'], ch: [0, 1, 3],
        ev: (M, sc) => { const d = sc.derived, del = stormDel(M), left = M.records.filter(r => r.status === 'stored'), lost = M.records.filter(r => r.status === 'lost');
          const leftPts = left.reduce((a, r) => a + r.pts, 0), lostPts = lost.reduce((a, r) => a + r.pts, 0), ageLoss = d.deliveredRaw - d.deliveredScience, notCollected = Math.max(0, M.C.requiredScience - d.collectedScience - lostPts);
          const ev = [`${plural(del.length, 'image')} delivered = ${n1(d.deliveredRaw)} pts before ageing, ${n1(d.deliveredScience)} pts after`, d.meanLatency === null ? 'no image delivered' : `mean delay from capture to delivery ${n1(d.meanLatency)} h`,
            `${plural(left.length, 'image')} (${n1(leftPts)} pts) still on board at 24:00`, `${n1(d.generatedGB)} GB generated, ${n1(d.deliveredGB)} GB delivered`];
          if (M.missedCaptures) ev.push(`${plural(M.missedCaptures, 'planned image')} not taken (${Object.entries(M.missedReasons).map(([k, v]) => `${v} × ${k === 'storage' ? 'storage full' : 'battery at reserve'}`).join(', ')})`);
          const losses = [[leftPts, `${plural(left.length, 'image')} worth ${n1(leftPts)} pts never left the satellite: the link moved ${n1(d.deliveredGB)} of ${n1(d.generatedGB)} GB.`],
            [ageLoss, `Delivered images lost ${n1(ageLoss)} pts to ageing: they reached Earth ${n1(d.meanLatency || 0)} h after capture on average.`],
            [lostPts, `${plural(lost.length, 'image')} worth ${n1(lostPts)} pts were discarded or pushed out of storage.`],
            [notCollected, `Only ${n1(d.collectedScience)} pts were collected in the first place${M.missedCaptures ? ` (${M.missedCaptures} planned image(s) not taken)` : ': too few or too weak images'}.`]].sort((a, b) => b[0] - a[0]);
          return { measured: `${n1(d.deliveredScience)} / ${M.C.requiredScience} pts`, evidence: ev, why: sc.gates.G1 ? `Enough images reached Earth quickly enough to keep their value.` : `Biggest loss: ${losses[0][1]}`,
            constraint: `${n1(d.generatedGB)} GB generated vs ${n1(d.deliveredGB)} GB delivered` }; } },
      { id: 'G2', text: 'Cover the storm\'s life', threshold: 'a qualifying image in at least 3 of the 4 six-hour storm phases', parts: ['instrument', 'observation', 'power', 'storage'], ch: [0, 1, 2],
        ev: (M, sc) => { const d = sc.derived, live = M.records.filter(r => r.status !== 'lost' && r.qualifies);
          const per = [0, 1, 2, 3].map(p => { const r = live.filter(x => x.phase === p).sort((a, b) => a.t - b.t)[0]; return r ? `phase ${p + 1} (${hm(p * 6)}–${hm(p * 6 + 6)}): first qualifying image at ${hm(r.t)}` : `phase ${p + 1} (${hm(p * 6)}–${hm(p * 6 + 6)}): no qualifying image`; });
          const miss = [0, 1, 2, 3].filter(p => !d.coveredSet.includes(p)).map(p => { const evs = M.events.filter(e => e.t >= p * 6 - EPS && e.t < p * 6 + 6 - EPS);
            const why = M.failed && evs.some(e => e.type === 'failure') ? 'the spacecraft had failed' : evs.some(e => e.type === 'rejected') ? 'storage was full' : evs.some(e => e.type === 'deferred' && /Imaging/.test(e.msg)) ? 'the battery was at its reserve' : M.records.some(r => r.phase === p) ? 'the images taken were too weak to count or were lost' : 'no image was planned or the spacecraft was down';
            return `phase ${p + 1}: ${why}`; });
          return { measured: `${d.coveredPhases} / 4 phases`, evidence: per, why: sc.gates.G2 ? 'Qualifying images were kept from enough phases.' : `Phases without a qualifying image: ${miss.join('; ')}.`, constraint: `${plural(M.missedCaptures, 'planned image')} not taken` }; } },
      { id: 'G3', text: 'Deliver the critical update', threshold: 'a qualifying image taken after 18:00 delivered by 24:00', parts: ['comms', 'power', 'storage'], ch: [3, 2],
        ev: (M, sc) => { const d = sc.derived, p4 = M.records.filter(r => r.phase === 3 && r.qualifies), del = p4.filter(r => r.status === 'delivered').sort((a, b) => a.deliveredAt - b.deliveredAt)[0], stuck = p4.filter(r => r.status === 'stored');
          const ev = del ? [`image #${del.id} captured ${hm(del.t)}, delivered ${hm(del.deliveredAt)} (${fmtLat(del.deliveredAt - del.t)} later)`] : p4.length ? stuck.map(r => `image #${r.id} captured ${hm(r.t)}: ${n2(r.remainingGB)} of ${n2(r.sizeGB)} GB still to send at 24:00`) : ['no qualifying image was captured between 18:00 and 24:00'];
          const queue = M.records.filter(r => r.status === 'stored').reduce((a, r) => a + r.remainingGB, 0);
          return { measured: del ? `delivered ${hm(del.deliveredAt)}` : 'not delivered', evidence: ev, why: d.critical ? 'A fresh image got through the queue before the deadline.' : p4.length ? `A fresh image existed but ${n1(queue)} GB was still queued on board at 24:00, so it never finished sending.` : 'No fresh image could be taken in the last 6 hours (storage full, battery at reserve, or spacecraft down).',
            constraint: `${n1(queue)} GB still queued at 24:00` }; } },
      { id: 'G4', text: 'Keep the spacecraft alive', threshold: 'no critical failure (essential systems never unpowered 2 hours in a row)', parts: ['power'], ch: [2],
        ev: (M, sc) => { const inc = M.events.filter(e => e.type === 'incident').map(e => e.msg.replace('Essential bus unpowered during hour ', 'hour '));
          return { measured: M.failed ? 'critical failure' : `no failure, health ${M.health}%`, evidence: [`essential systems powered ${n1(M.essentialHours)} of 24 h`, inc.length ? `unpowered: ${inc.join(', ')}` : 'no unpowered hour', `battery at 24:00: ${Math.round(sc.derived.batteryPct)}%`],
            why: M.failed ? 'The battery ran empty for two hours in a row during the solar fault.' : inc.length ? 'The battery ran empty for a short time, but not long enough to lose the spacecraft.' : 'The battery always covered the essential systems.', constraint: `battery ${M.P.power.battKWh} kWh, solar ${M.P.power.solarKW} kW` }; } },
    ],
    fire: [
      { id: 'G1', text: 'Deliver useful fire science', threshold: 'at least 3 science points delivered (age-weighted)', parts: ['instrument', 'comms', 'storage'], ch: [0, 1, 3],
        ev: (M, sc) => { const d = sc.derived, imgs = fireImgs(M), del = imgs.filter(i => i.status === 'delivered'), left = imgs.filter(i => i.status === 'stored'), raw = del.reduce((a, i) => a + i.pts, 0), leftPts = left.reduce((a, i) => a + i.pts, 0);
          const delGB = M.items.filter(i => i.status === 'delivered').reduce((a, i) => a + i.sizeGB, 0);
          const losses = [[leftPts, `${plural(left.length, 'image')} worth ${n1(leftPts)} pts never left the satellite.`], [raw - d.deliveredScience, `Delivered images lost ${n1(raw - d.deliveredScience)} pts to ageing while they waited for a contact.`],
            [Math.max(0, WF.CONFIG.requiredScience - d.collectedScience), `Only ${n1(d.collectedScience)} pts were collected. An image only scores for the fires it detects, and your images detected ${M.detected.size} of the ${WF.CONFIG.events.length} fire events${M.missed ? `; ${plural(M.missed, 'planned image')} could not be taken` : ''}.`]].sort((a, b) => b[0] - a[0]);
          return { measured: `${n1(d.deliveredScience)} / ${WF.CONFIG.requiredScience} pts`, evidence: [`${del.length} of ${plural(imgs.length, 'image')} delivered = ${n1(raw)} pts before ageing, ${n1(d.deliveredScience)} after`, `${plural(left.length, 'image')} (${n1(leftPts)} pts) still on board at 24:00`, `${n1(M.generatedGB)} GB generated, ${n1(delGB)} GB delivered`].concat(M.missed ? [`${plural(M.missed, 'planned image')} not taken`] : []),
            why: sc.gates.G1 ? 'Enough images reached responders while they were still fresh.' : `Biggest loss: ${losses[0][1]}`, constraint: `${n1(M.generatedGB)} GB generated vs ${n1(delGB)} GB delivered` }; } },
      { id: 'G2', text: 'Warn about the new hotspot', threshold: `alert delivered within ${WF.CONFIG.alertOnTimeH} h of detection`, parts: ['instrument', 'comms'], ch: [3, 1],
        ev: (M, sc) => { const C = WF.CONFIG, a = fireAlerts(M).find(x => x.critical), e5 = C.events.find(e => e.critical), last = fireImgs(M).filter(i => i.pass === e5.pass), need = C.eventThreshold[e5.cls];
          if (a) { const lat = a.status === 'delivered' ? a.deliveredAt - a.t : null;
            return { measured: lat === null ? 'detected, alert never delivered' : `${fmtLat(lat)} after detection`, evidence: [`hotspot detected at ${hm(a.t)} (region ${e5.region})`, lat === null ? 'alert still on board at 24:00' : `alert delivered at ${hm(a.deliveredAt)}`],
              why: lat === null ? 'The hotspot was detected, but its alert was still waiting in the downlink queue at 24:00 (a file already being sent finishes first).' : lat <= C.alertOnTimeH + EPS ? 'The alert went out on the first contact after detection.' : 'The alert waited behind other data and arrived more than 2 hours after detection.', constraint: lat === null ? 'no contact time left' : `first usable contact ${fmtLat(lat)} after the pass` }; }
          const why = !last.length ? 'The final pass was not imaged (plan, battery reserve, full storage or safe mode).' : !last.some(i => i.regions.includes(e5.region)) ? `The final pass looked at ${last[0].regions.join(', ')}; the hotspot was in region ${e5.region}, outside the footprint.` : `Region ${e5.region} was imaged, but detection strength ${n2(Math.max(...last.map(i => i.strength)))} was below the ${need} needed for a ${e5.cls.toLowerCase()} fire.`;
          return { measured: 'hotspot not detected', evidence: last.length ? last.map(i => `final-pass image #${i.id} at ${hm(i.t)}: regions ${i.regions.join(', ')}, detection strength ${n2(i.strength)}`) : ['no image on the final pass'], why, constraint: last.length ? `detection strength ${n2(Math.max(...last.map(i => i.strength)))} vs ${need} needed` : 'no final-pass image' }; } },
      { id: 'G3', text: 'Deliver the final update', threshold: 'a qualifying image from the final pass delivered by 24:00', parts: ['comms', 'instrument', 'storage'], ch: [3, 1],
        ev: (M, sc) => { const last = fireImgs(M).filter(i => i.pass === 3), ok = last.filter(i => i.qualifies && i.status === 'delivered').sort((a, b) => a.deliveredAt - b.deliveredAt)[0];
          const ev = last.length ? last.map(i => `image #${i.id} captured ${hm(i.t)}, ${n2(i.pts)} pts${i.qualifies ? '' : ' (too weak to count)'}: ${i.status === 'delivered' ? 'delivered ' + hm(i.deliveredAt) : `${n2(i.remainingGB)} of ${n2(i.sizeGB)} GB still to send at 24:00`}`) : ['no image on the final pass'];
          const why = ok ? 'A final-pass image finished sending before 24:00.' : !last.length ? 'No image was taken on the final pass.' : !last.some(i => i.qualifies) ? 'The final-pass image detected too little to count as an update.' : `The final-pass image was too big for the contact time left: ${n2(Math.min(...last.filter(i => i.qualifies).map(i => i.remainingGB)))} GB was still on board at 24:00.`;
          return { measured: ok ? `delivered ${hm(ok.deliveredAt)}` : 'not delivered', evidence: ev, why, constraint: `link ${M.P.comms.rateGBh} GB/h, final image ${last.length ? n2(last[0].origGB) : '–'} GB` }; } },
      { id: 'G4', text: 'Keep the spacecraft alive', threshold: 'no critical failure (never unpowered for 2 hours)', parts: ['power'], ch: [2],
        ev: (M, sc) => { const safe = M.events.filter(e => /Safe mode entered/.test(e.msg)).map(e => hm(e.h));
          return { measured: M.failed ? 'critical failure' : `no failure, health ${M.health}%`, evidence: [`lowest battery ${Math.round(M.minBatt)}%`, safe.length ? `safe mode entered at ${safe.join(', ')}` : 'never in safe mode', `operating ${n1(M.opHours)} of 24 h`],
            why: M.failed ? 'The battery stayed empty for two hours during the solar fault.' : safe.length ? 'The battery dropped below 5% and the satellite protected itself in safe mode, but it survived.' : 'The battery always covered the essential systems.', constraint: `lowest battery ${Math.round(M.minBatt)}%` }; } },
    ],
    flood: [
      { id: 'G1', text: 'Deliver useful flood maps', threshold: 'at least 5 map points delivered', parts: ['instrument', 'observation', 'comms', 'storage'], ch: [0, 1, 3],
        ev: (M, sc) => { const d = sc.derived, maps = floodMaps(M), del = maps.filter(i => i.status === 'delivered'), left = maps.filter(i => i.status === 'stored'), lost = maps.filter(i => i.status === 'lost'), leftPts = left.reduce((a, i) => a + i.pts, 0);
          const sk = Object.entries(M.skipped).filter(([, v]) => v > 0).map(([k, v]) => `${v} × ${({ dark: 'too dark', energy: 'battery at reserve', storage: 'storage full', screened: 'screened as cloud', safe: 'safe mode' })[k]}`), nSk = Object.values(M.skipped).reduce((a, b) => a + b, 0);
          const delGB = del.reduce((a, i) => a + i.sizeGB, 0);
          const losses = [[leftPts, `${plural(left.length, 'map')} worth ${n1(leftPts)} pts never left the satellite: contacts moved ${n1(delGB)} of ${n1(M.generatedGB)} GB.`], [lost.reduce((a, i) => a + i.pts, 0), `${plural(lost.length, 'map')} were dropped from storage.`],
            [Math.max(0, M.C.requiredMaps - d.collected), `Only ${n1(d.collected)} map pts were collected: ${nSk} planned map(s) not taken (${sk.join(', ') || 'none'}), and cloud lowers what a camera map is worth.`]].sort((a, b) => b[0] - a[0]);
          return { measured: `${n1(d.delivered)} / ${M.C.requiredMaps} map pts`, evidence: [`${del.length} of ${plural(maps.length, 'map')} delivered`, `${plural(left.length, 'map')} (${n1(leftPts)} pts) still on board at the end`, `${n1(M.generatedGB)} GB generated, ${n1(delGB)} GB delivered`].concat(sk.length ? [`not taken: ${sk.join(', ')}`] : []),
            why: sc.gates.G1 ? 'Enough map value reached the emergency teams.' : `Biggest loss: ${losses[0][1]}`, constraint: `${n1(M.generatedGB)} GB generated vs ${n1(delGB)} GB delivered` }; } },
      { id: 'G2', text: 'Map every zone', threshold: 'a clear map (zone score ≥ 0.5) of all 3 zones', parts: ['instrument', 'observation'], ch: [0, 1],
        ev: (M, sc) => { const live = floodMaps(M).filter(i => i.status !== 'lost'), radar = M.P.instrument.kind === 'radar';
          const per = FL.ZONES.map(z => { const best = live.filter(i => i.zones.includes(z)).sort((a, b) => (b.zoneScore[z] || 0) - (a.zoneScore[z] || 0))[0]; return `${FL.ZNAME[z]}: ${best ? `best zone score ${n2(best.zoneScore[z])} (map #${best.id} at mission hour ${hm(best.t)})${floodQual(M, best, z) ? '' : ', below 0.5'}` : 'never imaged'}`; });
          const missing = FL.ZONES.filter(z => !sc.derived.zonesQ.includes(z)).map(z => FL.ZNAME[z]);
          return { measured: `${sc.derived.coveredZones} / 3 zones`, evidence: per, why: sc.gates.G2 ? 'Each zone has at least one clear map.' : `No clear map of ${missing.join(' and ')}: ${radar ? 'radar maps of hills and towns score lower, so aim and detail matter' : `the camera lost ${M.skipped.dark} map(s) to darkness and cloud cut the value of the rest`}.`,
            constraint: radar ? 'radar: all passes usable' : `camera: ${M.skipped.dark} map(s) lost to darkness` }; } },
      { id: 'G3', text: 'Deliver a fresh town map', threshold: 'a clear town map taken in the last 6 hours and delivered before the end', parts: ['comms', 'instrument', 'power'], ch: [3, 2],
        ev: (M, sc) => { const tq = floodMaps(M).filter(i => i.townQual), del = tq.filter(i => i.status === 'delivered').sort((a, b) => a.deliveredAt - b.deliveredAt)[0], lateTown = floodMaps(M).filter(i => i.t >= 18 - EPS && i.zones.includes('TOWN'));
          const ev = del ? [`map #${del.id} captured at mission hour ${hm(del.t)}, delivered ${hm(del.deliveredAt)} (${fmtLat(del.deliveredAt - del.t)} later)`] : tq.length ? tq.map(i => `map #${i.id} captured ${hm(i.t)}: ${n2(i.remainingGB)} of ${n2(i.sizeGB)} GB still to send at the end`) : lateTown.length ? lateTown.map(i => `map #${i.id} at ${hm(i.t)}: town zone score ${n2(i.zoneScore.TOWN || 0)}, below 0.5`) : ['no town map was taken after mission hour 18:00'];
          const why = del ? 'A fresh town map got down before the deadline.' : tq.length ? 'A fresh town map was taken but did not finish sending in the contact time left.' : lateTown.length ? 'The late town maps were not clear enough to count.' : `No town map could be taken in the last 6 hours (${M.P.instrument.kind === 'optical' ? 'the first late pass is at night, when a camera cannot map' : 'battery reserve, safe mode or full storage'}).`;
          return { measured: del ? `delivered ${hm(del.deliveredAt)}` : 'not delivered', evidence: ev, why, constraint: `${n2(M.P.comms.rateGBmin * M.C.contactMin)} GB per contact, map ${n2(M.P.instrument.sizeGB)} GB raw` }; } },
      { id: 'G4', text: 'Keep the spacecraft alive', threshold: 'no critical failure (never unpowered 2 hours in a row)', parts: ['power'], ch: [2],
        ev: (M, sc) => ({ measured: M.failed ? 'critical failure' : `no failure, health ${M.health}%`, evidence: [`lowest battery ${Math.round(M.minBatt)}%`, `safe mode ${n1(sc.derived.safeHours)} h`, `unpowered hours: ${M.unpoweredHours.size}`],
          why: M.failed ? 'The battery stayed empty for two hours in a row during the night-time solar fault.' : sc.derived.safeHours > 0 ? 'The battery fell below 10% and the satellite paused science in safe mode, but it survived.' : 'The battery always covered the essential systems.', constraint: `lowest battery ${Math.round(M.minBatt)}%` }) },
    ],
  };

  /* ---------- 4. student-selected targets (one numeric target; adds no points; class D thresholds) ---------- */
  // measure(M) -> { value: number|null, text, evidence[] }. value === null means "no evidence": never Met.
  const T = (o) => Object.assign({ cls: 'D', defVersion: DEF_VERSION }, o);
  const TARGETS = {
    storm: [
      T({ id: 'S1', title: 'Fast critical update', statement: 'Get the first fresh image of the final storm phase to forecasters by mission hour 20:00.', unit: 'mission hour of delivery', op: '<=', threshold: 20,
        definition: 'Earliest delivery time of a qualifying image captured at or after 18:00.', source: 'engine image ledger: deliveredAt of delivered records with phase 4 and qualifies = true', verify: 'Met if that time is 20:00 or earlier. Not met if later, or if no such image was delivered.',
        demands: 'The mandatory requirement only asks for delivery by 24:00. Four hours earlier means the downlink queue must be nearly empty when the last phase starts: think link speed, image size and what you send first.',
        parts: ['comms', 'instrument', 'storage', 'power'], ch: [3, 1, 2], fmt: v => hm(v),
        measure: M => { const c = stormDel(M).filter(r => r.phase === 3 && r.qualifies).sort((a, b) => a.deliveredAt - b.deliveredAt)[0]; return c ? { value: c.deliveredAt, evidence: [`image #${c.id} captured ${hm(c.t)}, delivered ${hm(c.deliveredAt)}`] } : { value: null, evidence: ['no qualifying image from 18:00–24:00 was delivered'] }; } }),
      T({ id: 'S2', title: 'The whole storm story', statement: 'Deliver at least one qualifying image from all 4 storm phases.', unit: 'storm phases with a delivered image', op: '>=', threshold: 4,
        definition: 'Number of 6-hour storm phases (0–4) with at least one qualifying image delivered to Earth by 24:00.', source: 'engine image ledger: phase of delivered records with qualifies = true', verify: 'Met if the count is 4.',
        demands: 'The mandatory requirement accepts 3 phases and counts images that are still on board. This target needs every phase imaged AND delivered, including the phase hit by the power fault.',
        parts: ['power', 'comms', 'storage', 'observation'], ch: [0, 1, 2, 3], fmt: v => `${v} of 4`,
        measure: M => { const del = stormDel(M).filter(r => r.qualifies), ph = [0, 1, 2, 3].filter(p => del.some(r => r.phase === p)); return { value: ph.length, evidence: [0, 1, 2, 3].map(p => { const r = del.filter(x => x.phase === p).sort((a, b) => a.deliveredAt - b.deliveredAt)[0]; return r ? `phase ${p + 1}: image #${r.id} delivered ${hm(r.deliveredAt)}` : `phase ${p + 1}: nothing delivered`; }) }; } }),
      T({ id: 'S3', title: 'Fresh data', statement: 'Keep the average delay between taking an image and delivering it at 2 hours or less.', unit: 'hours (mean capture-to-delivery delay)', op: '<=', threshold: 2,
        definition: 'Mean of (delivery time − capture time) over all delivered images.', source: 'engine image ledger: deliveredAt − t of delivered records (derive().meanLatency)', verify: 'Met if the mean is 2.0 h or less and at least one image was delivered.',
        demands: 'Images must not wait in storage. Make only as much data as your link can move: a bigger storage does not make anything arrive sooner.',
        parts: ['comms', 'instrument', 'observation', 'storage'], ch: [0, 1, 3], fmt: v => `${n2(v)} h`,
        measure: M => { const del = stormDel(M); if (!del.length) return { value: null, evidence: ['no image was delivered'] }; const lat = del.map(r => r.deliveredAt - r.t), mean = lat.reduce((a, b) => a + b, 0) / lat.length; return { value: mean, evidence: [`${plural(del.length, 'image')} delivered; delays from ${fmtLat(Math.min(...lat))} to ${fmtLat(Math.max(...lat))}`] }; } }),
    ],
    fire: [
      T({ id: 'F1', title: 'Wide awareness', statement: 'Detect at least 6 of the 8 fire events that happen during the mission.', unit: 'fire events detected', op: '>=', threshold: 6,
        definition: 'Number of scenario fire events (out of 8) detected by at least one image.', source: 'engine detection ledger (M.detected)', verify: 'Met if 6 or more events were detected.',
        demands: 'Weak and moderate fires need a strong detection signal, and fires outside the footprint are never seen. This asks for sensitivity and coverage at the same time, which makes bigger files.',
        parts: ['instrument', 'observation', 'storage', 'comms'], ch: [0, 2, 3], fmt: v => `${v} of 8`,
        measure: M => ({ value: M.detected.size, evidence: [`detected: ${[...M.detected].join(', ') || 'none'}`, `missed: ${WF.CONFIG.events.filter(e => !M.detected.has(e.id)).map(e => e.id).join(', ') || 'none'}`] }) }),
      T({ id: 'F2', title: 'Every alert on time', statement: 'Deliver every fire alert your satellite raises within 2 hours of detection.', unit: 'hours (slowest alert, detection to delivery)', op: '<=', threshold: WF.CONFIG.alertOnTimeH,
        definition: 'Largest (delivery time − detection time) over all alerts raised. An alert never delivered counts as not met.', source: 'engine alert ledger: deliveredAt − t of every alert item', verify: 'Met if at least one alert was raised and the slowest one took 2 h or less. The 2-hour limit is the same educational limit the mandatory hotspot alert uses.',
        demands: 'The mandatory requirement times only the last hotspot alert. This target times all of them, so alerts must never queue behind big images at any contact.',
        parts: ['comms', 'instrument', 'storage'], ch: [1, 2, 3], fmt: v => v === Infinity ? 'an alert was never delivered' : fmtLat(v),
        measure: M => { const a = fireAlerts(M); if (!a.length) return { value: null, evidence: ['no alert was raised'] }; const und = a.filter(x => x.status !== 'delivered');
          return { value: und.length ? Infinity : Math.max(...a.map(x => x.deliveredAt - x.t)), evidence: a.map(x => `${x.event}: detected ${hm(x.t)}, ${x.status === 'delivered' ? `delivered ${hm(x.deliveredAt)} (${fmtLat(x.deliveredAt - x.t)})` : 'never delivered'}`) }; } }),
      T({ id: 'F3', title: 'A complete fire record', statement: 'Deliver a qualifying image from all 4 passes before 24:00.', unit: 'passes with a delivered image', op: '>=', threshold: 4,
        definition: 'Number of observation passes (0–4) with at least one qualifying image delivered by 24:00.', source: 'engine item ledger: pass of delivered images with qualifies = true', verify: 'Met if the count is 4.',
        demands: 'Every pass must be imaged, including the one during the power fault, and every image must fit through the contacts that are left.',
        parts: ['comms', 'power', 'storage', 'instrument'], ch: [1, 2, 3], fmt: v => `${v} of 4`,
        measure: M => { const del = fireImgs(M).filter(i => i.status === 'delivered' && i.qualifies); return { value: [0, 1, 2, 3].filter(p => del.some(i => i.pass === p)).length, evidence: [0, 1, 2, 3].map(p => { const i = del.filter(x => x.pass === p).sort((a, b) => a.deliveredAt - b.deliveredAt)[0]; return i ? `pass ${p + 1}: image #${i.id} delivered ${hm(i.deliveredAt)}` : `pass ${p + 1}: nothing delivered`; }) }; } }),
    ],
    flood: [
      T({ id: 'L1', title: 'Every zone in responders\' hands', statement: 'Deliver a clear map of all 3 zones.', unit: 'zones with a delivered clear map', op: '>=', threshold: 3,
        definition: 'Number of zones (0–3) with a delivered map whose zone score is 0.5 or more.', source: 'engine map ledger: zoneScore of delivered maps', verify: 'Met if the count is 3.',
        demands: 'The mandatory requirement counts a zone as mapped even if the map is still on board. This target needs each zone\'s map to actually reach the ground.',
        parts: ['comms', 'instrument', 'observation', 'storage'], ch: [0, 1, 3], fmt: v => `${v} of 3`,
        measure: M => { const del = floodMaps(M).filter(i => i.status === 'delivered'); const zs = FL.ZONES.filter(z => del.some(i => floodQual(M, i, z))); return { value: zs.length, evidence: FL.ZONES.map(z => { const i = del.filter(x => floodQual(M, x, z)).sort((a, b) => a.deliveredAt - b.deliveredAt)[0]; return `${FL.ZNAME[z]}: ${i ? `map #${i.id} delivered at mission hour ${hm(i.deliveredAt)}` : 'no clear map delivered'}`; }) }; } }),
      T({ id: 'L2', title: 'A truly fresh town map', statement: 'Get a fresh town map to responders within 30 minutes of taking it.', unit: 'minutes (town map age at delivery)', op: '<=', threshold: 30,
        definition: 'Smallest (delivery time − capture time) of a delivered clear town map taken in the last 6 hours.', source: 'engine map ledger: deliveredAt − t of delivered maps flagged townQual', verify: 'Met if that age is 30 minutes or less. Not met if no fresh town map was delivered.',
        demands: 'Ground contacts come about 90 minutes after each pass. Half an hour needs a faster path to the ground and a map small enough to send in one short window.',
        parts: ['comms', 'instrument', 'power'], ch: [3, 1, 2], fmt: v => mins(v / 60),
        measure: M => { const t = floodMaps(M).filter(i => i.status === 'delivered' && i.townQual).sort((a, b) => (a.deliveredAt - a.t) - (b.deliveredAt - b.t))[0]; return t ? { value: (t.deliveredAt - t.t) * 60, evidence: [`map #${t.id} captured at mission hour ${hm(t.t)}, delivered ${hm(t.deliveredAt)}`] } : { value: null, evidence: ['no fresh clear town map was delivered'] }; } }),
      T({ id: 'L3', title: 'High-volume mapping', statement: 'Deliver at least 6 clear maps.', unit: 'clear maps delivered', op: '>=', threshold: 6,
        definition: 'Number of delivered maps with a zone score of 0.5 or more in at least one zone.', source: 'engine map ledger: count of delivered maps with a qualifying zoneScore', verify: 'Met if the count is 6 or more.',
        demands: 'Six clear maps means using most of the eight passes, including cloudy and night-time ones, and moving all of that data through 10-minute contacts.',
        parts: ['instrument', 'observation', 'comms', 'storage', 'power'], ch: [0, 1, 2, 3], fmt: v => `${v}`,
        measure: M => { const del = floodMaps(M).filter(i => i.status === 'delivered' && i.zones.some(z => floodQual(M, i, z))); return { value: del.length, evidence: [del.length ? `delivered clear maps: ${del.map(i => `#${i.id} (${hm(i.deliveredAt)})`).join(', ')}` : 'no clear map delivered'] }; } }),
    ],
  };
  const targetDef = (m, id) => (TARGETS[m] || []).find(t => t.id === id) || null;
  function evaluateTarget(m, id, M) { const t = targetDef(m, id); if (!t || !M) return { status: 'Not applicable', value: null, text: 'no target selected', evidence: [], def: t };
    const r = t.measure(M), has = r.value !== null && r.value !== undefined && !Number.isNaN(r.value);
    const met = has && (t.op === '<=' ? r.value <= t.threshold + EPS : r.value >= t.threshold - EPS);
    return { status: met ? 'Met' : 'Not met', value: has ? r.value : null, text: has ? t.fmt(r.value) : 'no measurement', evidence: r.evidence, def: t, noEvidence: !has }; }
  // The stored requirement: goes into the mission state (M.requirement) and the mission record.
  function requirementState(m, targetId) { const t = targetDef(m, targetId);
    return { mission: m, definitionVersion: DEF_VERSION, mandatory: GATES[m].map(g => ({ id: g.id, text: g.text, threshold: g.threshold })),
      target: t ? { id: t.id, title: t.title, threshold: t.threshold, op: t.op, unit: t.unit, definition: t.definition, measurementSource: t.source, class: t.cls, relevantParts: t.parts.slice(), relevantChallenges: t.ch.map(c => c + 1) } : null }; }
  function attach(M, m, targetId, archId) { M.requirement = requirementState(m, targetId); if (archId !== undefined) M.architectureId = archId; return M; }

  /* ---------- 5. launch profiles: ONE fixed profile per mission (no rocket selection) ---------- */
  // maxKg is read from the engine's own mass limit, so the launch check and the engine's validity rule can never disagree.
  const LAUNCH = {
    storm: { id: 'storm-gto', version: '1.0', name: 'GTO-class delivery', orbit: 'geostationary transfer orbit; the satellite then raises itself to geostationary orbit (35,786 km) with its own fuel', maxKg: () => CFG.storm().limits.kg, cls: 'D',
      basis: 'Educational limit, set equal to the launch mass of the real GOES-R weather satellites (5,192 kg fuelled; class B, NOAA NESDIS, checked 2026-11-15). It is not the payload capacity of any rocket.',
      note: 'About 45% of GOES-R\'s launch mass is fuel (5,192 kg fuelled, 2,857 kg dry). That is why the fixed bus is so heavy in this mission.' },
    fire: { id: 'fire-leo', version: '1.0', name: 'Low-Earth-orbit delivery', orbit: 'sun-synchronous low Earth orbit, about 824 km', maxKg: () => CFG.fire().limits.kg, cls: 'D',
      basis: 'Educational limit chosen by the team for this mission (1,150 kg). It is not a rocket or spacecraft specification.', note: 'Both Wildfire Watch orbit options are at the same altitude, so they use the same launch limit.' },
    flood: { id: 'flood-leo', version: '1.0', name: 'Low-Earth-orbit delivery', orbit: 'sun-synchronous low Earth orbit, 747 km', maxKg: () => CFG.flood().limits.kg, cls: 'D',
      basis: 'Educational limit, set equal to the launch mass of the real NISAR radar satellite (about 2,380 kg; class B, NASA JPL press kit, checked 2026-11-15). It is not the payload capacity of any rocket.', note: '' },
  };
  const LAUNCH_COST_NOTE = 'Launch cost is not a separate line in this game. The mission budget covers the spacecraft only (fixed bus + your five parts), so no launch cost is added and none is counted twice.';
  function launchProfile(m /*, archId */) { return LAUNCH[m]; }
  function launchCheck(m, kg, archId) { const p = launchProfile(m, archId), max = p.maxKg(), ok = kg <= max;
    return { ok, kg, maxKg: max, marginKg: max - kg, profile: p, message: ok ? `Your spacecraft (${kg.toLocaleString()} kg) fits this launch: up to ${max.toLocaleString()} kg to ${p.orbit.split(';')[0]}.`
      : `Your spacecraft is heavier than this launch can carry to its orbit (${kg.toLocaleString()} kg, limit ${max.toLocaleString()} kg). Reduce mass by ${(kg - max).toLocaleString()} kg to launch.` }; }

  /* ---------- 6. Design Check: the single readiness logic (review.js renders it; nothing here knows the Mission Code) ---------- */
  // kind: 'feasibility' = hard constraint (fail -> Not Ready, launch blocked) · 'risk' = feasible but risky (Caution) · 'info'
  // st: 'ok' | 'cau' | 'no'. Formulas and thresholds for the risk rows are the v6.3 readiness review's, unchanged.
  function designCheck(m, design, archId) { const C = CFG[m](), P = k => C.parts[k][design[k]], t = totals(m, design), lim = limits(m), L = launchCheck(m, t.kg, archId), rows = [];
    const row = (kind, key, label, val, ok, note, risk, cause, pri) => rows.push({ kind, key, label, val, st: ok ? 'ok' : kind === 'feasibility' ? 'no' : 'cau', note, risk: ok ? '' : risk, cause: ok ? '' : cause, pri: pri || 9 });
    const heavy = () => PARTS.filter(k => design[k] === 'adv').map(k => `${P(k).name} (+${P(k).kg - C.parts[k].std.kg} kg)`).join(', ') || 'the fixed bus';
    const pricey = () => PARTS.filter(k => design[k] === 'adv').map(k => `${P(k).name} (+${costText(m, (m === 'fire' ? P(k).credits - C.parts[k].std.credits : P(k).costM - C.parts[k].std.costM))})`).join(', ') || 'the fixed bus';
    row('feasibility', 'launch', 'Launch compatibility (mass)', `${t.kg.toLocaleString()} / ${L.maxKg.toLocaleString()} kg`, L.ok, `${L.profile.name}: ${L.profile.basis}`, L.message, `Mass comes from the ${C.bus.kg.toLocaleString()} kg bus plus your parts. Heavier choices: ${heavy()}.`, 0);
    row('feasibility', 'budget', 'Mission budget', `${costText(m, t.cost)} / ${costText(m, lim.cost)}`, t.cost <= lim.cost, 'Spacecraft only. ' + LAUNCH_COST_NOTE, `The spacecraft costs ${costText(m, t.cost - lim.cost)} more than the mission budget. Swap a part to launch.`, `Costlier choices: ${pricey()}.`, 0);
    if (m === 'storm') { const gen = P('observation').maxPerHour * 6 * P('instrument').sizeGB, cap = P('comms').rateGBh * C.backgroundDownlink * 6, fill = gen > cap ? P('storage').capGB / ((gen - cap) / 6) : Infinity, batH = P('power').battKWh / C.essentialKW, net = P('power').solarKW * C.anomalySolarFactor - C.essentialKW;
      row('feasibility', 'fit', 'One image fits in storage', `${n2(P('instrument').sizeGB)} GB image, ${P('storage').capGB} GB storage`, P('instrument').sizeGB <= P('storage').capGB, 'An image bigger than the storage could never be kept.', 'A single image is bigger than the storage.', 'Imager file size vs storage capacity.', 0);
      row('feasibility', 'sun', 'Solar power covers essential systems in normal sunlight', `${n2(P('power').solarKW)} kW vs ${n2(C.essentialKW)} kW`, P('power').solarKW >= C.essentialKW, 'Otherwise the battery would drain even on a normal day.', 'The solar arrays cannot keep the essential systems running.', 'Solar output vs essential load.', 0);
      row('risk', 'flow', 'Data made vs. sent (per 6 h)', `${n1(gen)} GB vs ${n1(cap)} GB`, gen <= cap + EPS, 'At top speed. Extra data waits in storage and arrives late.', 'Your satellite can make more images than it can send, so some will reach forecasters late.', `${P('observation').name} × ${P('instrument').name} makes up to ${n1(gen)} GB in 6 h; ${P('comms').name} sends ${n1(cap)} GB at the background rate.`, 3);
      row('risk', 'storage', 'Storage fills in', gen > cap ? `${n1(fill)} h` : 'never at this rate', gen <= cap || fill >= 12, `${P('storage').capGB} GB on board`, 'Storage may fill up during the mission, leaving no room for new images.', `The backlog grows by ${n1((gen - cap) / 6)} GB each hour into ${P('storage').capGB} GB of storage.`, 2);
      row('risk', 'battery', 'Battery backup', `${n1(batH)} h`, batH >= 4, `${P('power').battKWh} kWh ÷ ${C.essentialKW} kW for essential systems`, 'The battery alone can keep essential systems running for only a short time.', `${P('power').battKWh} kWh of battery against a ${C.essentialKW} kW essential load.`, 4);
      row('risk', 'fault', 'Power during a solar fault', `${n1(net)} kW`, net >= -0.8, `Standard test case: solar output at ${Math.round(C.anomalySolarFactor * 100)}%. Battery may drain if solar power drops.`, 'If solar power drops, the battery will drain quickly.', `${n2(P('power').solarKW)} kW of solar × ${Math.round(C.anomalySolarFactor * 100)}% is less than the ${C.essentialKW} kW the essential systems need.`, 1);
      row('info', 'link', 'Downlink speed', `${P('comms').rateGBh} GB/h`, true, 'Half speed in Challenges 1–3');
    } else if (m === 'fire') { const A = fireArch(archId), cLen = A.contacts[0][1] - A.contacts[0][0], perPass = P('observation').perPass * P('instrument').sizeGB, perC = P('comms').rateGBh * cLen, det = P('instrument').sens * C.mode.high.detect * C.footprint.wide.detect, net = P('power').solarKW * C.anomaly.solarFactor - C.baselineKW;
      const eclH = A.eclipse.eclipseSteps.length * C.stepMin / 60, cycleMin = A.eclipse.cycleSteps * C.stepMin, sunShare = 1 - A.eclipse.eclipseSteps.length / A.eclipse.cycleSteps;
      row('feasibility', 'fit', 'One image fits in storage', `${n2(P('instrument').sizeGB)} GB image, ${P('storage').capGB} GB storage`, P('instrument').sizeGB <= P('storage').capGB, 'An image bigger than the storage could never be kept.', 'A single image is bigger than the storage.', 'Imager file size vs storage capacity.', 0);
      row('feasibility', 'sun', 'Solar power covers the baseline load over a normal orbit', `${n2(P('power').solarKW * sunShare)} kW average vs ${n2(C.baselineKW)} kW`, P('power').solarKW * sunShare >= C.baselineKW, `Sunlit for ${Math.round(sunShare * 100)}% of each orbit in this architecture.`, 'The solar arrays cannot keep the satellite running over a full orbit.', 'Solar output × sunlit share vs baseline load.', 0);
      row('risk', 'flow', 'Data per pass vs. one contact', `${n1(perPass)} GB vs ${n1(perC)} GB`, perPass <= perC + EPS, 'Extra images wait for the next contact.', 'One pass can make more data than one contact can send, so some images will reach responders late.', `${P('observation').name} × ${P('instrument').name} makes ${n1(perPass)} GB per pass; ${P('comms').name} sends ${n1(perC)} GB in a ${Math.round(cLen * 60)}-minute contact.`, 2);
      row('risk', 'detect', 'Fire detection strength', det.toFixed(2), det >= 0.8, 'Wide survey, high detail. Strong fires need 0.5, moderate 0.8, weak 1.2', 'Your imager may miss moderate and weak fires.', `${P('instrument').name} has sensitivity ${P('instrument').sens.toFixed(2)}; a wide footprint lowers it to ${det.toFixed(2)}.`, 3);
      row('info', 'eclipse', 'Battery use in Earth\'s shadow', eclH > 0 ? `${n1(C.baselineKW * eclH)} kWh of ${P('power').battKWh} kWh` : 'none', true, eclH > 0 ? `${Math.round(eclH * 60)} min in shadow every ${cycleMin}-min orbit` : 'This orbit stays in sunlight (educational simplification)');
      row('risk', 'fault', 'Power during a solar fault', `${n1(net)} kW`, net >= -0.5, `Standard test case: solar output at ${Math.round(C.anomaly.solarFactor * 100)}% in sunlight. Battery may drain if solar power drops.`, 'If solar power drops, the battery will drain through the whole fault.', `${n2(P('power').solarKW)} kW of solar × ${Math.round(C.anomaly.solarFactor * 100)}% is less than the ${C.baselineKW} kW baseline load.`, 1);
      { const w = contactWindows(A), hrs = w.reduce((a, c) => a + c[1] - c[0], 0); row('info', 'contacts', 'Ground contacts', A.id === DEFAULT_ARCH.fire ? `${A.contacts.length} one-hour contacts in 24 h` : `${w.length} contact windows, ${n1(hrs)} h in total`, true, 'Alerts are tiny (0.01 GB); images are not'); }
    } else { const perPass = P('observation').perPass * P('instrument').sizeGB, perC = P('comms').rateGBmin * C.contactMin, radar = P('instrument').kind === 'radar', net = P('power').solarKW * C.sunFactor * C.anomaly.factor - C.essentialKW - C.standbyKW;
      const usable = C.passes.filter(p => p.illum > 0 && p.cloud < 0.5).length;
      row('feasibility', 'fit', 'One map fits in storage', `${n2(P('instrument').sizeGB)} GB map, ${P('storage').capGB} GB storage`, P('instrument').sizeGB <= P('storage').capGB, 'A map bigger than the storage could never be kept.', 'A single map is bigger than the storage.', 'Instrument file size vs storage capacity.', 0);
      row('feasibility', 'sun', 'Solar power covers essential systems on a normal orbit', `${n2(P('power').solarKW * C.sunFactor)} kW average vs ${n2(C.essentialKW + C.standbyKW)} kW`, P('power').solarKW * C.sunFactor >= C.essentialKW + C.standbyKW, 'Orbit-average sunlight.', 'The solar arrays cannot keep the satellite running.', 'Solar output vs essential + standby load.', 0);
      row('risk', 'passes', 'Usable passes', radar ? `${C.passes.length} of ${C.passes.length} (day, night, cloud)` : `${usable} clear daytime passes of ${C.passes.length}`, radar, radar ? 'Radar maps hills and towns less clearly' : 'A camera needs sunlight and gaps in the cloud', `A camera can't see through cloud or at night, so only ${usable} of ${C.passes.length} passes are usable.`, `${P('instrument').name} is an optical sensor.`, 3);
      row('risk', 'flow', 'Data per pass vs. one contact', `${n1(perPass)} GB vs ${n1(perC)} GB`, perPass <= perC + EPS, 'Extra maps wait for the next contact, 3 hours later.', 'One pass can make more maps than one contact can send, so some maps will arrive hours late.', `${P('observation').name} × ${P('instrument').name} makes ${n1(perPass)} GB per pass; ${P('comms').name} sends ${n1(perC)} GB in a ${C.contactMin}-minute contact.`, 4);
      row('risk', 'storage', 'Storage space', `${n1(P('storage').capGB / perPass)} passes of maps`, P('storage').capGB / perPass >= 2, `${P('storage').capGB} GB on board`, 'Storage holds less than two passes of maps, so a missed contact can leave no room for new ones.', `${P('storage').capGB} GB of storage against ${n1(perPass)} GB per pass.`, 2);
      row('risk', 'fault', 'Power during a solar fault', `${n1(net)} kW`, net >= -0.8, `Standard test case: solar output at ${Math.round(C.anomaly.factor * 100)}%. Battery ${P('power').battKWh} kWh lasts ${n1(P('power').battKWh * 0.9 / Math.max(0.01, -net))} h before safe mode`, 'If solar power drops, the battery may run low and the satellite may go into safe mode.', `${n2(P('power').solarKW)} kW of solar at ${Math.round(C.anomaly.factor * 100)}% cannot cover the ${n2(C.essentialKW + C.standbyKW)} kW load.`, 1);
      row('info', 'contacts', 'Ground contacts', `${C.contacts.length} ten-minute contacts in 24 h`, true, 'A relay satellite can add two windows in the final challenge');
    }
    const no = rows.filter(r => r.st === 'no'), cau = rows.filter(r => r.st === 'cau'), top = (no.length ? no : cau).slice().sort((a, b) => a.pri - b.pri)[0];
    const status = no.length ? 'Not Ready' : cau.length ? 'Caution' : 'Ready';
    const summary = no.length ? ['no', 'Not ready to launch', top.risk] : cau.length ? ['cau', `Ready to launch with ${cau.length} caution${cau.length > 1 ? 's' : ''}`, 'Biggest risk: ' + top.risk] : ['ok', 'Ready to launch', 'All checks pass.'];
    return { mission: m, status, canLaunch: !no.length, rows, hard: no, cautions: cau, summary, launch: L, totals: t,
      scope: 'Feasibility check from your design and the standard practice conditions only. It does not know your Mission Code\'s surprise events and does not predict your mission result.' }; }

  /* ---------- 7. builder links: capability, resources, what it supports, what it makes harder (all values from the engines) ---------- */
  function partLink(m, design, k) { const C = CFG[m](), P = q => C.parts[q][design[q]], o = P(k), cost = costText(m, m === 'fire' ? o.credits : o.costM), base = `${o.kg} kg, ${cost}`;
    const G = (...ids) => ids.map(i => GATES[m].find(g => g.id === i)).map(g => g.text.toLowerCase()).join('; ');
    const rate6 = () => m === 'storm' ? P('comms').rateGBh * C.backgroundDownlink : null;
    if (k === 'instrument') { const send = m === 'storm' ? `${n1(o.sizeGB / rate6())} h of downlink at the background rate` : m === 'fire' ? `${n1(o.sizeGB / P('comms').rateGBh * 60)} min of contact time` : `${n1(o.sizeGB / P('comms').rateGBmin)} min of contact time`;
      return { gives: m === 'flood' ? (o.kind === 'radar' ? 'Maps through cloud and at night (all 8 passes).' : 'Sharp maps, but only in daylight and through gaps in cloud.') : m === 'fire' ? `Detects fires at sensitivity ${o.sens.toFixed(2)}; up to ${o.basePts} science pt${o.basePts > 1 ? 's' : ''} per image.` : `Up to ${o.basePts} science pt${o.basePts > 1 ? 's' : ''} per image.`,
        uses: `${base}, ${n2(o.imgKW)} kW while imaging, ${n2(o.sizeGB)} GB per ${m === 'flood' ? 'map' : 'image'}.`, supports: G('G1', 'G2'),
        harder: `Communications and storage: each ${m === 'flood' ? 'raw map' : 'full image'} needs ${send} with your current link, and fills ${Math.round(100 * o.sizeGB / P('storage').capGB)}% of your storage.` }; }
    if (k === 'observation') { const n = m === 'storm' ? o.maxPerHour : o.perPass, per = m === 'storm' ? 'hour' : 'pass', made = n * P('instrument').sizeGB;
      return { gives: `Up to ${n} ${m === 'flood' ? 'map' : 'image'}${n > 1 ? 's' : ''} per ${per}.`, uses: `${base}. Every extra ${m === 'flood' ? 'map' : 'image'} also costs imaging energy and storage.`, supports: G('G1', 'G2'),
        harder: m === 'storm' ? `Communications: up to ${n1(made * 6)} GB per 6 h against ${n1(rate6() * 6)} GB your link sends in that time.` : `Communications: up to ${n1(made)} GB per pass against ${n1(m === 'fire' ? P('comms').rateGBh : P('comms').rateGBmin * C.contactMin)} GB per contact. A second image of the same scene is also worth less.` }; }
    if (k === 'power') { const f = m === 'storm' ? C.anomalySolarFactor : m === 'fire' ? C.anomaly.solarFactor : C.anomaly.factor, load = m === 'storm' ? C.essentialKW : m === 'fire' ? C.baselineKW : C.essentialKW + C.standbyKW, sol = o.solarKW * (m === 'flood' ? C.sunFactor : 1) * f;
      return { gives: `${n2(o.solarKW)} kW of solar power and a ${n2(o.battKWh)} kWh battery.`, uses: `${base}.`, supports: G('G4') + '; every image and every downlink also draws on the battery',
        harder: `Mass and budget for everything else. And a bigger battery does not fix a lasting shortfall: in the standard ${Math.round(f * 100)}% solar-fault case the arrays give ${n2(sol)} kW against a ${n2(load)} kW load, so the battery only decides how long you last.` }; }
    if (k === 'comms') { const rate = m === 'flood' ? `${n2(o.rateGBmin * C.contactMin)} GB per 10-minute contact` : `${n2(o.rateGBh)} GB per hour`, kw = m === 'flood' ? o.txKW : o.commKW;
      return { gives: `Sends ${rate}.`, uses: `${base}, ${n2(kw)} kW while sending.`, supports: G('G1', 'G3') + (m === 'fire' ? '; ' + G('G2') : ''),
        harder: `Power: sending draws ${n2(kw)} kW from the same battery that keeps the satellite alive during the solar fault. It also only works during ${m === 'storm' ? 'the downlink time you have' : 'ground contacts'}: a faster link does not add contact time.` }; }
    return { gives: `Holds ${o.capGB} GB until it can be sent.`, uses: `${base}.`, supports: G('G1', 'G2') + ' (keeps observations safe between downlinks)',
      harder: `Nothing gets to Earth sooner: larger storage delays overflow but does not increase downlink speed. Data that waits ${m === 'flood' ? 'can miss the deadline' : 'arrives older and is worth less'}.` }; }

  // How a design change moves a target: flies the 256 standard decision plans in the REAL engine under PRACTICE conditions.
  const reachCache = {};
  function targetReach(m, design, targetId, archId) { const key = [m, targetId, archId || '', PARTS.map(k => design[k]).join('')].join('|'); if (key in reachCache) return reachCache[key];
    if (!totals(m, design).valid || !targetDef(m, targetId)) return (reachCache[key] = null);
    const ch = challenges(m); let met = 0;
    for (let q = 0; q < 256; q++) { const dec = ch.map((c, ci) => [c.controls[0][(q >> (ci * 2)) & 1], c.controls[1][(q >> (ci * 2 + 1)) & 1]]);
      if (evaluateTarget(m, targetId, runFull(m, design, dec, null, null, archId).M).status === 'Met') met++; }
    return (reachCache[key] = met); }
  function changeNote(m, before, after, targetId, archBefore, archAfter) { const a = targetReach(m, before, targetId, archBefore), b = targetReach(m, after, targetId, archAfter === undefined ? archBefore : archAfter);
    if (b === null) return { dir: 'blocked', a, b, text: 'This build cannot launch yet (mass or budget), so its effect on your target cannot be tested.' };
    if (a === null) return { dir: 'unknown', a, b, text: 'Your build can launch again.' };
    const dir = b > a + 12 ? 'easier' : b < a - 12 ? 'harder' : 'same';
    return { dir, a, b, text: dir === 'easier' ? 'This change makes your target easier to reach.' : dir === 'harder' ? 'This change makes your target harder to reach.' : 'This change makes little difference to your target.' }; }

  /* ---------- 8. verification, summary, comparison ---------- */
  function verify(m, M, sc, ctx) { ctx = ctx || {}; const dec = ctx.decisionText || M.decisions.map(d => d ? d.join(' + ') : '–');
    const mk = (g, kind, e, status) => ({ id: g.id, kind, requirement: g.text || g.statement, threshold: g.threshold, measured: e.measured, evidence: e.evidence, status, why: e.why, parts: g.parts.map(k => ({ key: k, name: partName(m, M, k) })), challenges: g.ch.map(c => ({ n: c + 1, text: dec[c] })),
      chain: { design: g.parts.slice(0, 2).map(k => partName(m, M, k)).join(' + '), constraint: e.constraint, decision: `Challenge ${g.ch[0] + 1}: ${dec[g.ch[0]]}`, outcome: `${e.measured} → ${status}` } });
    const gates = GATES[m].map(g => mk(g, 'mandatory', g.ev(M, sc), sc.gates[g.id] ? 'Met' : 'Missed'));
    const tid = ctx.targetId !== undefined ? ctx.targetId : (M.requirement && M.requirement.target ? M.requirement.target.id : null), t = targetDef(m, tid);
    let target = null;
    if (t) { const r = evaluateTarget(m, tid, M), cmp = t.op === '<=' ? 'at most' : 'at least', thr = t.fmt(t.threshold);
      const why = r.noEvidence ? `There is nothing to measure: ${r.evidence[0]}. A target with no evidence is never counted as met.` : r.status === 'Met' ? `Measured ${r.text}; the target was ${cmp} ${thr}.` : `Measured ${r.text}; the target needed ${cmp} ${thr}.`;
      target = mk({ id: t.id, statement: t.statement, threshold: `${cmp} ${thr} (${t.unit})`, parts: t.parts, ch: t.ch }, 'target', { measured: r.text, evidence: r.evidence, why, constraint: (gates.find(g => g.status === 'Missed') || gates[0]).chain.constraint }, r.status);
      target.title = t.title; target.value = r.value; target.definition = t.definition; target.source = t.source; }
    return { mission: m, definitionVersion: DEF_VERSION, gates, target, mandatoryMet: gates.every(g => g.status === 'Met') }; }

  function summarize(m, M, sc, targetId) { const d = sc.derived, t = totals(m, M.design), tr = targetId ? evaluateTarget(m, targetId, M) : null;
    const res = m === 'storm' ? { generatedGB: d.generatedGB, deliveredGB: d.deliveredGB, leftOnBoard: d.nOnboard, finalBatteryPct: d.batteryPct, lowestBatteryPct: null, health: M.health }
      : m === 'fire' ? { generatedGB: M.generatedGB, deliveredGB: M.items.filter(i => i.status === 'delivered').reduce((a, i) => a + i.sizeGB, 0), leftOnBoard: M.items.filter(i => i.status === 'stored').length, finalBatteryPct: d.batteryPct, lowestBatteryPct: M.minBatt, health: M.health }
      : { generatedGB: M.generatedGB, deliveredGB: M.items.filter(i => i.status === 'delivered').reduce((a, i) => a + i.sizeGB, 0), leftOnBoard: d.nOnboard, finalBatteryPct: d.batteryPct, lowestBatteryPct: M.minBatt, health: M.health };
    Object.keys(res).forEach(k => { if (typeof res[k] === 'number') res[k] = +res[k].toFixed(2); });
    return { score: sc.total, outcome: sc.outcome, science: +sc.sci.toFixed(2), delivery: +sc.del.toFixed(2), efficiency: +sc.eff.toFixed(2), reliability: +sc.rel.toFixed(2), gates: Object.assign({}, sc.gates),
      target: tr ? { id: targetId, status: tr.status, value: tr.value === Infinity ? 'never' : tr.value, text: tr.text } : null, massKg: t.kg, cost: t.cost, costUnit: t.unit, resources: res }; }

  // Side-by-side comparison of two run summaries (both produced by the real engine).
  function compare(m, a, b) { const rows = [], gate = v => v ? 'Met' : 'Missed';
    const num = (label, x, y, unit, higherBetter) => rows.push({ label, a: x === null || x === undefined ? '–' : `${n1(x)}${unit}`, b: y === null || y === undefined ? '–' : `${n1(y)}${unit}`, delta: (typeof x === 'number' && typeof y === 'number') ? +(y - x).toFixed(2) : null, better: (typeof x !== 'number' || typeof y !== 'number' || Math.abs(y - x) < 0.05 || higherBetter === null) ? 0 : ((y > x) === higherBetter ? 1 : -1) });
    const txt = (label, x, y, rank) => rows.push({ label, a: x, b: y, delta: null, better: rank ? Math.sign(rank(y) - rank(x)) : 0 });
    const oRank = o => o === 'Mission Success' ? 2 : o === 'Partial Success' ? 1 : 0, sRank = s => s === 'Met' ? 1 : 0;
    txt('Outcome', a.outcome, b.outcome, oRank); num('Total score', a.score, b.score, '', true);
    num('Science (35)', a.science, b.science, '', true); num('Delivery (35)', a.delivery, b.delivery, '', true); num('Efficiency (20)', a.efficiency, b.efficiency, '', true); num('Reliability (10)', a.reliability, b.reliability, '', true);
    GATES[m].forEach(g => txt(`Requirement: ${g.text}`, gate(a.gates[g.id]), gate(b.gates[g.id]), sRank));
    if (a.target || b.target) txt('Your target' + (b.target && targetDef(m, b.target.id) ? `: ${targetDef(m, b.target.id).title}` : ''), a.target ? `${a.target.status} (${a.target.text})` : 'Not applicable', b.target ? `${b.target.status} (${b.target.text})` : 'Not applicable', s => /^Met/.test(s) ? 1 : 0);
    num('Spacecraft mass', a.massKg, b.massKg, ' kg', null); num(`Spacecraft cost (${b.costUnit})`, a.cost, b.cost, '', null);
    num('Data generated', a.resources.generatedGB, b.resources.generatedGB, ' GB', null); num('Data delivered', a.resources.deliveredGB, b.resources.deliveredGB, ' GB', true);
    num('Items left on board', a.resources.leftOnBoard, b.resources.leftOnBoard, '', false); num('Battery at the end', a.resources.finalBatteryPct, b.resources.finalBatteryPct, '%', true);
    if (a.resources.lowestBatteryPct !== null) num('Lowest battery', a.resources.lowestBatteryPct, b.resources.lowestBatteryPct, '%', true);
    num('Health', a.resources.health, b.resources.health, '%', true);
    return rows; }

  /* ---------- 9. redesign: carrying earlier decisions onto a changed spacecraft ---------- */
  // Decisions tied to hardware-dependent image numbers cannot be reused once hardware (or architecture) changes.
  // They are reset to automatic and reported; everything else is carried unchanged. Nothing is reused silently.
  function carry(m, rec, newDesign, newArch) { const dec = rec.decisions.map(c => c.slice()), ext = rec.manipulations ? JSON.parse(JSON.stringify(rec.manipulations)) : [null, null, null, null], resets = [];
    const oldArch = rec.architecture ? rec.architecture.id : DEFAULT_ARCH[m], archChanged = (newArch || DEFAULT_ARCH[m]) !== oldArch, hwChanged = PARTS.some(k => rec.design[k] !== newDesign[k]);
    if ((hwChanged || archChanged) && m === 'storm') {
      if (ext[1] && ((ext[1].first && ext[1].first.length) || (ext[1].drop && ext[1].drop.length))) { ext[1] = null; resets.push('Challenge 2: your Send first / Discard marks pointed at specific image numbers. A different satellite takes different images, so sorting is back to automatic.'); }
      if (ext[3] && ext[3].order && ext[3].order.length) { ext[3] = { order: [], newFirst: ext[3].newFirst !== false }; resets.push('Challenge 4: your hand-ordered downlink queue listed specific image numbers. The queue is back to automatic order (your "new images first" choice is kept).'); }
    }
    // Wildfire region tasking and footprint choices are made once per pass, and both architectures have one pass per challenge, so they carry over unchanged.
    return { decisions: dec, manipulations: ext, resets, hardwareChanged: hwChanged, architectureChanged: archChanged, compatible: resets.length === 0 }; }

  /* ---------- 10. mission records (v2) and replay (v1 records from v6.3 still replay) ---------- */
  function makeRecord(o) { const m = o.mission, M = o.M, sc = o.score || score(m, M), scn = o.scn, tid = o.targetId || null, arch = m === 'fire' ? fireArch(o.archId) : null;
    return { game: 'Earth Missions', gameVersion: GAME_VERSION, recordVersion: RECORD_VERSION, mission: m, missionCode: scn.code, scenarioId: scn.id, scenarioVersion: Sc.VERSION, engineVersion: engineVersion(m), mode: o.mode || (scn.practice ? 'practice' : 'class'),
      design: Object.assign({}, M.design), architecture: arch ? { id: arch.id, version: arch.version } : null, launchProfile: { id: LAUNCH[m].id, version: LAUNCH[m].version },
      requirement: requirementState(m, tid), decisions: M.decisions.map(c => c.slice()), manipulations: M.ext ? JSON.parse(JSON.stringify(M.ext)) : null,
      result: { score: sc.total, outcome: sc.outcome, science: +sc.sci.toFixed(2), delivery: +sc.del.toFixed(2), efficiency: +sc.eff.toFixed(2), reliability: +sc.rel.toFixed(2), gates: sc.gates },
      summary: summarize(m, M, sc, tid), attempt: o.attempt || { n: 1, basedOn: null, mode: 'played', resets: [] }, simulatedEvents: scn.events.map(e => e.text) }; }
  function replay(rec) { const p = Sc.parseCode(rec.missionCode), scn = Sc.generate(p.mission, p.seed), arch = rec.architecture ? rec.architecture.id : undefined; // v1 records have no architecture: default profile
    const out = runFull(rec.mission, rec.design, rec.decisions, scn, rec.manipulations, arch), tid = rec.requirement && rec.requirement.target ? rec.requirement.target.id : null;
    return { M: out.M, s: out.s, scn, matches: out.s.total === rec.result.score && out.s.outcome === rec.result.outcome, summary: summarize(rec.mission, out.M, out.s, tid) }; }

  const API = { DEF_VERSION, RECORD_VERSION, GAME_VERSION, MISSIONS, PARTS, NAME, BRIEFING, BRIEF, WHY_ORBIT, GATES, TARGETS, LAUNCH, LAUNCH_COST_NOTE, DEFAULT_ARCH,
    totals, limits, runFull, score, challenges, fireArch, archOptions, archInfo, contactWindows, targetDef, evaluateTarget, requirementState, attach, launchProfile, launchCheck, designCheck, partLink, targetReach, changeNote,
    verify, summarize, compare, carry, makeRecord, replay, hm };
  if (node) module.exports = API; else root.MissionDesign = API;
})(typeof window !== 'undefined' ? window : globalThis);

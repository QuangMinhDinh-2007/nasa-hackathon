/* Storm Watch simulation engine — v3.4 (balancing revision of spec v3.3)
 * Pure, deterministic, no DOM. Runs in the browser (window.SWEngine) and in Node (module.exports).
 * Every number lives in CONFIG. PROFILE 'spec33' reproduces spec v3.3 exactly as written;
 * PROFILE 'v34' applies the documented balancing revision (see README / BALANCING_REPORT.md).
 */
(function (root) {
  'use strict';

  const BASE = {
    // ---- §23.1 builder (game values) ----
    bus: { kg: 4500, costM: 600 },
    limits: { kg: 5192, costM: 850 },
    parts: {
      instrument: { std: { name: 'Standard Weather Imager', kg: 100, costM: 35, sizeGB: 0.25, basePts: 1, imgKW: 0.35 },
                    adv: { name: 'Advanced Weather Imager', kg: 170, costM: 85, sizeGB: 0.60, basePts: 2, imgKW: 0.80 } },
      observation: { std: { name: 'Routine Observation', kg: 40, costM: 15, maxPerHour: 1 },
                     adv: { name: 'Intensive Observation', kg: 70, costM: 30, maxPerHour: 2 } },
      power: { std: { name: 'Standard Power', kg: 180, costM: 45, solarKW: 3.8, battKWh: 8 },
               adv: { name: 'High-Capacity Power', kg: 260, costM: 80, solarKW: 5.2, battKWh: 12.24 } },
      comms: { std: { name: 'Standard Communications', kg: 70, costM: 20, rateGBh: 0.35, commKW: 0.15 },
               adv: { name: 'High-Capacity Communications', kg: 110, costM: 45, rateGBh: 1.2, commKW: 0.40 } },
      storage: { std: { name: 'Small Storage', kg: 20, costM: 10, capGB: 8 },
                 adv: { name: 'Large Storage', kg: 35, costM: 20, capGB: 24 } },
    },
    // ---- §23.4 power ----
    essentialKW: 2.40,
    imagingHours: 0.25,
    reservePct: 0.10,
    incidentHealthLoss: 20,
    failAfterUnpoweredHours: 2,
    // ---- health v2 (off in BASE so spec33 is unchanged; switched on by the live profile) ----
    deepDischargePct: 0,       // battery fraction below which a powered hour counts as a deep discharge
    deepDischargeLoss: 0,      // health lost per deep-discharge hour
    relHealthWeight: 0,        // share of Reliability that comes from final health (the rest: powered hours)
    powerSaveFactor: 0.75,
    // ---- §23.5 modes ----
    res: { std: { size: 0.70, quality: 0.80 }, high: { size: 1.00, quality: 1.00 } },
    backgroundDownlink: 0.50,
    c4Comm: { std: 0.50, fast: 1.00 },
    c4Power: { full: { rate: 1.00, load: 1.00 }, eco: { rate: 0.70, load: 0.70 } },
    // ---- §14 gates / §13 scoring ----
    requiredScience: 12,
    requiredCollectedScience: 12,
    requiredPhases: 3,
    failBelowDelivered: 6,
    qualifyPts: 0.50,
    redundancy: [1.00, 0.50, 0.25],
    // ---- v3.6 interactive extensions (class D; anchored to the two original presets of each challenge) ----
    ix: { boxMin: 0.5, coreR: 0.08, track0: [0.30, 0.62], trackStep: [0.09, -0.035], coneGrow: 0.16, practiceDev: 0.5, userPrio: 1e3 },
    stepsPerHour: 20, // event resolution inside each 1-hour reporting interval (3 simulated minutes)
  };

  const PROFILES = {
    // Spec v3.3 exactly as written
    spec33: {
      anomalySolarFactor: 0.50,
      c1Scan: { wide: { detail: 0.85, rel: [1.0, 1.0], size: 1.0, cover: 90 },
                focus: { detail: 1.00, rel: [1.0, 0.5], size: 1.0, cover: 45 } },
      timeliness: null,          // delivered science not weighted by latency
      phaseTarget: null,         // global clamp on 12 points
      efficiency: 'avoidableWaste',
    },
    // v3.4 balancing revision (each change documented in BALANCING_REPORT.md)
    v34: {
      anomalySolarFactor: 0.35,
      c1Scan: { wide: { detail: 0.85, rel: [1.0, 1.0], size: 1.0, cover: 90 },
                focus: { detail: 1.00, rel: [0.6, 0.3], size: 0.5, cover: 45 } },
      // Forecast-cycle timeliness: value of a delivered observation by age at delivery (hours).
      timeliness: [[3, 1.00], [6, 0.75], [12, 0.50], [Infinity, 0.25]],
      phaseTarget: 3,            // 12 points spread over 4 phases
      efficiency: 'productiveYield',
      // Comms sizing rule: the 50% background allocation keeps up only with the economical imaging mode of the
      // matching imager; full allocation (C4 High-Speed) keeps up with high resolution at routine cadence.
      partsOverride: { comms: { adv: { rateGBh: 0.80 } } },
      // Downlink does not pre-empt a file already being transmitted (realistic file-based downlink).
      noPreemption: true,
    },
  };
  // v3.5 = v3.4 + health v2. Deep discharge wears the battery (NASA Li-ion guidance: avoid over-discharge; shallower
  // cycling gives longer life). Each fully powered hour that dips below 25% costs 5 health; Reliability counts final health.
  // v34 stays as it was so records made before health v2 replay to the same score.
  PROFILES.v35 = Object.assign({}, PROFILES.v34, { deepDischargePct: 0.25, deepDischargeLoss: 5, relHealthWeight: 0.5 });

  function makeConfig(profile) {
    const prof = PROFILES[profile || 'v34'];
    const C = Object.assign({}, BASE, prof, { profile: profile || 'v34' });
    C.parts = JSON.parse(JSON.stringify(BASE.parts));
    const ov = prof.partsOverride || {};
    for (const k of Object.keys(ov)) for (const lvl of Object.keys(ov[k])) Object.assign(C.parts[k][lvl], ov[k][lvl]);
    return C;
  }

  const CHALLENGES = [
    { key: 'c1', hours: [0, 6], controls: [['std', 'high'], ['wide', 'focus']] },
    { key: 'c2', hours: [6, 12], controls: [['std', 'high'], ['keep', 'prio']] },
    { key: 'c3', hours: [12, 18], controls: [['normal', 'save'], ['freq', 'occ']] },
    { key: 'c4', hours: [18, 24], controls: [['std', 'fast'], ['full', 'eco']] },
  ];

  function designTotals(design, C) {
    let kg = C.bus.kg, costM = C.bus.costM;
    for (const k of Object.keys(C.parts)) { kg += C.parts[k][design[k]].kg; costM += C.parts[k][design[k]].costM; }
    return { kg, costM, okKg: kg <= C.limits.kg, okCost: costM <= C.limits.costM, valid: kg <= C.limits.kg && costM <= C.limits.costM };
  }

  function timelinessFactor(latency, C) {
    if (!C.timeliness) return 1;
    for (const [lim, f] of C.timeliness) if (latency <= lim + 1e-9) return f;
    return 0;
  }

  function newMission(design, profile, scn) {
    const C = makeConfig(profile);
    const P = {}; for (const k of Object.keys(C.parts)) P[k] = C.parts[k][design[k]];
    return { scn: (scn && scn.params) || null, scenarioId: scn ? scn.id : 'storm:PRACTICE', trace: [], traceOn: false,
      
      C, P, design: Object.assign({}, design),
      t: 0, battery: P.power.battKWh, health: 100, failed: false, unpoweredRun: 0,
      essentialHours: 0, deepHours: 0, records: [], nextId: 1, events: [], decisions: [null, null, null, null],
      energy: { solar: 0, curtailed: 0, essential: 0, imaging: 0, comms: 0 },
      generatedGB: 0, missedCaptures: 0, missedReasons: {}, incidents: 0,
      chSnapshots: [], ext: [null, null, null, null],
    };
  }

  // ---------- helpers ----------
  const storedGB = M => M.records.filter(r => r.status === 'stored').reduce((a, r) => a + r.sizeGB, 0);
  const phaseOf = t => Math.min(3, Math.floor(t / 6)); // 0..3
  function log(M, type, msg, extra) { M.events.push(Object.assign({ t: +M.t.toFixed(2), type, msg }, extra || {})); }

  // ---------- v3.6 interactive extensions ----------
  // Storm track on the map (unit square). Forecast = straight line; the real storm drifts sideways inside the forecast cone.
  function trackDev(M) { return (M.scn && M.scn.trackDev != null) ? M.scn.trackDev : M.C.ix.practiceDev; }
  function trackPoint(C, k, dev) { // k = hours after 00:00 (0..5); dev in [-1, 1]; dev = 0 is the forecast line
    const X = C.ix, dx = X.trackStep[0], dy = X.trackStep[1], L = Math.hypot(dx, dy), off = dev * X.coneGrow * (k / 5);
    return [X.track0[0] + dx * k - dy / L * off, X.track0[1] + dy * k + dx / L * off];
  }
  function normBox(C, b) { const w = Math.max(C.ix.boxMin, Math.min(1, b.w)), cl = v => Math.max(w / 2, Math.min(1 - w / 2, v)); return { x: cl(b.x), y: cl(b.y), w }; }
  function boxScan(M, box, h) { // scan parameters for a player-drawn square box during hour h (0..5)
    const C = M.C, X = C.ix, b = normBox(C, box), f = (b.w - X.boxMin) / (1 - X.boxMin);   // f: 0 = tightest box, 1 = whole disk
    const p = trackPoint(C, h, trackDev(M)), ov = d => Math.max(0, Math.min(1, (b.w / 2 - Math.abs(d)) / (2 * X.coreR) + 0.5));
    const seen = ov(p[0] - b.x) * ov(p[1] - b.y);                                           // share of the storm core inside the box
    const W = C.c1Scan.wide, F = C.c1Scan.focus, mix = (a, c) => a + (c - a) * f;
    return { detail: mix(F.detail, W.detail), size: mix(F.size, W.size), cover: mix(F.cover, W.cover), seen,
             rel: [seen, seen * mix(F.rel[1] / F.rel[0], W.rel[1] / W.rel[0])] };
  }
  function applyTriage(M, e) { // challenge 2 / 4: the player sorts the packets that are on board
    if (!e) return;
    for (const r of M.records) if (r.status === 'stored') {
      if (e.drop && e.drop.includes(r.id)) { r.status = 'lost'; r.lostReason = 'discarded'; log(M, 'discard', `Discarded obs #${r.id} to free ${r.sizeGB.toFixed(2)} GB`, { id: r.id }); }
      else if (e.order && e.order.includes(r.id)) r.userRank = e.order.length - e.order.indexOf(r.id);
      else if (e.first && e.first.includes(r.id)) r.userRank = 1;
    }
  }

  function hourSettings(M, h) {
    const C = M.C, ci = Math.min(3, Math.floor(h / 6)), d = M.decisions;
    const c1 = d[0] || ['std', 'wide'], c2 = d[1], c3 = d[2], c4 = d[3];
    const resKey = (h >= 6 && c2) ? c2[0] : c1[0];
    const s = { ci, res: C.res[resKey], resKey, scan: null, perHour: M.P.observation.maxPerHour, imgFactor: 1, commFactor: 1,
                downRate: M.P.comms.rateGBh * C.backgroundDownlink, commLoadFactor: C.backgroundDownlink,
                policy: (h >= 6 && c2) ? c2[1] : 'keep', solarFactor: 1, urgentFirst: false };
    if (ci === 0) s.scan = (M.ext[0] && M.ext[0].box) ? boxScan(M, M.ext[0].box, h) : C.c1Scan[c1[1]];
    if (h >= 12 && h < 18) s.solarFactor = M.scn ? M.scn.anomalySolar : C.anomalySolarFactor;
    if (M.scn && M.scn.eclipseHour === h) s.solarFactor = 0;                 // seeded GEO eclipse-season hour (class D)
    const sched = M.ext[2] && M.ext[2].sched;                                   // player's hour-by-hour plan for 12:00-18:00
    if (sched) {
      if (ci === 2) { const m = sched[h - 12];
        if (m === 'rest') s.perHour = 0; else if (m === 'one') s.perHour = Math.min(s.perHour, 1);
        else if (m === 'eco') { s.perHour = Math.min(s.perHour, 1); s.imgFactor = C.powerSaveFactor; s.commFactor = C.powerSaveFactor; } }
    } else {
    if (ci === 2 || ci === 3) {
      const obsMode = c3 ? c3[1] : 'freq';
      if (obsMode === 'occ') s.perHour = (h % 2 === 0) ? 1 : 0;
    }
    if (ci === 2 && c3 && c3[0] === 'save') { s.perHour = Math.min(s.perHour, 1); s.imgFactor = C.powerSaveFactor; s.commFactor = C.powerSaveFactor; }
    }
    if (ci === 3 && c4) {
      const cm = C.c4Comm[c4[0]], pm = C.c4Power[c4[1]];
      s.downRate = M.P.comms.rateGBh * cm * pm.rate;
      s.commLoadFactor = cm * pm.load;
      s.urgentFirst = !(M.ext[3] && M.ext[3].newFirst === false);
    }
    if (M.scn && M.scn.link) for (const l of M.scn.link) if (h >= l.from && h < l.to) s.downRate *= l.factor; // seeded ground-station weather
    return s;
  }

  function priorityKey(r, urgentFirst) {
    // higher = more important
    const urgent = urgentFirst && r.phase === 3 && r.qualifies ? 1e6 : 0;
    return urgent + (r.userRank || 0) * 1e3 + r.pts / r.sizeGB;
  }

  function capture(M, s, idxInHour) {
    const C = M.C, P = M.P;
    const scan = s.scan || { detail: 1, rel: [1, 1], size: 1 };
    const sizeGB = P.instrument.sizeGB * s.res.size * scan.size;
    const imgKWh = P.instrument.imgKW * C.imagingHours * s.imgFactor;
    const reserve = C.reservePct * P.power.battKWh;
    if (M.failed) return;
    if (M.battery - imgKWh < reserve) { M.missedCaptures++; M.missedReasons.energy = (M.missedReasons.energy || 0) + 1; log(M, 'deferred', 'Imaging deferred: battery at reserve'); return; }
    const quality = s.res.quality * scan.detail;
    const rel = scan.rel[Math.min(idxInHour, scan.rel.length - 1)];
    const red = C.redundancy[Math.min(idxInHour, C.redundancy.length - 1)];
    const pts = P.instrument.basePts * quality * rel * red;
    const rec = { id: M.nextId, t: M.t, phase: phaseOf(M.t), sizeGB, origGB: sizeGB, remainingGB: sizeGB, pts, qualifies: pts >= C.qualifyPts - 1e-9,
                  quality, rel, red, resKey: s.resKey, status: 'pending', imgKWh, commKWh: 0, deliveredAt: null, lostReason: null };
    // storage admission
    let free = P.storage.capGB - storedGB(M);
    if (free + 1e-9 < sizeGB) {
      if (s.policy === 'prio') {
        const pk = priorityKey(rec, true);
        const cands = M.records.filter(r => r.status === 'stored').sort((a, b) => priorityKey(a, true) - priorityKey(b, true) || b.t - a.t);
        const evict = []; let gain = free;
        for (const r of cands) { if (gain + 1e-9 >= sizeGB) break; if (priorityKey(r, true) < pk - 1e-12) { evict.push(r); gain += r.sizeGB; } else break; }
        if (gain + 1e-9 >= sizeGB) {
          for (const r of evict) { r.status = 'lost'; r.lostReason = 'evicted'; log(M, 'evict', `Evicted obs #${r.id} for higher-priority image`, { id: r.id }); }
          free = gain;
        }
      }
      if (free + 1e-9 < sizeGB) { M.missedCaptures++; M.missedReasons.storage = (M.missedReasons.storage || 0) + 1; log(M, 'rejected', 'Image rejected: storage full'); return; }
    }
    M.battery -= imgKWh; M.energy.imaging += imgKWh; M.generatedGB += sizeGB;
    M.nextId++; rec.status = 'stored'; M.records.push(rec);
    log(M, 'capture', `Captured obs #${rec.id} (${pts.toFixed(2)} pts, ${sizeGB.toFixed(2)} GB)`, { id: rec.id });
  }

  function runHour(M, h) {
    const C = M.C, P = M.P, s = hourSettings(M, h), n = C.stepsPerHour, dt = 1 / n;
    const reserve = C.reservePct * P.power.battKWh;
    const captureSteps = s.perHour >= 2 ? [0, n / 2] : s.perHour === 1 ? [0] : [];
    let poweredSteps = 0, deep = false;
    const deepKWh = C.deepDischargePct * P.power.battKWh;
    for (let k = 0; k < n; k++) {
      M.t = h + k * dt;
      // 1-2. solar + essential
      const solar = P.power.solarKW * s.solarFactor * dt;
      const ess = C.essentialKW * dt;
      M.energy.solar += solar;
      let e = M.battery + solar - ess;
      if (e < 0) { M.energy.essential += ess + e; e = 0; M._unpowered = true; } else { M.energy.essential += ess; poweredSteps++; }
      if (e > P.power.battKWh) { M.energy.curtailed += e - P.power.battKWh; e = P.power.battKWh; }
      M.battery = e;
      if (M.battery < deepKWh - 1e-9) deep = true;
      if (M.failed) continue;
      // 3. captures
      const ci = captureSteps.indexOf(k);
      if (ci >= 0) capture(M, s, ci);
      // 4. downlink
      let budgetGB = s.downRate * dt;
      const commKWfull = P.comms.commKW * s.commLoadFactor * s.commFactor; // kW at the active rate
      // A file already in transmission finishes first (no preemption: head-of-line blocking), then priority order.
      const inProg = r => (C.noPreemption && r.remainingGB < r.sizeGB - 1e-9) ? 1 : 0;
      const queue = M.records.filter(r => r.status === 'stored').sort((a, b) => inProg(b) - inProg(a) || priorityKey(b, s.urgentFirst) - priorityKey(a, s.urgentFirst) || a.t - b.t || a.id - b.id);
      for (const r of queue) {
        if (budgetGB <= 1e-12) break;
        const sendGB = Math.min(budgetGB, r.remainingGB);
        const activeH = sendGB / s.downRate;
        const kwh = commKWfull * activeH;
        if (M.battery - kwh < reserve) { log(M, 'deferred', 'Downlink deferred: battery at reserve'); break; }
        M.battery -= kwh; M.energy.comms += kwh; r.commKWh += kwh;
        r.remainingGB -= sendGB; budgetGB -= sendGB;
        if (r.remainingGB <= 1e-9) {
          r.remainingGB = 0; r.status = 'delivered'; r.deliveredAt = M.t + dt; // completes within this step
          if (r.deliveredAt > 24) { r.status = 'stored'; r.deliveredAt = null; }
          else log(M, 'delivered', `Delivered obs #${r.id}`, { id: r.id });
        }
      }
      if (M.battery < deepKWh - 1e-9) deep = true;
    }
    // 6. hourly health bookkeeping
    if (poweredSteps === n) { M.essentialHours += 1; M.unpoweredRun = 0;
      if (deep && C.deepDischargeLoss && !M.failed) { M.deepHours++; M.health = Math.max(0, M.health - C.deepDischargeLoss);
        log(M, 'deep', `Battery below ${Math.round(100 * C.deepDischargePct)}% during hour ${h}: health −${C.deepDischargeLoss}`); } }
    else {
      M.essentialHours += poweredSteps / n; M.unpoweredRun += 1; M.incidents++; M.health = Math.max(0, M.health - C.incidentHealthLoss);
      log(M, 'incident', 'Essential bus unpowered during hour ' + h);
      if (M.unpoweredRun >= C.failAfterUnpoweredHours) { M.failed = true; M.health = 0; log(M, 'failure', 'Critical failure: essential systems unpowered 2 h'); }
    }
    M.t = h + 1;
  }

  function runChallenge(M, ci, choice) {
    M.decisions[ci] = choice.slice();
    if (ci === 1 || ci === 3) applyTriage(M, M.ext[ci]);
    const before = derive(M);
    const [h0, h1] = CHALLENGES[ci].hours;
    const capturedBefore = M.records.length, idsBefore = new Set(M.records.map(r => r.id));
    const deliveredBefore = new Set(M.records.filter(r => r.status === 'delivered').map(r => r.id));
    const lostBefore = new Set(M.records.filter(r => r.status === 'lost').map(r => r.id));
    const eBefore = Object.assign({}, M.energy), battBefore = M.battery, missedBefore = M.missedCaptures;
    for (let h = h0; h < h1; h++) { runHour(M, h); if (M.traceOn) M.trace.push(derive(M)); }
    if (ci === 3) { for (const r of M.records) if (r.status === 'stored') r.lostReason = 'undelivered'; }
    const after = derive(M);
    const snap = {
      ci, choice: choice.slice(), before, after,
      captured: M.records.filter(r => !idsBefore.has(r.id)),
      delivered: M.records.filter(r => r.status === 'delivered' && !deliveredBefore.has(r.id)),
      lost: M.records.filter(r => r.status === 'lost' && !lostBefore.has(r.id)),
      missed: M.missedCaptures - missedBefore,
      imagingKWh: M.energy.imaging - eBefore.imaging, commsKWh: M.energy.comms - eBefore.comms,
      solarKWh: M.energy.solar - eBefore.solar, essentialKWh: M.energy.essential - eBefore.essential,
      battBeforeKWh: battBefore, battAfterKWh: M.battery,
    };
    M.chSnapshots[ci] = snap;
    return snap;
  }

  // ---------- derived metrics (single source of truth for dashboard, mini-reports, final report) ----------
  function derive(M) {
    const C = M.C, end = M.t >= 24 - 1e-9;
    const live = M.records.filter(r => r.status === 'stored' || r.status === 'delivered');
    const delivered = M.records.filter(r => r.status === 'delivered');
    const dVal = r => r.pts * timelinessFactor(r.deliveredAt - r.t, C);
    const phases = [0, 1, 2, 3];
    const coveredSet = new Set(live.filter(r => r.qualifies).map(r => r.phase));
    const collectedByPhase = phases.map(p => live.filter(r => r.phase === p).reduce((a, r) => a + r.pts, 0));
    const deliveredByPhase = phases.map(p => delivered.filter(r => r.phase === p).reduce((a, r) => a + dVal(r), 0));
    const deliveredRaw = delivered.reduce((a, r) => a + r.pts, 0);
    const deliveredScience = deliveredByPhase.reduce((a, b) => a + b, 0);
    const collectedScience = collectedByPhase.reduce((a, b) => a + b, 0);
    const critical = delivered.find(r => r.phase === 3 && r.qualifies && r.deliveredAt <= 24 + 1e-9);
    const hasP4 = M.records.some(r => r.phase === 3 && r.qualifies && r.status !== 'lost');
    const criticalStatus = M.t < 18 ? 'Not yet required' : critical ? 'Delivered' : end ? 'Missed' : 'Pending';
    const lat = delivered.map(r => r.deliveredAt - r.t);
    return {
      t: M.t, coveredPhases: coveredSet.size, coveredSet: [...coveredSet].sort(),
      collectedScience, collectedByPhase, deliveredScience, deliveredRaw, deliveredByPhase,
      critical: !!critical, criticalRec: critical || null, criticalStatus, hasPhase4: hasP4,
      batteryPct: 100 * M.battery / M.P.power.battKWh, batteryKWh: M.battery,
      storagePct: 100 * storedGB(M) / M.P.storage.capGB, storedGB: storedGB(M),
      health: M.health, failed: M.failed, deepHours: M.deepHours, unpoweredHours: M.incidents,
      nCaptured: M.records.length, nDelivered: delivered.length, nLost: M.records.filter(r => r.status === 'lost').length,
      nOnboard: M.records.filter(r => r.status === 'stored').length, missedCaptures: M.missedCaptures,
      generatedGB: M.generatedGB, deliveredGB: delivered.reduce((a, r) => a + r.origGB, 0),
      meanLatency: lat.length ? lat.reduce((a, b) => a + b, 0) / lat.length : null,
      maxLatency: lat.length ? Math.max(...lat) : null,
    };
  }

  const clamp01 = x => Math.max(0, Math.min(1, x));

  function score(M) {
    const C = M.C, d = derive(M);
    const delivered = M.records.filter(r => r.status === 'delivered');
    let sci, del, eff, effDetail = {};
    if (C.phaseTarget) {
      const cPh = d.collectedByPhase.map(v => clamp01(v / C.phaseTarget));
      const dPh = d.deliveredByPhase.map(v => clamp01(v / C.phaseTarget));
      sci = 35 * (0.60 * cPh.reduce((a, b) => a + b, 0) / 4 + 0.40 * d.coveredPhases / 4);
      del = 35 * (0.85 * dPh.reduce((a, b) => a + b, 0) / 4 + 0.15 * (d.critical ? 1 : 0));
    } else {
      sci = 35 * (0.60 * clamp01(d.collectedScience / C.requiredCollectedScience) + 0.40 * d.coveredPhases / 4);
      del = 35 * (0.85 * clamp01(d.deliveredScience / C.requiredScience) + 0.15 * (d.critical ? 1 : 0));
    }
    const activity = clamp01(d.deliveredScience / C.requiredScience);
    if (C.efficiency === 'productiveYield') {
      const optE = M.energy.imaging + M.energy.comms;
      const prodE = delivered.reduce((a, r) => a + (r.imgKWh + r.commKWh) * timelinessFactor(r.deliveredAt - r.t, C), 0);
      const prodGB = delivered.reduce((a, r) => a + r.origGB * timelinessFactor(r.deliveredAt - r.t, C), 0);
      const energyYield = optE > 0 ? clamp01(prodE / optE) : 0;
      const dataYield = M.generatedGB > 0 ? clamp01(prodGB / M.generatedGB) : 0;
      eff = 20 * activity * (0.5 * energyYield + 0.5 * dataYield);
      effDetail = { energyYield, dataYield, activity, optionalKWh: optE, productiveKWh: prodE };
    } else {
      // spec v3.3: avoidable waste counters. As specified, the engine only defers optional work it cannot finish,
      // so no "knowingly impossible" energy is ever spent: avoidableEnergyWaste is structurally 0.
      const avoidableEnergyWaste = 0;
      const lostGB = M.records.filter(r => r.status === 'lost' && r.lostReason !== 'evicted').reduce((a, r) => a + r.origGB, 0);
      const ew = M.energy.imaging + M.energy.comms > 0 ? avoidableEnergyWaste / (M.energy.imaging + M.energy.comms) : 0;
      const dw = M.generatedGB > 0 ? clamp01(lostGB / M.generatedGB) : 0;
      eff = 20 * activity * (0.5 * (1 - ew) + 0.5 * (1 - dw));
      effDetail = { energyWasteFraction: ew, dataWasteFraction: dw, activity };
    }
    const hw = C.relHealthWeight || 0;
    const rel = 10 * ((1 - hw) * clamp01(M.essentialHours / 24) + hw * M.health / 100) * (M.failed ? 0 : 1);
    const total = Math.round(sci + del + eff + rel);
    const gates = {
      G1: d.deliveredScience >= C.requiredScience - 1e-9,
      G2: d.coveredPhases >= C.requiredPhases,
      G3: d.critical,
      G4: !M.failed,
    };
    let outcome;
    if (M.failed || d.deliveredScience < C.failBelowDelivered) outcome = 'Mission Failure';
    else if (gates.G1 && gates.G2 && gates.G3 && gates.G4) outcome = 'Mission Success';
    else outcome = 'Partial Success';
    return { sci, del, eff, rel, total, gates, outcome, effDetail, derived: d };
  }

  function runFull(design, decisions, profile, scn, ext) {
    const M = newMission(design, profile, scn);
    if (ext) M.ext = JSON.parse(JSON.stringify(ext));
    for (let ci = 0; ci < 4; ci++) runChallenge(M, ci, decisions[ci]);
    return { M, s: score(M) };
  }

  const API = { VERSION: 'storm-3.7.0', BASE, PROFILES, CHALLENGES, makeConfig, designTotals, newMission, runChallenge, derive, score, runFull, timelinessFactor, trackPoint, trackDev, normBox, boxScan };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.SWEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);

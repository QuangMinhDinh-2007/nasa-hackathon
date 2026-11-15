/* Wildfire Watch — reference simulation engine (calibration prototype for spec v3.0)
 * Deterministic, pure JS, no DOM. Same architecture as Storm Watch engine v3.4:
 * one MissionState, an observation/alert ledger, 10-minute steps, all numbers in CONFIG.
 * Scenario fire events are SYNTHETIC placeholders until the historical FIRMS event is selected (spec §3, §23.6).
 */
(function (root) {
  'use strict';

  const CONFIG = {
    stepMin: 10, steps: 144,
    bus: { kg: 600, credits: 30 },            // 500 kg bus + 100 kg propellant/misc; 25 + 5 credits
    limits: { kg: 1150, credits: 95 },
    parts: {
      instrument: { std: { name: 'Standard Thermal Imager', kg: 100, credits: 12, sizeGB: 0.5, basePts: 1, imgKW: 1.5, sens: 0.80 },
                    adv: { name: 'Advanced Thermal Imager', kg: 200, credits: 22, sizeGB: 1.5, basePts: 2, imgKW: 2.5, sens: 1.25 } },
      observation: { std: { name: 'Fixed-Swath Observation', kg: 40, credits: 6, perPass: 1 },
                     adv: { name: 'Agile-Pointing Observation', kg: 80, credits: 12, perPass: 2 } },
      power: { std: { name: 'Standard Power', kg: 120, credits: 12, solarKW: 3, battKWh: 6 },
               adv: { name: 'High-Capacity Power', kg: 220, credits: 22, solarKW: 5, battKWh: 10 } },
      comms: { std: { name: 'Standard Communications', kg: 60, credits: 8, rateGBh: 0.6, commKW: 0.5 },
               adv: { name: 'High-Capacity Communications', kg: 120, credits: 16, rateGBh: 2.0, commKW: 1.0 } },
      storage: { std: { name: 'Small Storage', kg: 20, credits: 4, capGB: 8 },
                 adv: { name: 'Large Storage', kg: 50, credits: 9, capGB: 24 } },
    },
    baselineKW: 1.0, powerSaveBaselineKW: 0.8, safeModeBaselineKW: 0.5,
    imagingMin: 10, reservePct: 0.10, safeEnterPct: 0.05, safeExitPct: 0.30,
    safeModeHealthLoss: 10, unpoweredHealthLoss: 20, failAfterUnpoweredSteps: 12,
    eclipse: { cycleSteps: 10, eclipseSteps: [7, 8, 9] },   // ~70 min sunlit / 30 min eclipse per ~100-min orbit
    anomaly: { from: 12, to: 18, solarFactor: 0.15 },
    passes: [{ h: 2 }, { h: 8 }, { h: 14 }, { h: 20 }],       // start of 30-min observation windows
    contacts: [[3, 4], [9, 10], [15, 16], [21, 22], [23, 24]],
    alertGB: 0.01,
    mode: { std: { size: 0.7, quality: 0.8, detect: 1.0 }, high: { size: 1.0, quality: 1.0, detect: 1.2 } },
    footprint: { wide: { regions: ['A', 'B', 'C'], detect: 0.85 }, targeted: { regions: ['A'], detect: 1.15 } },
    compression: { size: 0.5, quality: 0.75 },
    powerSave: { perPass: 1, commRate: 0.75, commLoad: 0.75 },
    c4Rate: { std: { rate: 0.5, load: 0.5 }, fast: { rate: 1.0, load: 1.0 } },
    eventThreshold: { High: 0.5, Medium: 0.8, Low: 1.2 },
    eventWeight: { High: 1.0, Medium: 0.7, Low: 0.4 },
    redundancy: [1.0, 0.5],
    qualifyPts: 0.30,
    sciTiming: [[3, 1.0], [6, 0.75], [12, 0.5], [Infinity, 0.25]],
    alertOnTimeH: 2,
    requiredScience: 3, perPassTarget: 0.75, failBelowDelivered: 1.5,
    // SYNTHETIC scenario (replace positions/timing with the selected FIRMS event; keep classes unless re-calibrated)
    events: [
      { id: 'E1', name: 'Initial wildfire', region: 'A', pass: 0, cls: 'High', initial: true },
      { id: 'E2', name: 'Spot fire', region: 'B', pass: 0, cls: 'Low' },
      { id: 'E1b', name: 'Initial wildfire (continued)', region: 'A', pass: 1, cls: 'High' },
      { id: 'E3', name: 'Flank activity', region: 'B', pass: 1, cls: 'Medium' },
      { id: 'E1c', name: 'Initial wildfire (continued)', region: 'A', pass: 2, cls: 'Medium' },
      { id: 'E4', name: 'Expansion into forest', region: 'B', pass: 2, cls: 'High' },
      { id: 'E1d', name: 'Initial wildfire (continued)', region: 'A', pass: 3, cls: 'Medium' },
      { id: 'E5', name: 'New hotspot near community', region: 'C', pass: 3, cls: 'Medium', critical: true },
    ],
  };

  const CHALLENGES = [
    { key: 'c1', hours: [0, 6], controls: [['wide', 'targeted'], ['std', 'high']] },        // footprint, image mode
    { key: 'c2', hours: [6, 12], controls: [['alerts', 'fifo'], ['full', 'compress']] },     // downlink order, imagery handling
    { key: 'c3', hours: [12, 18], controls: [['normal', 'save'], ['image', 'skip']] },        // power mode, 14:00 pass plan
    { key: 'c4', hours: [18, 24], controls: [['wide', 'targeted'], ['std', 'fast']] },       // final footprint, downlink rate
  ];

  const clamp01 = x => Math.max(0, Math.min(1, x));
  function totals(design) { let kg = CONFIG.bus.kg, cr = CONFIG.bus.credits; for (const k in CONFIG.parts) { kg += CONFIG.parts[k][design[k]].kg; cr += CONFIG.parts[k][design[k]].credits; } return { kg, credits: cr, valid: kg <= CONFIG.limits.kg && cr <= CONFIG.limits.credits }; }
  const timing = (lat) => { for (const [l, f] of CONFIG.sciTiming) if (lat <= l + 1e-9) return f; return 0; };

  function newMission(design, scn) {
    const P = {}; for (const k in CONFIG.parts) P[k] = CONFIG.parts[k][design[k]];
    return { scn: (scn && scn.params) || null, scenarioId: scn ? scn.id : 'fire:PRACTICE', trace: [], traceOn: false,  P, design: Object.assign({}, design), step: 0, battery: P.power.battKWh, health: 100, safe: false, failed: false, unpoweredRun: 0,
      opHours: 0, minBatt: 100, items: [], nextId: 1, detected: new Set(), decisions: [null, null, null, null], ext: [null, null, null, null], events: [], missed: 0,
      energy: { imaging: 0, comms: 0 }, generatedGB: 0 };
  }
  const hourOf = s => s * CONFIG.stepMin / 60;
  const stored = M => M.items.filter(i => i.status === 'stored').reduce((a, i) => a + i.sizeGB, 0);
  const inContact = (M, h) => CONFIG.contacts.some(([a, b], i) => { const late = (M.scn && M.scn.contactCut && M.scn.contactCut.index === i) ? M.scn.contactCut.lateMin / 60 : 0; return h >= a + late - 1e-9 && h < b - 1e-9; });
  const sunlit = s => !CONFIG.eclipse.eclipseSteps.includes(s % CONFIG.eclipse.cycleSteps);

  function settings(M, h) {
    const d = M.decisions, ci = Math.min(3, Math.floor(h / 6));
    const c1 = d[0] || ['wide', 'std'], c2 = d[1] || ['alerts', 'full'], c3 = d[2], c4 = d[3];
    const s = { footprint: c1[0], mode: c1[1], order: h >= 6 ? c2[0] : 'alerts', compress: h >= 6 && c2[1] === 'compress',
      baselineKW: CONFIG.baselineKW, perPass: M.P.observation.perPass, commRate: 1, commLoad: 1, solar: 1,
      imgReserve: CONFIG.reservePct, dlReserve: CONFIG.reservePct };
    if (ci === 3 && c4) { s.footprint = c4[0]; s.commRate = CONFIG.c4Rate[c4[1]].rate; s.commLoad = CONFIG.c4Rate[c4[1]].load; }
    if (h >= CONFIG.anomaly.from && h < CONFIG.anomaly.to) s.solar = M.scn ? M.scn.anomalySolar : CONFIG.anomaly.solarFactor;
    if (ci === 2 && c3) {
      if (c3[0] === 'save') { s.baselineKW = CONFIG.powerSaveBaselineKW; s.perPass = Math.min(s.perPass, CONFIG.powerSave.perPass); s.commRate = CONFIG.powerSave.commRate; s.commLoad = CONFIG.powerSave.commLoad; }
      if (c3[1] === 'skip') s.perPass = 0;
    }
    if (M.safe) { s.baselineKW = CONFIG.safeModeBaselineKW; s.perPass = 0; s.commRate = 0; }
    return s;
  }

  function imagePass(M, passIdx, s, k) {
    const C = CONFIG, P = M.P, h = hourOf(M.step);
    // v3.2 direct tasking: the player picks which regions this pass targets (class D: 1 region = Targeted, 3 = Wide, 2 = halfway)
    let regs = null; if (M.ext) for (let i = Math.min(3, Math.floor(h / 6)); i >= 0 && !regs; i--) if (M.ext[i] && M.ext[i].regions && M.ext[i].regions.length) regs = M.ext[i].regions;
    const W = C.footprint.wide, T = C.footprint.targeted;
    const fp = regs ? { regions: regs, detect: regs.length >= 3 ? W.detect : regs.length === 1 ? T.detect : (W.detect + T.detect) / 2 } : C.footprint[s.footprint], md = C.mode[s.mode];
    const sizeGB = P.instrument.sizeGB * md.size;
    const kwh = P.instrument.imgKW * C.imagingMin / 60;
    if (M.battery - kwh < s.imgReserve * P.power.battKWh) { M.missed++; M.events.push({ h, msg: 'Imaging skipped: battery reserve' }); return; }
    if (stored(M) + sizeGB > P.storage.capGB + 1e-9) { M.missed++; M.events.push({ h, msg: 'Imaging skipped: storage full' }); return; }
    const det = P.instrument.sens * md.detect * fp.detect * ((M.scn && M.scn.smoke && M.scn.smoke.pass === passIdx) ? M.scn.smoke.factor : 1);
    const visible = C.events.filter(e => e.pass === passIdx && fp.regions.includes(e.region));
    const found = visible.filter(e => det + 1e-9 >= C.eventThreshold[e.cls]);
    const rel = clamp01(found.reduce((a, e) => a + C.eventWeight[e.cls], 0));
    const quality = md.quality;
    const pts = P.instrument.basePts * quality * rel * C.redundancy[Math.min(k, C.redundancy.length - 1)];
    M.battery -= kwh; M.energy.imaging += kwh; M.generatedGB += sizeGB;
    const img = { id: M.nextId++, kind: 'image', t: h, pass: passIdx, sizeGB, origGB: sizeGB, remainingGB: sizeGB, pts, basePtsNoCompress: pts, qualifies: pts >= C.qualifyPts,
      status: 'stored', imgKWh: kwh, commKWh: 0, deliveredAt: null, found: found.map(e => e.id), compressed: false,
      regions: fp.regions.slice(), strength: det }; // v3.2.1: display-only fields (which regions were imaged, detection strength)
    M.items.push(img);
    M.events.push({ h, type: 'capture', msg: `Image #${img.id} captured: ${found.length} detection(s), ${pts.toFixed(2)} pts` });
    for (const e of found) {
      if (M.detected.has(e.id)) continue; M.detected.add(e.id);
      M.items.push({ id: M.nextId++, kind: 'alert', t: h, pass: passIdx, event: e.id, cls: e.cls, initial: !!e.initial, critical: !!e.critical,
        sizeGB: C.alertGB, origGB: C.alertGB, remainingGB: C.alertGB, pts: 0, status: 'stored', imgKWh: 0, commKWh: 0, deliveredAt: null, sourceId: img.id });
      M.generatedGB += C.alertGB;
    }
  }

  function order(M, s) {
    const q = M.items.filter(i => i.status === 'stored');
    const inProg = i => i.remainingGB < i.sizeGB - 1e-9 ? 1 : 0;
    if (s.order === 'fifo') return q.sort((a, b) => inProg(b) - inProg(a) || a.t - b.t || a.id - b.id);
    const rank = i => i.kind === 'alert' ? ({ High: 3, Medium: 2, Low: 1 })[i.cls] * 1e3 : i.pts / i.sizeGB;
    return q.sort((a, b) => inProg(b) - inProg(a) || rank(b) - rank(a) || a.t - b.t || a.id - b.id);
  }

  function step(M) {
    const C = CONFIG, P = M.P, h = hourOf(M.step), dt = C.stepMin / 60;
    let s = settings(M, h);
    // compression applies to undelivered, untouched images once policy is active
    if (s.compress) for (const i of M.items) if (i.kind === 'image' && i.status === 'stored' && !i.compressed && i.remainingGB === i.sizeGB) {
      i.compressed = true; i.sizeGB *= C.compression.size; i.remainingGB = i.sizeGB; i.pts *= C.compression.quality; }
    // power
    const solar = sunlit(M.step) ? P.power.solarKW * s.solar : 0;
    let e = M.battery + (solar - s.baselineKW) * dt;
    let powered = true;
    if (e < 0) { e = 0; powered = false; }
    M.battery = Math.min(P.power.battKWh, e);
    M.minBatt = Math.min(M.minBatt, 100 * M.battery / P.power.battKWh);
    if (!M.failed) {
      if (!powered) { M.unpoweredRun++; if (M.unpoweredRun === 1) M.health = Math.max(0, M.health - C.unpoweredHealthLoss);
        if (M.unpoweredRun >= C.failAfterUnpoweredSteps) { M.failed = true; M.health = 0; M.events.push({ h, msg: 'Critical failure' }); } }
      else M.unpoweredRun = 0;
      if (!M.safe && M.battery < C.safeEnterPct * P.power.battKWh) { M.safe = true; M.health = Math.max(0, M.health - C.safeModeHealthLoss); M.events.push({ h, msg: 'Safe mode entered' }); }
      else if (M.safe && M.battery >= C.safeExitPct * P.power.battKWh) { M.safe = false; M.events.push({ h, msg: 'Safe mode exited' }); }
      if (!M.safe && powered) M.opHours += dt;
      s = settings(M, h);
      // imaging in pass windows: product k at pass start + k*10 min
      const pi = C.passes.findIndex(p => Math.abs(h - p.h) < 1e-9 || Math.abs(h - (p.h + C.stepMin / 60)) < 1e-9);
      if (pi >= 0 && !M.safe) { const k = Math.round((h - C.passes[pi].h) * 60 / C.stepMin); if (k < s.perPass) imagePass(M, pi, s, k); }
      // downlink during contacts
      if (inContact(M, h) && s.commRate > 0) {
        const rate = P.comms.rateGBh * s.commRate; let budget = rate * dt;
        for (const i of order(M, s)) {
          if (budget <= 1e-12) break;
          const send = Math.min(budget, i.remainingGB), kwh = P.comms.commKW * s.commLoad * (send / rate);
          if (M.battery - kwh < s.dlReserve * P.power.battKWh) break;
          M.battery -= kwh; M.energy.comms += kwh; i.commKWh += kwh; i.remainingGB -= send; budget -= send;
          if (i.remainingGB <= 1e-9) { i.remainingGB = 0; i.status = 'delivered'; i.deliveredAt = h + dt * (1 - budget / (rate * dt)); M.events.push({ h: i.deliveredAt, type: 'delivered', msg: i.kind === 'alert' ? `Alert delivered (${i.event})` : `Image #${i.id} delivered` }); }
        }
      }
    }
    M.step++;
  }

  function runChallenge(M, ci, choice) {
    M.decisions[ci] = choice.slice();
    const [h0, h1] = CHALLENGES[ci].hours;
    while (hourOf(M.step) < h1 - 1e-9) { step(M); if (M.traceOn && M.step % 3 === 0) { const d = derive(M); d.t = hourOf(M.step); M.trace.push(d); } }
  }

  function derive(M) {
    const C = CONFIG, items = M.items, imgs = items.filter(i => i.kind === 'image'), alerts = items.filter(i => i.kind === 'alert');
    const live = imgs.filter(i => i.status !== 'lost');
    const delImgs = imgs.filter(i => i.status === 'delivered');
    const val = i => i.pts * timing(i.deliveredAt - i.t);
    const passes = [0, 1, 2, 3];
    const collectedByPass = passes.map(p => live.filter(i => i.pass === p).reduce((a, i) => a + i.pts, 0));
    const deliveredByPass = passes.map(p => delImgs.filter(i => i.pass === p).reduce((a, i) => a + val(i), 0));
    const covered = new Set(live.filter(i => i.qualifies).map(i => i.pass));
    const initAlert = alerts.find(a => a.initial);
    const initialOnTime = !!(initAlert && initAlert.status === 'delivered' && initAlert.deliveredAt - initAlert.t <= C.alertOnTimeH + 1e-9);
    const finalObs = delImgs.find(i => i.pass === 3 && i.qualifies && i.deliveredAt <= 24 + 1e-9);
    const critAlert = alerts.find(a => a.critical);
    const criticalOnTime = !!(critAlert && critAlert.status === 'delivered' && critAlert.deliveredAt - critAlert.t <= C.alertOnTimeH + 1e-9);
    const truthW = C.events.reduce((a, e) => a + C.eventWeight[e.cls], 0);
    const foundW = C.events.filter(e => M.detected.has(e.id)).reduce((a, e) => a + C.eventWeight[e.cls], 0);
    return { collectedByPass, deliveredByPass, coveredPasses: covered.size, deliveredScience: deliveredByPass.reduce((a, b) => a + b, 0),
      collectedScience: collectedByPass.reduce((a, b) => a + b, 0), initialOnTime, initialDelivered: !!(initAlert && initAlert.status === 'delivered'),
      finalUpdate: !!finalObs, newHotspotAlert: !!(critAlert && critAlert.status === 'delivered'), criticalOnTime, criticalDetected: !!critAlert, detectedWeight: foundW / truthW,
      batteryPct: 100 * M.battery / M.P.power.battKWh, storagePct: 100 * stored(M) / M.P.storage.capGB, health: M.health, failed: M.failed,
      alertsDelivered: alerts.filter(a => a.status === 'delivered').length, alertsTotal: alerts.length, missed: M.missed,
      onboard: imgs.filter(i => i.status === 'stored').length };
  }

  function score(M) {
    const C = CONFIG, d = derive(M);
    const cP = d.collectedByPass.map(v => clamp01(v / C.perPassTarget)), dP = d.deliveredByPass.map(v => clamp01(v / C.perPassTarget));
    const sci = 35 * (0.50 * cP.reduce((a, b) => a + b, 0) / 4 + 0.25 * d.coveredPasses / 4 + 0.25 * d.detectedWeight);
    const del = 35 * (0.70 * dP.reduce((a, b) => a + b, 0) / 4 + 0.15 * (d.criticalOnTime ? 1 : 0) + 0.15 * (d.finalUpdate ? 1 : 0));
    const activity = clamp01(d.deliveredScience / C.requiredScience);
    const delivered = M.items.filter(i => i.status === 'delivered');
    const w = i => i.kind === 'alert' ? 1 : timing(i.deliveredAt - i.t);
    const optE = M.energy.imaging + M.energy.comms;
    const prodE = delivered.reduce((a, i) => a + (i.imgKWh + i.commKWh) * w(i), 0);
    const prodGB = delivered.reduce((a, i) => a + i.origGB * w(i), 0);
    const eff = 20 * activity * (0.5 * (optE > 0 ? clamp01(prodE / optE) : 0) + 0.5 * (M.generatedGB > 0 ? clamp01(prodGB / M.generatedGB) : 0));
    const rel = 10 * clamp01(M.opHours / 24) * (M.failed ? 0 : 1);
    const gates = { G1: d.deliveredScience >= C.requiredScience - 1e-9, G2: d.criticalOnTime, G3: d.finalUpdate, G4: !M.failed };
    const outcome = (M.failed || d.deliveredScience < C.failBelowDelivered) ? 'Mission Failure' : (gates.G1 && gates.G2 && gates.G3 && gates.G4) ? 'Mission Success' : 'Partial Success';
    return { sci, del, eff, rel, total: Math.round(sci + del + eff + rel), gates, outcome, derived: d };
  }

  function runFull(design, decisions, scn, ext) { const M = newMission(design, scn); if (ext) M.ext = JSON.parse(JSON.stringify(ext)); for (let ci = 0; ci < 4; ci++) runChallenge(M, ci, decisions[ci]); return { M, s: score(M) }; }

  const API = { VERSION: 'fire-3.2.1', CONFIG, CHALLENGES, totals, newMission, runChallenge, derive, score, runFull };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.WFEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);

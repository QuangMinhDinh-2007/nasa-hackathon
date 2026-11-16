/* Flood Watch — reference simulation engine
 * Deterministic, pure JS. 5-minute steps (288). One MissionState + map ledger.
 * PROFILE 'spec40' = spec v4.0 as written; 'v41' = documented balancing revision.
 */
(function (root) {
  'use strict';
  const ZONES = ['UV', 'FARM', 'TOWN'];
  const ZNAME = { UV: 'Upper Valley', FARM: 'Farmland', TOWN: 'Riverside Town' };
  const BASE = {
    stepMin: 5, steps: 288,
    bus: { kg: 1700, costM: 300 }, limits: { kg: 2380, costM: 550 },
    parts: {
      instrument: { std: { name: 'Optical Multispectral Imager', kind: 'optical', kg: 150, costM: 60, sizeGB: 1.0, basePts: 2.0, imgKW: 0.40 },
                    adv: { name: 'Synthetic Aperture Radar', kind: 'radar', kg: 400, costM: 140, sizeGB: 2.0, basePts: 1.4, imgKW: 3.00 } },
      observation: { std: { name: 'Fixed-Pointing Targeting', kg: 30, costM: 10, perPass: 1 },
                     adv: { name: 'Agile Pointing Targeting', kg: 80, costM: 35, perPass: 2 } },
      power: { std: { name: 'Standard Power', kg: 120, costM: 30, solarKW: 3.0, battKWh: 6.0 },
               adv: { name: 'High-Capacity Power', kg: 220, costM: 60, solarKW: 5.0, battKWh: 12.6 } },
      comms: { std: { name: 'Standard X-band', kg: 40, costM: 15, rateGBmin: 0.06, txKW: 0.20 },
               adv: { name: 'High-Rate Ka-band', kg: 70, costM: 35, rateGBmin: 0.20, txKW: 0.45 } },
      storage: { std: { name: 'Small Storage', kg: 10, costM: 5, capGB: 3 },
                 adv: { name: 'Large Storage', kg: 25, costM: 15, capGB: 12 } },
    },
    essentialKW: 1.10, standbyKW: 0.40, sunFactor: 0.62,
    anomaly: { from: 12, to: 18, factor: 0.25 },
    reservePct: 0.10, safeEnter: 0.10, safeExit: 0.30, incidentLoss: 20, failHours: 2,
    deepDischargePct: 0, deepDischargeLoss: 0, relHealthWeight: 0,   // health v2: off in BASE (spec40 and v41 unchanged), on in v42
    imagingMin: 5,
    passes: [ { h: 1, illum: 1.0, cloud: 0.10 }, { h: 4, illum: 1.0, cloud: 0.20 }, { h: 7, illum: 1.0, cloud: 0.70 }, { h: 10, illum: 0.6, cloud: 0.85 },
              { h: 13, illum: 0, cloud: 0.60 }, { h: 16, illum: 0, cloud: 0.40 }, { h: 19, illum: 0, cloud: 0.30 }, { h: 22, illum: 1.0, cloud: 0.25 } ],
    contacts: [2.5, 5.5, 8.5, 11.5, 14.5, 17.5, 20.5, 23.5], contactMin: 10,
    relay: { at: [19.25, 22.25], min: 15, kw: 0.30 },
    detail: { std: { size: 0.70, quality: 0.80 }, high: { size: 1.00, quality: 1.00 } },
    footprint: { wide: 0.80, focused: 1.00 },
    mask: { size: 0.30, quality: 0.90, kw: 0.30, screenBelow: 0.50 },
    zoneFactor: { optical: { UV: 0.85, FARM: 1.00, TOWN: 0.90 }, radar: { UV: 0.75, FARM: 1.00, TOWN: 0.60 } },
    targets: [['UV', 'FARM'], ['FARM', 'TOWN'], ['FARM', 'TOWN'], ['TOWN', 'FARM']],
    powerSave: { load: 0.75, rate: 0.75 }, eco: { rate: 0.70, load: 0.70 },
    qualify: 0.50, requiredMaps: 5, requiredCollected: 8, failBelow: 2.5,
  };
  const PROFILES = {
    spec40: { timeliness: null, perZoneTarget: null, efficiency: 'avoidableWaste', noPreemption: false, c2: ['processing', 'storage'] },
    // v4.1 revision: productive-yield efficiency replaces the avoidable-waste counters (energy term was structurally 0;
    // rejected maps were counted as lost GB although they were never generated). Tested and NOT adopted:
    // timeliness weighting (all-standard became unwinnable), downlink-order control replacing Prioritize Key Maps
    // ("newest first" was dominated: better in 31 paired runs, worse in 539, never improved an outcome).
    v41: { timeliness: null, perZoneTarget: false, efficiency: 'productiveYield', noPreemption: false, c2: ['processing', 'storage'] },
  };
  // v4.2 = v4.1 + health v2: each powered hour that dips below 25% battery costs 5 health (deep discharge wears the battery).
  // Safe mode itself costs no health: it is the spacecraft protecting itself. Reliability counts final health.
  // v41 stays as it was so records made before health v2 replay to the same score.
  PROFILES.v42 = Object.assign({}, PROFILES.v41, { deepDischargePct: 0.25, deepDischargeLoss: 5, relHealthWeight: 0.5 });
  function makeConfig(profile) { const p = PROFILES[profile || 'v41']; const C = Object.assign({}, BASE, p, { profile: profile || 'v41' }); return C; }
  function challengesFor(C) {
    return [
      { key: 'c1', hours: [0, 6], controls: [['std', 'high'], ['wide', 'focused']] },
      { key: 'c2', hours: [6, 12], controls: C.c2[1] === 'order' ? [['raw', 'mask'], ['value', 'newest']] : [['raw', 'mask'], ['keep', 'prio']] },
      { key: 'c3', hours: [12, 18], controls: [['normal', 'save'], ['full', 'minimal']] },
      { key: 'c4', hours: [18, 24], controls: [['ground', 'relay'], ['full', 'eco']] },
    ];
  }
  const clamp01 = x => Math.max(0, Math.min(1, x));
  function totals(design, C) { let kg = C.bus.kg, m = C.bus.costM; for (const k in C.parts) { kg += C.parts[k][design[k]].kg; m += C.parts[k][design[k]].costM; } return { kg, costM: m, valid: kg <= C.limits.kg && m <= C.limits.costM }; }
  function timeliness(lat, C) { if (!C.timeliness) return 1; for (const [l, f] of C.timeliness) if (lat <= l + 1e-9) return f; return 0; }

  function newMission(design, profile, scn) {
    const C = makeConfig(profile); const P = {}; for (const k in C.parts) P[k] = C.parts[k][design[k]];
    return { scn: (scn && scn.params) || null, scenarioId: scn ? scn.id : 'flood:PRACTICE', trace: [], traceOn: false,  C, P, design: Object.assign({}, design), step: 0, battery: P.power.battKWh, health: 100, safe: false, failed: false,
      essentialSteps: 0, safeSteps: 0, unpoweredHours: new Set(), deepHours: new Set(), lastUnpoweredHour: -9, consecUnpowered: 0,
      items: [], nextId: 1, decisions: [null, null, null, null], ext: [null, null, null, null], log: [], skipped: { dark: 0, energy: 0, storage: 0, screened: 0, safe: 0 },
      energy: { imaging: 0, processing: 0, comms: 0 }, generatedGB: 0, rejectedGB: 0, minBatt: 100 };
  }
  const hourOf = s => s * 5 / 60;
  // An hour is charged once: if it goes unpowered after a deep-discharge charge, the unpowered loss replaces the deep one.
  function undoDeep(M, hr, C) { if (!M.deepHours.delete(hr)) return; M.health = Math.min(100, M.health + C.deepDischargeLoss);
    const i = M.log.findIndex(l => Math.floor(l.h + 1e-9) === hr && /^Battery below/.test(l.msg)); if (i >= 0) M.log.splice(i, 1); }
  const stored = M => M.items.filter(i => i.status === 'stored').reduce((a, i) => a + i.sizeGB, 0);

  function settings(M, h) {
    const C = M.C, d = M.decisions, ci = Math.min(3, Math.floor(h / 6));
    const c1 = d[0] || ['std', 'wide'], c2 = d[1], c3 = d[2], c4 = d[3];
    const s = { ci, detail: c1[0], footprint: c1[1], mask: !!(h >= 6 && c2 && c2[0] === 'mask'),
      policy: 'keep', order: 'value', perPass: M.P.observation.perPass, standby: true, imgLoad: 1, txLoad: 1, rate: 1, relay: false, solar: 1 };
    if (h >= 6 && c2) { if (C.c2[1] === 'order') s.order = c2[1]; else s.policy = c2[1]; }
    if (h >= C.anomaly.from && h < C.anomaly.to) s.solar = M.scn ? M.scn.anomalyFactor : C.anomaly.factor;
    if (ci === 2 && c3 && c3[0] === 'save') { s.standby = false; s.imgLoad = C.powerSave.load; s.txLoad = C.powerSave.load; s.rate = C.powerSave.rate; s.perPass = Math.min(s.perPass, 1); }
    if (ci >= 2 && c3 && c3[1] === 'minimal') s.minimal = true;
    if (ci === 3 && c4) { s.relay = c4[0] === 'relay'; if (c4[1] === 'eco') { s.rate = C.eco.rate; s.txLoad = C.eco.load; } }
    if (M.safe) { s.standby = false; }
    return s;
  }

  function capture(M, s, passIdx, k) {
    const C = M.C, P = M.P, pass = C.passes[passIdx], h = hourOf(M.step), kind = P.instrument.kind;
    const vis = kind === 'optical' ? pass.illum * (1 - pass.cloud) : 1.0;
    if (kind === 'optical' && vis <= 0) { M.skipped.dark++; return; }
    if (M.safe) { M.skipped.safe++; return; }
    // which zones does this product cover?
    const ci = Math.min(3, Math.floor(pass.h / 6));
    let zones, fpDetail;
    if (ci === 3 && k === 0) { zones = ['TOWN']; fpDetail = C.footprint.focused; }       // emergency tasking
    else if (M.ext && M.ext[ci] && M.ext[ci].zones && M.ext[ci].zones[k]) {                // v4.3 direct tasking: the player aims each pass
      const z = M.ext[ci].zones[k]; if (z === 'ALL') { zones = ZONES.slice(); fpDetail = C.footprint.wide; } else { zones = [z]; fpDetail = C.footprint.focused; } }
    else if (s.footprint === 'wide') { zones = ZONES.slice(); fpDetail = C.footprint.wide; }
    else { zones = [C.targets[ci][k] || C.targets[ci][0]]; fpDetail = C.footprint.focused; }
    const dt = C.detail[s.detail];
    let quality = dt.quality * (s.mask ? C.mask.quality : 1);
    let size = P.instrument.sizeGB * dt.size * (s.mask ? C.mask.size : 1);
    const prev = M.items.filter(i => i.passIdx === passIdx && i.kind === 'map');
    const covered = new Set(prev.flatMap(i => i.zones));
    const zoneScore = {}; zones.forEach(z => { zoneScore[z] = P.instrument.basePts * quality * fpDetail * C.zoneFactor[kind][z] * vis * (covered.has(z) ? 0.5 : 1); });
    const pts = zones.reduce((a, z) => a + zoneScore[z], 0) / zones.length;
    const imgKWh = P.instrument.imgKW * s.imgLoad * C.imagingMin / 60;
    const procKWh = s.mask ? C.mask.kw * C.imagingMin / 60 : 0;
    const reserve = C.reservePct * P.power.battKWh;
    if (M.battery - imgKWh - procKWh < reserve) { M.skipped.energy++; return; }
    // screening (optical + mask, mostly cloud): energy spent, nothing stored
    if (kind === 'optical' && s.mask && vis < C.mask.screenBelow) {
      M.battery -= imgKWh + procKWh; M.energy.imaging += imgKWh; M.energy.processing += procKWh; M.skipped.screened++;
      M.log.push({ h, msg: `Map screened as cloud (pass ${passIdx + 1})` }); return; }
    // storage
    let free = P.storage.capGB - stored(M);
    if (free + 1e-9 < size) {
      if (s.policy === 'prio') {
        const dens = pts / size;
        const cands = M.items.filter(i => i.status === 'stored' && i.remainingGB >= i.sizeGB - 1e-9).sort((a, b) => a.pts / a.sizeGB - b.pts / b.sizeGB);
        let gain = free; const ev = [];
        for (const c of cands) { if (gain + 1e-9 >= size) break; if (c.pts / c.sizeGB < dens - 1e-12) { ev.push(c); gain += c.sizeGB; } else break; }
        if (gain + 1e-9 >= size) { ev.forEach(c => { c.status = 'lost'; c.lostReason = 'evicted'; }); free = gain; }
      }
      if (free + 1e-9 < size) { M.skipped.storage++; M.rejectedGB += size; M.log.push({ h, msg: 'Map rejected: storage full' }); return; }
    }
    M.battery -= imgKWh + procKWh; M.energy.imaging += imgKWh; M.energy.processing += procKWh; M.generatedGB += size;
    M.items.push({ id: M.nextId++, kind: 'map', t: h, passIdx, zones, zoneScore, pts, sizeGB: size, remainingGB: size, status: 'stored',
      imgKWh: imgKWh + procKWh, commKWh: 0, deliveredAt: null,
      townQual: h >= 18 - 1e-9 && (zoneScore.TOWN || 0) >= C.qualify - 1e-9 });
    M.log.push({ h, type: 'capture', msg: `Map #${M.nextId - 1} captured (${zones.join('+')}), ${pts.toFixed(2)} pts` });
  }

  function windowAt(M, h, s) {
    const C = M.C;
    for (let i = 0; i < C.contacts.length; i++) { const c = C.contacts[i]; const len = (M.scn && M.scn.contactCut && M.scn.contactCut.index === i) ? M.scn.contactCut.minutes : C.contactMin; if (h >= c - 1e-9 && h < c + len / 60 - 1e-9) return { relay: false }; }
    if (s.relay) for (const r of C.relay.at) if (h >= r - 1e-9 && h < r + C.relay.min / 60 - 1e-9) return { relay: true };
    return null;
  }

  function step(M) {
    const C = M.C, P = M.P, h = hourOf(M.step), dt = C.stepMin / 60;
    let s = settings(M, h);
    // 1. solar + safe mode
    const solar = P.power.solarKW * C.sunFactor * s.solar * dt;
    const load = (C.essentialKW + (s.standby ? C.standbyKW : 0)) * dt;
    let e = M.battery + solar - load, powered = true;
    if (e < 0) { e = 0; powered = false; }
    M.battery = Math.min(P.power.battKWh, e);
    M.minBatt = Math.min(M.minBatt, 100 * M.battery / P.power.battKWh);
    const hr = Math.floor(h);
    if (!powered) { if (!M.unpoweredHours.has(hr)) { M.unpoweredHours.add(hr); undoDeep(M, hr, C); M.health = Math.max(0, M.health - C.incidentLoss);
        M.consecUnpowered = (M.lastUnpoweredHour === hr - 1) ? M.consecUnpowered + 1 : 1; M.lastUnpoweredHour = hr;
        if (M.consecUnpowered >= C.failHours) { M.failed = true; M.health = 0; } } }
    else { M.essentialSteps++;
      if (C.deepDischargeLoss && M.battery < C.deepDischargePct * P.power.battKWh - 1e-9 && !M.deepHours.has(hr) && !M.unpoweredHours.has(hr) && !M.failed) {
        M.deepHours.add(hr); M.health = Math.max(0, M.health - C.deepDischargeLoss);
        M.log.push({ h, msg: `Battery below ${Math.round(100 * C.deepDischargePct)}%: health −${C.deepDischargeLoss}` }); } }
    if (!M.safe && M.battery < C.safeEnter * P.power.battKWh) { M.safe = true; M.log.push({ h, msg: 'Safe mode entered' }); }
    else if (M.safe && M.battery >= C.safeExit * P.power.battKWh) { M.safe = false; M.log.push({ h, msg: 'Safe mode exited' }); }
    if (M.safe) M.safeSteps++;
    if (M.failed) { M.step++; return; }
    s = settings(M, h);
    // 3. imaging
    const pi = C.passes.findIndex(p => Math.abs(h - p.h) < 1e-9 || Math.abs(h - (p.h + C.imagingMin / 60)) < 1e-9);
    if (pi >= 0) {
      const k = Math.round((h - C.passes[pi].h) * 60 / C.imagingMin);
      let n = s.perPass;
      if (s.minimal) { if (C.passes[pi].h === 16) n = 0; else n = Math.min(n, 1); }
      if (k < n) capture(M, s, pi, k);
    }
    // 4. downlink
    const w = windowAt(M, h, s);
    if (w && !M.safe) {
      const rate = P.comms.rateGBmin * 60 * s.rate; let budget = rate * dt;
      const kw = P.comms.txKW * s.txLoad + (w.relay ? C.relay.kw : 0);
      const reserve = C.reservePct * P.power.battKWh;
      const inProg = i => (C.noPreemption && i.remainingGB < i.sizeGB - 1e-9) ? 1 : 0;
      const urgent = i => (s.ci === 3 && i.townQual) ? 1 : 0;
      const key = i => s.order === 'newest' ? i.t : i.pts / i.sizeGB;
      const q = M.items.filter(i => i.status === 'stored').sort((a, b) => inProg(b) - inProg(a) || urgent(b) - urgent(a) || key(b) - key(a) || a.t - b.t || a.id - b.id);
      for (const i of q) {
        if (budget <= 1e-12) break;
        const send = Math.min(budget, i.remainingGB), kwh = kw * (send / rate);
        if (M.battery - kwh < reserve) break;
        M.battery -= kwh; M.energy.comms += kwh; i.commKWh += kwh; i.remainingGB -= send; budget -= send;
        if (i.remainingGB <= 1e-9) { i.remainingGB = 0; i.status = 'delivered'; i.deliveredAt = h + dt - budget / rate; M.log.push({ h: i.deliveredAt, type: 'delivered', msg: `Map #${i.id} delivered (${i.zones.join('+')})` }); }
      }
    }
    M.step++;
  }

  function runChallenge(M, ci, choice) { M.decisions[ci] = choice.slice(); const h1 = (ci + 1) * 6; while (hourOf(M.step) < h1 - 1e-9) { step(M); if (M.traceOn && M.step % 6 === 0) M.trace.push(derive(M)); } }

  function derive(M) {
    const C = M.C, maps = M.items.filter(i => i.kind === 'map');
    const live = maps.filter(i => i.status !== 'lost'), del = maps.filter(i => i.status === 'delivered');
    const val = i => i.pts * timeliness(i.deliveredAt - i.t, C);
    const zonesQ = new Set(); live.forEach(i => i.zones.forEach(z => { if (i.zoneScore[z] >= C.qualify - 1e-9) zonesQ.add(z); }));
    // per-zone credit: product points shared equally among the zones it covers
    const zoneCollected = { UV: 0, FARM: 0, TOWN: 0 }, zoneDelivered = { UV: 0, FARM: 0, TOWN: 0 };
    live.forEach(i => i.zones.forEach(z => zoneCollected[z] += i.pts / i.zones.length));
    del.forEach(i => i.zones.forEach(z => zoneDelivered[z] += val(i) / i.zones.length));
    const town = del.find(i => i.townQual && i.deliveredAt <= 24 + 1e-9);
    const t = hourOf(M.step);
    return { t, coveredZones: zonesQ.size, zonesQ: [...zonesQ], collected: live.reduce((a, i) => a + i.pts, 0),
      delivered: del.reduce((a, i) => a + val(i), 0), deliveredRaw: del.reduce((a, i) => a + i.pts, 0), zoneCollected, zoneDelivered,
      town: !!town, townRec: town || null, townStatus: t < 18 ? 'Not yet required' : town ? 'Delivered' : t >= 24 - 1e-9 ? 'Missed' : 'Pending',
      batteryPct: 100 * M.battery / M.P.power.battKWh, storagePct: 100 * stored(M) / M.P.storage.capGB, health: M.health, safe: M.safe, deepHours: M.deepHours.size, unpoweredHours: M.unpoweredHours.size,
      safeHours: M.safeSteps * 5 / 60, nCaptured: maps.length, nDelivered: del.length, nLost: maps.filter(i => i.status === 'lost').length,
      nOnboard: maps.filter(i => i.status === 'stored').length, generatedGB: M.generatedGB };
  }

  function score(M) {
    const C = M.C, d = derive(M), maps = M.items.filter(i => i.kind === 'map'), del = maps.filter(i => i.status === 'delivered');
    let mapping, delivery, eff, detail = {};
    if (C.perZoneTarget) {
      const zT = C.requiredCollected / 3, dT = C.requiredMaps / 3;
      mapping = 35 * (0.60 * ZONES.reduce((a, z) => a + clamp01(d.zoneCollected[z] / zT), 0) / 3 + 0.40 * d.coveredZones / 3);
      delivery = 35 * (0.85 * ZONES.reduce((a, z) => a + clamp01(d.zoneDelivered[z] / dT), 0) / 3 + 0.15 * (d.town ? 1 : 0));
    } else {
      mapping = 35 * (0.60 * clamp01(d.collected / C.requiredCollected) + 0.40 * d.coveredZones / 3);
      delivery = 35 * (0.85 * clamp01(d.delivered / C.requiredMaps) + 0.15 * (d.town ? 1 : 0));
    }
    const activity = clamp01(d.delivered / C.requiredMaps);
    if (C.efficiency === 'productiveYield') {
      const optE = M.energy.imaging + M.energy.processing + M.energy.comms;
      const w = i => timeliness(i.deliveredAt - i.t, C);
      const prodE = del.reduce((a, i) => a + (i.imgKWh + i.commKWh) * w(i), 0);
      const prodGB = del.reduce((a, i) => a + i.sizeGB * w(i), 0);
      const ey = optE > 0 ? clamp01(prodE / optE) : 0, dy = M.generatedGB > 0 ? clamp01(prodGB / M.generatedGB) : 0;
      eff = 20 * activity * (0.5 * ey + 0.5 * dy); detail = { energyYield: ey, dataYield: dy };
    } else {
      const ew = 0; // avoidable energy waste: structurally zero (impossible work is deferred, not attempted)
      const dw = M.generatedGB > 0 ? clamp01(M.rejectedGB / M.generatedGB) : 0;
      eff = 20 * activity * (0.5 * (1 - ew) + 0.5 * (1 - dw)); detail = { dataWaste: dw };
    }
    const essentialH = M.essentialSteps * 5 / 60, safeH = M.safeSteps * 5 / 60;
    const hw = C.relHealthWeight || 0;
    const rel = 10 * ((1 - hw) * clamp01((essentialH - 0.5 * safeH) / 24) + hw * M.health / 100) * (M.failed ? 0 : 1);
    const gates = { G1: d.delivered >= C.requiredMaps - 1e-9, G2: d.coveredZones === 3, G3: d.town, G4: !M.failed };
    const outcome = (M.failed || d.delivered < C.failBelow) ? 'Mission Failure' : (gates.G1 && gates.G2 && gates.G3 && gates.G4) ? 'Mission Success' : 'Partial Success';
    return { sci: mapping, del: delivery, eff, rel, total: Math.round(mapping + delivery + eff + rel), gates, outcome, derived: d, detail };
  }
  function runFull(design, decisions, profile, scn, ext) { const M = newMission(design, profile, scn); if (ext) M.ext = JSON.parse(JSON.stringify(ext)); for (let ci = 0; ci < 4; ci++) runChallenge(M, ci, decisions[ci]); return { M, s: score(M) }; }
  const API = { VERSION: 'flood-4.4.0', BASE, PROFILES, ZONES, ZNAME, makeConfig, challengesFor, totals, newMission, runChallenge, derive, score, runFull, timeliness };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.FLEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);

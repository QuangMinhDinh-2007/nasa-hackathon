/* Mission Code / seeded scenario generator — Earth Missions
 * Pure and deterministic. The schedule of external events is generated ONLY from (scenario version, mission, seed)
 * using independent named random streams, before the mission starts. Player decisions never touch these streams,
 * so the same code always gives the same external conditions.
 * Every event here is an EDUCATIONAL SIMULATION EVENT (class D). No NASA/NOAA observation is ever altered.
 */
(function (root) {
  'use strict';
  const VERSION = '1.0';
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1
  const PREFIX = { storm: 'STORM', fire: 'FIRE', flood: 'FLOOD' };
  function hash32(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const stream = (mission, seed, name) => mulberry32(hash32(`${VERSION}|${mission}|${seed}|${name}`));
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const hh = h => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

  // Documented generation ranges (all class D, educational). Baselines are the calibrated Practice values.
  const RANGES = {
    storm: { anomalySolar: [0.30, 0.35, 0.40, 0.45], linkStart: [1, 19], linkHours: 2, linkFactor: 0.5,
             eclipseChance: 0.5, eclipseHours: [3, 4, 5, 6, 7, 8, 9, 10, 19, 20, 21, 22], trackDev: [-1, -0.5, 0, 0.5, 1] },
    fire:  { anomalySolar: [0.10, 0.15, 0.20, 0.25], contactIndex: [0, 1, 2, 3], contactLateMin: 30,
             smokeChance: 0.5, smokePass: [0, 1, 2], smokeFactor: 0.85 }, // never the final pass: with smoke there only 2 of 21 designs could still succeed (tested)
    flood: { anomalyFactor: [0.20, 0.25, 0.30, 0.35], contactIndex: [0, 1, 2, 3, 4, 5, 6], contactMinutes: 5 },
  };

  function randomSeed(rand) { let s = ''; for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(rand() * ALPHABET.length)]; return s; }
  function codeFor(mission, seed) { return `${PREFIX[mission]}-${seed}`; }
  function parseCode(text) {
    const t = String(text || '').trim().toUpperCase().replace(/\s+/g, '');
    const m = /^(STORM|FIRE|FLOOD)-(PRACTICE|[A-HJ-NP-Z2-9]{5})$/.exec(t);
    if (!m) return null;
    const mission = Object.keys(PREFIX).find(k => PREFIX[k] === m[1]);
    return { mission, seed: m[2], code: `${m[1]}-${m[2]}` };
  }

  function generate(mission, seed) {
    const base = { mission, seed: seed || 'PRACTICE', version: VERSION, code: codeFor(mission, seed || 'PRACTICE'), id: `${mission}@${VERSION}:${seed || 'PRACTICE'}` };
    if (!seed || seed === 'PRACTICE') return Object.assign(base, { practice: true, params: null, events: [] });
    const R = RANGES[mission], ev = [], p = {};
    const power = stream(mission, seed, 'power'), ground = stream(mission, seed, 'ground'), env = stream(mission, seed, 'environment');
    if (mission === 'storm') {
      p.anomalySolar = pick(power, R.anomalySolar);
      ev.push({ stream: 'power', from: 12, to: 18, title: 'Solar-array fault', text: `Solar generation ${Math.round(p.anomalySolar * 100)}% of nominal, hours 12–18 (Practice value: 35%).` });
      const s = R.linkStart[0] + Math.floor(ground() * (R.linkStart[1] - R.linkStart[0] + 1));
      p.link = [{ from: s, to: s + R.linkHours, factor: R.linkFactor }];
      ev.push({ stream: 'ground', from: s, to: s + R.linkHours, title: 'Ground-station weather', text: `Heavy rain at the ground station: downlink rate halved, ${hh(s)}–${hh(s + R.linkHours)}.` });
      p.trackDev = pick(stream(mission, seed, 'track'), R.trackDev); // forecast error: where inside the cone the storm really goes (not an announced event)
      const inSeason = env() < R.eclipseChance, eh = pick(env, R.eclipseHours);
      p.eclipseHour = inSeason ? eh : null;
      if (inSeason) ev.push({ stream: 'environment', from: eh, to: eh + 1, title: 'Eclipse season', text: `The satellite passes through Earth's shadow: no solar power for about an hour from ${hh(eh)}.` });
    } else if (mission === 'fire') {
      p.anomalySolar = pick(power, R.anomalySolar);
      ev.push({ stream: 'power', from: 12, to: 18, title: 'Solar-array fault', text: `Solar generation ${Math.round(p.anomalySolar * 100)}% of nominal in sunlight, hours 12–18 (Practice value: 15%).` });
      const ci = pick(ground, R.contactIndex);
      p.contactCut = { index: ci, lateMin: R.contactLateMin };
      const starts = [3, 9, 15, 21];
      ev.push({ stream: 'ground', from: starts[ci], to: starts[ci] + 0.5, title: 'Ground-station maintenance', text: `The ${hh(starts[ci])} contact starts 30 minutes late (30 instead of 60 minutes).` });
      const smoky = env() < R.smokeChance, sp = pick(env, R.smokePass);
      p.smoke = smoky ? { pass: sp, factor: R.smokeFactor } : null;
      const ph = [2, 8, 14, 20];
      if (smoky) ev.push({ stream: 'environment', from: ph[sp], to: ph[sp] + 0.5, title: 'Thick smoke', text: `Dense smoke over the region during the ${hh(ph[sp])} pass: detection strength ×${R.smokeFactor}.` });
    } else if (mission === 'flood') {
      p.anomalyFactor = pick(power, R.anomalyFactor);
      ev.push({ stream: 'power', from: 12, to: 18, title: 'Solar-array drive fault', text: `Solar generation ${Math.round(p.anomalyFactor * 100)}% of nominal, hours 12–18 (Practice value: 25%).` });
      const ci = pick(ground, R.contactIndex);
      p.contactCut = { index: ci, minutes: R.contactMinutes };
      const c = [2.5, 5.5, 8.5, 11.5, 14.5, 17.5, 20.5, 23.5][ci];
      ev.push({ stream: 'ground', from: c, to: c + 1 / 6, title: 'Ground-station conflict', text: `The contact at mission hour ${hh(c)} is cut from 10 to 5 minutes (antenna shared with another spacecraft).` });
    }
    ev.sort((a, b) => a.from - b.from);
    return Object.assign(base, { practice: false, params: p, events: ev });
  }

  const API = { VERSION, RANGES, PREFIX, randomSeed, codeFor, parseCode, generate, hash32, mulberry32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.Scenario = API;
})(typeof window !== 'undefined' ? window : globalThis);

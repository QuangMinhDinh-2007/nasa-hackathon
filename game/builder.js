/* Earth Missions v6.3 — "Build your satellite" redesign for all three missions. Loaded after fireplus.js.
 * Presentation only. Five accordion sections (one open at a time), each opening into two side-by-side option cards:
 * name + selection mark, one-line description, labelled spec blocks, and 2–3 arrow trade-offs.
 * Every number is read from the mission's own part table (Storm CFG.parts [v34], Wildfire WC.parts, Flood LC.parts).
 * Every arrow is computed from the two options' actual values; equal values never get an arrow.
 * Selecting a card fires the existing actions (part / fpart / lpart), so S.design / S.fdesign / S.ldesign stay the only
 * configuration state. The only state added here is which section is open (S.bOpen) and keyboard focus.
 * Warnings reuse the readiness review's own cross-part checks (upgrade.js) with the same formulas and thresholds.
 * Rollback: remove the builder.js line from index.html.
 */
'use strict';
document.head.insertAdjacentHTML('beforeend', `<style>
.build.bx{grid-template-columns:minmax(0,1fr) minmax(320px,400px)}
.bx .parts{gap:10px}
.ready.btop{margin:14px 0 4px}
.ready.bbottom{padding:0;border:0;background:none;margin-top:14px}
.ready.bbottom>button{margin-top:0!important}
.bsec{border:1px solid var(--line);border-radius:18px;background:rgba(0,0,0,.25)}
.bsec.open{background:rgba(255,255,255,.04)}
.bhead{width:100%;display:flex;align-items:center;gap:12px;padding:12px 16px;background:none;border:0;color:#fff;text-align:left;font:inherit;cursor:pointer;border-radius:18px}
.bhead .num{width:32px;height:32px;flex:none;border-radius:10px;background:#ffffff14;display:flex;align-items:center;justify-content:center;font-weight:600}
.bhead .nm{font-size:15px;font-weight:600}
.bhead .sum{margin-left:auto;font-size:13px;color:var(--muted);text-align:right}
.bhead .chev{font-size:12px;color:var(--muted);width:14px;text-align:center}
.bbody{padding:2px 16px 18px}
.bq{margin:0 0 14px;font-size:15px;color:#fff}
.bcards{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.bcard{position:relative;text-align:left;font:inherit;color:#fff;background:#0b111dcc;border:1.5px solid var(--line);border-radius:18px;padding:18px 18px 16px;cursor:pointer;display:flex;flex-direction:column}
.bcard:hover{border-color:rgba(255,255,255,.35)}
.bcard[aria-checked="true"]{border-color:var(--blue);box-shadow:0 0 0 1px var(--blue) inset}
.bcard .top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.bcard .name{font-size:18px;font-weight:600;line-height:1.25}
.bcard .mark{width:24px;height:24px;border-radius:50%;border:1.5px solid rgba(255,255,255,.45);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex:none}
.bcard[aria-checked="true"] .mark{background:var(--blue);border-color:var(--blue);color:#06101f}
.bcard .desc{margin:5px 0 16px;font-size:13.5px;color:var(--muted);line-height:1.45}
.bspecs{display:grid;grid-template-columns:1fr 1fr;gap:14px 14px;margin:0}
.bspecs dt{font-size:12.5px;color:var(--muted);margin:0 0 2px}
.bspecs dd{margin:0;font-size:18px;font-weight:600}
.bcard hr{border:0;border-top:1px solid rgba(255,255,255,.12);margin:16px 0 12px;width:100%}
.bcard .tt{font-size:12.5px;color:var(--muted);margin:0 0 6px}
.btr{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px;font-size:14.5px;font-weight:600}
.btr li{display:flex;align-items:center;gap:8px}.btr .g{color:var(--good)}.btr .b{color:#ff8a6b}
.bwarn{display:flex;gap:10px;align-items:flex-start;padding:11px 14px;border-radius:14px;background:#ffc85714;border:1px solid #ffc85755;font-size:13.5px;line-height:1.45}
.bwarn b{color:var(--warn)}
.bsr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (max-width:1000px){.build.bx{grid-template-columns:1fr}}
@media (max-width:760px){.bcards{grid-template-columns:1fr}.bhead .sum{display:none}}
</style>`);
const GAME63 = '6.3';

/* ---------- formatting, per mission ---------- */
const bNum = v => (Math.round(v * 100) / 100).toString();
const COST = { storm: o => `$${o.costM}M`, fire: o => `${o.credits} credits`, flood: o => `$${o.costM}M` };
const COSTV = { storm: o => o.costM, fire: o => o.credits, flood: o => o.costM };
const S_ = (lab, f) => ({ lab, f });          // spec block: label + formatter(option)
const T_ = (lab, v, good) => ({ lab, v, good }); // trade-off metric: label + value(option) + 'higher' or 'lower' is better
const W = S_('Weight', o => `${o.kg} kg`);

/* ---------- content (wording approved 15 Nov 2026) ---------- */
const BX = {
  storm: { parts: () => CFG.parts, action: 'part', design: () => S.design, keys: ['instrument', 'observation', 'power', 'comms', 'storage'],
    label: { instrument: 'Weather imager', observation: 'Observation system', power: 'Power system', comms: 'Communication system', storage: 'Data storage' },
    q: { instrument: 'How much detail should each storm image show?', observation: 'How often should you photograph the storm?', power: 'How much energy can your satellite collect and store?', comms: 'How fast can you send images to forecasters?', storage: 'How many images can wait on board?' },
    name: { instrument: ['Standard', 'Advanced'], observation: ['Routine', 'Intensive'], power: ['Standard', 'High-Capacity'], comms: ['Standard', 'High-Capacity'], storage: ['Small', 'Large'] },
    desc: { instrument: ['Light, small files; enough to follow the storm.', 'Sharper images worth more to forecasters.'], observation: ['One look per hour.', 'Up to two looks per hour.'],
      power: ['Smaller panels and battery.', 'Bigger panels and battery.'], comms: ['Slower link, low power. Runs at half rate in Challenges 1–3.', 'Faster link, more power. Runs at half rate in Challenges 1–3.'], storage: ['Holds a short backlog.', 'Holds a long backlog.'] },
    specs: { instrument: [S_('Science per image', o => `${o.basePts} pt${o.basePts > 1 ? 's' : ''}`), S_('Data per image', o => `${bNum(o.sizeGB)} GB`), S_('Power while imaging', o => `${bNum(o.imgKW)} kW`)],
      observation: [S_('Images per hour', o => `up to ${o.maxPerHour}`)], power: [S_('Solar output', o => `${bNum(o.solarKW)} kW`), S_('Battery', o => `${bNum(o.battKWh)} kWh`)],
      comms: [S_('Send rate', o => `${bNum(o.rateGBh)} GB/h`), S_('Power while sending', o => `${bNum(o.commKW)} kW`)], storage: [S_('Capacity', o => `${o.capGB} GB`)] },
    trade: { instrument: [T_('Science per Image', o => o.basePts, 'higher'), T_('Data Size', o => o.sizeGB, 'lower'), T_('Power Use', o => o.imgKW, 'lower')],
      observation: [T_('Images per Hour', o => o.maxPerHour, 'higher'), T_('Data Made', o => o.maxPerHour, 'lower'), T_('Imaging Energy', o => o.maxPerHour, 'lower')],
      power: [T_('Battery Capacity', o => o.battKWh, 'higher'), T_('Solar Output', o => o.solarKW, 'higher'), T_('Weight', o => o.kg, 'lower')],
      comms: [T_('Send Rate', o => o.rateGBh, 'higher'), T_('Power Draw', o => o.commKW, 'lower'), T_('Weight', o => o.kg, 'lower')],
      storage: [T_('Capacity', o => o.capGB, 'higher'), T_('Weight', o => o.kg, 'lower')] } },
  fire: { parts: () => WC.parts, action: 'fpart', design: () => S.fdesign, keys: ['instrument', 'observation', 'power', 'comms', 'storage'],
    label: { instrument: 'Thermal imager', observation: 'Observation system', power: 'Power system', comms: 'Communication system', storage: 'Data storage' },
    q: { instrument: 'How well should your satellite detect fires?', observation: 'How many images per pass over the fire?', power: 'How much energy for passes and eclipses?', comms: 'How much can you send during each ground contact?', storage: 'How much data can wait for the next contact?' },
    name: { instrument: ['Standard', 'Advanced'], observation: ['Fixed-Swath', 'Agile-Pointing'], power: ['Standard', 'High-Capacity'], comms: ['Standard', 'High-Capacity'], storage: ['Small', 'Large'] },
    desc: { instrument: ['Picks up strong fires with small files.', 'Picks up weaker fires with bigger files.'], observation: ['One image each pass.', 'Up to two images each pass.'],
      power: ['Smaller panels and battery. No solar power in eclipse.', 'Bigger panels and battery. No solar power in eclipse.'], comms: ['Slower link, low power. Contacts last 1 hour.', 'Faster link, more power. Contacts last 1 hour.'], storage: ['Holds a short backlog.', 'Holds a long backlog.'] },
    specs: { instrument: [S_('Fire sensitivity', o => o.sens.toFixed(2)), S_('Data per image', o => `${bNum(o.sizeGB)} GB`), S_('Power while imaging', o => `${bNum(o.imgKW)} kW`), S_('Science per image', o => `${o.basePts} pt${o.basePts > 1 ? 's' : ''}`)],
      observation: [S_('Images per pass', o => `up to ${o.perPass}`)], power: [S_('Solar output', o => `${bNum(o.solarKW)} kW`), S_('Battery', o => `${bNum(o.battKWh)} kWh`)],
      comms: [S_('Send rate', o => `${bNum(o.rateGBh)} GB/h`), S_('Power while sending', o => `${bNum(o.commKW)} kW`)], storage: [S_('Capacity', o => `${o.capGB} GB`)] },
    trade: { instrument: [T_('Fire Sensitivity', o => o.sens, 'higher'), T_('Data Size', o => o.sizeGB, 'lower'), T_('Power Use', o => o.imgKW, 'lower')],
      observation: [T_('Images per Pass', o => o.perPass, 'higher'), T_('Data Made', o => o.perPass, 'lower'), T_('Imaging Energy', o => o.perPass, 'lower')],
      power: [T_('Battery Capacity', o => o.battKWh, 'higher'), T_('Solar Output', o => o.solarKW, 'higher'), T_('Weight', o => o.kg, 'lower')],
      comms: [T_('Send Rate', o => o.rateGBh, 'higher'), T_('Power Draw', o => o.commKW, 'lower'), T_('Weight', o => o.kg, 'lower')],
      storage: [T_('Capacity', o => o.capGB, 'higher'), T_('Weight', o => o.kg, 'lower')] } },
  flood: { parts: () => LC.parts, action: 'lpart', design: () => S.ldesign, keys: ['instrument', 'observation', 'power', 'comms', 'storage'],
    label: { instrument: 'Imaging instrument', observation: 'Targeting system', power: 'Power system', comms: 'Communication system', storage: 'Data storage' },
    q: { instrument: 'How should your satellite see the flooded areas?', observation: 'How many maps can you make on each pass?', power: 'How much energy can your satellite collect and store?', comms: 'How much can you send in a 10-minute contact?', storage: 'How many maps can wait on board?' },
    name: { instrument: ['Optical', 'Radar'], observation: ['Fixed Pointing', 'Agile Pointing'], power: ['Standard', 'High-Capacity'], comms: ['X-band', 'Ka-band'], storage: ['Small', 'Large'] },
    desc: { instrument: ['A camera: clear maps, but only in daylight and clear sky.', 'Works through cloud and at night; maps hills and towns less clearly.'], observation: ['One map each pass.', 'Up to two maps each pass.'],
      power: ['Smaller panels and battery.', 'Bigger panels and battery.'], comms: ['Slower link, low power.', 'Faster link, more power.'], storage: ['Holds a short backlog.', 'Holds a long backlog.'] },
    specs: { instrument: [S_('Science per map', o => `${bNum(o.basePts)} pts`), S_('Data per map', o => `${bNum(o.sizeGB)} GB`), S_('Power while imaging', o => `${bNum(o.imgKW)} kW`)],
      observation: [S_('Maps per pass', o => `up to ${o.perPass}`)], power: [S_('Solar output', o => `${bNum(o.solarKW)} kW`), S_('Battery', o => `${bNum(o.battKWh)} kWh`)],
      comms: [S_('Per 10-min contact', o => `${bNum(o.rateGBmin * LC.contactMin)} GB`), S_('Power while sending', o => `${bNum(o.txKW)} kW`)], storage: [S_('Capacity', o => `${o.capGB} GB`)] },
    cat: { instrument: { optical: [['☀', 'Needs Sunlight', 0], ['☁', 'Blocked by Cloud', 0]], radar: [['☾', 'Day and Night', 1], ['☁', 'Sees through Cloud', 1]] } },
    trade: { instrument: [T_('Power Use', o => o.imgKW, 'lower')],
      observation: [T_('Maps per Pass', o => o.perPass, 'higher'), T_('Data Made', o => o.perPass, 'lower'), T_('Imaging Energy', o => o.perPass, 'lower')],
      power: [T_('Battery Capacity', o => o.battKWh, 'higher'), T_('Solar Output', o => o.solarKW, 'higher'), T_('Weight', o => o.kg, 'lower')],
      comms: [T_('Data per Contact', o => o.rateGBmin, 'higher'), T_('Power Draw', o => o.txKW, 'lower'), T_('Weight', o => o.kg, 'lower')],
      storage: [T_('Capacity', o => o.capGB, 'higher'), T_('Weight', o => o.kg, 'lower')] } },
};

/* ---------- trade-offs: direction from the real values, colour from what helps ---------- */
function bTrades(m, k, v) { const X = BX[m], P = X.parts()[k], me = P[v], other = P[v === 'std' ? 'adv' : 'std'], out = [];
  const cat = X.cat && X.cat[k] && X.cat[k][me.kind]; if (cat) cat.forEach(([ic, lab, good]) => out.push({ ic, lab, good: !!good, sr: good ? 'an advantage' : 'a limitation' }));
  (X.trade[k] || []).forEach(t => { const a = t.v(me), b = t.v(other); if (Math.abs(a - b) < 1e-9) return; const up = a > b, good = (t.good === 'higher') === up;
    out.push({ ic: up ? '↑' : '↓', lab: t.lab, good, sr: `${up ? 'more' : 'less'} than the other option, ${good ? 'an advantage' : 'a disadvantage'}` }); });
  return out.sort((x, y) => (y.good ? 1 : 0) - (x.good ? 1 : 0)).slice(0, 3); }
function bSpecs(m, k, o) { const X = BX[m]; return X.specs[k].concat([W, S_('Cost', COST[m])]).map(s => ({ lab: s.lab, val: s.f(o) })); }

/* ---------- warnings: the readiness review's own cross-part checks ---------- */
function bWarning(m) { const d = BX[m].design(), P = k => BX[m].parts()[k][d[k]];
  if (m === 'storm') { const gen = P('observation').maxPerHour * 6 * P('instrument').sizeGB, cap = P('comms').rateGBh * CFG.backgroundDownlink * 6;
    if (gen > cap && P('storage').capGB / ((gen - cap) / 6) < 12) return ['Storage pressure', 'At full cadence your images could fill storage within a day. Plan for what waits on board.']; }
  if (m === 'fire') { if (P('observation').perPass * P('instrument').sizeGB > P('comms').rateGBh * 1 + 1e-9) return ['Data delivery', 'One pass can make more data than one ground contact can send. Some images will wait for a later contact.']; }
  if (m === 'flood') { if (P('storage').capGB / (P('observation').perPass * P('instrument').sizeGB) < 2) return ['Storage pressure', 'Your storage holds less than two passes of maps. A missed contact can leave no room for new maps.']; }
  return null; }

/* ---------- render ---------- */
const bEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
function bCard(m, k, v, on) { const X = BX[m], o = X.parts()[k][v], i = v === 'std' ? 0 : 1, nm = X.name[k][i], tr = bTrades(m, k, v);
  return `<button class="bcard" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}" data-a="${X.action}" data-k="${k}" data-v="${v}" data-bx="1" aria-label="${bEsc(nm)}: ${bEsc(o.name)}. ${bEsc(X.desc[k][i])}">
   <div class="top"><span class="name">${nm}</span><span class="mark" aria-hidden="true">${on ? '✓' : ''}</span></div>
   <p class="desc">${X.desc[k][i]}</p>
   <dl class="bspecs">${bSpecs(m, k, o).map(s => `<div><dt>${s.lab}</dt><dd>${s.val}</dd></div>`).join('')}</dl>
   <hr><p class="tt">Trade-offs</p>
   <ul class="btr">${tr.map(t => `<li class="${t.good ? 'g' : 'b'}"><span aria-hidden="true">${t.ic}</span> ${t.lab}<span class="bsr"> (${t.sr})</span></li>`).join('')}</ul></button>`; }
function bHtml(m) { const X = BX[m], d = X.design(); S.bOpen = S.bOpen || {}; const open = S.bOpen[m] === undefined ? 'instrument' : S.bOpen[m];
  const secs = X.keys.map((k, i) => { const v = d[k], o = X.parts()[k][v], isOpen = open === k, id = `bx-${m}-${k}`;
    return `<section class="bsec ${isOpen ? 'open' : ''}"><button class="bhead" data-bopen="${k}" aria-expanded="${isOpen}" aria-controls="${id}">
      <span class="num">${i + 1}</span><span class="nm">${X.label[k]}</span><span class="sum">${X.name[k][v === 'std' ? 0 : 1]}</span><span class="chev" aria-hidden="true">${isOpen ? '▾' : '▸'}</span></button>
      ${isOpen ? `<div class="bbody" id="${id}"><p class="bq" id="${id}-q">${X.q[k]}</p><div class="bcards" role="radiogroup" aria-labelledby="${id}-q">${['std', 'adv'].map(vv => bCard(m, k, vv, v === vv)).join('')}</div></div>` : ''}</section>`; }).join('');
  const w = bWarning(m);
  return secs + (w ? `<div class="bwarn" role="note"><span aria-hidden="true">⚠</span><div><b>${w[0]}</b> · ${w[1]}</div></div>` : ''); }
const BSCREEN = { build: 'storm', fbuild: 'fire', lbuild: 'flood' };
function builderMount() { const m = BSCREEN[S.screen]; if (!m) return; const parts = document.querySelector('#app .build .parts'); if (!parts) return;
  parts.closest('.build').classList.add('bx'); parts.innerHTML = bHtml(m);
  // Launch readiness (mass and budget) sits above the parts; the Readiness review button stays at the bottom.
  const ready = parts.closest('.panel').querySelector('.ready');
  if (ready && !parts.parentNode.querySelector('.btop')) { const top = document.createElement('div'); top.className = 'ready btop';
    [...ready.children].filter(el => !el.matches('button') && !/color:var\(--bad\)/.test(el.getAttribute('style') || '')).forEach(el => top.appendChild(el));
    parts.parentNode.insertBefore(top, parts); ready.classList.add('bbottom'); }
  document.querySelectorAll('.pad .fwarn').forEach(e => e.remove()); // the v6.2 card now lives in the builder
  if (S.bFocus) { const el = parts.querySelector(S.bFocus); if (el) el.focus(); S.bFocus = null; } }
const __render63 = render; render = function () { __render63(); builderMount(); };
softView = (f => function () { f(); builderMount(); })(softView);

/* ---------- interaction: accordion + keyboard; selection uses the existing click actions ---------- */
document.addEventListener('click', e => { const h = e.target.closest('.bhead[data-bopen]'); if (h) { const m = BSCREEN[S.screen]; S.bOpen = S.bOpen || {};
    const k = h.dataset.bopen; S.bOpen[m] = S.bOpen[m] === k || (S.bOpen[m] === undefined && k === 'instrument') ? null : k; S.bFocus = `.bhead[data-bopen="${k}"]`; render(); return; }
  const c = e.target.closest('.bcard'); if (c) S.bFocus = `.bcard[data-k="${c.dataset.k}"][data-v="${c.dataset.v}"]`; }, true);
document.addEventListener('keydown', e => { const c = e.target.closest && e.target.closest('.bcard'); if (!c || !/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return; e.preventDefault();
  const o = c.parentNode.querySelector(`.bcard[data-v="${c.dataset.v === 'std' ? 'adv' : 'std'}"]`); if (o) o.click(); });
// hover cards: the real-mission fact stays on the section header, not over the option cards
const __tipDec63 = tipDecorate; tipDecorate = function () { __tipDec63(); document.querySelectorAll('.bcard[data-tip]').forEach(b => b.removeAttribute('data-tip')); };

if (typeof module !== 'undefined') module.exports = { BX, bTrades, bSpecs, bWarning };

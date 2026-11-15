/* Earth Missions v6.3.3 — Mission Readiness Review wording. Loaded after look.js.
 * Same calculations and thresholds as upgrade.js mrr(); wording and layout only.
 * Status labels: Ready (check passes) · Caution (possible problem, launch allowed) · Not Ready (requirement not met, launch blocked).
 * Rollback: remove the review.js line from index.html.
 */
'use strict';
document.head.insertAdjacentHTML('beforeend', `<style>
.rv-st{font-weight:600;white-space:nowrap}.rv-st.ok{color:var(--good)}.rv-st.cau{color:var(--warn)}.rv-st.no{color:var(--bad)}
.rv-sum{margin-top:14px;padding:12px 14px;border-radius:12px;font-size:13.5px;line-height:1.5;border:1px solid}
.rv-sum+.acts{margin-top:16px}
.rv-sum b{display:block;font-size:14.5px;margin-bottom:2px}
.rv-sum.ok{border-color:#3ddc9755;background:#3ddc9712}.rv-sum.ok b{color:var(--good)}
.rv-sum.cau{border-color:#ffc85755;background:#ffc85712}.rv-sum.cau b{color:var(--warn)}
.rv-sum.no{border-color:#ff7a6b66;background:#ff7a6b14}.rv-sum.no b{color:var(--bad)}
</style>`);
const RV = { ok: ['ok', '✓', 'Ready'], cau: ['cau', '⚠', 'Caution'], no: ['no', '✕', 'Not Ready'] };
mrr = function (m) { const X = MX[m], d = X.design(), rows = [];
  // st: 'ok' | 'cau' | 'no'; pri: lower = more important when choosing the risk to explain
  const row = (label, val, st, note, risk, pri) => rows.push({ label, val, st, note, risk, pri: pri || 9 });
  const pass = (ok, hard) => ok ? 'ok' : (hard ? 'no' : 'cau');
  if (m === 'storm') { const P = k => CFG.parts[k][d[k]], t = totals(); const gen = P('observation').maxPerHour * 6 * P('instrument').sizeGB, cap = P('comms').rateGBh * CFG.backgroundDownlink * 6;
    const fill = gen > cap ? P('storage').capGB / ((gen - cap) / 6) : Infinity, batH = P('power').battKWh / CFG.essentialKW, net = P('power').solarKW * CFG.anomalySolarFactor - CFG.essentialKW;
    row('Mass and budget', `${t.kg.toLocaleString()} kg, $${t.m}M`, pass(t.kg <= MAX_KG && t.m <= MAX_M, true), `Limits ${MAX_KG.toLocaleString()} kg (GOES-R launch mass), $${MAX_M}M`, 'The satellite is over its mass or budget limit.', 0);
    row('Data made vs. sent (per 6 h)', `${fmt(gen)} GB vs ${fmt(cap)} GB`, pass(gen <= cap + 1e-9), 'At top speed. Extra data waits in storage and arrives late.', 'Your satellite can make more images than it can send, so some will reach forecasters late.', 3);
    row('Storage fills in', gen > cap ? `${fmt(fill)} h` : 'never at this rate', pass(gen <= cap || fill >= 12), `${P('storage').capGB} GB on board`, 'Storage may fill up during the mission, leaving no room for new images.', 2);
    row('Battery backup', `${fmt(batH)} h`, pass(batH >= 4), `${P('power').battKWh} kWh ÷ ${CFG.essentialKW} kW for essential systems`, 'The battery alone can keep essential systems running for only a short time.', 4);
    row('Power during solar fault', `${fmt(net)} kW`, pass(net >= -0.8), 'Battery may drain if solar power drops.', 'If solar power drops, the battery will drain quickly.', 1);
    row('Downlink speed', `${P('comms').rateGBh} GB/h`, 'ok', 'Half speed in Challenges 1–3');
    row('Forecasters need', '12 science pts, 3 of 4 storm phases, a fresh final update', 'ok', 'Checked at the end of the mission');
  } else if (m === 'fire') { const P = k => WC.parts[k][d[k]], t = fTotals(); const perPass = P('observation').perPass * P('instrument').sizeGB, perC = P('comms').rateGBh * 1;
    const det = P('instrument').sens * WC.mode.high.detect * WC.footprint.wide.detect, net = P('power').solarKW * WC.anomaly.solarFactor - WC.baselineKW;
    row('Mass and budget', `${t.kg} kg, ${t.cr} credits`, pass(t.kg <= WC.limits.kg && t.cr <= WC.limits.credits, true), `Limits ${WC.limits.kg} kg, ${WC.limits.credits} credits`, 'The satellite is over its mass or budget limit.', 0);
    row('Data per pass vs. one contact', `${fmt(perPass)} GB vs ${fmt(perC)} GB`, pass(perPass <= perC + 1e-9), 'Extra images wait for the next contact.', 'One pass can make more data than one contact can send, so some images will reach responders late.', 2);
    row('Fire detection strength', det.toFixed(2), pass(det >= 0.8), 'Strong fires need 0.5, moderate 0.8, weak 1.2', 'Your imager may miss moderate and weak fires.', 3);
    row('Battery use in Earth\'s shadow', `${fmt(WC.baselineKW * 0.5)} kWh of ${P('power').battKWh} kWh`, 'ok', '30 min in shadow every 100-min orbit');
    row('Power during solar fault', `${fmt(net)} kW`, pass(net >= -0.5), 'Battery may drain if solar power drops.', 'If solar power drops, the battery will drain through the whole fault.', 1);
    row('Ground contacts', '5 one-hour contacts in 24 h', 'ok', 'Alerts are tiny (0.01 GB); images are not');
    row('Responders need', '3 science pts, new-hotspot alert within 2 h, a fresh final image', 'ok', 'Checked at the end of the mission');
  } else { const P = k => LC.parts[k][d[k]], t = lTotals(); const perPass = P('observation').perPass * P('instrument').sizeGB, perC = P('comms').rateGBmin * LC.contactMin, radar = P('instrument').kind === 'radar';
    const net = P('power').solarKW * LC.sunFactor * LC.anomaly.factor - LC.essentialKW - LC.standbyKW;
    row('Mass and budget', `${t.kg.toLocaleString()} kg, $${t.m}M`, pass(t.kg <= LC.limits.kg && t.m <= LC.limits.costM, true), `Limits ${LC.limits.kg.toLocaleString()} kg (NISAR launch mass), $${LC.limits.costM}M`, 'The satellite is over its mass or budget limit.', 0);
    row('Usable passes', radar ? '8 of 8 (day, night, cloud)' : '3 clear daytime passes of 8', pass(radar), radar ? 'Radar maps hills and towns less clearly' : 'A camera needs sunlight and gaps in the cloud', 'A camera can\'t see through cloud or at night, so only 3 of 8 passes are usable.', 3);
    row('Data per pass vs. one contact', `${fmt(perPass)} GB vs ${fmt(perC)} GB`, pass(perPass <= perC + 1e-9), 'Extra maps wait for the next contact, 3 hours later.', 'One pass can make more maps than one contact can send, so some maps will arrive hours late.', 4);
    row('Storage space', `${fmt(P('storage').capGB / perPass)} passes of maps`, pass(P('storage').capGB / perPass >= 2), `${P('storage').capGB} GB on board`, 'Storage holds less than two passes of maps, so a missed contact can leave no room for new ones.', 2);
    row('Power during solar fault', `${fmt(net)} kW`, pass(net >= -0.8), `Battery ${P('power').battKWh} kWh lasts ${fmt(P('power').battKWh * 0.9 / Math.max(0.01, -net))} h before safe mode`, 'If solar power drops, the battery may run low and the satellite may go into safe mode.', 1);
    row('Ground contacts', '8 ten-minute contacts in 24 h', 'ok', 'A relay satellite can add two windows in the final challenge');
    row('Responders need', '5 map pts, all 3 zones, a fresh town map', 'ok', 'Checked at the end of the mission');
  }
  const no = rows.filter(r => r.st === 'no'), cau = rows.filter(r => r.st === 'cau'), top = (no.length ? no : cau).slice().sort((a, b) => a.pri - b.pri)[0];
  const sum = no.length ? ['no', 'Not ready to launch', top.risk]
    : cau.length ? ['cau', `Ready to launch with ${cau.length} caution${cau.length > 1 ? 's' : ''}`, 'Biggest risk: ' + top.risk]
    : ['ok', 'Ready to launch', 'All checks pass.'];
  const tr = rows.map(r => { const s = RV[r.st]; return `<tr><td>${r.label}</td><td><b>${r.val}</b></td><td class="rv-st ${s[0]}"><span aria-hidden="true">${s[1]}</span> ${s[2]}</td><td class="muted">${r.note}</td></tr>`; }).join('');
  $('#layer').innerHTML = `<div class="modal-wrap"><div class="glass modal" style="max-width:860px;width:92vw" role="dialog" aria-label="Mission Readiness Review"><div class="eyebrow">Mission Readiness Review · ${X.name}</div>
    <h2>Go / no-go for launch</h2>
    <div style="overflow:auto;margin-top:12px"><table class="xtab"><tr><th>Check</th><th>Your design</th><th>Status</th><th>Why it matters</th></tr>${tr}</table></div>
    <div class="rv-sum ${sum[0]}" role="status"><b>${sum[1]}</b>${sum[2]}</div>
    <div class="acts"><button class="btn ghost" data-a="mrrBack">Back to design</button><button class="btn good" data-a="goLaunch" data-m="${m}" ${no.length ? 'disabled aria-disabled="true"' : ''}>Go for launch</button></div></div></div>`; };

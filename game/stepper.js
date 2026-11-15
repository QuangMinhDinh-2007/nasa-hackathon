/* Earth Missions v6.3.1 — compact mission stepper. Loaded after builder.js.
 * The Build · Launch · Operate · Report steps leave the top bar. A "Step n of 4" button sits with the other
 * bottom-right buttons; clicking it expands the full stepper. Presentation only.
 * Rollback: remove the stepper.js line from index.html.
 */
'use strict';
document.head.insertAdjacentHTML('beforeend', `<style>
.nav .steps>*{display:none}
#stepBtn{position:fixed;right:380px;bottom:16px;z-index:50;padding:8px 12px;border-radius:999px;border:1px solid #5aa9ff88;background:#000a;color:#fff;font-size:12px;font-weight:600}
#stepBtn[hidden]{display:none}
#stepPop{position:fixed;right:16px;bottom:60px;z-index:60;padding:14px 18px;border-radius:16px;border:1px solid var(--line2);background:#0b1424f2;box-shadow:0 10px 30px #000a}
#stepPop[hidden]{display:none}
#stepPop .steps{display:flex;gap:10px;align-items:center}
#stepPop .steps>*{display:flex}
#stepPop .step-line{display:block}
</style>`);
document.body.insertAdjacentHTML('beforeend', '<button id="stepBtn" aria-expanded="false" aria-controls="stepPop" hidden></button><div id="stepPop" role="region" aria-label="Mission steps" hidden></div>');
function stepSync() { const b = document.getElementById('stepBtn'), p = document.getElementById('stepPop'), s = document.querySelector('.nav .steps');
  if (!s) { b.hidden = true; p.hidden = true; b.setAttribute('aria-expanded', 'false'); return; }
  const all = [...s.querySelectorAll('.step')], i = all.findIndex(x => x.classList.contains('on')), n = i < 0 ? all.length : i + 1;
  const lbl = i < 0 ? 'Done' : all[i].querySelector('.lbl').textContent;
  b.hidden = false; b.textContent = `Step ${Math.min(n, all.length)} of ${all.length} · ${lbl} ${p.hidden ? '▴' : '▾'}`;
  p.innerHTML = `<div class="steps">${s.innerHTML}</div>`; }
const __render631 = render; render = function () { __render631(); stepSync(); };
document.getElementById('stepBtn').addEventListener('click', () => { const p = document.getElementById('stepPop'), b = document.getElementById('stepBtn'); p.hidden = !p.hidden; b.setAttribute('aria-expanded', String(!p.hidden)); stepSync(); });
stepSync();

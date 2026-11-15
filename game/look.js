/* Earth Missions v6.3.2 — build-screen look. Loaded after stepper.js. Presentation only.
 * Launch-site landscape behind the build screen with the rocket standing on the ground; no outline on the top bar;
 * build-screen helper sentences removed; mission scenario as Choose How to Play (Start a Mission / Use a Mission Code);
 * more room at the top of How to play.
 * Rollback: remove the look.js line from index.html.
 */
'use strict';
document.head.insertAdjacentHTML('beforeend', `<style>
.nav-in{border:0}
.nav .logo .chip{display:none}
#bg .photo{transition:opacity .8s,filter .8s}
.build .pad{position:sticky;top:96px;height:calc(100vh - 120px);min-height:560px;background:none;border:0;overflow:visible}
.build .pad::before{display:none}
.build .pad::after{content:"";position:absolute;left:44%;bottom:calc(13.8% - 14px);transform:translateX(-50%);width:190px;height:16px;border-radius:4px;background:linear-gradient(180deg,#5b6170,#2a2e36);box-shadow:0 8px 18px #0009}
.htp h4{font-size:16px;margin-bottom:12px}
.htp-main{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.htp-card{display:flex;flex-direction:column;align-items:flex-start;gap:5px;padding:14px 16px;border-radius:14px;border:1.5px solid #ffffff28;background:#ffffff0d;color:#fff;font:inherit;text-align:left;cursor:pointer;min-height:104px}
.htp-card:hover{border-color:#ffffff55}.htp-card[aria-checked="true"]{border-color:var(--blue);background:#05080fcc}
.htp-card svg{width:22px;height:22px;color:#ffffffbb}.htp-card[aria-checked="true"] svg{color:var(--blue)}
.htp-card b{font-size:15px;font-weight:600}.htp-card>span{font-size:12.5px;color:var(--muted);line-height:1.4}
.htp-sub{margin-top:12px;display:flex;flex-direction:column;gap:8px}
.htp-opt{display:flex;gap:12px;align-items:center;padding:11px 14px;border-radius:12px;border:1.5px solid #ffffff22;background:#0005;color:#fff;font:inherit;text-align:left;cursor:pointer}
.htp-opt:hover{border-color:#ffffff55}.htp-opt[aria-checked="true"]{border-color:var(--blue)}
.htp-opt .rd{width:18px;height:18px;border-radius:50%;border:1.5px solid #ffffff88;flex:none;box-sizing:border-box}.htp-opt[aria-checked="true"] .rd{border:5px solid var(--blue)}
.htp-opt b{display:block;font-size:14px;font-weight:600}.htp-opt span span{font-size:12.5px;color:var(--muted)}
.htp-code{margin-top:10px;display:flex;align-items:center;gap:10px;padding:8px 10px 8px 12px;border-radius:12px;background:#0006}
.htp-code .l{font-size:12px;color:var(--muted)}.htp-code .c{flex:1;font-family:ui-monospace,monospace;font-size:16px;letter-spacing:.08em}
.htp-btn{height:38px;padding:0 14px;border-radius:10px;border:1px solid #ffffff33;background:#ffffff14;color:#fff;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.htp-btn.blue{background:#2f6fe8;border-color:#2f6fe8;align-self:flex-start;padding:0 20px}
.htp-link{margin-top:6px;background:none;border:0;padding:4px 0;color:#9cc9ff;font:inherit;font-size:12.5px;cursor:pointer;text-align:left}
.htp-lab{font-size:13px;font-weight:600}
.htp input{height:44px;border-radius:10px;border:1.5px solid #ffffff33;background:#ffffff0f;color:#fff;padding:0 12px;font-family:ui-monospace,monospace;font-size:15px;letter-spacing:.06em;text-transform:uppercase}
.htp input.err{border-color:var(--bad)}
.htp-err{margin:0;font-size:12.5px;color:#ff8a6b}.htp-err:empty{display:none}
.htp-help{margin:0 0 4px;font-size:12.5px;color:var(--muted);line-height:1.45}
@media (max-width:560px){.htp-main{grid-template-columns:1fr}}
[role="dialog"][aria-label="How to play"]>h2{margin-bottom:18px}
[role="dialog"][aria-label="How to play"] .how{margin:22px 0 18px}
</style>`);
BG.build = { img: 'url(assets/launchsite.svg)', blur: 0, shade: 'linear-gradient(90deg,#000b 0,#0007 42%,#0000 70%)', flares: [] };
const __setBg632 = setBg; setBg = function (key) { __setBg632(key); const p = document.getElementById('bgPhoto'); if (p) { p.style.backgroundPosition = key === 'build' ? 'center bottom' : ''; p.style.backgroundSize = key === 'build' ? 'cover' : ''; } };

/* ---------- Choose How to Play: Start a Mission / Use a Mission Code ----------
 * Uses the existing Scenario logic (generate, randomSeed, parseCode) and S.scn / S.scnMode.
 * A random code is generated once per mission and kept; only "New random mission" makes another. */
const HIC = { start: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19c2-6 6-11 14-14-1 8-6 12-12 14"/><path d="M9 15l-3 3"/><circle cx="14.5" cy="9.5" r="1.5"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/></svg>' };
function htp(m) { S.htp = S.htp || {}; if (!S.htp[m]) { const mode = S.scnMode[m], scn = S.scn[m];
    S.htp[m] = { card: mode === 'class' ? 'code' : 'start', opt: mode === 'surprise' ? 'random' : 'practice', seed: mode === 'surprise' ? scn.seed : null, val: mode === 'class' ? scn.code : '', err: '' }; }
  return S.htp[m]; }
const hEsc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
scenarioCard = function (m) { const h = htp(m), scn = S.scn[m], P = Scenario.PREFIX[m];
  const big = (k, title, sub) => `<button class="htp-card" role="radio" aria-checked="${h.card === k}" data-a="htpCard" data-m="${m}" data-v="${k}">${HIC[k]}<b>${title}</b><span>${sub}</span></button>`;
  const opt = (k, title, sub) => `<button class="htp-opt" role="radio" aria-checked="${h.opt === k}" data-a="htpOpt" data-m="${m}" data-v="${k}"><span class="rd" aria-hidden="true"></span><span><b>${title}</b><span>${sub}</span></span></button>`;
  let body;
  if (h.card === 'start') body = `<div class="htp-sub" role="radiogroup" aria-label="Mission type">${opt('practice', 'Practice Mission', 'Learn the basics with a familiar scenario')}${opt('random', 'Random Mission', 'Discover new simulated events')}</div>`
    + (h.opt === 'random' && h.seed ? `<div class="htp-code"><span class="l">Your code</span><span class="c">${scn.code}</span><button class="htp-btn" data-a="scnCopy" data-m="${m}">Copy</button></div><button class="htp-link" data-a="htpNew" data-m="${m}">↻ New random mission</button>` : '');
  else body = `<div class="htp-sub"><label class="htp-lab" for="htpIn-${m}">Mission code</label>
    <input id="htpIn-${m}" class="${h.err ? 'err' : ''}" placeholder="${P}-XXXXX" value="${hEsc(h.val)}" autocomplete="off" spellcheck="false" aria-invalid="${!!h.err}" aria-describedby="htpErr-${m} htpHelp-${m}">
    <p class="htp-err" id="htpErr-${m}" role="alert">${h.err}</p>
    <p class="htp-help" id="htpHelp-${m}">Same code, same simulated events. Your choices and score are your own.</p>
    <button class="htp-btn blue" data-a="htpGo" data-m="${m}">Continue</button></div>`;
  return `<div class="scn-card htp"><h4>Choose How to Play</h4><div class="htp-main" role="radiogroup" aria-label="How to play">${big('start', 'Start a Mission', 'Play on your own or share your challenge')}${big('code', 'Use a Mission Code', 'Play a challenge shared by your teacher or friend')}</div>${body}</div>`; };
function htpApplyStart(m) { const h = htp(m);
  if (h.opt === 'practice') { S.scn[m] = Scenario.generate(m, 'PRACTICE'); S.scnMode[m] = 'practice'; }
  else { if (!h.seed) h.seed = Scenario.randomSeed(Math.random); S.scn[m] = Scenario.generate(m, h.seed); S.scnMode[m] = 'surprise'; } }
document.addEventListener('input', e => { const i = e.target.closest && e.target.closest('[id^="htpIn-"]'); if (i) { const h = htp(i.id.slice(6)); h.val = i.value; } });
document.addEventListener('keydown', e => { const i = e.target.closest && e.target.closest('[id^="htpIn-"]'); if (i && e.key === 'Enter') { e.preventDefault(); const b = document.querySelector(`[data-a="htpGo"][data-m="${i.id.slice(6)}"]`); if (b) b.click(); } });
document.addEventListener('click', e => { const b = e.target.closest('[data-a^="htp"]'); if (!b) return; const m = b.dataset.m, h = htp(m), a = b.dataset.a;
  if (a === 'htpCard') { h.card = b.dataset.v; if (h.card === 'start') htpApplyStart(m); render(); const f = h.card === 'code' ? document.getElementById('htpIn-' + m) : document.querySelector(`[data-a="htpCard"][data-v="start"][data-m="${m}"]`); if (f) f.focus(); }
  else if (a === 'htpOpt') { h.opt = b.dataset.v; htpApplyStart(m); render(); const f = document.querySelector(`[data-a="htpOpt"][data-v="${h.opt}"][data-m="${m}"]`); if (f) f.focus(); }
  else if (a === 'htpNew') { h.seed = Scenario.randomSeed(Math.random); htpApplyStart(m); render(); toast('New Mission Code: ' + S.scn[m].code); }
  else if (a === 'htpGo') { const p = Scenario.parseCode(h.val);
    if (!p) h.err = `Codes look like ${Scenario.PREFIX[m]}-7K3QX.`;
    else if (p.mission !== m) h.err = `That code is for ${MX[p.mission].name}. ${MX[m].name} codes start with ${Scenario.PREFIX[m]}-.`;
    else { h.err = ''; h.val = p.code; S.scn[m] = Scenario.generate(m, p.seed); S.scnMode[m] = p.seed === 'PRACTICE' ? 'practice' : 'class'; toast('Mission code set: ' + p.code); }
    render(); if (h.err) { const i = document.getElementById('htpIn-' + m); if (i) i.focus(); } } });

const BSCR = { build: 1, fbuild: 1, lbuild: 1 };
function lookMount() { if (!BSCR[S.screen]) return; const panel = document.querySelector('#app .build .panel'); if (!panel) return;
  const sub = panel.querySelector(':scope > h2 + p.muted'); if (sub) sub.remove();
  panel.querySelectorAll('.btop .muted').forEach(e => { if (/^Includes/.test(e.textContent.trim())) e.remove(); });
  document.querySelectorAll('.pad .nose > .muted').forEach(e => e.remove()); }
const __render632 = render; render = function () { __render632(); lookMount(); };
softView = (f => function () { f(); lookMount(); })(softView);

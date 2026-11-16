/* PROJECT ECHO: satellite builder presentation. Loaded after echo.js.
 * 1. "Choose How to Play" redrawn as two distinct sections: Start Your Own Mission (Practice / Random) and
 *    Play a Shared Challenge (Mission Code). Same state (htp(m) in look.js), same buttons (data-a htpCard /
 *    htpOpt / htpNew / htpGo / scnCopy), same Scenario calls. Only the markup and styles are new.
 * 2. Larger, scoped builder typography (CSS only).
 * The Rewind screen's locked Mission Code card (design-ui.js) is kept: it wraps the previous scenarioCard.
 */
'use strict';
(function () {
  const IC = {
    rocket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19c2-6 6-11 14-14-1 8-6 12-12 14"/><path d="M9 15l-3 3"/><circle cx="14.5" cy="9.5" r="1.5"/></svg>',
    group: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.4 3-5.2 6-5.2s5.4 1.8 6 5.2"/><circle cx="17" cy="9" r="2.4"/><path d="M16 13.9c2.6.1 4.4 1.7 5 4.6"/></svg>' };
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const prev = scenarioCard;   // design-ui.js: shows the locked code while rewinding
  scenarioCard = function (m) { if (S.redo && S.redo[m]) return prev(m);
    const h = htp(m), scn = S.scn[m], own = h.card === 'start', shared = !own;
    const opt = (k, title, sub) => { const on = own && h.opt === k;
      return `<button class="eh-opt ${on ? 'on' : ''}" role="radio" aria-checked="${on}" data-a="htpOpt" data-m="${m}" data-v="${k}"><span class="eh-tick" aria-hidden="true">${on ? '✓' : ''}</span><b>${title}</b><span>${sub}</span>${on ? '<em>Selected</em>' : ''}</button>`; };
    const code = own && h.opt === 'random' && h.seed ? `<div class="eh-code"><span>Your Mission Code</span><b>${scn.code}</b><button class="eh-mini" data-a="scnCopy" data-m="${m}">Copy</button><button class="eh-mini" data-a="htpNew" data-m="${m}">↻ New</button></div><p class="eh-note">Share this code so others can fly the same scenario.</p>` : '';
    const input = shared ? `<div class="eh-enter"><label for="htpIn-${m}">Mission Code</label>
        <div class="eh-row"><input id="htpIn-${m}" class="${h.err ? 'err' : ''}" placeholder="${Scenario.PREFIX[m]}-XXXXX" value="${esc(h.val)}" autocomplete="off" spellcheck="false" aria-invalid="${!!h.err}" aria-describedby="htpErr-${m} htpHelp-${m}"><button class="eh-go" data-a="htpGo" data-m="${m}">Use code</button></div>
        <p class="htp-err" id="htpErr-${m}" role="alert">${h.err}</p>
        <p class="eh-note" id="htpHelp-${m}">Same code, same simulated events. Afterwards, compare your score with theirs.</p></div>` : '';
    return `<div class="scn-card htp eh"><h4>Choose How to Play</h4>
      <section class="eh-sec eh-own ${own ? 'on' : ''}"><div class="eh-h">${IC.rocket}<b>Start Your Own Mission</b></div>
        <div class="eh-opts" role="radiogroup" aria-label="Mission type">${opt('practice', 'Practice Mission', 'Learn with a familiar scenario.')}${opt('random', 'Random Mission', 'Discover a new simulated scenario.')}</div>${code}</section>
      <section class="eh-sec eh-shared ${shared ? 'on' : ''}"><button class="eh-h eh-pick" role="radio" aria-checked="${shared}" data-a="htpCard" data-m="${m}" data-v="code">${IC.group}<span><b>Play a Shared Challenge</b><span>Have a Mission Code from your teacher or friend? Enter it to play the same scenario.</span></span>${shared ? '<em>Selected</em>' : '<i aria-hidden="true">▸</i>'}</button>${input}</section></div>`; };
  // Practice / Random also switch the section back to "own mission" (look.js's handler sets only the option)
  document.addEventListener('click', e => { const b = e.target.closest('[data-a="htpOpt"]'); if (b) htp(b.dataset.m).card = 'start'; }, true);

  document.head.insertAdjacentHTML('beforeend', `<style>
  /* ---- Choose How to Play ---- */
  body.echo .htp.eh{background:none;border:0;padding:0;margin-top:18px}
  body.echo .htp.eh>h4{font-family:var(--e-display);font-weight:800;font-size:22px;color:#fff;margin:0 0 10px}
  .eh-sec{border:3px solid var(--e-ink);border-radius:22px;padding:14px 16px 16px;color:var(--e-ink);box-shadow:0 5px 0 rgba(30,22,60,.45)}
  .eh-own{background:var(--e-cream)}.eh-shared{background:#e4f6ff;margin-top:14px;border-style:dashed}
  .eh-sec.on{box-shadow:0 5px 0 rgba(30,22,60,.45),0 0 0 4px var(--e-sun)}.eh-shared.on{border-style:solid;background:#d6f2ff}
  .eh-h{display:flex;align-items:center;gap:10px;font-family:var(--e-display);font-size:19px;color:var(--e-ink)}
  .eh-h svg{width:30px;height:30px;flex:none;padding:5px;border-radius:10px;background:var(--e-sun);border:2px solid var(--e-ink);box-sizing:content-box}
  .eh-shared .eh-h svg{background:var(--e-sky)}
  .eh-pick{width:100%;background:none;border:0;padding:0;text-align:left;cursor:pointer;font:inherit;min-height:48px}
  .eh-pick>span{flex:1;display:flex;flex-direction:column;gap:2px}.eh-pick>span>span{font-family:var(--e-body);font-size:16px;font-weight:600;color:var(--e-ink2);line-height:1.35}
  .eh-pick i{font-style:normal;font-size:18px}
  .eh-h b{font-family:var(--e-display);font-size:20px;font-weight:800;line-height:1.2}
  .eh-note{font-size:16px!important}
  .eh-sec em{font-style:normal;font-family:var(--e-display);font-weight:800;font-size:13px;letter-spacing:.06em;text-transform:uppercase;background:var(--e-mint);border:2px solid var(--e-ink);border-radius:999px;padding:2px 10px;white-space:nowrap}
  .eh-opts{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
  .eh-opt{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:14px 16px 14px 52px;min-height:88px;border-radius:16px;border:3px solid var(--e-ink);background:#fff;color:var(--e-ink);font:inherit;text-align:left;cursor:pointer;transition:transform .12s}
  .eh-opt:hover{transform:translateY(-2px)}
  .eh-opt b{font-family:var(--e-display);font-size:19px;font-weight:800}.eh-opt>span:not(.eh-tick){font-size:16px;font-weight:600;color:var(--e-ink2);line-height:1.35}
  .eh-opt.on{background:var(--e-mint)}.eh-opt.on>span:not(.eh-tick){color:var(--e-ink)}
  .eh-opt em{position:absolute;right:10px;top:10px}
  .eh-tick{position:absolute;left:14px;top:16px;width:26px;height:26px;border-radius:50%;border:3px solid var(--e-ink);background:#fff;display:grid;place-items:center;font-weight:900;font-size:15px}
  .eh-opt.on .eh-tick{background:var(--e-sun)}
  .eh-code{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:12px;padding:10px 12px;border-radius:14px;background:#fff;border:2px solid var(--e-ink)}
  .eh-code span{font-size:15px;font-weight:700}.eh-code b{flex:1;font-family:ui-monospace,monospace;font-size:19px;letter-spacing:.08em}
  .eh-mini{min-height:44px;padding:0 14px;border-radius:12px;border:2px solid var(--e-ink);background:var(--e-cream);color:var(--e-ink);font-family:var(--e-display);font-weight:700;font-size:15px;cursor:pointer}
  .eh-note{margin:8px 0 0;font-size:15px;color:var(--e-ink2);font-weight:600;line-height:1.4}
  .eh-enter{margin-top:12px}.eh-enter label{display:block;font-family:var(--e-display);font-weight:700;font-size:16px;margin-bottom:6px}
  .eh-row{display:flex;gap:10px;flex-wrap:wrap}
  body.echo .eh input{flex:1;min-width:200px;height:52px;border-radius:14px;border:3px solid var(--e-ink);background:#fff;color:var(--e-ink);padding:0 14px;font-family:ui-monospace,monospace;font-size:19px;letter-spacing:.08em;text-transform:uppercase}
  body.echo .eh input:focus{outline:4px solid var(--e-sun);outline-offset:2px}
  body.echo .eh input.err{border-color:#d9402b}
  .eh-go{min-height:52px;padding:0 22px;border-radius:14px;border:3px solid var(--e-ink);background:var(--e-sun);color:var(--e-ink);font-family:var(--e-display);font-weight:800;font-size:17px;cursor:pointer;box-shadow:0 4px 0 var(--e-ink)}
  body.echo .eh .htp-err{color:#b3261e;font-size:15px;font-weight:700;margin-top:6px}
  @media(max-width:700px){.eh-opts{grid-template-columns:1fr}}

  /* ---- Builder typography (all three missions). Sizes only, plus a clearer selected card. ---- */
  body.echo .build .panel>h2{font-size:clamp(28px,2.4vw,32px)}
  body.echo .build .ready{font-size:16px}
  body.echo .build .ready .meter .row,body.echo .build .ready .kv{font-size:17px}
  body.echo .build .ready .chip{font-size:14px;height:28px}
  body.echo .md-strip{font-size:16px;line-height:1.5}body.echo .md-strip .h b{font-size:14px}body.echo .md-strip button{font-size:15px;min-height:32px}
  body.echo .md-note,body.echo .md-redo{font-size:15px}
  body.echo .bhead{padding:14px 18px}body.echo .bhead .nm{font-family:var(--e-display);font-size:21px;font-weight:700}
  body.echo .bhead .num{width:36px;height:36px;font-size:17px}body.echo .bhead .chev{font-size:15px}
  body.echo .bhead .sum,body.echo .bhead .sel{font-size:16px}
  body.echo .bq{font-size:18px;font-weight:600}
  body.echo .bcard{padding:20px 20px 18px}
  body.echo .bcard .name{font-family:var(--e-display);font-size:20px;font-weight:800}
  body.echo .bcard .desc{font-size:16px;line-height:1.45;color:#fff;opacity:.92}
  body.echo .bspecs dt{font-size:14.5px}body.echo .bspecs dd{font-size:18px}
  body.echo .bcard .tt{font-size:14.5px}body.echo .btr{font-size:16px}
  body.echo .bcard[aria-pressed="true"],body.echo .bcard[aria-checked="true"],body.echo .bcard.on{border:3px solid var(--e-sun);background:#26306f;box-shadow:0 0 0 3px rgba(255,209,102,.35)}
  body.echo .bcard[aria-pressed="true"] .mark,body.echo .bcard[aria-checked="true"] .mark,body.echo .bcard.on .mark{background:var(--e-sun);border-color:var(--e-sun);color:var(--e-ink)}
  body.echo .bwarn{font-size:15.5px}
  body.echo .md-link{font-size:15.5px}body.echo .md-link dt{font-size:14.5px}body.echo .md-link .tg-rel{font-size:15px}
  body.echo .build .ar-h{font-size:20px}body.echo .build .ar .t{font-size:19px}body.echo .build .ar .s,body.echo .build .ar .k{font-size:15.5px}
  body.echo .nose{width:310px;padding:18px 20px}body.echo .nose .t{font-size:14px;letter-spacing:.12em}
  body.echo .nose .r{font-size:15px;padding:6px 0;gap:12px}body.echo .nose .r span{min-width:0}body.echo .nose .r b{text-align:right}
  body.echo .build .ready.bbottom .btn{font-size:18px;height:54px}
  </style>`);
})();

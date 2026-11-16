/* Storm Watch Challenge 4 — Emergency downlink: ranking interface.
 *
 * UI only. The engine reads the same structure as before: S.ops.ix[3] = M.ext[3] = { order: [image ids], newFirst }.
 * engine.applyTriage gives each id in `order` a rank from its position; the engine's own rules (an image already being sent
 * finishes first, "Jump the queue" for new storm images, then the ranking) are unchanged.
 *
 * Five-card view: the first five images of the default order (science value per GB, then time), with the newest image on board
 * swapped in as the fifth if it is not already there. Each card shows its real position in the queue. Moving a card in the
 * five-card view only exchanges positions between those five; the other images never move. "Show all images" reorders the whole
 * queue. Nothing here runs the simulation: only the original Confirm & run button does.
 */
'use strict';
(function () {
  const C4 = { all: false, drag: null, focus: null };
  const on = () => S.screen === 'ops' && S.ops && S.ops.ci === 3 && S.ops.phase === 'choose' && S.ops.ix && S.ops.ix[3];
  function fiveIds(M) { const d = onboard(M); if (d.length <= 5) return d.map(r => r.id);
    const f = d.slice(0, 5).map(r => r.id), newest = d.slice().sort((a, b) => b.t - a.t || b.id - a.id)[0].id; if (!f.includes(newest)) f[4] = newest; return f; }
  // the cards on screen: [id, position in the full queue]
  function shown(x, M) { const all = x.order.map((id, i) => [id, i]); if (C4.all || x.order.length <= 5) return all; const f = new Set(fiveIds(M)); return all.filter(v => f.has(v[0])); }
  function move(from, to) { const o = S.ops, x = o.ix[3], V = shown(x, o.M); if (to < 0 || to >= V.length || from === to) return false;
    const ids = V.map(v => v[0]), slots = V.map(v => v[1]), [id] = ids.splice(from, 1); ids.splice(to, 0, id);
    slots.forEach((s, k) => { x.order[s] = ids[k]; }); o.M.ext[3] = x; return true; }

  const face = () => (window.EchoArt ? EchoArt.echo('think') : '');
  const INTRO = 'Let’s decide which images to send first! Drag and drop the images to change their order, or use the ↑ and ↓ buttons to move them up or down. The image at the top gets sent first!';
  const EXPLAIN = { std: 'Half the speed, uses less power.', fast: 'Full speed, uses more power.', full: 'Full sending rate.', eco: '30% less power, but 30% slower.' };
  const pct = v => Math.round(v);

  // Kim's coaching: every number comes from the existing preview (the next six hours as planned, no surprise events)
  function coach(x, p, n, sent, low) { const cr = p.d.critical;
    if (!cr) { const why = [];
      if (sent < n) why.push(`only ${sent} of the ${n} waiting images reach Earth before 24:00 in this plan, so sending time runs out`);
      if (low < 20) why.push(`the battery falls to ${pct(low)}%, close to the 10% reserve`);
      if (x.newFirst === false) why.push('new storm images wait behind the images you ranked');
      if (p.snap.missed) why.push(`${p.snap.missed} new image${p.snap.missed > 1 ? 's are' : ' is'} not taken at all`);
      return `Careful: with this plan no fresh storm image reaches forecasters by 24:00. ${why.length ? 'Why: ' + why.join('; ') + '.' : ''} Change one thing and watch the plan below.`; }
    if (low < 20) return `The fresh storm image is planned to arrive at ${hhmm(p.d.criticalRec.deliveredAt)}, but the battery drops to ${pct(low)}%. Faster sending and full power use more energy, and we must stay above the 10% reserve.`;
    if (sent < n) return `We need a recent storm picture before the deadline, but older images still contain useful data. Only ${sent} of ${n} waiting images fit before 24:00 in this plan, so think carefully about which ones go first!`;
    return 'We need a recent storm picture before the deadline, but older images still contain useful data. Think carefully about which ones to send first!'; }

  function card(r, pos, k, last, n) { const ok = r.status === 'delivered';
    return `<li class="c4c ${ok ? 'ok' : 'late'}" data-k="${k}">
      <span class="c4n" aria-hidden="true">${pos + 1}</span>
      <button class="c4h" data-c4="grab" data-k="${k}" aria-label="Image ${r.id}, number ${pos + 1} of ${n} in the queue. Drag, or press the up and down arrow keys, to move it.">⠿</button>
      <div class="c4m"><b>Image #${r.id}</b><span>taken ${hhmm(r.t)} · ${r.pts.toFixed(2)} pts</span></div>
      <span class="c4eta">${ok ? `arrives ${hhmm(r.deliveredAt)}` : 'too late'}</span>
      <span class="c4ud"><button class="c4b" data-a="c4Move" data-k="${k}" data-d="-1" aria-label="Move image ${r.id} up" ${k ? '' : 'disabled'}>↑</button><button class="c4b" data-a="c4Move" data-k="${k}" data-d="1" aria-label="Move image ${r.id} down" ${k === last ? 'disabled' : ''}>↓</button></span></li>`; }

  function seg(lab, gi, opts, val, why) { return `<div class="c4set"><div class="c4lab">${lab}</div><div class="c4seg" role="group" aria-label="${lab}">${opts.map(op => `<button class="${val === op[0] ? 'on' : ''}" ${op[2]} aria-pressed="${val === op[0]}">${op[1]}</button>`).join('')}</div><p class="c4why">${why}</p></div>`; }

  function c4Panel() { const o = S.ops, M = o.M, x = ixGet(), p = ixPreview(), rec = id => p.c.records.find(r => r.id === id) || { id, t: 0, pts: 0, status: 'stored' };
    const n = x.order.length, V = shown(x, M), sent = x.order.filter(id => rec(id).status === 'delivered').length, low = Math.min(...p.tr.map(f => f.batteryPct)), cr = p.d.critical;
    const c = o.choice[3], ch = chx('storm', 3);
    const cards = V.length ? `<ol class="c4q" aria-label="Transmission queue">${V.map((v, k) => card(rec(v[0]), v[1], k, V.length - 1, n)).join('')}</ol>` : '<p class="c4why">No images are waiting on board. Only the settings below are left to decide.</p>';
    const more = n > 5 ? `<div class="c4more"><button class="c4all" data-a="c4All" aria-expanded="${C4.all}">${C4.all ? 'Show the 5 picks only' : `Show all images (${n})`}</button><span>${C4.all ? 'You are ordering the whole queue.' : `${n - 5} more images wait in the queue in their current order.`}</span></div>` : '';
    const plan = `<div class="c4plan" role="status"><h4>Your Transmission Plan</h4><ul>
        <li><b>${sent} of ${n}</b> waiting image${n === 1 ? '' : 's'} expected to reach Earth by 24:00.</li>
        <li class="${cr ? 'good' : 'bad'}">${cr ? `Your plan is expected to deliver the fresh storm image at <b>${hhmm(p.d.criticalRec.deliveredAt)}</b>.` : '<b>Warning:</b> no fresh storm image is expected to arrive by 24:00.'}</li>
        <li class="${low < 20 ? 'bad' : ''}">Lowest battery: <b>${pct(low)}%</b>${low < 20 ? ' (close to the 10% reserve)' : ''}.</li></ul>
      ${p.snap.missed ? `<p class="c4warn">${p.snap.missed} new image${p.snap.missed > 1 ? 's' : ''} will not be taken (${Object.keys(p.c.missedReasons).join(', ')}).</p>` : ''}
      <details class="c4det"><summary>Details: every image in sending order</summary><ol>${x.order.map(id => { const r = rec(id); return `<li>#${id} · taken ${hhmm(r.t)} · ${r.status === 'delivered' ? 'arrives ' + hhmm(r.deliveredAt) : 'does not arrive by 24:00'}</li>`; }).join('')}</ol>
        <p class="c4why">Expected values assume the next six hours go as planned (no surprise events).</p></details></div>`;
    return `<div class="glass decision ix c4" id="ixPanel"><h3>Emergency downlink</h3>
      <div class="c4kim"><span class="c4face" aria-hidden="true">${face()}</span><div><b>Kim’s Tip</b><p>${INTRO}</p><p class="c4coach">${coach(x, p, n, sent, low)}</p></div></div>
      <p class="c4hint">Drag to reorder, or use ↑ ↓ to move images. Top image sends first.</p>
      ${n > 5 && !C4.all ? '<p class="c4why">These images were selected for their scientific value and freshness.</p>' : ''}
      ${cards}${more}
      <div class="c4sets">
        ${seg('New storm images', null, [['1', 'Jump the queue', 'data-a="ixNew" data-v="1"'], ['0', 'Wait their turn', 'data-a="ixNew" data-v="0"']], x.newFirst === false ? '0' : '1', x.newFirst === false ? 'New storm images wait behind your ranking: your order decides everything.' : 'A fresh storm image goes ahead of your ranking: good for the deadline, but older images wait longer.')}
        ${seg(ch.groups[0].lab, 0, ch.groups[0].opts.map(op => [op[0], op[1], `data-a="opt" data-g="0" data-v="${op[0]}"`]), c[0], EXPLAIN[c[0]] || '')}
        ${seg(ch.groups[1].lab, 1, ch.groups[1].opts.map(op => [op[0], op[1], `data-a="opt" data-g="1" data-v="${op[0]}"`]), c[1], EXPLAIN[c[1]] || '')}
      </div>${plan}
      <div class="c4go">${ixRunBtn()}</div></div>`; }

  const _ixPanel = ixPanel; ixPanel = function () { const o = S.ops; return o && o.ci === 3 ? c4Panel() : _ixPanel(); };
  function redraw(k, sel) { const d = document.getElementById('ixPanel'); if (d) d.outerHTML = ixPanel(); if (k != null) { const b = document.querySelector(`#ixPanel [data-c4="grab"][data-k="${k}"]`) || document.querySelector(`#ixPanel ${sel || ''}`); if (b) b.focus({ preventScroll: true }); } }
  function moveAndShow(from, to, sel) { if (move(from, to)) redraw(Math.max(0, to), sel); }

  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-a="c4Move"],[data-a="c4All"]'); if (!b || !on()) return; e.stopPropagation();
    if (b.dataset.a === 'c4All') { C4.all = !C4.all; redraw(null); const t = document.querySelector('#ixPanel [data-a="c4All"]'); if (t) t.focus({ preventScroll: true }); return; }
    const k = +b.dataset.k, d = +b.dataset.d; if (move(k, k + d)) { redraw(null); const nb = document.querySelector(`#ixPanel [data-a="c4Move"][data-k="${k + d}"][data-d="${d}"]:not([disabled])`) || document.querySelector(`#ixPanel [data-c4="grab"][data-k="${k + d}"]`); if (nb) nb.focus({ preventScroll: true }); } }, true);
  document.addEventListener('keydown', e => { const h = e.target && e.target.closest && e.target.closest('[data-c4="grab"]'); if (!h || !on()) return; const d = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0; if (!d) return;
    e.preventDefault(); const k = +h.dataset.k; moveAndShow(k, k + d); });
  // drag and drop with pointer events (mouse, pen and touch). The other cards slide to make room; the order is written on drop.
  document.addEventListener('pointerdown', e => { const h = e.target.closest && e.target.closest('[data-c4="grab"]'); if (!h || !on()) return; const li = h.closest('.c4c'), list = li.parentNode;
    const items = [...list.children], rects = items.map(x => x.getBoundingClientRect());
    C4.drag = { k: +h.dataset.k, to: +h.dataset.k, y0: e.clientY, li, items, rects, step: rects.length > 1 ? rects[1].top - rects[0].top : rects[0].height + 8 };
    li.classList.add('dragging'); list.classList.add('sorting'); try { h.setPointerCapture(e.pointerId); } catch (err) {} e.preventDefault(); });
  document.addEventListener('pointermove', e => { const d = C4.drag; if (!d) return; const dy = e.clientY - d.y0; d.li.style.transform = `translateY(${dy}px)`;
    d.to = Math.max(0, Math.min(d.items.length - 1, d.k + Math.round(dy / d.step)));
    d.items.forEach((x, i) => { if (x === d.li) return; const s = d.k < d.to && i > d.k && i <= d.to ? -1 : d.k > d.to && i < d.k && i >= d.to ? 1 : 0; x.style.transform = s ? `translateY(${s * d.step}px)` : ''; }); });
  const drop = () => { const d = C4.drag; if (!d) return; C4.drag = null; if (!move(d.k, d.to)) { d.items.forEach(x => { x.style.transform = ''; }); d.li.classList.remove('dragging'); d.li.parentNode.classList.remove('sorting'); return; } redraw(d.to); };
  document.addEventListener('pointerup', drop); document.addEventListener('pointercancel', drop);

  window.C4UI = { fiveIds, shown: () => shown(S.ops.ix[3], S.ops.M), move, setAll: v => { C4.all = !!v; } };
})();

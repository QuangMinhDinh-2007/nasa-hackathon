/* PROJECT ECHO — story, navigation and point-and-click presentation layer. Loaded LAST.
 *
 * What this file is: a wrapper around the existing game. It adds a title scene, motion-comic story panels, a Mission Room
 * with clickable objects, ECHO (the guide) and the Flight Director, button sounds and an Engineering Notebook.
 *
 * What this file is NOT: a gameplay engine. It never calls runChallenge / runFull / score to decide anything, never writes to
 * a mission state (S.ops.M, S.f.M, S.l.M), never changes a design, a decision, a Mission Code or a target on its own.
 * A hotspot click only NAVIGATES to the existing screen or opens the existing dialog. Every engineering decision is still
 * committed by the original buttons (data-a="run" / "frun" / "lrun"), exactly once, through the original handlers.
 * All numbers ECHO quotes are read from engine.derive() / engine.score() and the challenge log the game already makes.
 *
 * Rollback: remove the four echo/ lines from index.html and the game is the previous version again.
 */
'use strict';
(function () {
  const A = window.EchoArt, T = window.EchoStory, MD = window.MissionDesign;
  const MS = ['storm', 'fire', 'flood'];
  const BUILD = { storm: 'build', fire: 'fbuild', flood: 'lbuild' }, OPS = { storm: 'ops', fire: 'fops', flood: 'lops' }, REPORT = { storm: 'report', fire: 'freport', flood: 'lreport' };
  const ALERT = { storm: () => showAlert(), fire: () => showFAlert(), flood: () => showLAlert() };
  const START = { startMission: 'storm', fstart: 'fire', lstart: 'flood' };
  const mOfScreen = s => MS.find(m => BUILD[m] === s || OPS[m] === s || REPORT[m] === s);
  // browser storage with an in-page fallback: if localStorage is blocked or full, the game keeps working for this page session
  const LS = { mem: {}, ok: (() => { try { localStorage.setItem('echo.__t', '1'); localStorage.removeItem('echo.__t'); return true; } catch (e) { return false; } })(),
    get(k) { if (k in this.mem) return this.mem[k]; try { return localStorage.getItem('echo.' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('echo.' + k, v); delete this.mem[k]; } catch (e) { this.mem[k] = v; this.ok = false; } },
    del(k) { delete this.mem[k]; try { localStorage.removeItem('echo.' + k); } catch (e) {} } };
  const reduced = () => E.fast || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const E = S.echo = { cur: null, briefed: {}, designed: {}, launched: {}, inCh: {}, seen: {}, run: { storm: 0, fire: 0, flood: 0 }, snap: {}, fast: false, fid: {}, owner: {}, fseen: {}, rewoundM: {}, sound: LS.get('sound') !== 'off', q: null, cm: null };

  /* ================= sound: tiny generated button sounds (no audio files). Never touches game state. ================= */
  const Sfx = { ctx: null,
    tone(f, d, type, vol, when, slide) { if (!E.sound || E.fast) return; try { this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
      const c = this.ctx; if (c.state === 'suspended') c.resume(); const t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.02); },
    hover() { this.tone(880, 0.05, 'sine', 0.025); }, click() { this.tone(520, 0.08, 'triangle', 0.07, 0, 760); },
    confirm() { this.tone(523, 0.1, 'triangle', 0.07); this.tone(784, 0.16, 'triangle', 0.07, 0.09); },
    nope() { this.tone(220, 0.14, 'sine', 0.07, 0, 160); }, page() { this.tone(300, 0.16, 'sine', 0.04, 0, 620); },
    chirp() { this.tone(1200, 0.06, 'sine', 0.05, 0, 1700); this.tone(1500, 0.07, 'sine', 0.05, 0.08, 2100); },
    win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.07, i * 0.11)); },
    launch() { [0, .32, .64].forEach(t => this.tone(880, .12, 'square', .045, t)); this.tone(1320, .3, 'square', .05, .96);
      this.tone(90, 2.6, 'sawtooth', .07, 1.05, 38); this.tone(140, 2.2, 'triangle', .05, 1.1, 60); },
    deploy() { this.tone(660, .12, 'sine', .06); this.tone(990, .14, 'sine', .06, .12); this.tone(1320, .3, 'triangle', .06, .26); }, low() { this.tone(392, 0.2, 'sine', 0.06); this.tone(330, 0.3, 'sine', 0.06, 0.18); } };
  /* voice hook for later: set ECHO.voice = { play(lineId, who, text) {} } and every story line will call it. Subtitles stay on. */
  const voice = (id, who, text) => { const v = window.ECHO && window.ECHO.voice; if (v && v.play) try { v.play(id, who, text); } catch (e) {} };

  /* ================= read-only helpers ================= */
  const st = m => { try { return MX[m].st(); } catch (e) { return null; } };
  function stage(m) { if (!m) return 'none'; if (!E.briefed[m] || !S.target[m]) return 'goal';
    const s = st(m); if (!E.launched[m] || !s) return E.designed[m] ? 'review' : 'design';
    if (s.ci === 3 && s.phase === 'result') return 'report'; return 'c' + s.ci; }
  function activeHot(m) { const g = stage(m); return g === 'goal' ? 'holo' : g === 'design' ? 'bench' : g === 'review' ? 'launch' : g === 'report' ? 'board' : g[0] === 'c' ? T.hot[m][+g[1]] : null; }
  function objective(m) { const g = stage(m), M = T.missions[m]; return g === 'goal' ? M.goal : g === 'design' ? M.design : g === 'review' ? M.review : g === 'report' ? T.ui.reportGoal : g[0] === 'c' ? M.ch[+g[1]].goal : ''; }
  function facts(m) { const s = st(m); if (!s || !s.M) return {}; const X = MX[m], d = X.eng.derive(s.M), b = E.snap[m] || {};
    const n = v => Array.isArray(v) ? v.length : (v && typeof v.size === 'number') ? v.size : +v || 0;
    return { batt: Math.round(d.batteryPct), stor: Math.round(d.storagePct), health: d.health, pts: fmt(d[X.pts]), need: X.target,
      cap: n(d.nCaptured) - n(b.nCaptured), del: n(d.nDelivered), miss: n(d.missedCaptures) - n(b.missedCaptures), onb: n(d.nOnboard != null ? d.nOnboard : d.onboard),
      det: n(s.M.detected), zones: n(d.coveredZones), cov: n(d[X.cov]) }; }
  const fill = (t, f) => t.replace(/\{(\w+)\}/g, (_, k) => f[k] != null ? f[k] : '');
  const plural = t => t.replace(/\b1 (pictures|items|fires|maps|zones)\b/g, (_, w) => '1 ' + w.slice(0, -1));

  /* ================= dialogue (subtitles; click, Enter or Space = next; Esc = skip) ================= */
  const host = document.createElement('div'); host.id = 'echoHost'; document.body.appendChild(host);
  host.innerHTML = '<div id="echoComic" hidden></div><div id="echoTalk" hidden></div><div id="echoNote" hidden></div><div id="echoFx" aria-hidden="true"></div>';
  const elTalk = host.querySelector('#echoTalk'), elComic = host.querySelector('#echoComic'), elNote = host.querySelector('#echoNote');
  const NAME = { echo: 'Kim', dir: 'Flight Director' }, face = (who, mood) => who === 'dir' ? A.director() : A.echo(mood);
  function talk(lines, done, opts) { lines = (lines || []).filter(Boolean); if (!lines.length || E.fast) { if (done) done(); return; }
    E.q = { lines, i: 0, done, chip: opts && opts.chip }; showLine(); }
  function showLine() { const q = E.q; if (!q) return; const L = q.lines[q.i], last = q.i === q.lines.length - 1;
    elTalk.hidden = false; elTalk.innerHTML = `<div class="et-box ${L.who}" role="dialog" aria-live="polite" aria-label="${NAME[L.who]} says">
      <div class="et-face">${face(L.who, L.mood)}</div>
      <div class="et-body"><b class="et-name">${NAME[L.who]}</b>${q.chip && q.i === 0 ? `<span class="et-chip ${q.chip[1]}">${esc(q.chip[0])}</span>` : ''}<p class="et-text">${esc(L.say)}</p></div>
      <div class="et-btns"><button class="eb eb-sun" data-e="talkNext" autofocus>${last ? 'OK' : 'Next'} <span aria-hidden="true">▸</span></button>${last ? '' : '<button class="eb-link" data-e="talkSkip">Skip</button>'}</div></div>`;
    Sfx[L.who === 'echo' ? 'chirp' : 'page'](); voice(L.id || '', L.who, L.say);
    placeBubble(L.who);
    const b = elTalk.querySelector('[data-e="talkNext"]'); if (b) b.focus({ preventScroll: true }); }
  // In the Mission Room Kim's lines appear as a speech bubble beside Kim (left or right, whichever side has room).
  function placeBubble(who) { const box = elTalk.querySelector('.et-box'), bird = document.querySelector('#app .room-echo'); elTalk.classList.remove('near');
    if (!box || who !== 'echo' || S.screen !== 'room' || !bird || innerWidth < 900) return; const r = bird.getBoundingClientRect(); if (!r.width) return;
    elTalk.classList.add('near'); const w = Math.min(460, innerWidth - 32), right = r.right + 14 + w <= innerWidth - 16;
    box.classList.toggle('tail-l', right); box.classList.toggle('tail-r', !right); box.style.width = w + 'px';
    box.style.left = (right ? r.right + 14 : Math.max(16, r.left - 14 - w)) + 'px';
    const h = box.offsetHeight; box.style.top = Math.max(84, Math.min(innerHeight - h - 70, r.top + r.height * .2)) + 'px'; }
  function talkNext() { const q = E.q; if (!q) return; if (++q.i >= q.lines.length) return talkEnd(); showLine(); }
  function talkEnd() { const q = E.q; E.q = null; elTalk.hidden = true; elTalk.classList.remove('near'); elTalk.innerHTML = ''; if (q && q.done) q.done(); }

  /* ================= motion-comic panels (skippable) ================= */
  function comic(panels, done, opts) { panels = (panels || []).filter(Boolean); if (!panels.length || E.fast) { if (done) done(); return; }
    E.cm = { panels, i: 0, done, m: (opts && opts.m) || S.mission || 'storm', title: opts && opts.title }; showPanel(); }
  function showPanel() { const c = E.cm; if (!c) return; const P = c.panels[c.i], last = c.i === c.panels.length - 1;
    elComic.hidden = false; elComic.innerHTML = `<div class="ec-wrap" role="dialog" aria-label="Story">
      ${c.title ? `<div class="ec-title">${esc(c.title)}</div>` : ''}
      <div class="ec-panel" key="${c.i}"><div class="ec-art">${A.scene(P.art, c.m)}</div><div class="ec-cap">${esc(P.cap)}</div></div>
      ${P.say ? `<div class="ec-say ${P.who}"><div class="et-face">${face(P.who, P.mood)}</div><div><b class="et-name">${NAME[P.who]}</b><p>${esc(P.say)}</p></div></div>` : ''}
      <div class="ec-foot"><div class="ec-dots">${c.panels.map((_, i) => `<i class="${i === c.i ? 'on' : i < c.i ? 'done' : ''}"></i>`).join('')}</div>
        <span style="flex:1"></span>${last ? '' : '<button class="eb-link" data-e="comicSkip">Skip story</button>'}<button class="eb eb-sun" data-e="comicNext">${last ? (c.panels.length > 1 ? 'Let’s go' : 'OK') : 'Next'} <span aria-hidden="true">▸</span></button></div></div>`;
    Sfx.page(); if (P.say) voice(P.id || '', P.who, P.say);
    const b = elComic.querySelector('[data-e="comicNext"]'); if (b) b.focus({ preventScroll: true }); }
  function comicNext() { const c = E.cm; if (!c) return; if (++c.i >= c.panels.length) return comicEnd(); showPanel(); }
  function comicEnd() { const c = E.cm; E.cm = null; elComic.hidden = true; elComic.innerHTML = ''; if (c && c.done) c.done(); }

  /* ================= screens added by Project ECHO ================= */
  BGKEY.title = 'dest'; BGKEY.room = 'dest';
  const LOGO_E = `<span class="e-logo"><i>PROJECT</i><b>ECHO</b></span>`;
  V.title = () => { const f = Saves.list()[0];
    return `<div class="screen e-title">
      <div class="e-title-art">${A.scene('title')}</div>
      <div class="e-title-card"><div class="e-title-echo">${A.echo('cheer')}</div><div class="e-kicker">A space mission design game</div>
        <h1 class="e-logo-big"><i>PROJECT</i><b>ECHO</b></h1>
        <p>Design a satellite. Fly the mission. Help Earth.</p>
        ${P.cur() ? `<div class="e-who"><span>Playing as <b>${esc(P.cur().name)}</b></span><button class="eb-link" data-e="acct">My Account</button></div>` : E.guest ? `<div class="e-who e-guest"><span><b>Guest — progress not saved</b></span><button class="eb-link" data-e="acct">My Account</button></div>` : ''}
        ${f ? `<button class="e-cont" data-e="contFlight" data-fid="${f.fid}"><span class="e-cont-k">Continue Mission</span><b>${MN[f.m]}</b><span>${progressOf(f)} · saved ${day(f.t)}</span><i aria-hidden="true">▸</i></button>` : ''}
        <div class="e-title-acts"><button class="eb ${f ? 'eb-ghost' : 'eb-sun eb-big'}" data-e="begin">${f ? 'Start New Mission' : 'Start Adventure <span aria-hidden="true">▸</span>'}</button></div>
        ${saveNotes()}</div></div>`; };
  const saveNotes = () => { const n = Saves.notes.slice(); if (!LS.ok) n.push('This browser is not saving right now. Your progress lasts until you close this page.'); if (XPV.pending()) n.push('Earlier XP and patches are waiting in My Account.'); return n.length ? `<div class="e-savenote" role="status">${n.map(esc).join('<br>')}</div>` : ''; };
  V.signin = V.title; V.ready = V.title; V.dest = V.title;   // the old sign-in / welcome / destination pages are replaced by the title scene

  const _missions = V.missions;
  V.missions = () => { const art = { storm: `<div class="art">${stormArt()}</div>`, fire: `<div class="art" style="background:#1d2a17">${cardArt('fire')}</div>`, flood: `<div class="art" style="background:#123a6a">${cardArt('flood')}</div>` };
    const act = { storm: 'startMission', fire: 'fstart', flood: 'lstart' };
    return `<div class="screen e-missions">
      <div class="e-top"><button class="eb eb-ghost" data-e="toTitle">‹ Title</button>${LOGO_E}<span style="flex:1"></span>${topBtns()}</div>
      <div class="e-mis-head"><div class="e-mis-echo">${A.echo('happy')}</div><div class="e-bubble">Three ways to help Earth. Pick one!</div></div>
      <div class="mis-grid e-mis-grid">${MS.map(m => { const ep = T.episodes[m], best = bestOf(m), f = Saves.list().find(x => x.m === m);
        return `<div class="mis e-ep ep-${m}" data-m="${m}">${art[m]}
          <div class="body"><div class="e-ep-n">Mission ${ep.n}${m === 'storm' ? ' <span class="e-rec">★ ' + ep.level + '</span>' : ''}</div><h3>${ep.title}</h3><p>${ep.blurb}</p>
          ${best ? `<div class="e-best">Best so far: <b>${best}</b></div>` : ''}
          ${f ? `<button class="e-cont e-cont-sm" data-e="contFlight" data-fid="${f.fid}" aria-label="Continue ${ep.title}: ${progressOf(f)}"><span class="e-cont-k">Continue Mission</span><span>${progressOf(f)}</span><i aria-hidden="true">▸</i></button>` : ''}
          <div class="e-ep-btns"><button class="eb ${f ? 'eb-ghost' : 'eb-sun'}" data-a="${act[m]}" aria-label="Start a new ${ep.title} mission">${f ? 'Start New Mission' : 'Play <span aria-hidden="true">▸</span>'}</button></div></div></div>`; }).join('')}</div></div>`; };
  const bestOf = m => { const r = S.last && S.last[m]; return r && r.result ? `${r.result.score} · ${r.result.outcome}` : ''; };
  const topBtns = () => `<button class="eb-icon" data-e="acct" aria-label="My Account" title="My Account">${ICON.user}</button><button class="eb-icon" data-e="note" aria-label="Engineering notebook" title="Engineering notebook">${ICON.book}</button><button class="eb-icon" data-e="sound" aria-label="Sound ${E.sound ? 'on' : 'off'}" aria-pressed="${E.sound}" title="Button sounds">${E.sound ? ICON.snd : ICON.mute}</button>`;
  const ICON = { user: '<svg viewBox="0 0 48 48"><circle cx="24" cy="17" r="9" fill="#ffb3c7" stroke="#4a3b63" stroke-width="3"/><path d="M8 42q2-14 16-14t16 14z" fill="#7fe0c2" stroke="#4a3b63" stroke-width="3" stroke-linejoin="round"/></svg>',
    book: '<svg viewBox="0 0 48 48"><path d="M8 10q8-4 16 2q8-6 16-2v26q-8-4-16 2q-8-6-16-2z" fill="#6cc4ff" stroke="#4a3b63" stroke-width="3" stroke-linejoin="round"/><path d="M24 12v26" stroke="#4a3b63" stroke-width="3"/><path d="M12 18h8M12 24h8M28 18h8M28 24h8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>',
    snd: '<svg viewBox="0 0 48 48"><path d="M8 19h8l10-9v28l-10-9h-8z" fill="#ffd166" stroke="#4a3b63" stroke-width="3" stroke-linejoin="round"/><path d="M32 17q6 7 0 14M37 12q10 12 0 24" fill="none" stroke="#4a3b63" stroke-width="3" stroke-linecap="round"/></svg>',
    mute: '<svg viewBox="0 0 48 48"><path d="M8 19h8l10-9v28l-10-9h-8z" fill="#e7e2f2" stroke="#4a3b63" stroke-width="3" stroke-linejoin="round"/><path d="M32 18l10 12M42 18l-10 12" stroke="#4a3b63" stroke-width="3" stroke-linecap="round"/></svg>' };

  // hotspot boxes in % of the 1600 x 900 room art: [left, top, width, height, label side]
  const HOT = { power: [3.6, 42, 12.2, 34.5], bench: [17.4, 59, 20.4, 26], obs: [21.6, 16.5, 18, 24.5], holo: [43, 39.5, 14, 34], launch: [61.5, 55, 21, 29], board: [63, 15.5, 14.6, 20.5], data: [82.6, 36, 9, 38], comms: [91, 51, 8.6, 26.5] };
  const STEPS = [['goal', 'Goal'], ['design', 'Build'], ['review', 'Check'], ['c0', '1'], ['c1', '2'], ['c2', '3'], ['c3', '4'], ['report', 'Report']];
  V.room = () => { const m = S.mission || 'storm', g = stage(m), act = activeHot(m), s = st(m), flying = !!E.launched[m] && !!s, f = flying ? facts(m) : {};
    let svg = A.room(m, { flying, batt: flying ? f.batt : 100, stor: flying ? f.stor : 0 });
    svg = svg.replace(`class="hs" data-hs="${act}"`, `class="hs go" data-hs="${act}"`);
    const doneHot = {}; if (flying) for (let i = 0; i < 4; i++) if (s.log[i] && (i < s.ci || g === 'report')) doneHot[T.hot[m][i]] = s.log[i];
    const tag = { power: flying ? `Battery ${f.batt}%` : '', data: flying ? `Storage ${f.stor}%` : '', comms: flying ? `${f.pts} / ${f.need} pts on Earth` : '' };
    const pos = HOT[act] || HOT.holo, ex = pos[0] > 70 ? pos[0] - 10 : pos[0] + pos[2] - 1, ey = Math.max(4, pos[1] - 12);
    const idx = STEPS.findIndex(x => x[0] === g);
    return `<div class="screen e-room m-${m}"><div class="room-stage" id="roomStage">${svg}
      ${Object.keys(HOT).map(k => { const p = HOT[k], on = k === act, L = doneHot[k];
        return `<button class="rhot ${on ? 'is-go' : ''} ${L ? 'is-done' : ''}" data-e="hot" data-hot="${k}" style="left:${p[0]}%;top:${p[1]}%;width:${p[2]}%;height:${p[3]}%" aria-label="${T.hotName[k]}${on ? ' (next step)' : ''}">
          <span class="rhot-lab">${T.hotName[k]}</span>${on ? '<span class="rhot-arrow" aria-hidden="true"><svg viewBox="0 0 48 52"><path d="M14 4h20v18h10L24 48 4 22h10z" fill="#ff8f7a" stroke="#4a3b63" stroke-width="4" stroke-linejoin="round"/></svg></span>' : ''}
          ${L && !on ? `<span class="rhot-badge ${L.met ? 'ok' : 'no'}" title="${esc(L.badge)}">${L.met ? '✓' : '!'}</span>` : ''}${tag[k] ? `<span class="rhot-tag">${tag[k]}</span>` : ''}</button>`; }).join('')}
      <button class="room-echo" data-e="hint" style="left:${ex}%;top:${ey}%" aria-label="Ask Kim for a hint">${A.echo(g === 'report' ? 'cheer' : 'happy')}</button>
      <div class="room-goal" role="status"><small>${T.episodes[m].tag}${flying ? ' · ' + esc(S.scn[m].code) : ''}</small>${esc(objective(m))}</div>
      <div class="room-top"><button class="eb eb-ghost" data-e="toMissions">‹ Missions</button>${topBtns()}</div>
      <div class="room-steps" aria-label="Mission progress">${STEPS.map((x, i) => `${i === 3 ? '<em>Fly</em>' : ''}<span class="${i < idx ? 'done' : i === idx ? 'on' : ''}">${i < idx ? '✓' : x[1]}</span>`).join('')}</div>
    </div></div>`; };

  /* ================= room behaviour ================= */
  function toRoom(after) { if (S.screen !== 'room') go('room'); else render(); enterRoom(after); }
  function roomFocus() { const h = document.querySelector('.rhot.is-go'), w = document.querySelector('.e-room'); if (h && w && w.scrollWidth > w.clientWidth + 4) w.scrollLeft = h.offsetLeft + h.offsetWidth / 2 - w.clientWidth / 2; }
  // plays the story beat that belongs to the current step, once per attempt. Skipping it changes nothing.
  function enterRoom(after) { const m = S.mission, g = stage(m), M = T.missions[m], key = `${m}:${g}:${E.run[m]}`, done = () => { if (after) after(); };
    if (E.seen[key]) return done(); E.seen[key] = 1; if (E.fseen[m] && !E.fseen[m].includes(g)) { E.fseen[m].push(g); checkpoint(m); }
    if (g === 'goal') return talk([{ who: 'echo', say: M.goalHint, id: `${m}.goal` }], () => tour(false, done));
    if (g === 'design') return talk([{ who: 'echo', say: 'Goal locked in! ' + M.designHint, mood: 'cheer', id: `${m}.design` }], done);
    if (g === 'review') return talk([{ who: 'echo', say: M.reviewHint, id: `${m}.review` }], done);
    const ci = g === 'report' ? 4 : +g[1], beat = () => { if (ci > 3) return ending(m, done);
      const C = M.ch[ci], f = facts(m); comic([{ art: C.art, cap: C.cap }], () => talk(C.lines.map((l, i) => ({ who: l.who, say: plural(fill(l.say, f)), mood: l.who === 'echo' && /Uh-oh|quick|please/i.test(l.say) ? 'worry' : 'happy', id: `${m}.c${ci + 1}.${i}` })), done), { m, title: `Challenge ${ci + 1} of 4` }); };
    if (ci === 0) return talk(E.run[m] > 0 && E.rewound ? [{ who: 'echo', say: T.ui.rewind[1], mood: 'cheer' }] : M.inOrbit.map((l, i) => ({ who: l.who, say: l.say, id: `${m}.orbit.${i}` })), beat);
    feedback(m, ci - 1, beat); }
  // ECHO's reaction to the challenge that just ran: chosen by the game's own challenge log (met / badge), numbers from derive()
  function feedback(m, ci, next) { const s = st(m), L = s && s.log[ci]; if (!L) return next(); const C = T.missions[m].ch[ci], f = facts(m);
    Sfx[L.met ? 'win' : 'low']();
    talk([{ who: 'echo', say: plural(fill(L.met ? C.ok : C.no, f)), mood: L.met ? 'cheer' : 'worry', id: `${m}.c${ci + 1}.${L.met ? 'ok' : 'no'}` }, { who: 'echo', say: C.why, mood: 'think', id: `${m}.c${ci + 1}.why` }], next, { chip: [L.badge, L.met ? 'ok' : 'no'] }); }
  // ending panel: picked by the engine's outcome; missed requirements are listed from the engine's gates
  function ending(m, done) { const s = st(m), sc = MX[m].eng.score(s.M), M = T.missions[m], k = sc.outcome === 'Mission Success' ? 'success' : sc.outcome === 'Partial Success' ? 'partial' : 'fail';
    const missed = ['G1', 'G2', 'G3', 'G4'].filter(g => !sc.gates[g]).map(g => M.gateLine[g]);
    Sfx[k === 'success' ? 'win' : 'low']();
    comic([{ art: k, cap: M.end[k][0], who: 'echo', say: k === 'success' ? M.end[k][1] : (missed[0] || M.end[k][1]), mood: k === 'success' ? 'cheer' : k === 'partial' ? 'think' : 'sad' }], () => talk([{ who: 'dir', say: `${sc.outcome}. Score ${sc.total} of 100.` }, { who: 'echo', say: k === 'success' ? T.ui.report : M.end[k][1], mood: k === 'success' ? 'cheer' : 'happy' }], done), { m, title: sc.outcome }); }

  function hotClick(k) { const m = S.mission, g = stage(m), act = activeHot(m), s = st(m);
    if (k !== act) { Sfx.nope(); const flying = !!E.launched[m];
      if (k === 'holo' && S.target[m]) { const t = MD.targetDef(m, S.target[m]); return talk([{ who: 'echo', say: `Our goal: ${t.title}. ${t.statement}` }]); }
      if (k === 'bench' && flying) return talk([{ who: 'echo', say: T.ui.locked }]);
      if (flying && s) { const i = T.hot[m].findIndex((h, n) => h === k && s.log[n] && (n < s.ci || g === 'report')); if (i >= 0) return talk([{ who: 'echo', say: `Challenge ${i + 1}: ${s.log[i].badge}.`, mood: s.log[i].met ? 'cheer' : 'think' }]); }
      return talk([{ who: 'echo', say: T.ui.notYet[(E.nope = (E.nope || 0) + 1) % 3] + ' ' + objective(m), mood: 'think' }]); }
    Sfx.confirm();
    if (g === 'goal') return go('brief');
    if (g === 'design') return go(BUILD[m]);
    if (g === 'review') return mrr(m);                      // the existing Design Check dialog
    if (g === 'report') { E.openReport = true; go(REPORT[m]); E.openReport = false; return; }
    // a challenge: open the existing operate screen. Nothing is simulated here; the original "Confirm & run" button does that.
    E.inCh[m] = s.ci; E.snap[m] = Object.assign({}, MX[m].eng.derive(s.M));
    go(OPS[m]); if (s.phase === 'alert') ALERT[m](); }

  /* ================= hooks into the existing flow (navigation only) ================= */
  const _go = go;
  go = function (scr) {
    if (scr === 'signin' || scr === 'ready' || scr === 'dest') scr = 'title';
    const m = mOfScreen(scr);
    if (m && scr === OPS[m]) { const s = st(m); if (s && s.phase === 'alert' && E.inCh[m] !== s.ci) { S.mission = m; _go('room'); return redoPending(m) ? undefined : enterRoom(); } }
    if (m && scr === REPORT[m] && !E.openReport) { S.mission = m; _go('room'); return enterRoom(); }
    _go(scr); };
  // challenge alerts: shown only when the player has clicked into that challenge from the room
  const redoPending = m => { const R = S.redo && S.redo[m], s = st(m); return !!(R && R.pending && s && s.ci === 0 && s.phase === 'alert'); };
  // Rewind: after relaunch the existing "Fly my earlier decisions / Make new decisions" dialog opens over the room (same handlers, same engine).
  const wrapAlert = (m, f) => function () { const s = st(m);
    if (redoPending(m) && window.MDUI) { S.mission = m; if (S.screen !== 'room') _go('room'); talkEnd(); comicEnd(); return MDUI.redoModal(m); }
    if (s && E.inCh[m] !== s.ci) { $('#layer').innerHTML = ''; S.mission = m; if (S.screen !== 'room') _go('room'); enterRoom(); return; } f(); };
  showAlert = wrapAlert('storm', showAlert); showFAlert = wrapAlert('fire', showFAlert); showLAlert = wrapAlert('flood', showLAlert);
  const _endLaunch = window.endLaunch;
  // When the launch animation finishes on its own, it stops on "Satellite deployed" and waits for Next.
  // Skip, and any call made with no launch scene on screen, go straight on as before.
  window.endLaunch = function () { const m = S.mission || 'storm', scene = document.querySelector('#layer .launch, #layer canvas');
    if (scene && !E.skipLaunch && !E.deployOk && !E.fast) { if (document.querySelector('#layer .e-deploy')) return;
      Sfx.deploy(); const box = document.querySelector('#layer .launch, #layer > *') || document.getElementById('layer');
      box.insertAdjacentHTML('beforeend', `<div class="e-deploy" role="dialog" aria-label="Satellite deployed"><div class="et-face">${A.echo('cheer')}</div><div><b class="et-name">Kim</b><p>Satellite deployed! We are in orbit. Let’s go back to the Mission Room.</p></div><button class="eb eb-sun" data-e="deployNext" autofocus>Next <span aria-hidden="true">▸</span></button></div>`);
      const n = document.querySelector('[data-e="deployNext"]'); if (n) n.focus({ preventScroll: true }); return; }
    E.skipLaunch = false; E.deployOk = false; E.launched[m] = true; E.inCh[m] = null; _endLaunch(); };
  S.howSeen = true;   // the old pop-up tutorial is replaced by ECHO's one-line hints (still in the notebook)

  function newAttempt(m, rewound) { E.run[m]++; E.inCh[m] = null; E.rewound = !!rewound;
    E.fid[m] = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); E.owner[m] = Saves.who(); E.fseen[m] = []; }
  // At most five unfinished missions per player: a new one starts only after one is finished or deleted. Runs before every other handler.
  window.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-a]'); if (!b || !START[b.dataset.a]) return;
    if (Saves.list().length >= MAXF) { e.stopPropagation(); e.preventDefault(); Sfx.nope(); E.flLimit = true; account(); } }, true);
  // capture phase: runs before the original handlers
  document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
    if (START[a]) { e.stopPropagation(); const m = START[a]; S.mission = m; E.cur = m; E.briefed[m] = false; E.designed[m] = false; E.launched[m] = false; newAttempt(m); Sfx.confirm();
      return comic(T.missions[m].brief, () => toRoom(), { m, title: T.episodes[m].title }); }
    if (a === 'briefGo') { const m = S.mission; if (!S.target[m]) return; e.stopPropagation(); E.briefed[m] = true; Sfx.confirm(); return toRoom(); }
    if (a === 'mrr' && BUILD[b.dataset.m || S.mission] === S.screen) { e.stopPropagation(); const m = b.dataset.m || S.mission; S.mission = m; E.designed[m] = true; Sfx.confirm(); return toRoom(); }
    if (a === 'back') { e.stopPropagation(); const m = mOfScreen(S.screen), s = m && st(m); if (s && s.phase === 'playing') return toast('Wait for the mission clock to stop.');
      $('#layer').innerHTML = ''; if (m) { S.mission = m; if (S.screen === OPS[m]) E.inCh[m] = s && s.phase === 'alert' ? null : E.inCh[m]; } Sfx.click(); return m ? toRoom() : go('missions'); }
    if (a === 'alertBack' || a === 'falertBack' || a === 'lalertBack') { e.stopPropagation(); $('#layer').innerHTML = ''; E.inCh[S.mission] = null; Sfx.click(); return toRoom(); }
    if (a === 'retry' || a === 'fretry' || a === 'lretry') { const m = mOfScreen(S.screen) || S.mission; newAttempt(m, true); }
    if (a === 'improve') { const m = b.dataset.m || S.mission; E.designed[m] = false; E.launched[m] = false; newAttempt(m, true); }
    if (a === 'redesign' || a === 'fredesign' || a === 'lredesign') { const m = mOfScreen(S.screen) || S.mission; E.designed[m] = false; E.launched[m] = false; newAttempt(m); }
    if (a === 'skip') E.skipLaunch = true;
    if (a === 'goLaunch') Sfx.launch(); else if (a === 'run' || a === 'frun' || a === 'lrun' || a === 'pickTarget') Sfx.confirm(); else Sfx.click();
  }, true);
  // bubble phase: runs after the original handlers
  document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
    if (a === 'mrrBack' && S.screen === 'room') { const m = S.mission; E.designed[m] = false; go(BUILD[m]); }
    if (a === 'retry' || a === 'fretry' || a === 'lretry' || a === 'improve') comic([{ art: 'rewind', cap: T.ui.rewind[0], who: 'echo', say: T.ui.rewind[1], mood: 'cheer' }], null, { title: 'ECHO Rewind' });
    if (a === 'changeTarget') { /* the brief screen is opened by the original handler */ } });

  // Project ECHO's own buttons
  document.addEventListener('click', e => { const b = e.target.closest('[data-e]'); if (!b) return; const a = b.dataset.e;
    switch (a) {
      case 'moToggle': { E.moOpen = E.moOpen === false; const m = mOfScreen(S.screen), sd = document.querySelector('.ops .side'); if (m && sd) sd.outerHTML = MX[m].dashFn(); const t = document.querySelector('[data-e="moToggle"]'); if (t) t.focus(); break; }
      case 'ogNext': ogStep(1); break; case 'ogBack': ogStep(-1); break; case 'ogSkip': Sfx.click(); ogEnd(); break;
      case 'tourNext': tourStep(1); break; case 'tourBack': tourStep(-1); break; case 'tourSkip': tourEnd(); break;
      case 'tourReplay': elNote.hidden = true; elNote.innerHTML = ''; if (S.screen !== 'room') toRoom(() => tour(true)); else tour(true); break;
      case 'acct': account(); break; case 'acctClose': elAcct.hidden = true; elAcct.innerHTML = ''; break;
      case 'acctNew': { const i = document.getElementById('acctName'), v = (i && i.value || '').trim().slice(0, 24); if (!v) { if (i) i.focus(); break; } P.create(v); account(); if (E.afterAcct) { const f = E.afterAcct; E.afterAcct = null; elAcct.hidden = true; elAcct.innerHTML = ''; f(); } break; }
      case 'acctUse': P.use(b.dataset.id); account(); render(); break;
      case 'acctGuest': E.guest = true; XPV.apply(); elAcct.hidden = true; elAcct.innerHTML = ''; if (E.afterAcct) { const f = E.afterAcct; E.afterAcct = null; f(); } else render(); break;
      case 'legacyGive': { const sel = document.getElementById('legacyTo'); if (sel && sel.value) { XPV.give(sel.value); toast('Earlier progress added to ' + ((P.data().list.find(p => p.id === sel.value) || {}).name || 'player') + '.'); } account(); render(); break; }
      case 'legacyLeave': XPV.leave(); account(); render(); break;
      case 'acctDel': E.delAsk = b.dataset.id; account(); break; case 'acctDelNo': E.delAsk = null; account(); break;
      case 'acctDelYes': LS.del(Saves.key(E.delAsk)); P.remove(E.delAsk); E.delAsk = null; account(); render(); break;
      case 'deployNext': Sfx.confirm(); E.deployOk = true; window.endLaunch(); break;
      case 'talkNext': Sfx.click(); talkNext(); break; case 'talkSkip': Sfx.click(); talkEnd(); break;
      case 'comicNext': comicNext(); break; case 'comicSkip': Sfx.click(); comicEnd(); break;
      case 'begin': Sfx.confirm(); if (!P.cur() && !E.fast && !E.guest) { E.afterAcct = () => b.click(); account(true); break; } if (P.flag('prologue') || LS.get('prologue')) go('missions'); else { P.flag('prologue', 1); comic(T.prologue, () => go('missions'), { title: 'Project ECHO' }); } break;
      case 'replayIntro': elNote.hidden = true; comic(T.prologue, null, { title: 'Project ECHO' }); break;
      case 'replayBrief': elNote.hidden = true; comic(T.missions[b.dataset.m].brief, null, { m: b.dataset.m, title: T.episodes[b.dataset.m].title }); break;
      case 'toTitle': Sfx.click(); go('title'); break; case 'toMissions': Sfx.click(); go('missions'); break;
      case 'toRoom': Sfx.click(); $('#layer').innerHTML = ''; toRoom(); break;
      case 'contFlight': Sfx.confirm(); continueFlight(b.dataset.fid); break;
      case 'flDel': E.flDelAsk = b.dataset.fid; account(); break; case 'flDelNo': E.flDelAsk = null; account(); break;
      case 'flDelYes': { const fid = E.flDelAsk; E.flDelAsk = null; Saves.drop(fid); delete lastSig[fid]; MS.forEach(m => { if (E.fid[m] === fid) E.closed = fid; }); account(); if (['title', 'missions'].includes(S.screen)) render(); break; }
      case 'resume': Sfx.confirm(); S.mission = b.dataset.m; E.cur = b.dataset.m; toRoom(); break;
      case 'hot': hotClick(b.dataset.hot); break;
      case 'sideHint': { const m = mOfScreen(S.screen); Sfx.chirp(); if (m) talk([{ who: 'echo', say: tipFor(S.screen, m), mood: 'think' }]); break; }
      case 'hint': { const m = S.mission, g = stage(m), M = T.missions[m]; Sfx.chirp();
        talk([{ who: 'echo', say: g === 'goal' ? M.goalHint : g === 'design' ? M.designHint : g === 'review' ? M.reviewHint : g === 'report' ? T.ui.report : M.ch[+g[1]].lines[M.ch[+g[1]].lines.length - 1].say, mood: 'think' }]); break; }
      case 'note': Sfx.page(); notebook(b.dataset.tab); break; case 'noteClose': Sfx.click(); elNote.hidden = true; elNote.innerHTML = ''; break;
      case 'noteTab': Sfx.click(); notebook(b.dataset.tab); break;
      case 'noteSources': elNote.hidden = true; openSources(S.mission || 'storm'); break;
      case 'noteHow': elNote.hidden = true; howTo(); break;
      case 'sound': E.sound = !E.sound; LS.set('sound', E.sound ? 'on' : 'off'); Sfx.confirm(); render(); hud(); break;
    } });
  elTalk.addEventListener('click', e => { if (e.target === elTalk) talkNext(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (E.q) return talkEnd(); if (E.cm) return comicEnd(); if (E.og) return ogEnd(); if (E.tour) return tourEnd(); if (!elAcct.hidden && (P.cur() || E.guest)) { elAcct.hidden = true; elAcct.innerHTML = ''; return; } if (!elNote.hidden) { elNote.hidden = true; elNote.innerHTML = ''; } } });
  document.addEventListener('mousemove', e => { const r = document.getElementById('roomStage'); if (!r || reduced()) return; r.style.setProperty('--px', ((e.clientX / innerWidth) - 0.5).toFixed(3)); r.style.setProperty('--py', ((e.clientY / innerHeight) - 0.5).toFixed(3)); });

  /* ================= five-step room tour ================= */
  const elTour = document.createElement('div'); elTour.id = 'echoTour'; elTour.hidden = true; host.appendChild(elTour);
  const TOUR = [['.room-goal', 'Your mission objective', 'Your next job is always written here.'],
    ['.rhot.is-go', 'Follow the glow', 'Click the glowing object to take the next step. Only the glowing one moves the mission on.'],
    ['.room-echo', 'Meet Kim', 'Kim is your guide. Click Kim any time to hear the current hint again.'],
    ['.room-steps', 'Progress and notebook', 'This bar shows how far you are. The notebook button (top right) has goals, numbers, words and a full guide.'],
    [null, 'Back to the room', 'After every step you come back to this room. Follow the glow until the Report Board lights up.']];
  function tour(force, done) { if (!force && (E.fast || P.flag('tour'))) { if (done) done(); return; } P.flag('tour', 1); E.tour = { i: 0, done }; drawTour(); }
  function tourStep(d) { const t = E.tour; if (!t) return; t.i += d; if (t.i < 0) t.i = 0; if (t.i >= TOUR.length) return tourEnd(); drawTour(); }
  function tourEnd() { const t = E.tour; E.tour = null; elTour.hidden = true; elTour.innerHTML = ''; if (t && t.done) t.done(); }
  function drawTour() { const t = E.tour, st = TOUR[t.i], el = st[0] && document.querySelector('#app ' + st[0]), r = el && el.getBoundingClientRect(), last = t.i === TOUR.length - 1;
    const ring = r && r.width ? `<div class="tour-ring" style="left:${r.left - 8}px;top:${r.top - 8}px;width:${r.width + 16}px;height:${r.height + 16}px"></div>` : '<div class="tour-dim"></div>';
    let pos = 'left:50%;top:50%;transform:translate(-50%,-50%)';
    if (r && r.width) { const w = Math.min(420, innerWidth - 32), below = r.bottom + 230 < innerHeight, x = Math.max(16, Math.min(innerWidth - w - 16, r.left + r.width / 2 - w / 2));
      pos = `left:${x}px;${below ? `top:${r.bottom + 18}px` : `bottom:${innerHeight - r.top + 18}px`};width:${w}px`; }
    elTour.hidden = false; elTour.innerHTML = `${ring}<div class="tour-card" role="dialog" aria-label="Tour step ${t.i + 1} of ${TOUR.length}" style="${pos}">
      <div class="tour-k">Tour · ${t.i + 1} of ${TOUR.length}</div><h3>${st[1]}</h3><p>${st[2]}</p>
      <div class="tour-btns">${t.i ? '<button class="eb-link" data-e="tourBack">Back</button>' : '<button class="eb-link" data-e="tourSkip">Skip tour</button>'}<span style="flex:1"></span><button class="eb eb-sun" data-e="tourNext" autofocus>${last ? 'Got it!' : 'Next ▸'}</button></div></div>`;
    const n = elTour.querySelector('[data-e="tourNext"]'); if (n) n.focus({ preventScroll: true }); }

  /* ================= Challenge 1 spotlight guide (all three missions) =================
     Three steps: the map, the challenge panel, Mission Overview. One part stays lit, the rest of the screen is dimmed,
     and Kim moves next to the lit part with the instructions and a Next button. Shown once per flight; UI only. */
  const OG_MAP = { storm: 'This is your satellite\'s view of Earth. The <b>yellow box</b> is what your camera scans. Drag the box over the storm. The dashed line shows where the storm is heading.',
    fire: 'This is the forest seen from orbit. Each <b>yellow box</b> is a region the heat camera can scan. Click a region to target it, or click again to drop it.',
    flood: 'This is Riverbend Valley seen from orbit. The <b>yellow tags</b> show where each pass is aimed. They move when you pick a zone in the challenge below.' };
  const OG_DO = { storm: 'Set the box size and the camera mode here.', fire: 'Pick the image mode for this pass here.', flood: 'Pick a zone for each pass and the level of detail here.' };
  const ogSteps = m => [['.ops .view', 'The map', OG_MAP[m]],
    ['.ops .decision', 'Your challenge', `${OG_DO[m]} When you are ready, press <b>Confirm &amp; run 6 hours</b> and watch what happens.`],
    ['.ops .side .mo', 'Mission Overview', `This is your scoreboard: goals, data on Earth, battery and storage. Press <b>${E.moOpen !== false ? 'Show less' : 'Show all'}</b> to see ${E.moOpen !== false ? 'only the key numbers' : 'every detail'}.`]];
  function ogMaybe(m) { const s = st(m); if (!s || E.og || E.fast || E.q || E.cm || E.tour || s.ci !== 0 || s.phase !== 'choose' || $('#layer').innerHTML) return;
    E.ogSeen = E.ogSeen || {}; if (E.ogSeen[m] === E.run[m]) return; if (!document.querySelector('#app .ops .view')) return;
    E.ogSeen[m] = E.run[m]; E.og = { m, i: 0, steps: ogSteps(m) }; document.body.classList.add('og-on');
    elTour.hidden = false; elTour.innerHTML = `<div class="tour-ring"></div><div class="og"><span class="og-face" aria-hidden="true">${A.echo('happy')}</span><div class="tour-card og-card" role="dialog" aria-live="polite"></div></div>`;
    addEventListener('scroll', ogPlace, true); addEventListener('resize', ogPlace); ogDraw(); }
  function ogStep(d) { const g = E.og; if (!g) return; g.i = Math.max(0, g.i + d); if (g.i >= g.steps.length) return ogEnd(); Sfx.click(); ogDraw(); }
  function ogEnd() { if (!E.og) return; E.og = null; document.body.classList.remove('og-on'); removeEventListener('scroll', ogPlace, true); removeEventListener('resize', ogPlace);
    elTour.hidden = true; elTour.innerHTML = ''; scrollTo(0, 0); }
  function ogDraw() { const g = E.og, sp = g.steps[g.i], n = g.steps.length, last = g.i === n - 1, el = document.querySelector('#app ' + sp[0]), card = elTour.querySelector('.og-card');
    if (!el || !card) return ogEnd();
    card.setAttribute('aria-label', `Guide step ${g.i + 1} of ${n}`);
    card.innerHTML = `<div class="tour-k">Kim's guide · ${g.i + 1} of ${n}</div><h3>${sp[1]}</h3><p>${sp[2]}</p>
      <div class="tour-btns">${g.i ? '<button class="eb-link" data-e="ogBack">Back</button>' : '<button class="eb-link" data-e="ogSkip">Skip guide</button>'}<span style="flex:1"></span><button class="eb eb-sun" data-e="ogNext">${last ? 'Got it!' : 'Next ▸'}</button></div>`;
    ogPlace(true); const b = card.querySelector('[data-e="ogNext"]'); if (b) b.focus({ preventScroll: true }); }
  // Light the target and put Kim beside it: right or left when there is room, otherwise stacked below or above it.
  // With scroll=true (a new step) the page first scrolls so both the lit part and Kim are on screen.
  function ogPlace(scroll) { const g = E.og; if (!g) return; const el = document.querySelector('#app ' + g.steps[g.i][0]), ring = elTour.querySelector('.tour-ring'), og = elTour.querySelector('.og'); if (!el || !ring || !og) return;
    const W = innerWidth, H = innerHeight, pad = 8, gap = 22; let r = el.getBoundingClientRect();
    const roomR = W - r.right - gap - 12, roomL = r.left - gap - 12, beside = roomR >= 250 ? 'right' : roomL >= 250 ? 'left' : '';
    const w = Math.round(Math.min(360, beside === 'right' ? roomR : beside === 'left' ? roomL : W - 32));
    og.className = 'og og-' + (beside || 'below'); og.style.width = w + 'px'; const h = og.offsetHeight, under = r.height + h + gap + 100 <= H;
    if (scroll === true) { let top = beside ? (r.height < H - 100 ? (H - r.height) / 2 : 84) : under ? 84 : h + gap + 16;
      if (!beside && !under && scrollY + r.top - top < 0) top = H - h - gap - 10 - r.height;   // near the page top there is no room above: Kim goes below
      if (!beside || r.top < 70 || r.bottom > H - 16) { scrollTo(0, Math.max(0, scrollY + r.top - top)); r = el.getBoundingClientRect(); } }
    ring.style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;
    const vt = Math.max(r.top, 0), vb = Math.min(r.bottom, H), side = beside || (H - vb >= h + gap ? 'below' : vt >= h + gap ? 'above' : 'over');
    og.className = 'og og-' + side;
    const x = side === 'right' ? r.right + gap : side === 'left' ? r.left - gap - w : Math.max(16, Math.min(W - w - 16, r.left + r.width / 2 - w / 2));
    const y = side === 'below' ? vb + gap : side === 'above' ? vt - gap - h : side === 'over' ? vb - h - 14 : (vt + vb) / 2 - h / 2;
    og.style.left = Math.round(x) + 'px'; og.style.top = Math.round(Math.max(10, Math.min(H - h - 10, y))) + 'px'; }

  /* ================= local player profiles and My Account (this browser only) ================= */
  const P = { k: 'profiles', load() { try { return JSON.parse(LS.get(this.k) || '') || null; } catch (e) { return null; } },
    data() { const d = this.load() || { cur: null, list: [] }; return d; }, save(d) { LS.set(this.k, JSON.stringify(d)); },
    cur() { if (E.guest) return null; const d = this.data(); return d.list.find(p => p.id === d.cur) || null; },
    create(name) { const d = this.data(), p = { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, made: Date.now(), flags: {}, results: [] }; d.list.push(p); d.cur = p.id; this.save(d); E.guest = false; XPV.apply(); return p; },
    use(id) { const d = this.data(); if (d.list.some(p => p.id === id)) { d.cur = id; this.save(d); E.guest = false; XPV.apply(); } },
    remove(id) { const d = this.data(); d.list = d.list.filter(p => p.id !== id); if (d.cur === id) d.cur = d.list[0] ? d.list[0].id : null; this.save(d); XPV.apply(); },
    flag(k, v) { const d = this.data(), p = E.guest ? null : d.list.find(x => x.id === d.cur); if (!p) return v === undefined ? !!E['f_' + k] : (E['f_' + k] = v);
      p.flags = p.flags || {}; if (v === undefined) return !!p.flags[k]; p.flags[k] = v; this.save(d); },
    add(r) { const d = this.data(), p = E.guest ? null : d.list.find(x => x.id === d.cur); if (!p) return false; p.results.unshift(r); p.results = p.results.slice(0, 200); this.save(d); return true; } };
  // saves one entry per finished flight, straight from the engine's score and the mission record
  function saveResult(m) { const s = st(m); if (!s || !s.M || !s.record || s.echoSaved) return; const sc = MX[m].eng.score(s.M), tid = (S.target || {})[m], t = tid && MD.targetDef(m, tid), tr = t ? MD.evaluateTarget(m, tid, s.M) : null;
    const me = P.cur(); if (me && E.fid[m] && me.results.some(r => r.fid === E.fid[m])) { s.echoSaved = true; return; }   // this flight is already in the list
    s.echoSaved = P.add({ fid: E.fid[m] || null, t: Date.now(), m, code: S.scn[m].code, score: sc.total, outcome: sc.outcome, goals: ['G1', 'G2', 'G3', 'G4'].filter(g => sc.gates[g]).length, bonus: t ? t.title : '', bonusMet: tr ? tr.status === 'Met' : null, attempt: s.attempt ? s.attempt.n : 1 }); }
  /* ================= XP, rank and patches per player =================
   * fun.js keeps its award rules (stars on the report once per flight, quick calls during playback). Its save now goes to the current
   * player's profile; a guest's XP lives only in this page. XP saved before players existed stays in its old place, unassigned,
   * until someone gives it to one player in My Account (once) or chooses to leave it unassigned. */
  const XPV = { guest: null, blank: () => ({ xp: 0, patches: [], streak: 0 }),
    clean(x) { const o = { xp: 0, patches: [], streak: 0 }; if (!x || typeof x !== 'object') return o;
      if (Number.isFinite(x.xp) && x.xp >= 0) o.xp = Math.floor(x.xp); if (Number.isFinite(x.streak) && x.streak >= 0) o.streak = Math.floor(x.streak);
      if (Array.isArray(x.patches)) o.patches = x.patches.filter(p => p && MS.includes(p.m) && typeof p.code === 'string' && Number.isFinite(p.score) && Number.isFinite(p.stars)).map(p => ({ m: p.m, code: p.code, stars: p.stars, score: p.score }));
      return o; },
    apply() { if (!window.XPSAVE) return; const me = P.cur();
      if (!me) { this.guest = this.guest || this.blank(); return XPSAVE.use(this.guest, v => { this.guest = v; }); }
      const id = me.id; XPSAVE.use(this.clean(me.xp), v => { const d = P.data(), p = d.list.find(x => x.id === id); if (p) { p.xp = XPV.clean(v); P.save(d); } }); },
    of(p) { return p ? this.clean(p.xp) : (this.guest || this.blank()); },
    legacy() { let raw = null; try { raw = localStorage.getItem(XPSAVE.key); } catch (e) {} if (!raw) return null; let x = null; try { x = JSON.parse(raw); } catch (e) {} const c = this.clean(x); return c.xp || c.patches.length ? c : null; },
    pending() { const d = P.data(); return !d.legacy && d.list.length ? this.legacy() : null; },
    give(id) { const L = this.pending(), d = P.data(), p = d.list.find(x => x.id === id); if (!L || !p) return;
      const x = this.clean(p.xp); x.xp += L.xp; L.patches.forEach(q => { const o = x.patches.find(r => r.m === q.m && r.code === q.code); if (!o) x.patches.push(q); else if (q.score > o.score) Object.assign(o, q); });
      p.xp = x; d.legacy = { to: id, t: Date.now(), xp: L.xp, patches: L.patches.length }; P.save(d); this.apply(); },
    leave() { const d = P.data(); if (d.legacy) return; d.legacy = { to: null, t: Date.now() }; P.save(d); } };
  const rankName = xp => (typeof rankOf === 'function' ? rankOf(xp)[1] : '');
  if (typeof xpUi === 'function') { const _xpUi = xpUi; xpUi = function () { _xpUi(); const b = document.getElementById('xpBtn'); if (b && !P.cur()) b.textContent += ' · Guest'; }; }

  /* ================= Resume Mission: unfinished flights, saved per player at safe checkpoints =================
   * A flight is saved after the goal is locked in, after the satellite is taken to launch, after launch, and after each challenge
   * the player confirmed (its result is already computed by the original handler). A saved flight keeps only inputs: Mission Code,
   * goal, orbit, design, the confirmed decisions and controls of finished challenges, and the Rewind context. Restoring rebuilds the
   * mission state by sending those same decisions through the same engine calls, one challenge at a time (as "Fly my earlier
   * decisions" does). Nothing is played back, so no quick call, XP or result is awarded twice. Unconfirmed choices are not saved. */
  const SAVE_V = 1, MAXF = 5, GUEST = { list: [] };
  const clone = o => o == null ? o : JSON.parse(JSON.stringify(o));
  const RESETS = { storm: () => resetOps(), fire: () => resetF(), flood: () => resetL() };
  const Saves = { notes: [],
    who() { const p = P.cur(); return p ? p.id : 'guest'; },
    key: pid => 'flights.v' + SAVE_V + '.' + pid,
    valid(f) { const arr = a => Array.isArray(a) && a.length <= 4;
      return !!f && f.v === SAVE_V && typeof f.fid === 'string' && MS.includes(f.m) && typeof f.seed === 'string' && typeof f.t === 'number' && ['goal', 'design', 'flight'].includes(f.stage) &&
        f.design && typeof f.design === 'object' && (f.stage !== 'flight' || (Number.isInteger(f.done) && f.done >= 0 && f.done <= 4 && arr(f.choice) && f.choice.length >= f.done && f.choice.every(Array.isArray) && arr(f.ext) && f.attempt && typeof f.attempt.n === 'number')); },
    load(pid) { pid = pid || this.who(); if (pid === 'guest') return GUEST.list;
      const raw = LS.get(this.key(pid)); if (!raw) return [];
      let d = null; try { d = JSON.parse(raw); } catch (e) {}
      if (!d || d.v !== SAVE_V || !Array.isArray(d.list)) { LS.set('flights.broken.' + pid + '.' + Date.now(), raw); LS.del(this.key(pid)); this.note('Your unfinished missions could not be opened, so they were set aside. Finished results are safe.'); return []; }
      const good = d.list.filter(f => { try { return this.valid(f); } catch (e) { return false; } });
      if (good.length < d.list.length) { LS.set('flights.broken.' + pid + '.' + Date.now(), JSON.stringify(d.list.filter(f => !good.includes(f)))); this.write(pid, good); this.note('One unfinished mission could not be opened and was set aside.'); }
      return good; },
    write(pid, list) { pid = pid || this.who(); if (pid === 'guest') { GUEST.list = list; return; } LS.set(this.key(pid), JSON.stringify({ v: SAVE_V, list })); },
    list(pid) { return this.load(pid).slice().sort((a, b) => b.t - a.t); },
    get(fid, pid) { return this.load(pid).find(f => f.fid === fid) || null; },
    put(f, pid) { const l = this.load(pid).filter(x => x.fid !== f.fid); l.push(f); this.write(pid, l); },
    drop(fid, pid) { const l = this.load(pid), n = l.filter(x => x.fid !== fid); if (n.length !== l.length) this.write(pid, n); },
    note(t) { if (!this.notes.includes(t)) this.notes.push(t); } };
  // snapshot of the live flight of mission m at a safe point, or null while nothing is worth saving / a challenge is running
  function snapshot(m) { if (!E.fid[m] || !E.briefed[m] || !S.target[m]) return null; const X = MX[m], s = st(m), launched = !!E.launched[m] && !!s;
    const f = { v: SAVE_V, fid: E.fid[m], m, t: 0, seed: S.scn[m].seed, code: S.scn[m].code, mode: S.scnMode[m], target: S.target[m], arch: m === 'fire' ? archOf('fire') : null,
      design: clone(X.design()), stage: launched ? 'flight' : E.designed[m] ? 'design' : 'goal', rewound: !!E.rewound, seen: (E.fseen[m] || []).slice(),
      redo: S.redo && S.redo[m] ? clone(Object.assign({}, S.redo[m], { carry: undefined })) : null };
    if (launched) { if (s.phase === 'playing' || !s.attempt) return null; const done = s.phase === 'result' ? s.ci + 1 : s.ci;
      if (s.log.filter(Boolean).length < done) return null;
      Object.assign(f, { done, choice: s.choice.slice(0, done).map(c => c.slice()), ext: (s.M.ext || []).slice(0, done).map(x => clone(x == null ? null : x)), attempt: clone(s.attempt) }); }
    return f; }
  const sig = f => JSON.stringify(Object.assign({}, f, { t: 0 }));
  const lastSig = {};
  function checkpoint(m) { m = m || S.mission; if (E.restoring || !m || !E.fid[m] || E.owner[m] !== Saves.who() || E.closed === E.fid[m]) return;
    let f; try { f = snapshot(m); } catch (e) { f = null; } if (!f) return;
    const k = sig(f); if (lastSig[f.fid] === k) return;
    const old = Saves.get(f.fid); if (old && sig(old) === k) { lastSig[f.fid] = k; return; }
    f.t = Date.now(); Saves.put(f); lastSig[f.fid] = k; }
  // the final report has been recorded: this flight is finished and leaves the unfinished list
  function closeFlight(m) { const fid = E.fid[m]; if (!fid || E.owner[m] !== Saves.who()) return; Saves.drop(fid); E.closed = fid; delete lastSig[fid]; }
  // rebuild a saved flight. Outside events come from the Mission Code; completed challenges are re-computed by the engine from the saved
  // decisions (no playback, no rewards); the player continues at the start of the next challenge.
  function restore(f) { E.restoring = true; try { restoreIn(f); } finally { E.restoring = false; } const m = f.m; lastSig[f.fid] = ''; checkpoint(m); $('#layer').innerHTML = ''; talkEnd(); comicEnd(); toRoom(); }
  function restoreIn(f) { const m = f.m, X = MX[m];
    S.mission = m; E.cur = m;
    S.scn[m] = Scenario.generate(m, f.seed); S.scnMode[m] = f.mode || S.scnMode[m]; if (S.htp) delete S.htp[m];
    S.target[m] = f.target; if (m === 'fire' && f.arch) S.arch.fire = f.arch;
    if (m === 'fire' && archOf('fire') !== MD.DEFAULT_ARCH.fire) S.scn.fire = WFEngine.scenarioView(S.scn.fire, archOf('fire'));
    Object.assign(X.design(), clone(f.design));
    if (f.redo) S.redo[m] = clone(f.redo); else delete S.redo[m]; if (S.mdNote) S.mdNote[m] = null;
    E.run[m]++; E.rewound = !!f.rewound; E.inCh[m] = null; E.fid[m] = f.fid; E.owner[m] = Saves.who(); E.fseen[m] = (f.seen || []).slice(); E.closed = null;
    E.briefed[m] = true; E.designed[m] = f.stage !== 'goal'; E.launched[m] = f.stage === 'flight';
    if (f.stage === 'flight') { if (S.redo[m]) S.redo[m].n = f.attempt.n - 1;     // the reset below counts the attempt again
      RESETS[m](); const s = X.st(); s.attempt = clone(f.attempt); const k = f.done;
      s.M.ext = s.M.ext || []; for (let i = 0; i < k; i++) { s.choice[i] = f.choice[i].slice(); if (f.ext[i] != null) s.M.ext[i] = clone(f.ext[i]); }
      if (m === 'storm') s.ix = s.M.ext; else s.task = s.M.ext;
      for (let ci = 0; ci < k; ci++) { s.ci = ci; X.sim(); if (m === 'storm' && typeof ixAfter === 'function') { s.ci = ci; ixAfter(ci); } }   // Storm words its log at the end of playback; same step, text only
      if (k < 4) { s.ci = k; s.phase = 'alert'; } else { s.ci = 3; s.phase = 'result'; } s.delta = {}; }
    E.fseen[m].forEach(g => { E.seen[`${m}:${g}:${E.run[m]}`] = 1; });
  }
  function continueFlight(fid) { const f = Saves.get(fid); if (!f) { toast('That mission is no longer saved.'); return render(); }
    elAcct.hidden = true; elAcct.innerHTML = '';
    if (E.fid[f.m] === fid && E.owner[f.m] === Saves.who() && E.closed !== fid && E.briefed[f.m]) { S.mission = f.m; E.cur = f.m; return toRoom(); }   // already open in this page
    restore(f); }
  const progressOf = f => f.stage === 'goal' ? 'Goal chosen · build next' : f.stage === 'design' ? 'Satellite built · launch next' : f.done >= 4 ? 'All 4 challenges done · report next' : f.done === 0 ? 'In orbit · Challenge 1 next' : `Challenge ${f.done + 1} of 4 next`;

  const elAcct = document.createElement('div'); elAcct.id = 'echoAcct'; elAcct.hidden = true; host.appendChild(elAcct);
  const MN = { storm: 'Storm Watch', fire: 'Wildfire Watch', flood: 'Flood Watch' }, day = t => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  function unfinished() { const L = Saves.list(), lim = E.flLimit; E.flLimit = false; if (!L.length) return '';
    return `<h3>Unfinished missions <small class="en-dim">(${L.length} of ${MAXF})</small></h3>
      ${lim ? `<p class="ac-limit" role="alert">You already have ${MAXF} unfinished missions. Finish one or delete one, then start a new mission.</p>` : ''}
      <div class="ac-fl">${L.map(f => `<div class="ac-fl-row"><div><b>${MN[f.m]}</b><span><code>${esc(f.code)}</code> · ${progressOf(f)}</span><small>Saved ${day(f.t)}</small></div>
        ${E.flDelAsk === f.fid ? `<span class="ac-fl-ask">Delete this mission? <button class="eb eb-sun" data-e="flDelYes">Yes, delete</button><button class="eb eb-ghost" data-e="flDelNo">Keep</button></span>`
          : `<button class="eb eb-sky" data-e="contFlight" data-fid="${f.fid}">Continue</button><button class="eb-link" data-e="flDel" data-fid="${f.fid}">Delete</button>`}</div>`).join('')}</div>`; }
  const xpLine = x => `<div class="ac-xp"><b>★ ${x.xp} XP</b><span>${esc(rankName(x.xp))}</span><span>${x.patches.length} mission patch${x.patches.length === 1 ? '' : 'es'}</span></div>`;
  // one-time choice for XP and patches saved before there were players: give them to one player, or leave them unassigned
  function legacyBox(d) { const L = XPV.pending(); if (!L || !d.list.length) return '';
    return `<div class="ac-legacy"><h3>Earlier progress</h3><p>This computer has <b>${L.xp} XP</b> and <b>${L.patches.length} patch${L.patches.length === 1 ? '' : 'es'}</b> from before players were added. It does not belong to anyone yet. You can give it to one player, once.</p>
      <div class="ac-row"><label for="legacyTo" class="en-dim">Give to</label><select id="legacyTo">${d.list.map(p => `<option value="${p.id}" ${P.cur() && P.cur().id === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
      <button class="eb eb-sun" data-e="legacyGive">Give to this player</button><button class="eb eb-ghost" data-e="legacyLeave">Leave unassigned</button></div></div>`; }
  function account(firstRun) { const d = P.data(), me = P.cur(), others = d.list.filter(p => !me || p.id !== me.id);
    const newForm = `<div class="ac-new"><label for="acctName">${me ? 'Add another player' : 'What should we call you?'}</label><div class="ac-row"><input id="acctName" maxlength="24" placeholder="Your first name or nickname" autocomplete="off"><button class="eb eb-sun" data-e="acctNew">${me ? 'Add player' : 'Create player'}</button></div><p class="en-dim">Saved only in this browser. No sign-in, nothing is sent anywhere.</p></div>`;
    const best = me ? ['storm', 'fire', 'flood'].map(m => { const r = me.results.filter(x => x.m === m); return `<div><span>${MN[m]}</span><b>${r.length ? Math.max(...r.map(x => x.score)) : '–'}</b><small>${r.length} flight${r.length === 1 ? '' : 's'}</small></div>`; }).join('') : '';
    const rows = me && me.results.length ? `<div class="ac-tab"><table><thead><tr><th>When</th><th>Mission</th><th>Mission Code</th><th>Score</th><th>Result</th><th>Goals</th><th>Bonus goal</th></tr></thead><tbody>${me.results.map(r => `<tr><td>${day(r.t)}</td><td>${MN[r.m]}</td><td><code>${esc(r.code)}</code></td><td><b>${r.score}</b></td><td>${esc(r.outcome)}</td><td>${r.goals} / 4</td><td>${r.bonus ? `${r.bonusMet ? '✓' : '✕'} ${esc(r.bonus)}` : '–'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="en-dim">No finished missions yet. Results appear here after each final report.</p>';
    const del = E.delAsk ? `<div class="ac-del" role="alert">Delete <b>${esc((d.list.find(p => p.id === E.delAsk) || {}).name || '')}</b> and all their saved results? <button class="eb eb-sun" data-e="acctDelYes">Yes, delete</button><button class="eb eb-ghost" data-e="acctDelNo">Keep</button></div>` : '';
    elAcct.hidden = false; elAcct.innerHTML = `<div class="en-book ac" role="dialog" aria-label="My Account"><div class="en-head"><span class="en-ic">${ICON.user}</span><h2>${me ? esc(me.name) : E.guest ? 'Guest' : 'Welcome, Designer!'}</h2>${firstRun ? '' : '<button class="eb-icon" data-e="acctClose" aria-label="Close My Account">✕</button>'}</div>
      <div class="en-body">${E.guest ? `<p class="ac-guest" role="status"><b>Guest — progress not saved.</b> Your XP, patches and unfinished missions disappear when you refresh or close this page. Create a player to keep them.</p>` : ''}
      ${me || E.guest ? xpLine(XPV.of(me)) : ''}${legacyBox(d)}
      ${me ? `<div class="ac-best">${best}</div>${unfinished()}<h3>Finished missions</h3>${rows}` : unfinished()}${del}
      ${others.length ? `<h3>Other players on this computer</h3><div class="ac-players">${others.map(p => `<div><b>${esc(p.name)}</b><span>${p.results.length} flights · ${XPV.of(p).xp} XP</span><button class="eb eb-sky" data-e="acctUse" data-id="${p.id}">Switch</button><button class="eb-link" data-e="acctDel" data-id="${p.id}">Delete</button></div>`).join('')}</div>` : ''}
      ${newForm}${E.guest ? '' : `<p class="ac-guestbtn"><button class="eb ${me ? 'eb-ghost' : 'eb-sky'}" data-e="acctGuest">Play as guest</button> <span class="en-dim">Nothing is saved for a guest.</span></p>`}${me && !firstRun ? `<p><button class="eb-link" data-e="acctDel" data-id="${me.id}">Delete ${esc(me.name)}</button></p>` : ''}</div></div>`;
    const f = elAcct.querySelector(me ? '[data-e="acctClose"]' : '#acctName'); if (f) f.focus({ preventScroll: true }); }
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'acctName') { e.preventDefault(); const b = elAcct.querySelector('[data-e="acctNew"]'); if (b) b.click(); } });

  /* ================= Engineering Notebook: the details layer (numbers, requirements, words, sources) ================= */
  function notebook(tab) { const m = S.mission || mOfScreen(S.screen) || 'storm'; tab = tab || 'mission'; const X = MX[m], s = st(m), flying = !!E.launched[m] && s && s.M;
    const t = S.target[m] ? MD.targetDef(m, S.target[m]) : null, d = X.design();
    let body = '';
    if (tab === 'mission') { const sc = flying ? X.eng.score(s.M) : null, done = flying && s.ci === 3 && s.phase === 'result';
      body = `<h3>${T.episodes[m].tag}: ${T.episodes[m].title}</h3><p>${MD.BRIEF[m].what} ${MD.BRIEF[m].who}</p>
        <h4>Must do (decides success)</h4><ul class="en-req">${MD.GATES[m].map((gt, i) => { const ok = sc && sc.gates[gt.id]; return `<li class="${ok ? 'ok' : done ? 'no' : ''}"><i>${ok ? '✓' : done ? '✕' : i + 1}</i>${MD.BRIEF[m].req[i]}</li>`; }).join('')}</ul>
        ${flying && !done ? '<p class="en-dim">Ticks update as the simulation runs. The final check is at hour 24.</p>' : ''}
        <h4>Your goal</h4><p>${t ? `<b>${t.title}.</b> ${t.statement}<br><span class="en-dim">Measured as: ${t.definition}</span>` : 'Not chosen yet. Use the Earth hologram.'}</p>
        <h4>Mission Code</h4><p><code>${esc(S.scn[m].code)}</code> <span class="en-dim">Same code, same outside events. That makes replays fair.</span></p>`; }
    else if (tab === 'numbers') { const P = { storm: () => CFG.parts, fire: () => WC.parts, flood: () => LC.parts }[m](), LAB = { storm: PARTLABEL, fire: FLABEL, flood: LLABEL }[m];
      const tot = { storm: () => { const x = totals(); return `${x.kg.toLocaleString()} / ${MAX_KG.toLocaleString()} kg · $${x.m}M / $${MAX_M}M`; }, fire: () => { const x = fTotals(); return `${x.kg} / ${WC.limits.kg} kg · ${x.cr} / ${WC.limits.credits} credits`; }, flood: () => { const x = lTotals(); return `${x.kg} / ${LC.limits.kg} kg · $${x.m}M / $${LC.limits.costM}M`; } }[m];
      let totTxt = ''; try { totTxt = tot(); } catch (e) {}
      const f = flying ? facts(m) : null;
      body = `<h3>Your satellite</h3><table class="en-tab">${Object.keys(LAB).map(k => { const p = P[k][d[k]]; return `<tr><td>${LAB[k]}</td><td><b>${p.name || p.n || (d[k] === 'adv' ? 'Advanced' : 'Standard')}</b></td><td>${p.kg} kg</td></tr>`; }).join('')}</table>
        ${totTxt ? `<p><b>Mass and cost:</b> ${totTxt}</p>` : ''}
        ${f ? `<h3>Live numbers (from the simulation)</h3><div class="en-gauges">${[['Battery', f.batt, '%'], ['Storage used', f.stor, '%'], ['Health', f.health, '%']].map(g => `<div><span>${g[0]}</span><b>${g[1]}${g[2]}</b><div class="en-bar"><i style="width:${Math.max(0, Math.min(100, g[1]))}%"></i></div></div>`).join('')}<div><span>Useful data on Earth</span><b>${f.pts} / ${f.need} pts</b><div class="en-bar"><i style="width:${Math.min(100, parseFloat(f.pts) / f.need * 100)}%"></i></div></div></div>
          ${s.log.filter(Boolean).length ? `<h3>Challenge log</h3>${s.log.map((L, i) => L ? `<details class="en-log"><summary><span class="et-chip ${L.met ? 'ok' : 'no'}">${esc(L.badge)}</span> ${i + 1}. ${X.CH[i].title}</summary><p><b>You chose:</b> ${L.choices}</p><p>${L.good}</p><p>${L.trade}</p></details>` : '').join('')}` : ''}` : '<p class="en-dim">Live mission numbers appear here after launch.</p>'}`; }
    else if (tab === 'words') body = `<h3>Space words</h3><dl class="en-gloss">${T.glossary.map(g => `<dt>${g[0]}</dt><dd>${g[1]}</dd>`).join('')}</dl>`;
    else if (tab === 'guide') body = `<h3>Mission Room guide</h3><p class="en-row"><button class="eb eb-sun" data-e="tourReplay">Replay the room tour</button></p>
        <dl class="en-gloss">${[['Earth hologram', 'Pick your mission goal and bonus goal (and orbit for Wildfire Watch).'], ['Workbench', 'Build your satellite: five parts, each Standard or Advanced. Watch mass and budget.'], ['Launch console', 'Readiness check by the Flight Director, then launch.'], ['Observation monitor', 'Aim the camera or choose where the satellite looks.'], ['Data storage', 'Decide what the satellite keeps when storage fills.'], ['Power console', 'Get through power faults and dark hours.'], ['Comms dish', 'Choose what is sent to Earth first.'], ['Report board', 'Your final report, then Rewind & Redesign or Fly Again.']].map(x => `<dt>${x[0]}</dt><dd>${x[1]}</dd>`).join('')}</dl>
        <h3>Controls</h3><dl class="en-gloss">${[['The glow', 'Only the glowing object moves the mission on. Other objects give a hint.'], ['Kim', 'Click Kim for the current hint.'], ['Progress bar', 'Goal, Build, Check, four challenges, Report.'], ['Notebook', 'This book: goals, numbers, words, story and sources.'], ['My Account', 'Your player name and saved mission results.'], ['‹ Missions', 'Back to the three missions. Your mission waits for you.'], ['Sound', 'Turn button sounds on or off.']].map(x => `<dt>${x[0]}</dt><dd>${x[1]}</dd>`).join('')}</dl>`;
    else if (tab === 'story') body = `<h3>Story</h3><p>Watch the comics again. Replaying a story never changes your mission.</p>
        <p class="en-row"><button class="eb eb-sky" data-e="replayIntro">Prologue</button>${MS.map(x => `<button class="eb eb-ghost" data-e="replayBrief" data-m="${x}">${T.episodes[x].tag}</button>`).join('')}</p>
        <h3>How to play</h3><ol class="en-how"><li>In the Mission Room, click the glowing object.</li><li>Pick a goal, build your satellite, pass the launch check.</li><li>Fly four challenges. Each one covers six hours.</li><li>Read your report. Then rewind and test a new idea.</li></ol>
        <p><button class="eb eb-ghost" data-e="noteHow">Full how-to-play guide</button></p>`;
    else body = `<h3>Evidence and sources</h3><p>Every number in the game has a class: <b>A</b> observed NASA data, <b>B</b> published specs, <b>C</b> calculated, <b>D</b> game value.</p>
        <p class="en-dim">Real observations appear in reports. They never drive a score. Maps are simulated training scenes.</p>
        <p><button class="eb eb-sky" data-e="noteSources">Open NASA data & sources</button> <button class="eb eb-ghost" data-e="noteHow">How to play</button></p>
        <h4>How Kim works</h4><p class="en-dim">Kim only reads what the simulation measured. Kim cannot change a result.</p>`;
    elNote.hidden = false; elNote.innerHTML = `<div class="en-wrap" role="dialog" aria-label="Engineering notebook"><div class="en-book">
      <div class="en-head"><span class="en-ic">${ICON.book}</span><h2>Engineering Notebook</h2><button class="eb-icon" data-e="noteClose" aria-label="Close notebook">✕</button></div>
      <div class="en-tabs" role="tablist">${[['mission', 'Mission'], ['guide', 'Guide'], ['numbers', 'Numbers'], ['words', 'Words'], ['story', 'Story'], ['nasa', 'NASA data']].map(x => `<button role="tab" aria-selected="${x[0] === tab}" data-e="noteTab" data-tab="${x[0]}">${x[1]}</button>`).join('')}</div>
      <div class="en-body">${body}</div></div></div>`;
    const c = elNote.querySelector('[data-e="noteClose"]'); if (c) c.focus({ preventScroll: true }); }

  /* ================= workspace dressing (after every render; DOM labels only) ================= */
  const hudEl = document.createElement('div'); hudEl.id = 'echoHud'; document.body.appendChild(hudEl);
  function tipFor(scr, m) { const s = st(m);
    if (scr === 'brief') return 'Pick one goal card.'; if (scr === BUILD[m]) return 'Tap a part to swap it. Watch mass and budget.';
    if (scr === OPS[m] && s) return s.phase === 'result' ? 'See what changed. Then head back.' : s.phase === 'playing' ? 'Watch the mission clock run.' : T.missions[m].ch[s.ci].goal;
    if (scr === REPORT[m]) return 'Rewind and try a new idea!'; return ''; }
  const bookBtn = () => `<button class="eb-icon e-navnote" data-e="note" aria-label="Engineering notebook" title="Engineering notebook">${ICON.book}</button>`;
  // gameplay screens: ECHO's one-line hint replaces the old step dots in the nav bar, the notebook sits at its right end. No extra height.
  function hud() { const scr = S.screen, m = scr === 'brief' ? S.mission : mOfScreen(scr), navEl = document.querySelector('#app .nav-in');
    hudEl.hidden = true; hudEl.innerHTML = '';
    if (scr === 'room' || scr === 'title' || scr === 'missions') return;
    if (navEl && m) { const steps = navEl.querySelector('.steps'), who = navEl.querySelector('.who'), hs = scr === OPS[m] && st(m) ? T.hot[m][st(m).ci] : scr === BUILD[m] ? 'bench' : scr === REPORT[m] ? 'board' : '';
      if (steps) { steps.className = 'steps e-navtip'; steps.innerHTML = scr === OPS[m] ? `<span class="e-navsay e-navplain" role="status">${hs ? `<b>${T.hotName[hs]}</b>` : ''}</span>` : `<span class="e-navface">${A.echo('happy')}</span><span class="e-navsay" role="status">${hs ? `<b>${T.hotName[hs]}</b>` : ''}${esc(tipFor(scr, m))}</span>`; }
      if (who) who.innerHTML = bookBtn(); return; }
    hudEl.hidden = false; hudEl.innerHTML = bookBtn(); }
  // the compact final report stays as it is; ECHO adds one short line under the score, chosen by the engine's outcome and gates
  // Text below 14px in the engineering detail areas is raised: labels and notes to 14px, body text to 16px. Larger text is left alone.
  function bumpSmall(root) { if (!root) return; root.querySelectorAll('*').forEach(el => { if (el.closest('svg') || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
    const fs = parseFloat(getComputedStyle(el).fontSize); if (!(fs < 14)) return;
    const body = /^(P|LI|TD)$/.test(el.tagName) && !/muted|lab|rv-st|ms|chip/.test(el.className) && !el.closest('th');
    el.style.fontSize = (body ? 16 : 14) + 'px'; }); }
  // Kim beside the "Full Engineering Report" button; gone for good once the report is opened
  function kimHint(m) { const d = document.querySelector('#app details.cr-full'), sm = d && d.querySelector(':scope > summary'), s = st(m); if (!sm || !s || s.kimSeen || d.open) return;
    if (d.nextElementSibling && d.nextElementSibling.classList.contains('e-kimhint')) return;
    d.insertAdjacentHTML('afterend', `<div class="e-kimhint" role="note"><span class="e-kf" aria-hidden="true">${A.echo('happy')}</span><span class="e-kb">Want to see the full engineering report? Click here!</span></div>`);
    d.addEventListener('toggle', () => { if (d.open) { s.kimSeen = true; const h = d.nextElementSibling; if (h && h.classList.contains('e-kimhint')) h.remove(); } }); }
  function reportDress(m) { const hero = document.querySelector('#app .cr-hero'); if (!hero || hero.querySelector('.e-rline')) return; const s = st(m); if (!s || !s.M) return;
    const sc = MX[m].eng.score(s.M), M = T.missions[m], k = sc.outcome === 'Mission Success' ? 'success' : sc.outcome === 'Partial Success' ? 'partial' : 'fail';
    const missed = ['G1', 'G2', 'G3', 'G4'].filter(g => !sc.gates[g]), line = k === 'success' ? M.end[k][1] : missed.length ? M.gateLine[missed[0]] : M.end[k][1];
    hero.insertAdjacentHTML('afterbegin', `<div class="e-hero-art" aria-hidden="true">${A.scene(k, m)}</div>`);
    hero.insertAdjacentHTML('beforeend', `<div class="e-rline"><span class="e-rface">${A.echo(k === 'success' ? 'cheer' : k === 'partial' ? 'think' : 'sad')}</span><span>${esc(line)}</span></div>`); }
  function dress() { const scr = S.screen, b = document.body; b.dataset.scr = scr; b.dataset.mission = S.mission || ''; b.toggleAttribute('data-ws', !['room', 'title', 'missions'].includes(scr));
    const m = mOfScreen(scr);
    document.querySelectorAll('#app .backbtn').forEach(x => { x.textContent = '‹ Mission room'; });
    if (scr === 'brief') { const l = document.querySelector('#app .linkback'); if (l) { l.textContent = '‹ Mission room'; l.removeAttribute('data-a'); l.removeAttribute('data-to'); l.dataset.e = 'toRoom'; }
      const g = document.querySelector('#app [data-a="briefGo"]'); if (g) g.textContent = 'Lock in this goal ▸';
      const h = document.querySelector('#app .brief h1'); if (h && !document.querySelector('.e-brief-art')) h.insertAdjacentHTML('beforebegin', `<div class="e-brief-art" aria-hidden="true">${A.scene({ storm: 'storm1', fire: 'fire1', flood: 'flood1' }[S.mission] || 'storm1', S.mission)}</div>`); }
    if (m && scr === BUILD[m]) document.querySelectorAll('#app [data-a="mrr"]').forEach(x => { x.textContent = 'Done! Take it to launch ▸'; });
    if (m && scr === REPORT[m]) { reportDress(m); kimHint(m); saveResult(m); const s = st(m); if (s && s.record && (s.echoSaved || !P.cur())) closeFlight(m); bumpSmall(document.querySelector('#app .cr-full-in')); }
    else checkpoint(m || S.mission);
    if (scr === 'room') roomFocus();
    if (m && scr === OPS[m]) ogMaybe(m); else if (E.og) ogEnd();
    hud(); }
  const _render = render; render = function () { const bd = document.body; bd.dataset.scr = S.screen; bd.toggleAttribute('data-ws', !['room', 'title', 'missions'].includes(S.screen)); _render(); dress(); };   // theme markers first, so new elements never fade in from the old colours
  // Gameplay sidebar: the checklist, goal and status boxes become one "Mission Overview" panel. String in, string out,
  // so live updates during playback (which re-render the sidebar from dash()/fDash()/lDash()) keep the same layout.
  function overview(html) { const t = document.createElement('div'); t.innerHTML = html; const side = t.querySelector('.side'); if (!side) return html;
    const boxes = [...side.children].filter(c => c.classList.contains('dash') && !c.querySelector('.mini-globe')); if (!boxes.length) return html;
    side.querySelectorAll(':scope > .dash').forEach(c => { if (c.querySelector('.mini-globe')) c.remove(); });   // no Earth picture: Mission Overview sits at the top, level with the map, Kim under it
    const sec = { check: '', prog: '', stat: '' };
    boxes.forEach(b => { const h = b.querySelector(':scope > h4'), name = h ? h.textContent.trim() : '';
      if (b.querySelector(':scope > details')) sec.check += b.innerHTML;
      else if (/goal/i.test(name)) { h.remove(); sec.prog += b.innerHTML; }
      else if (/status/i.test(name)) { h.remove(); sec.stat = b.innerHTML + sec.stat; }
      else sec.stat += `<div class="mo-extra">${b.innerHTML}</div>`; b.remove(); });
    const open = E.moOpen !== false, tmp = document.createElement('div'); tmp.innerHTML = sec.check + sec.prog + sec.stat;
    const val = re => { const r = [...tmp.querySelectorAll('.meter .row')].find(x => re.test(x.firstElementChild.textContent)); return r ? r.lastElementChild.textContent.replace(/[+±-][\d.]+\s*(%|pts)?$/, '').trim() : ''; };
    const n = (tmp.querySelector('.gl-sum .n') || {}).textContent || '';
    const mini = `<div class="mo-mini">${[['Goals', n], ['Data on Earth', val(/delivered/i)], ['Battery', val(/^battery/i)], ['Storage', val(/^storage/i)]].map(x => `<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div>`;
    side.insertAdjacentHTML('beforeend', `<div class="glass dash mo ${open ? '' : 'mo-closed'}"><div class="mo-top"><h3 class="mo-title">Mission Overview</h3><button class="mo-tog" data-e="moToggle" aria-expanded="${open}">${open ? 'Show less ▴' : 'Show all ▾'}</button></div>
      ${open ? `${sec.check ? `<div class="mo-sec mo-check">${sec.check}</div>` : ''}<div class="mo-sec"><h4>Mission Progress</h4>${sec.prog}</div><div class="mo-sec"><h4>Satellite Status</h4>${sec.stat}</div>` : mini}</div>${sideKim()}`);
    return t.innerHTML; }
  // Kim during a challenge: under Mission Overview, with the current hint. Clicking Kim repeats it.
  function sideKim() { const m = mOfScreen(S.screen); if (!m || S.screen !== OPS[m]) return ''; const t = tipFor(S.screen, m); if (!t) return '';
    return `<div class="e-sidekim"><button class="e-sk-face" data-e="sideHint" aria-label="Ask Kim to repeat the hint">${A.echo('happy')}</button><p class="e-sk-say" role="status"><b>Kim</b>${esc(t)}</p></div>`; }
  const wrapDash = f => function () { return overview(f.apply(this, arguments)); };
  dash = wrapDash(dash); fDash = wrapDash(fDash); lDash = wrapDash(lDash);
  const _mrr = mrr; mrr = function (m) { _mrr(m); const h = document.querySelector('#layer .modal h2, #layer h2'); const ok = !(document.querySelector('#layer [data-a="goLaunch"]') || {}).disabled;
    bumpSmall(document.querySelector('#layer .rv-details .inner'));
    const box = document.querySelector('#layer .modal-wrap > *'); if (box && !box.querySelector('.er-dir')) box.insertAdjacentHTML('afterbegin', `<div class="er-dir"><div class="et-face">${A.director()}</div><p><b>Flight Director</b>${ok ? T.ui.reviewOk : T.ui.reviewNo}</p></div>`); };

  /* ================= public handle + test hooks (used by tools/echo_parity.js and tools/echo_e2e.js) ================= */
  window.ECHO = { xp: XPV, state: E, stage, activeHot, talk, comic, notebook, facts, profiles: P, tour, account, voice: null, sfx: Sfx, saves: Saves, checkpoint, continueFlight,
    test: { fast() { E.fast = true; talkEnd(); comicEnd(); },
      // skip any open story, then click the glowing hotspot (navigation only)
      advance() { if (E.q) return talkEnd(); if (E.cm) return comicEnd(); if (S.screen === 'room') { const h = document.querySelector('.rhot.is-go'); if (h) h.click(); } },
      toBuild(m) { S.mission = m; E.briefed[m] = true; E.designed[m] = false; E.launched[m] = false; go(BUILD[m]); } } };

  XPV.apply();
  document.body.classList.add('echo');
  go('title');
})();

/* viz.js — procedural mission visuals (approved prototype → production).
 * Replaces the CSS wedge storm, flat fire map and flat valley with seeded
 * Canvas-2D satellite-style scenes. Visual layer ONLY:
 *   - seeds come from a separate 'visual' stream (Scenario.hash32/mulberry32),
 *     the engines' random sequences are never read or advanced;
 *   - region outlines, hotspot markers, zone badges, scanbox, notes and all
 *     engine state stay exactly as rendered by the existing code — the canvas
 *     slides underneath them;
 *   - hidden fires / hidden flood extent are drawn only from M.detected and
 *     the reveal flag the game already passes;
 *   - storm rotation is a pure function of simulated mission time, so it
 *     pauses when the game is idle and replays identically.
 * Textures are cached per seed and redrawn only on seed change. Rollback:
 * remove the viz.js line from index.html. */
(function () {
  'use strict';
  var hash32 = Scenario.hash32, mulberry32 = Scenario.mulberry32;
  var vstream = function (mission, seed) { return mulberry32(hash32('1.0|' + mission + '|' + seed + '|visual')); };
  function latNoise(seed) {
    var h = function (x, y) { var n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed | 0; n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; };
    function n2(x, y) { var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      return h(xi, yi) * (1 - u) * (1 - v) + h(xi + 1, yi) * u * (1 - v) + h(xi, yi + 1) * (1 - u) * v + h(xi + 1, yi + 1) * u * v; }
    return function (x, y, oct, lac, gain) { var a = .5, f = 1, s = 0, norm = 0; oct = oct || 4; lac = lac || 2; gain = gain || .5;
      for (var o = 0; o < oct; o++) { s += a * n2(x * f, y * f); norm += a; a *= gain; f *= lac; } return s / norm; };
  }
  function seedOf(m) { try { return (S.scn && S.scn[m] && S.scn[m].seed) || 'PRACTICE'; } catch (e) { return 'PRACTICE'; } }
  function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  var cache = {};

  /* ================= STORM ================= */
  var STYPES = [
    { arms: 5, swirl: 5.2, eye: .045, core: 1, asym: .12, spread: .95, gaps: .35 },
    { arms: 3, swirl: 3.6, eye: 0, core: .72, asym: .3, spread: 1, gaps: .55 },
    { arms: 4, swirl: 4.2, eye: 0, core: .8, asym: .75, spread: .9, gaps: .5 },
    { arms: 3, swirl: 2.2, eye: 0, core: .55, asym: .25, spread: 1.35, gaps: .6 }];
  function stormTex(seed) {
    var key = 'st:' + seed; if (cache[key]) return cache[key];
    var r0 = vstream('storm', seed), p = STYPES[Math.floor(r0() * STYPES.length)];
    var fb = latNoise(hash32(seed + 'tex')), fb2 = latNoise(hash32(seed + 'band'));
    var phase = r0() * 6.283, cx = .5 + (r0() - .5) * p.asym * .14, cy = .5 + (r0() - .5) * p.asym * .14, aDir = r0() * 6.283;
    var armPh = []; for (var i = 0; i < p.arms; i++) armPh.push(i * 6.283 / p.arms + (r0() - .5) * 1.2);
    function density(x, y) {
      var dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy) / (0.5 * p.spread); if (r > 1.15) return 0;
      var th = Math.atan2(dy, dx), s = th + p.swirl * Math.log(r + .06) + phase, band = 0;
      for (var i = 0; i < p.arms; i++) { var d = (s - armPh[i]) % 6.283; if (d < 0) d += 6.283; d = Math.min(d, 6.283 - d);
        var w = .5 + .5 * fb2(r * 6 + i * 7.3, th * 1.5 + i * 3.1, 3);
        band = Math.max(band, Math.exp(-d * d / (2 * .32 * .32)) * w); }
      band *= Math.max(0, 1 - Math.abs(r - .55) / .65);
      var core = p.core * Math.exp(-r * r / (2 * .21 * .21));
      var outer = .34 * Math.max(0, 1 - r) * fb(x * 5 + 40, y * 5 + 40, 3);
      var dns = (core + band * .9 + outer) * (1 + p.asym * Math.cos(th - aDir));
      dns *= .35 + 1.05 * fb(x * 7, y * 7, 5, 2.1, .55);
      dns -= p.gaps * .35 * Math.max(0, fb(x * 11 + 90, y * 11 + 90, 3) - .55) * 3;
      if (p.eye) { var e = Math.hypot(dx, dy) / p.eye; dns *= Math.min(1, Math.max(0, (e - .55) / .6)); }
      return Math.max(0, Math.min(1, dns));
    }
    var W = 300;
    function layer(wgt) { var c = mkCanvas(W, W), g = c.getContext('2d'), im = g.createImageData(W, W), d = im.data;
      for (var yy = 0; yy < W; yy++) for (var xx = 0; xx < W; xx++) { var x = xx / W, y = yy / W;
        var r = Math.hypot(x - cx, y - cy) / (0.5 * p.spread);
        var w = wgt(r); if (w <= 0) continue;
        var v = density(x, y) * w; if (v <= 0) continue;
        var i = (yy * W + xx) * 4, b = 200 + 55 * Math.min(1, v * 1.3);
        d[i] = b; d[i + 1] = b; d[i + 2] = Math.min(255, b + 6); d[i + 3] = Math.min(255, v * 255); }
      g.putImageData(im, 0, 0); return c; }
    // feathered cross-fade between the two rotation layers: no visible seam
    var fadeIn = function (r) { return r <= .38 ? 0 : r >= .52 ? 1 : (r - .38) / .14; };
    return (cache[key] = { inner: layer(function (r) { return 1 - fadeIn(r); }), outer: layer(fadeIn), cx: cx, cy: cy });
  }
  function paintStorm(cv, t) {
    var g = cv.getContext('2d'), W = cv.width, H = cv.height, tex = stormTex(seedOf('storm'));
    var oc = g.createRadialGradient(W * .42, H * .5, 40, W * .5, H * .5, W * .62);
    oc.addColorStop(0, '#0f3a66'); oc.addColorStop(.55, '#082443'); oc.addColorStop(1, '#04121f');
    g.fillStyle = oc; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1c3a26'; g.beginPath(); g.ellipse(-W * .06, H * .45, W * .22, H * .75, 0, 0, 7); g.fill();
    // faint lat/lon grid, as the old CSS map had
    g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = 1; g.beginPath();
    for (var k = 40; k < W; k += 40) { g.moveTo(k, 0); g.lineTo(k, H); }
    for (k = 40; k < H; k += 40) { g.moveTo(0, k); g.lineTo(W, k); } g.stroke();
    var cxp = W * .6, cyp = H * .52, sc = Math.max(W, H) * 1.0;
    function draw(c, rot) { g.save(); g.translate(cxp, cyp); g.rotate(rot);
      g.drawImage(c, -tex.cx * sc, -tex.cy * sc, sc, sc); g.restore(); }
    // rotation = f(simulated hours); NH-style counter-clockwise, fictional basin
    draw(tex.outer, -t * .10); draw(tex.inner, -t * .22);
  }

  /* ================= WILDFIRE ================= */
  var FTYPES = [
    { treeBias: .72, dry: 0, roads: 0 }, { treeBias: .45, dry: .6, roads: 0 },
    { treeBias: .3, dry: .3, roads: 0 }, { treeBias: .6, dry: .2, roads: 1 }];
  function fireTex(seed, W, H) {
    var key = 'fi:' + seed + ':' + W; if (cache[key]) return cache[key];
    var r0 = vstream('fire', seed), p = FTYPES[Math.floor(r0() * FTYPES.length)];
    var fb = latNoise(hash32(seed + 'veg'));
    var c = mkCanvas(W, H), g = c.getContext('2d'), im = g.createImageData(W, H), d = im.data;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var u = x / W, v = y / H;
      var veg = fb(u * 5, v * 5, 5, 2.1, .52), fine = fb(u * 22 + 60, v * 22 + 60, 3);
      var shade = .82 + .36 * fb(u * 3 + 200, v * 3 + 200, 3), R, G, B;
      if (veg > (.58 - p.treeBias * .28)) { var kk = .75 + .5 * fine; R = 26 * kk; G = (52 + 26 * veg) * kk; B = 24 * kk; }
      else { var dry = p.dry * (.4 + .6 * fine); R = (52 + 70 * dry) * shade; G = (70 + 34 * (1 - dry) + 20 * fine) * shade; B = (34 + 8 * (1 - dry)) * shade; }
      if (fb(u * 8 + 500, v * 8 + 500, 3) > .74) { R = R * .6 + 70; G = G * .6 + 66; B = B * .6 + 44; }
      var i = (y * W + x) * 4; d[i] = R; d[i + 1] = G; d[i + 2] = B; d[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    var C = REG.C, nR = p.roads ? 3 : 1, nB = p.roads ? 26 : 10;
    g.strokeStyle = 'rgba(205,200,185,.5)'; g.lineWidth = 2;
    for (var k = 0; k < nR; k++) { g.beginPath(); var yy = (C.t / 100 + .1 + r0() * C.h / 100 * .8) * H; g.moveTo((C.l / 100 - .12) * W, yy);
      for (var xx = (C.l / 100 - .1) * W; xx <= W; xx += 18) { yy += (r0() - .5) * 8; g.lineTo(xx, yy); } g.stroke(); }
    for (k = 0; k < nB; k++) { g.fillStyle = 'rgba(222,216,200,' + (0.5 + r0() * 0.4) + ')';
      g.fillRect((C.l / 100 + r0() * C.w / 100) * W, (C.t / 100 + r0() * C.h / 100) * H, 2 + r0() * 3, 2 + r0() * 3); }
    return (cache[key] = c);
  }
  // one fire: burn scar, thermal cluster, smoke plume (k = size)
  function drawBlaze(g, seed, id, fx, fy, sc) {
      var fr = mulberry32(hash32(seed + '|' + id)), fh = latNoise(hash32(seed + id));
      g.save(); g.translate(fx, fy); g.scale(sc, sc); fx = 0; fy = 0;
      g.save();
      g.beginPath(); for (var a = 0; a <= 24; a++) { var th = a / 24 * 6.283, rr = 9 + 10 * fh(Math.cos(th) + 3, Math.sin(th) + 3, 3);
        var px = fx + Math.cos(th) * rr * 1.3, py = fy + Math.sin(th) * rr; a ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath();
      g.fillStyle = 'rgba(26,18,14,.7)'; g.fill();
      for (var k = 0; k < 6; k++) { var t2 = fr() * 6.283, r2 = fr() * 9, px2 = fx + Math.cos(t2) * r2 * 1.4, py2 = fy + Math.sin(t2) * r2;
        var gr = g.createRadialGradient(px2, py2, 0, px2, py2, 4 + fr() * 5);
        gr.addColorStop(0, 'rgba(255,240,190,.9)'); gr.addColorStop(.45, 'rgba(255,130,40,.7)'); gr.addColorStop(1, 'rgba(255,70,20,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(px2, py2, 9, 0, 7); g.fill(); }
      var wd = fr() * 1.2 - 2.2;
      for (k = 0; k < 20; k++) { var dd = k * 5.5 + fr() * 4, sx = fx + Math.cos(wd) * dd + (fr() - .5) * k * 2, sy = fy + Math.sin(wd) * dd + (fr() - .5) * k * 1.4;
        g.fillStyle = 'rgba(205,205,210,' + (0.32 * (1 - k / 22)) + ')'; g.beginPath(); g.arc(sx, sy, 3 + k * .9, 0, 7); g.fill(); }
      g.restore(); g.restore();
  }
  function paintFire(cv, reveal) {
    var W = cv.width, H = cv.height, g = cv.getContext('2d'), seed = seedOf('fire');
    g.drawImage(fireTex(seed, W, H), 0, 0);
    if (!S.f || !S.f.M) return;
    var M = S.f.M, t = reveal ? 24 : (typeof fNow === 'function' ? fNow() : M.step * WC.stepMin / 60);
    // smoke / burn / thermal cluster ONLY for events the engine says are detected and already shown
    WC.events.forEach(function (e) {
      if (!M.detected.has(e.id) || WC.passes[e.pass].h > t + 1e-9) return;
      var pos = EVPOS[e.id]; drawBlaze(g, seed, e.id, pos[0] / 100 * W, pos[1] / 100 * H, 1);
    });
  }

  /* ================= FLOOD ================= */
  var LTYPES = [
    { meander: 1.2, plain: .16, farm: 0, town: .4, wide: 0 }, { meander: .8, plain: .3, farm: 1, town: .4, wide: 0 },
    { meander: 1, plain: .2, farm: .4, town: 1, wide: 0 }, { meander: .9, plain: .34, farm: .5, town: .3, wide: 1 }];
  function floodTex(seed, W, H, level, radar) {
    var key = 'fl:' + seed + ':' + W + ':' + level.toFixed(2) + ':' + (radar ? 1 : 0); if (cache[key]) return cache[key];
    var r0 = vstream('flood', seed), p = LTYPES[Math.floor(r0() * LTYPES.length)];
    var fb = latNoise(hash32(seed + 'ter')), fields = latNoise(hash32(seed + 'fld'));
    var a1 = .10 + r0() * .1 * p.meander, a2 = .05 + r0() * .06 * p.meander, f1 = 1.1 + r0() * 1.2, f2 = 2.6 + r0() * 2, p1 = r0() * 6.283, p2 = r0() * 6.283;
    var riverY = function (u) { return .5 + a1 * Math.sin(u * 6.283 * f1 + p1) + a2 * Math.sin(u * 6.283 * f2 + p2) + .06 * (fb(u * 3, 9.7, 3) - .5); };
    var baseW = (p.wide ? .035 : .016) + r0() * .008;
    var c = mkCanvas(W, H), g = c.getContext('2d'), im = g.createImageData(W, H), d = im.data;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var u = x / W, v = y / H, dy = Math.abs(v - riverY(u));
      var terr = fb(u * 5 + 30, v * 5 + 30, 5, 2.1, .52);
      var height = dy * (1.6 - p.plain) + .35 * (terr - .5);
      var rw = baseW * (0.8 + .5 * fb(u * 7, 3.3, 3));
      var water = dy < rw, flooded = !water && height < -.12 + level * .34 && dy < .3, R, G, B;
      var shade = .85 + .3 * fb(u * 3 + 77, v * 3 + 77, 3);
      if (u > 1 / 3 && u < 2 / 3 && p.farm && !water) {
        var fv = Math.floor(fields(u * 9, v * 9, 2) * 6);
        var pal = [[116, 124, 62], [96, 112, 56], [136, 128, 70], [88, 98, 48], [124, 110, 58], [104, 120, 64]][fv % 6];
        R = pal[0] * shade; G = pal[1] * shade; B = pal[2] * shade;
        if ((Math.floor(u * W / 14) + Math.floor(v * H / 26)) % 7 === 0) { R *= .8; G *= .8; B *= .8; }
      } else { R = (40 + 30 * (1 - terr)) * shade; G = (72 + 34 * terr) * shade; B = (36 + 10 * terr) * shade; }
      if (water) { R = 24; G = 58; B = 96; }
      else if (flooded) { var kk = .55; R = R * (1 - kk) + 30 * kk; G = G * (1 - kk) + 70 * kk; B = B * (1 - kk) + 120 * kk; }
      if (radar) { var spk = fb(u * 60, v * 60, 2);
        var L = (water || flooded) ? 14 + spk * 18 : 70 + terr * 120 * spk + ((u > 2 / 3 && p.town) ? 30 * spk : 0); R = G = B = L; }
      var i = (y * W + x) * 4; d[i] = R; d[i + 1] = G; d[i + 2] = B; d[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    if (!radar) { g.strokeStyle = 'rgba(210,205,190,.5)'; g.lineWidth = 1.6;
      var n = Math.round(2 + p.town * 3);
      for (var k = 0; k < n; k++) { g.beginPath(); var yy = (0.2 + r0() * .6) * H; g.moveTo(W * 2 / 3, yy);
        for (var xx = W * 2 / 3; xx <= W; xx += 16) { yy += (r0() - .5) * 7; g.lineTo(xx, yy); } g.stroke(); }
      for (k = 0; k < Math.round(14 + p.town * 26); k++) { g.fillStyle = 'rgba(224,218,204,' + (0.45 + r0() * 0.4) + ')';
        g.fillRect((2 / 3 + r0() / 3) * W, r0() * H, 2 + r0() * 3, 2 + r0() * 3); } }
    return (cache[key] = c);
  }
  function paintFlood(cv, reveal) {
    // Hidden flood extent stays hidden: within banks during the mission, full
    // simulated extent only on the reveal map. Radar styling on the reveal map
    // when the player flew the radar instrument.
    var radar = reveal && S.l && S.l.M && S.l.M.P.instrument.kind === 'radar';
    cv.getContext('2d').drawImage(floodTex(seedOf('flood'), cv.width, cv.height, reveal ? 1 : 0, radar), 0, 0);
  }

  /* ================= mission cards (Earth missions page) =================
   * Decorative only: a fixed visual seed and made-up fire positions, never the
   * player's scenario, so the cards cannot hint at hidden events. */
  var CARD_SEED = 'CARD1';
  function paintFireCard(cv) {
    var W = cv.width, H = cv.height, g = cv.getContext('2d');
    g.drawImage(fireTex(CARD_SEED, W, H), 0, 0);
    drawBlaze(g, CARD_SEED, 'a', W * .62, H * .62, 2.1); drawBlaze(g, CARD_SEED, 'b', W * .3, H * .78, 1.3);
  }
  function paintFloodCard(cv) { cv.getContext('2d').drawImage(floodTex(CARD_SEED, cv.width, cv.height, .8, false), 0, 0); }
  cardArt = function (kind) { return '<canvas class="vizc" data-viz="' + kind + 'card" aria-hidden="true"></canvas>'; };

  /* ================= mounting ================= */
  var mount = function (kind, extra) { return '<canvas class="vizc" data-viz="' + kind + '" ' + (extra || '') + ' aria-hidden="true"></canvas>'; };
  document.head.insertAdjacentHTML('beforeend', '<style>.vizc{position:absolute;inset:0;width:100%;height:100%;display:block}</style>');

  var _stormArt = stormArt;
  stormArt = function () { return mount('storm'); };
  var _fireArt = fireArt; // post-fireplus version
  fireArt = function (reveal) { return _fireArt(reveal).replace('<div class="fmap"></div>', mount('fire', reveal ? 'data-reveal="1"' : '')); };
  var _valleyArt = valleyArt;
  valleyArt = function (reveal) { var html = _valleyArt(reveal);
    html = html.replace('<div class="vmap"></div><div class="river"></div>', mount('flood', reveal ? 'data-reveal="1"' : ''));
    if (reveal) html = html.replace(/<div class="flood"[^>]*><\/div>/g, ''); // canvas now shows the simulated extent
    return html; };

  function stormT() { if (S.live) return S.live.t; if (S.screen === 'report') return 24; return S.ops ? S.ops.ci * 6 : 0; }
  function paintAll() {
    document.querySelectorAll('canvas.vizc').forEach(function (cv) {
      var kind = cv.dataset.viz, box = cv.parentElement;
      var w = Math.min(640, Math.max(200, box.clientWidth || 510)), h = Math.max(140, box.clientHeight || 340);
      var t = kind === 'storm' ? stormT() : 0;
      if (kind === 'firecard' || kind === 'floodcard') { if (cv.dataset.sig === kind + w + 'x' + h) return; cv.dataset.sig = kind + w + 'x' + h; cv.width = w; cv.height = h; (kind === 'firecard' ? paintFireCard : paintFloodCard)(cv); return; }
      var sig = kind + '|' + w + 'x' + h + '|' + (cv.dataset.reveal || '') + '|' + t.toFixed(2) + '|' + seedOf(kind === 'storm' ? 'storm' : kind === 'fire' ? 'fire' : 'flood') + '|' + (kind === 'fire' && S.f && S.f.M ? S.f.M.detected.size : '');
      if (cv.dataset.sig === sig) return;
      cv.dataset.sig = sig; cv.width = w; cv.height = h;
      if (kind === 'storm') paintStorm(cv, t);
      else if (kind === 'fire') paintFire(cv, !!cv.dataset.reveal);
      else paintFlood(cv, !!cv.dataset.reveal);
    });
  }
  // repaint after every render, and keep a light watcher for journey playback
  var _render = render; render = function () { _render(); paintAll(); };
  setInterval(function () { if (!document.hidden) paintAll(); }, 250); // no-op unless sig changed
  window.addEventListener('resize', function () { paintAll(); });
  paintAll();
})();

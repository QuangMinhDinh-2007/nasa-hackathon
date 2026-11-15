/* rocket3d.js — the one rocket model used everywhere (Three.js).
 * Rocket3D.build() makes the 3D rocket that the launch sequence (launch3d.js) flies;
 * the "Build your satellite" screens show the very same model standing on the pad,
 * so the rocket you build is the rocket you watch launch.
 * Three.js is loaded from assets/three.min.js (works offline), then the CDN.
 * If WebGL or Three.js is unavailable the build screen keeps the flat SVG rocket
 * and the launch falls back to the 2D animation. Rollback: remove the rocket3d.js
 * and launch3d.js lines from index.html. */
(function () {
  'use strict';
  var SRC = ['assets/three.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'];
  var threeLoading = null;
  function loadThree() {
    if (window.THREE) return Promise.resolve();
    if (!threeLoading) threeLoading = new Promise(function (res, rej) {
      (function next(k) {
        if (k >= SRC.length) { rej(new Error('three.js unavailable')); return; }
        var s = document.createElement('script'); s.src = SRC[k];
        s.onload = function () { window.THREE ? res() : next(k + 1); }; s.onerror = function () { next(k + 1); };
        document.head.appendChild(s);
      })(0);
    });
    return threeLoading;
  }

  /* opts: { label: 'STORM WATCH', mission: 'storm'|'fire'|'flood', sat: [instrumentAdv/radar, powerAdv, commsAdv] }
   * Returns the rocket group (origin = base of the first stage) plus the parts the launch animates. */
  function build(T, opts) {
    opts = opts || {};
    var mat = function (c, o) { return new T.MeshLambertMaterial(Object.assign({ color: c }, o || {})); };
    var M = { white: mat(0xF7F8FA), red: mat(0xD93B3B), red2: mat(0xC23030), blue: mat(0x2F6FED), navy: mat(0x2F4E8F), dark: mat(0x2A3346), black: mat(0x1F2533),
      yellow: mat(0xE2B203), grey: mat(0x7A8391), gold: mat(0xE8C66A), pv: mat(0x3D66B5), glass: mat(0x9FB7E8) };
    function mesh(g, m, x, y, z, shadow) { var o = new T.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); if (shadow !== false) { o.castShadow = true; o.receiveShadow = true; } return o; }
    function box(w, h, d, m, x, y, z) { return mesh(new T.BoxGeometry(w, h, d), m, x, y, z); }
    function cyl(r1, r2, h, m, x, y, z, seg) { return mesh(new T.CylinderGeometry(r1, r2, h, seg || 24), m, x, y, z); }
    var i, a, rocket = new T.Group();
    var R = 1.3, stage1 = new T.Group(), stage2 = new T.Group(); rocket.add(stage1); rocket.add(stage2);
    stage1.add(cyl(R, 1.9, 3, M.red, 0, 1.5, 0)); stage1.add(cyl(R, R, 11, M.white, 0, 8.5, 0));
    stage1.add(cyl(R + 0.02, R + 0.02, 0.35, M.blue, 0, 11, 0)); stage1.add(cyl(R + 0.02, R + 0.02, 0.3, M.red, 0, 5, 0)); stage1.add(cyl(R + 0.01, R + 0.01, 0.8, M.dark, 0, 14.4, 0));
    for (i = 0; i < 4; i++) { a = i * Math.PI / 2 + Math.PI / 4; var bx = Math.cos(a) * 1.75, bz = Math.sin(a) * 1.75;
      stage1.add(cyl(0.18, 0.75, 5.5, M.red2, bx, 2.75, bz, 14)); stage1.add(cyl(0.45, 0.6, 0.6, M.yellow, bx, -0.25, bz, 12)); }
    stage1.add(cyl(0.7, 0.95, 0.7, M.yellow, 0, -0.3, 0, 16));
    stage2.position.y = 14.8;
    stage2.add(cyl(R, R, 14, M.white, 0, 7, 0)); stage2.add(cyl(R + 0.02, R + 0.02, 0.35, M.blue, 0, 1, 0)); stage2.add(cyl(R + 0.02, R + 0.02, 1.1, M.dark, 0, 10.6, 0));
    stage2.add(cyl(R + 0.03, R + 0.03, 0.18, M.red, 0, 10.6, 0)); stage2.add(cyl(R + 0.02, R + 0.02, 0.3, M.red, 0, 12.6, 0)); stage2.add(cyl(0.5, 0.8, 0.8, M.dark, 0, -0.4, 0, 16));
    var labelTex = new T.CanvasTexture(document.createElement('canvas'));
    function setLabel(text) { var c = labelTex.image; c.width = 96; c.height = 512; var x = c.getContext('2d'); x.clearRect(0, 0, 96, 512);
      x.save(); x.translate(48, 256); x.rotate(-Math.PI / 2); x.fillStyle = '#1B2B4B'; x.font = '400 54px Anton, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 0, 4, 480); x.restore(); labelTex.needsUpdate = true; }
    setLabel(opts.label || 'STORM WATCH');
    [[0, R + 0.02, 0], [-(R + 0.02), 0, -Math.PI / 2], [R + 0.02, 0, Math.PI / 2]].forEach(function (p) { var lp = mesh(new T.PlaneGeometry(1.25, 6.6), new T.MeshBasicMaterial({ map: labelTex, transparent: true }), p[0], 5.6, p[1], false); lp.rotation.y = p[2]; stage2.add(lp); });
    // fairing
    var FY = 28.8, prof = []; for (i = 0; i <= 14; i++) { var t = i / 14; prof.push(new T.Vector2(R * Math.sqrt(Math.max(0, 1 - Math.pow(t, 1.7))) * (1 - 0.15 * t) + 0.02, t * 8.5)); }
    var fair = [0, 1].map(function (k) { var g = new T.Group(); g.position.y = FY; var fm = new T.MeshLambertMaterial({ color: 0xF7F8FA, side: T.DoubleSide, transparent: true });
      g.add(mesh(new T.LatheGeometry(prof, 28, k * Math.PI, Math.PI), fm, 0, 0, 0, false)); g.add(cyl(0.05, 0.05, 1.6, M.dark, k ? -0.03 : 0.03, 9, 0, 6)); rocket.add(g); return g; });
    // flames
    function flame(r, h) { var g = new T.ConeGeometry(r, h, 16, 1, true); g.rotateX(Math.PI); g.translate(0, -h / 2, 0);
      var o = new T.Mesh(g, new T.MeshBasicMaterial({ color: 0xFFB13B, transparent: true, opacity: 0.9 })); var inner = new T.Mesh(g, new T.MeshBasicMaterial({ color: 0xFFF6C8 })); inner.scale.set(0.5, 0.6, 0.5); o.add(inner); return o; }
    var f1 = flame(1.5, 11); f1.position.y = -0.5; stage1.add(f1); var f2 = flame(0.7, 5); f2.position.y = -0.8; stage2.add(f2);
    var glow = new T.PointLight(0xFF8A2A, 0, 120); glow.position.y = -3; rocket.add(glow);
    // satellite from the player's design
    var sat = new T.Group(); sat.position.y = FY + 3.2; rocket.add(sat); var satParts = {};
    (function buildSat(m, o) {
      sat.add(box(1.3, 1.7, 1.3, M.gold, 0, 0, 0));
      var pw = o[1] ? 4.6 : 3.1;
      satParts.pl = new T.Group(); satParts.pl.position.x = -0.65; satParts.pl.add(box(pw, 1.1, 0.06, M.pv, -pw / 2, 0, 0)); sat.add(satParts.pl);
      satParts.pr = new T.Group(); satParts.pr.position.x = 0.65; satParts.pr.add(box(pw, 1.1, 0.06, M.pv, pw / 2, 0, 0)); sat.add(satParts.pr);
      for (var j = 1; j < 6; j++) { satParts.pl.add(box(0.04, 1.1, 0.08, M.glass, -pw * j / 6, 0, 0)); satParts.pr.add(box(0.04, 1.1, 0.08, M.glass, pw * j / 6, 0, 0)); }
      if (m !== 'flood') { var s = o[0] ? 1 : 0.6; sat.add(box(0.9 * s, 0.8 * s, 0.9 * s, M.dark, 0, -0.85 - 0.4 * s, 0)); sat.add(cyl(0.3 * s, 0.3 * s, 0.2, M.glass, 0, -0.85 - 0.85 * s, 0)); }
      else if (o[0]) { satParts.radar = new T.Group(); satParts.radar.position.y = 0.85; satParts.radar.add(cyl(0.06, 0.06, 1.9, M.white, 0, 0.95, 0, 8));
        var dish = mesh(new T.CylinderGeometry(2.3, 2.3, 0.05, 28), new T.MeshLambertMaterial({ color: 0xE8C66A, transparent: true, opacity: 0.55, side: T.DoubleSide }), 0, 3.6, 0); dish.rotation.x = Math.PI / 2; satParts.radar.add(dish);
        satParts.radar.add(mesh(new T.TorusGeometry(2.3, 0.07, 8, 36), M.gold, 0, 3.6, 0));
        for (j = 0; j < 4; j++) { var sp = box(4.6, 0.05, 0.05, M.gold, 0, 3.6, 0); sp.rotation.z = j * Math.PI / 4; satParts.radar.add(sp); } sat.add(satParts.radar); }
      else { sat.add(cyl(0.42, 0.42, 1, M.dark, 0, -1.35, 0)); satParts.lid = new T.Group(); satParts.lid.position.set(-0.42, -1.87, 0); satParts.lid.add(cyl(0.44, 0.44, 0.06, M.gold, 0.42, 0, 0)); sat.add(satParts.lid); }
      if (o[2]) { satParts.dish = new T.Group(); satParts.dish.position.set(0.4, 0.85, 0.3); satParts.dish.add(cyl(0.04, 0.04, 0.5, M.white, 0, 0.25, 0, 6));
        var dc = mesh(new T.ConeGeometry(0.5, 0.25, 18, 1, true), new T.MeshLambertMaterial({ color: 0xF7F8FA, side: T.DoubleSide }), 0, 0.6, 0); dc.rotation.x = Math.PI; satParts.dish.add(dc); sat.add(satParts.dish); }
    })(opts.mission || 'storm', opts.sat || [false, false, false]);
    return { rocket: rocket, stage1: stage1, stage2: stage2, fair: fair, f1: f1, f2: f2, glow: glow, sat: sat, satParts: satParts, FY: FY, R: R, setLabel: setLabel, height: FY + 8.5 };
  }

  window.Rocket3D = { loadThree: loadThree, build: build };

  /* ---------- the same rocket on the "Build your satellite" screens ----------
   * One persistent canvas + renderer; it is re-attached after every render so
   * toggling parts never recreates the WebGL context. Drag to turn the rocket. */
  var BUILD = { build: 'storm', fbuild: 'fire', lbuild: 'flood' }, LABEL = { storm: 'STORM WATCH', fire: 'WILDFIRE WATCH', flood: 'FLOOD WATCH' };
  var pv = null, failed = false;
  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '.rocket3d{position:absolute;left:44%;bottom:13.8%;transform:translateX(-50%);display:block;cursor:grab;touch-action:none;filter:drop-shadow(0 0 30px #5aa9ff44)}' +
    '.rocket3d:active{cursor:grabbing}.pad.has3d>svg.rocket{display:none}</style>');

  function makePreview() {
    var T = window.THREE, canvas = document.createElement('canvas'); canvas.className = 'rocket3d';
    canvas.setAttribute('role', 'img');
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 0);
    var scene = new T.Scene(), camera = new T.PerspectiveCamera(18, 0.34, 1, 600);
    // same light rig as the launch pad at night (launch3d.js)
    scene.add(new T.HemisphereLight(0x8fa8d8, 0x1c2638, 0.75));
    var sun = new T.DirectionalLight(0xaac4ff, 0.6); sun.position.set(-60, 120, 80); scene.add(sun);
    var fl1 = new T.PointLight(0xdfeaff, 1.1, 260); fl1.position.set(-30, 26, 60); scene.add(fl1);
    var fl2 = new T.PointLight(0xdfeaff, 0.8, 260); fl2.position.set(34, 20, 40); scene.add(fl2);
    var RK = build(T, { label: LABEL.storm, mission: 'storm' });
    RK.f1.visible = RK.f2.visible = false; RK.glow.intensity = 0; RK.sat.visible = false; // satellite stays stowed inside the fairing
    scene.add(RK.rocket);
    var lo = -0.6, hi = RK.height, mid = (lo + hi) / 2, half = (hi - lo) / 2 * 1.07, ph = 0.1, dist = half / Math.tan(9 * Math.PI / 180);
    camera.position.set(0, mid + dist * Math.sin(ph), dist * Math.cos(ph)); camera.lookAt(0, mid, 0);
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var p = { canvas: canvas, RK: RK, mission: 'storm', raf: 0, drag: null, w: 0, h: 0 };
    RK.rocket.rotation.y = -0.45;
    canvas.addEventListener('pointerdown', function (e) { p.drag = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', function (e) { if (p.drag === null) return; RK.rocket.rotation.y += (e.clientX - p.drag) * 0.012; p.drag = e.clientX; if (reduce) renderer.render(scene, camera); });
    var up = function () { p.drag = null; }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    p.size = function () { var pad = canvas.parentElement; if (!pad) return; var h = Math.round(pad.clientHeight * 0.7), w = Math.round(h * 0.34);
      if (h < 50 || (h === p.h && w === p.w)) return; p.h = h; p.w = w; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
      // stand the engine nozzles exactly on the pad platform
      camera.updateMatrixWorld(); var foot = new T.Vector3(0, -0.55, 1.2).project(camera); canvas.style.marginBottom = -Math.round((foot.y + 1) / 2 * h) + 'px'; };
    p.draw = function () { renderer.render(scene, camera); };
    p.loop = function () { cancelAnimationFrame(p.raf);
      (function f() { if (!canvas.isConnected) return; p.size();
        if (!reduce && p.drag === null && !document.hidden) RK.rocket.rotation.y += 0.004;
        p.draw(); if (!reduce) p.raf = requestAnimationFrame(f); })(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { RK.setLabel(LABEL[p.mission]); });
    return p;
  }

  function attach() {
    var m = BUILD[typeof S !== 'undefined' && S.screen]; if (!m || failed) return;
    var pad = document.querySelector('#app .build .pad'); if (!pad) return;
    if (!window.THREE) { loadThree().then(attach).catch(function () { failed = true; }); return; }
    if (!pv) { try { pv = makePreview(); } catch (e) { failed = true; return; } }
    if (pv.mission !== m) { pv.mission = m; pv.RK.setLabel(LABEL[m]); }
    pv.canvas.setAttribute('aria-label', LABEL[m].replace(/\B\w+/g, function (w) { return w.toLowerCase(); }) + ' rocket, 3D model. Drag to turn it.');
    if (pv.canvas.parentElement !== pad) { pad.insertBefore(pv.canvas, pad.firstChild); pad.classList.add('has3d'); pv.loop(); }
    else pad.classList.add('has3d');
  }
  window.Rocket3D.attachBuild = attach;
  var _render = render; render = function () { _render(); attach(); };
  softView = (function (f) { return function () { f(); attach(); }; })(softView);
  window.addEventListener('resize', function () { if (pv && pv.canvas.isConnected) { pv.size(); pv.draw(); } });
})();

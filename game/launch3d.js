/* launch3d.js — 3D launch sequence (Three.js) replacing the 2D runLaunch overlay.
 * Night-pad theme to match the game's dark UI. Mission-aware:
 *   storm → geostationary transfer; fire/flood → polar LEO.
 * Satellite in the nose cone reflects the player's actual part choices.
 * Falls back to the original 2D launch if WebGL/Three.js is unavailable. */
(function () {
  var runLaunch2D = window.runLaunch; // keep as fallback

  var CONFIG = {
    duration: 8,
    sky: 0x0b1630, space: 0x000000,
    missions: {
      storm: { label: 'STORM WATCH', name: 'Storm Watch', orbit: 'geo', orbitName: 'Geostationary · 35,786 km',
        steps: ['3 · 2 · 1 · Liftoff!', 'Booster separation', 'Transfer orbit burn', 'Parked 35,786 km above the equator'] },
      fire: { label: 'WILDFIRE WATCH', name: 'Wildfire Watch', orbit: 'leo', orbitName: 'Near-polar LEO · 824 km · ~101 min per orbit',
        steps: ['3 · 2 · 1 · Liftoff!', 'Booster separation', 'Fairing opens', 'Polar orbit, 824 km · ~101 min per lap'] },
      flood: { label: 'FLOOD WATCH', name: 'Flood Watch', orbit: 'leo', orbitName: 'Sun-synchronous LEO · 747 km · ~100 min per orbit',
        steps: ['3 · 2 · 1 · Liftoff!', 'Booster separation', 'Fairing opens', 'Polar orbit, 747 km · ~100 min per lap'] }
    }
  };

  function satOptions(m) {
    // [main instrument advanced/radar, high-capacity power, high-capacity comms]
    try {
      if (m === 'storm') return [S.design.instrument === 'adv', S.design.power === 'adv', S.design.comms === 'adv'];
      if (m === 'fire') return [S.fdesign.instrument === 'adv', S.fdesign.power === 'adv', S.fdesign.comms === 'adv'];
      var radar = LC.parts.instrument[S.ldesign.instrument].kind === 'radar';
      return [radar, S.ldesign.power === 'adv', S.ldesign.comms === 'adv'];
    } catch (e) { return [false, false, false]; }
  }

  var loadThree = Rocket3D.loadThree; // local assets/three.min.js first, then CDN

  var active = null; // current launch instance

  window.runLaunch = function () {
    var m = S.mission || 'storm';
    loadThree().then(function () { start3D(m); }).catch(function () { runLaunch2D(); });
  };

  function start3D(mKey) {
    var ms = CONFIG.missions[mKey] || CONFIG.missions.storm;
    var layer = document.getElementById('layer');
    layer.innerHTML = '<div class="launch" id="L3" style="background:#000">' +
      '<canvas id="l3c" style="position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab"></canvas>' +
      '<div class="hud" style="pointer-events:none' + (mKey === 'storm' ? ';top:4vh' : '') + '"><div class="eyebrow">' + ms.name + ' · Launch</div>' +
      '<div class="display" id="l3cap" style="font-size:clamp(40px,6vw,84px);margin-top:10px;text-shadow:0 2px 20px #000c">Go for launch</div>' +
      '<div id="l3sub" style="font-size:13px;color:var(--muted);margin-top:6px;min-height:18px"></div></div>' +
      '<div class="foot"><div class="bar"><i id="l3p" style="width:0"></i></div>' +
      '<span class="muted" style="font-size:11px;white-space:nowrap">Drag to look · scroll to zoom</span>' +
      '<button class="btn ghost" data-a="skip">Skip animation</button></div></div>';

    var canvas = document.getElementById('l3c'), renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true }); }
    catch (e) { layer.innerHTML = ''; runLaunch2D(); return; }

    var T = THREE;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    var scene = new T.Scene(); scene.background = new T.Color(CONFIG.sky); scene.fog = new T.Fog(CONFIG.sky, 300, 1400);
    var camera = new T.PerspectiveCamera(45, 1, 0.5, 9000);
    var hemi = new T.HemisphereLight(0x8fa8d8, 0x1c2638, 0.55); scene.add(hemi);
    var sun = new T.DirectionalLight(0xaac4ff, 0.5); sun.position.set(-60, 120, 80); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); var sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 90; sc.bottom = -30; sc.far = 400; scene.add(sun);
    // pad floodlights for night launch
    var fl1 = new T.PointLight(0xdfeaff, 1.1, 160); fl1.position.set(-30, 26, 30); scene.add(fl1);
    var fl2 = new T.PointLight(0xdfeaff, 0.8, 160); fl2.position.set(34, 20, -24); scene.add(fl2);

    var mat = function (c, o) { return new T.MeshLambertMaterial(Object.assign({ color: c }, o || {})); };
    var M = { white: mat(0xF7F8FA), red: mat(0xD93B3B), red2: mat(0xC23030), blue: mat(0x2F6FED), navy: mat(0x2F4E8F), dark: mat(0x2A3346), black: mat(0x1F2533),
      yellow: mat(0xE2B203), steel: mat(0xD9502B), grey: mat(0x7A8391), gold: mat(0xE8C66A), pv: mat(0x3D66B5), glass: mat(0x9FB7E8), pad: mat(0x565E6B), grass: mat(0x3d5236) };
    function mesh(g, m, x, y, z, shadow) { var o = new T.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); if (shadow !== false) { o.castShadow = true; o.receiveShadow = true; } return o; }
    function box(w, h, d, m, x, y, z) { return mesh(new T.BoxGeometry(w, h, d), m, x, y, z); }
    function cyl(r1, r2, h, m, x, y, z, seg) { return mesh(new T.CylinderGeometry(r1, r2, h, seg || 24), m, x, y, z); }
    function beam(a, b, th, m) { var d = new T.Vector3().subVectors(b, a), o = box(th, d.length(), th, m); o.position.copy(a).addScaledVector(d, 0.5);
      o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize()); return o; }
    var V = function (x, y, z) { return new T.Vector3(x, y, z); };
    var rnd = (function () { var s = 7; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();

    /* ---------- ground ---------- */
    var ground = new T.Group(); scene.add(ground);
    var g0 = mesh(new T.PlaneGeometry(4000, 4000), M.grass, 0, 0, 0); g0.rotation.x = -Math.PI / 2; g0.castShadow = false; ground.add(g0);
    var padM = box(150, 0.4, 130, M.pad, 0, 0.2, 10); padM.castShadow = false; ground.add(padM);
    [[-52, 0], [52, 0]].forEach(function (p) { ground.add(box(0.6, 0.06, 120, M.yellow, p[0], 0.44, 10)); });
    ground.add(box(60, 0.06, 0.6, M.yellow, 45, 0.44, 40));
    var i;
    for (i = -3; i <= 3; i++) ground.add(box(150, 0.05, 0.25, mat(0x667080), 0, 0.42, i * 18 + 10));
    var hills = [[-260, -420, 420, 95, 260], [220, -480, 520, 120, 280], [620, -300, 360, 80, 240], [-640, -260, 380, 70, 240], [0, -700, 900, 150, 300]];
    hills.forEach(function (h, k) { var s = mesh(new T.SphereGeometry(1, 32, 16), mat(k % 2 ? 0x2b3d26 : 0x24331f), h[0], -8, h[1], false); s.scale.set(h[2], h[3], h[4]); ground.add(s); });
    function hillY(x, z) { var y = 0; hills.forEach(function (h) { var a = (x - h[0]) / h[2], b = (z - h[1]) / h[4], q = 1 - a * a - b * b; if (q > 0) y = Math.max(y, -8 + h[3] * Math.sqrt(q)); }); return y; }
    [0x16250f, 0x1d2f16, 0x24381c].forEach(function (col, k) {
      var n = 150, im = new T.InstancedMesh(new T.ConeGeometry(1, 3, 7), mat(col), n), d = new T.Object3D();
      for (var j = 0; j < n; j++) { var x = (rnd() - 0.5) * 1300, z = -110 - rnd() * 520;
        var s = 3 + rnd() * 3.5; d.position.set(x, hillY(x, z) + s * 1.5 - 0.5, z); d.scale.set(s * 0.8, s, s * 0.8); d.updateMatrix(); im.setMatrixAt(j, d.matrix); }
      ground.add(im); });
    ground.add(cyl(7, 7, 26, M.white, -62, 13, -6)); ground.add(cyl(7.05, 7.05, 2, M.navy, -62, 5, -6));
    for (i = 0; i < 6; i++) ground.add(box(22 - i * 2.6, 1, 14, [M.navy, M.yellow, M.dark][i % 3], -58 + i * 1.3, 0.5 + i, 52));
    // launch mount
    var MOUNT = 6.2;
    ground.add(cyl(8.5, 8.5, 1, M.black, 0, MOUNT - 0.5, 0, 40));
    var ring = mesh(new T.TorusGeometry(2.6, 0.22, 10, 40), M.red, 0, MOUNT + 0.1, 0); ring.rotation.x = Math.PI / 2; ground.add(ring);
    for (i = 0; i < 4; i++) { var a = i * Math.PI / 2 + Math.PI / 4, cxx = Math.cos(a), sz = Math.sin(a);
      ground.add(beam(V(cxx * 7, MOUNT - 1, sz * 7), V(cxx * 9, 0, sz * 9), 0.7, M.black));
      ground.add(beam(V(cxx * 4, MOUNT - 1, sz * 4), V(cxx * 8, 0.6, sz * 8), 0.35, M.yellow)); }
    ground.add(cyl(1.2, 1.2, MOUNT - 1, M.grey, 0, (MOUNT - 1) / 2, 0)); ground.add(box(9, 0.3, 9, M.black, 0, 0.5, 0));
    // service tower
    var TX = -13, TW = 3, TH = 31, tower = new T.Group(); tower.position.set(TX, 0, 0); ground.add(tower);
    [[-TW, -TW], [TW, -TW], [-TW, TW], [TW, TW]].forEach(function (p) { tower.add(box(0.5, TH, 0.5, M.steel, p[0], TH / 2, p[1])); });
    var LV = 8, lh = TH / LV;
    for (i = 0; i < LV; i++) { var y0 = i * lh, y1 = y0 + lh;
      [[-TW, -TW, TW, -TW], [-TW, TW, TW, TW], [-TW, -TW, -TW, TW], [TW, -TW, TW, TW]].forEach(function (f) {
        tower.add(beam(V(f[0], y0, f[1]), V(f[2], y1, f[3]), 0.22, M.steel)); tower.add(beam(V(f[2], y0, f[3]), V(f[0], y1, f[1]), 0.22, M.steel)); });
      if (i % 2 === 0) tower.add(box(TW * 2 + 1.6, 0.35, TW * 2 + 1.6, M.black, 0, y0 + 0.2, 0)); }
    tower.add(box(TW * 2 + 1.6, 0.35, TW * 2 + 1.6, M.black, 0, TH, 0));
    tower.add(box(1.1, TH, 1.1, M.navy, TW + 0.2, TH / 2, TW + 0.2));
    tower.add(box(TW * 2 + 1, 1, 2, M.yellow, 0, TH + 0.7, 0)); tower.add(beam(V(-TW, TH + 0.7, 0), V(-TW - 6, TH - 1.6, 0), 0.5, M.yellow));
    tower.add(cyl(0.12, 0.12, 9, M.dark, 0, TH + 5.5, 0, 8)); tower.add(beam(V(0, TH + 9.8, 0), V(-60, 0, -20), 0.08, M.dark));
    var arms = [];
    [15, 22, 29].forEach(function (y) { var pv = new T.Group(); pv.position.set(TW + 0.3, y, 0); var L = -TX - TW - 0.3 - 1.4;
      pv.add(box(L, 0.2, 0.2, M.white, L / 2, 0.5, 0.6)); pv.add(box(L, 0.2, 0.2, M.white, L / 2, 0.5, -0.6)); pv.add(box(L, 0.2, 0.2, M.white, L / 2, -0.5, 0.6)); pv.add(box(L, 0.2, 0.2, M.white, L / 2, -0.5, -0.6));
      for (var j = 0; j < 6; j++) { var xa = j * L / 6, xb = xa + L / 6; pv.add(beam(V(xa, -0.5, 0.6), V(xb, 0.5, 0.6), 0.12, M.white)); pv.add(beam(V(xa, 0.5, -0.6), V(xb, -0.5, -0.6), 0.12, M.white)); }
      pv.add(box(0.5, 1.5, 1.7, M.yellow, L, 0, 0)); tower.add(pv); arms.push(pv); });
    // smoke
    var smokeG = new T.SphereGeometry(1, 10, 8), smoke = [];
    for (i = 0; i < 110; i++) { var sm = new T.Mesh(smokeG, new T.MeshLambertMaterial({ color: i % 3 ? 0xD5DAE1 : 0xAEB5BF, transparent: true, opacity: 0, depthWrite: false }));
      sm.userData = { a: rnd() * Math.PI * 2, b: 0.15 + rnd() * 0.3, r: 0.6 + rnd() * 0.8, up: rnd() }; sm.visible = false; ground.add(sm); smoke.push(sm); }

    /* ---------- rocket (shared model: rocket3d.js) ---------- */
    var RK = Rocket3D.build(T, { label: ms.label, mission: mKey, sat: satOptions(mKey) });
    var rocket = RK.rocket, stage1 = RK.stage1, stage2 = RK.stage2, fair = RK.fair, f1 = RK.f1, f2 = RK.f2, glow = RK.glow, sat = RK.sat, satParts = RK.satParts, FY = RK.FY;
    rocket.position.set(0, MOUNT, 0); scene.add(rocket);


    /* ---------- space ---------- */
    var sg = new T.BufferGeometry(), sp = []; for (i = 0; i < 900; i++) { var v = V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(4000); sp.push(v.x, v.y, v.z); }
    sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
    var stars = new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0.35, fog: false })); scene.add(stars);
    var ec = document.createElement('canvas'); ec.width = 1024; ec.height = 512; var ex = ec.getContext('2d'); ex.fillStyle = '#1F6FB5'; ex.fillRect(0, 0, 1024, 512);
    for (i = 0; i < 46; i++) { ex.fillStyle = i % 2 ? '#3E6B4A' : '#4C7C55'; ex.beginPath(); ex.ellipse(rnd() * 1024, 80 + rnd() * 352, 20 + rnd() * 70, 12 + rnd() * 40, rnd() * 3, 0, 7); ex.fill(); }
    for (i = 0; i < 70; i++) { ex.fillStyle = 'rgba(255,255,255,' + (0.35 + rnd() * 0.4) + ')'; ex.beginPath(); ex.ellipse(rnd() * 1024, rnd() * 512, 30 + rnd() * 90, 4 + rnd() * 10, 0, 0, 7); ex.fill(); }
    var etex = new T.CanvasTexture(ec); etex.wrapS = etex.wrapT = T.RepeatWrapping;
    var earth = mesh(new T.SphereGeometry(1, 96, 64), new T.MeshLambertMaterial({ map: etex, fog: false }), 0, 0, 0, false); scene.add(earth);
    earth.add(mesh(new T.SphereGeometry(1.012, 64, 40), new T.MeshBasicMaterial({ color: 0x9FB7E8, transparent: true, opacity: 0.16, side: T.BackSide, fog: false }), 0, 0, 0, false));
    var orbitMat = new T.MeshBasicMaterial({ color: 0xFFD34D, fog: false });
    var orbitGeo = mesh(new T.TorusGeometry(1, 0.0022, 6, 300), orbitMat, 0, 0, 0, false), orbitLeo = mesh(new T.TorusGeometry(1, 0.00009, 6, 1200), orbitMat, 0, 0, 0, false); scene.add(orbitGeo); scene.add(orbitLeo);

    /* ---------- state / animation ---------- */
    var state = { u: 0, playing: false, t0: 0, done: false };
    var cam = { th: -0.5, ph: 0, dist: 1, drag: null };
    var clamp = function (x) { return Math.max(0, Math.min(1, x)); }, seg = function (u, a, b) { return clamp((u - a) / (b - a)); }, sm3 = function (s) { return s * s * (3 - 2 * s); };
    var skyC = new T.Color(CONFIG.sky), spaceC = new T.Color(CONFIG.space), tmpC = new T.Color();
    var capEl = document.getElementById('l3cap'), subEl = document.getElementById('l3sub'), pEl = document.getElementById('l3p');

    function apply(u) {
      state.u = u; var now = performance.now() / 1000, flick = 1 + 0.18 * Math.sin(now * 60);
      var y = u < 0.18 ? 0 : 2268 * Math.pow(u - 0.18, 2); rocket.position.y = MOUNT + y;
      arms.forEach(function (a, k) { a.rotation.y = -1.45 * sm3(seg(u, 0.02 + k * 0.03, 0.07 + k * 0.03)); });
      var on1 = u >= 0.15 && u < 0.47; f1.visible = on1; f1.scale.set(1, flick, 1); var on2 = u >= 0.5 && u < 0.7; f2.visible = on2; f2.scale.set(1, flick, 1);
      glow.intensity = on1 ? 2.6 * flick : 0;
      var sep = seg(u, 0.46, 0.6); stage1.visible = u < 0.6; stage1.position.set(-10 * sep, -130 * sep * sep, 0); stage1.rotation.z = 1.3 * sep;
      var s2 = seg(u, 0.68, 0.85); stage2.visible = u < 0.85; stage2.position.y = 14.8 - 70 * s2 * s2;
      var fo = sm3(seg(u, 0.66, 0.82)); fair.forEach(function (g, k) { var d = k ? -1 : 1; g.visible = fo < 1; g.position.set(0, FY - 4 * fo, d * 9 * fo); g.rotation.x = d * 1.1 * fo; g.children[0].material.opacity = 1 - fo * fo; });
      var pp = sm3(seg(u, 0.85, 0.93)); satParts.pl.scale.x = satParts.pr.scale.x = Math.max(0.001, pp);
      var ex2 = sm3(seg(u, 0.9, 0.98)); if (satParts.dish) satParts.dish.scale.setScalar(Math.max(0.001, ex2));
      if (satParts.radar) { var rr = seg(u, 0.89, 1); satParts.radar.scale.setScalar(Math.max(0.001, rr < 0.8 ? 1.1 * sm3(rr / 0.8) : 1.1 - 0.1 * (rr - 0.8) / 0.2)); }
      if (satParts.lid) satParts.lid.rotation.z = -1.9 * ex2;
      smoke.forEach(function (p) { var d = p.userData, age = (u - d.b) / 0.2; if (age <= 0 || age >= 1 || u > 0.58) { p.visible = false; return; }
        p.visible = true; var rad = 4 + age * 30 * d.r; p.position.set(Math.cos(d.a) * rad, 1.5 + age * 9 * d.up, Math.sin(d.a) * rad); p.scale.setScalar(2 + age * 8); p.material.opacity = 0.85 * (1 - age); });
      var dk = sm3(seg(u, 0.3, 0.56)); tmpC.copy(skyC).lerp(spaceC, dk); scene.background.copy(tmpC); scene.fog.color.copy(tmpC); scene.fog.far = 1400 + dk * 8000;
      stars.material.opacity = 0.35 + 0.65 * dk; hemi.intensity = 0.55 + 0.35 * dk;
      fl1.intensity = 1.1 * (1 - dk); fl2.intensity = 0.8 * (1 - dk);
      var inSpace = u >= 0.58; ground.visible = !inSpace;
      var geo = ms.orbit === 'geo', py = rocket.position.y + sat.position.y;
      earth.visible = inSpace; orbitGeo.visible = orbitLeo.visible = false;
      if (inSpace) { var ER = geo ? 9 : 900, D = geo ? 22 : 926, ez = geo ? -34 : 0; earth.scale.setScalar(ER); earth.position.set(0, py - D, ez);
        if (geo) { earth.rotation.set(0, now * 0.05, 0); etex.repeat.set(1, 1); etex.offset.x = 0; } else { earth.rotation.set(0, 0, Math.PI / 2); etex.repeat.set(40, 20); etex.offset.x = now * 0.02; }
        var orbit = geo ? orbitGeo : orbitLeo, dist = Math.sqrt(D * D + ez * ez); orbit.scale.setScalar(dist); orbit.position.copy(earth.position); orbit.rotation.set(geo ? Math.atan2(-ez, D) : 0, 0, 0); orbit.visible = u > 0.64; }
      var k1 = sm3(seg(u, 0.56, 0.72)), tgtY = rocket.position.y + 16 + (sat.position.y - 16 - (geo ? 6 : 3)) * k1;
      var radius = (72 - 44 * k1) * cam.dist, th = cam.th, ph = -0.16 + 0.3 * k1 + cam.ph;
      var cy = tgtY + radius * Math.sin(ph); if (!inSpace) cy = Math.max(1.5, cy);
      camera.position.set(radius * Math.cos(ph) * Math.sin(th), cy, radius * Math.cos(ph) * Math.cos(th)); camera.lookAt(0, tgtY, 0); stars.position.copy(camera.position);
      sun.target.position.set(0, rocket.position.y, 0); sun.target.updateMatrixWorld();
      var st = u <= 0 ? 'Go for launch' : (u < 0.3 ? ms.steps[0] : (u < 0.6 ? ms.steps[1] : (u < 0.86 ? ms.steps[2] : ms.steps[3])));
      if (capEl && capEl.textContent !== st) capEl.textContent = st;
      if (subEl) subEl.textContent = u >= 0.86 ? 'Orbit: ' + ms.orbitName : '';
      if (pEl) pEl.style.width = (u * 100).toFixed(1) + '%';
    }

    function resize() { var w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 62 : 45; camera.updateProjectionMatrix(); }
    window.addEventListener('resize', resize); resize();

    canvas.addEventListener('pointerdown', function (e) { cam.drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', function (e) { if (!cam.drag) return; cam.th -= (e.clientX - cam.drag.x) * 0.006; cam.ph = Math.max(-0.5, Math.min(1, cam.ph + (e.clientY - cam.drag.y) * 0.004)); cam.drag = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointerup', function () { cam.drag = null; }); canvas.addEventListener('pointercancel', function () { cam.drag = null; });
    canvas.addEventListener('wheel', function (e) { e.preventDefault(); cam.dist = Math.max(0.5, Math.min(2, cam.dist * (e.deltaY > 0 ? 1.08 : 0.92))); }, { passive: false });

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var raf = 0, stopped = false;
    active = { stop: function () { stopped = true; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); try { renderer.dispose(); } catch (e) {} active = null; } };

    if (reduce) { apply(1); renderer.render(scene, camera); setTimeout(finish, 1200); return; }
    state.playing = true; state.t0 = performance.now() + 700; // short hold on the pad
    (function loop() { if (stopped) return;
      if (state.playing) { var u = (performance.now() - state.t0) / (CONFIG.duration * 1000);
        if (u >= 1) { u = 1; state.playing = false; state.done = true; setTimeout(finish, 1400); }
        apply(Math.max(0, u)); }
      else apply(state.u);
      renderer.render(scene, camera); raf = requestAnimationFrame(loop); })();

    function finish() { if (stopped) return; active && active.stop(); endLaunchRef(); }
  }

  // endLaunch is defined in index.html; Skip button (data-a="skip") also calls it.
  function endLaunchRef() { window.endLaunch(); }
  var endLaunch0 = window.endLaunch;
  window.endLaunch = function () { if (active) active.stop(); endLaunch0(); };
})();

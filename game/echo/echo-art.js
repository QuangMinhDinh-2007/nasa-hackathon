/* PROJECT ECHO — original illustrated art (inline SVG, no image files, works offline).
 * Everything here is presentation only. Nothing in this file reads or changes a simulation value,
 * except room() which is handed already-computed numbers to draw gauges.
 * Style: soft 2D cartoon, plum outlines, bright fresh pastels (cream, sky, mint, coral, sunny yellow, lavender).
 */
'use strict';
(function () {
  const C = { ink: '#4a3b63', cream: '#fff6e6', peach: '#ffd9bf', coral: '#ff8f7a', sun: '#ffd166', sky: '#6cc4ff', deep: '#3b7be0',
    mint: '#7fe0c2', teal: '#3fbfa8', lav: '#b9a5ff', pink: '#ffb3c7', white: '#ffffff', night: '#2a2d6e', leaf: '#6fcf7f' };
  const O = `stroke="${C.ink}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const o = w => `stroke="${C.ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

  /* ---------------- ECHO: a small blue bird with solar-panel wings and an antenna ---------------- */
  /* ---------------- ECHO: a small blue bird with solar-panel wings and an antenna ---------------- */
  function echo(mood) { mood = mood || 'happy';
    const eyes = {
      happy: `<circle cx="47" cy="50" r="8.5" fill="#fff" ${o(2.2)}/><circle cx="73" cy="50" r="8.5" fill="#fff" ${o(2.2)}/><circle cx="48.5" cy="51" r="4.6" fill="${C.ink}"/><circle cx="74.5" cy="51" r="4.6" fill="${C.ink}"/><circle cx="50" cy="49" r="1.7" fill="#fff"/><circle cx="76" cy="49" r="1.7" fill="#fff"/>`,
      cheer: `<path d="M39 52q8-11 16 0M65 52q8-11 16 0" fill="none" ${o(3.2)}/>`,
      worry: `<circle cx="47" cy="52" r="8" fill="#fff" ${o(2.2)}/><circle cx="73" cy="52" r="8" fill="#fff" ${o(2.2)}/><circle cx="47" cy="54" r="3.8" fill="${C.ink}"/><circle cx="73" cy="54" r="3.8" fill="${C.ink}"/><path d="M38 41l14 4M82 41l-14 4" fill="none" ${o(2.6)}/>`,
      think: `<circle cx="47" cy="50" r="8.5" fill="#fff" ${o(2.2)}/><circle cx="73" cy="50" r="8.5" fill="#fff" ${o(2.2)}/><circle cx="50" cy="47" r="4.2" fill="${C.ink}"/><circle cx="76" cy="47" r="4.2" fill="${C.ink}"/>`,
      sad: `<circle cx="47" cy="53" r="8" fill="#fff" ${o(2.2)}/><circle cx="73" cy="53" r="8" fill="#fff" ${o(2.2)}/><circle cx="47" cy="56" r="4" fill="${C.ink}"/><circle cx="73" cy="56" r="4" fill="${C.ink}"/><path d="M37 46l15-4M83 46l-15-4" fill="none" ${o(2.6)}/><path d="M84 60q3 6 0 9q-3-3 0-9z" fill="${C.sky}" ${o(1.4)}/>`,
    }[mood] || '';
    const beak = mood === 'cheer' ? `<path d="M52 61h16l-8 12z" fill="${C.sun}" ${o(2.2)}/><path d="M55 63h10l-5 6z" fill="${C.coral}"/>` : mood === 'worry' || mood === 'sad' ? `<path d="M53 64h14l-7 7z" fill="${C.sun}" ${o(2.2)}/>` : `<path d="M52 61h16l-8 9z" fill="${C.sun}" ${o(2.2)}/>`;
    const up = mood === 'cheer';
    const wing = (side) => { const s = side < 0 ? '' : 'transform="translate(120 0) scale(-1 1)"';
      return `<g ${s}><g class="ew ${up ? 'up' : ''}"><path d="M24 62l-8 ${up ? -8 : 2}" ${o(3)} fill="none"/><g transform="rotate(${up ? -38 : -8} 16 60)"><rect x="-8" y="50" width="24" height="17" rx="3.5" fill="${C.deep}" ${o(2.4)}/><path d="M0 50v17M8 50v17M-8 58.5h24" stroke="#9fd0ff" stroke-width="1.3"/></g></g></g>`; };
    return `<svg class="echo-bird m-${mood}" viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="60" cy="112" rx="26" ry="4.5" fill="#000" opacity=".12"/>
      <path d="M60 22v-11" ${o(2.6)} fill="none"/><circle class="e-ant" cx="60" cy="8" r="4.5" fill="${C.sun}" ${o(2.2)}/>
      ${wing(-1)}${wing(1)}
      <path d="M78 96q14 6 20-2q-8-2-12-8z" fill="${C.deep}" ${o(2.4)}/>
      <ellipse cx="60" cy="66" rx="36" ry="38" fill="${C.sky}" ${o(3)}/>
      <path d="M40 30q8-12 20-8q12-4 20 8" fill="${C.sky}" ${o(3)}/>
      <ellipse cx="60" cy="80" rx="22" ry="20" fill="${C.cream}"/>
      <circle cx="36" cy="64" r="5.5" fill="${C.pink}" opacity=".85"/><circle cx="84" cy="64" r="5.5" fill="${C.pink}" opacity=".85"/>
      ${eyes}${beak}
      <path d="M50 103v7m-4 0h8M70 103v7m-4 0h8" ${o(2.8)} stroke="${C.coral}" fill="none"/>
    </svg>`; }

  /* ---------------- Flight Director: calm, friendly, headset ---------------- */
  function director() { return `<svg class="echo-dir" viewBox="0 0 120 120" aria-hidden="true">
      <path d="M14 120q2-34 46-34t46 34z" fill="${C.teal}" ${O}/><path d="M48 88l12 14l12-14" fill="${C.cream}" ${o(2.4)}/>
      <circle cx="84" cy="106" r="7" fill="${C.sun}" ${o(2)}/><path d="M84 102l1.4 3h3l-2.4 2l1 3l-3-1.8l-3 1.8l1-3l-2.4-2h3z" fill="${C.coral}"/>
      <path d="M30 52q-4-36 30-36t30 36q0 10-6 14h-48q-6-4-6-14z" fill="#5a3e36" ${O}/><circle cx="60" cy="14" r="10" fill="#5a3e36" ${O}/>
      <ellipse cx="60" cy="56" rx="24" ry="27" fill="#c98d68" ${O}/>
      <path d="M36 46q10-16 26-12q12 2 22 12q-2-20-24-20t-24 20z" fill="#5a3e36"/>
      <circle cx="50" cy="56" r="3.4" fill="${C.ink}"/><circle cx="70" cy="56" r="3.4" fill="${C.ink}"/><circle cx="51" cy="55" r="1.1" fill="#fff"/><circle cx="71" cy="55" r="1.1" fill="#fff"/>
      <path d="M45 48q5-3 9 0M66 48q5-3 9 0" fill="none" ${o(2.2)}/><path d="M51 68q9 7 18 0" fill="none" ${o(2.6)}/>
      <circle cx="43" cy="64" r="4" fill="${C.coral}" opacity=".45"/><circle cx="77" cy="64" r="4" fill="${C.coral}" opacity=".45"/>
      <path d="M33 54q-2-30 27-30t27 30" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/><rect x="27" y="48" width="10" height="17" rx="5" fill="${C.sun}" ${o(2.4)}/><rect x="83" y="48" width="10" height="17" rx="5" fill="${C.sun}" ${o(2.4)}/>
      <path d="M32 65q2 14 18 13" fill="none" ${o(2.4)}/><circle cx="51" cy="78" r="3" fill="${C.ink}"/>
    </svg>`; }

  /* ---------------- small reusable pieces ---------------- */
  const stars = (n, w, h, seed) => { let s = '', x = seed || 7; const r = () => (x = (x * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < n; i++) { const cx = (r() * w).toFixed(0), cy = (r() * h).toFixed(0), k = r(); s += k > .8 ? `<path class="tw" style="animation-delay:${(r() * 3).toFixed(1)}s" d="M${cx} ${cy - 7}l2 5l5 2l-5 2l-2 5l-2-5l-5-2l5-2z" fill="#fff6c9"/>` : `<circle cx="${cx}" cy="${cy}" r="${(1 + k * 2).toFixed(1)}" fill="#fff" opacity="${(.5 + k * .5).toFixed(2)}"/>`; } return s; };
  const cloud = (x, y, s, f) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 30q-18 0-18-16q0-14 16-14q4-14 20-14q16 0 20 12q20-2 20 16q0 16-18 16z" fill="${f || '#fff'}" ${o(3 / s)}/></g>`;
  const earth = (cx, cy, r) => `<g><circle cx="${cx}" cy="${cy}" r="${r + 10}" fill="#bfe9ff" opacity=".35"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.sky}" ${O}/>
      <g transform="translate(${cx - r} ${cy - r}) scale(${r / 100})"><path d="M38 34q14-12 34-6q16 4 20 18q-10 8-4 20q-12 12-26 6q-10-12-22-10q-12-12-2-28z" fill="${C.leaf}" ${o(2.5)}/><path d="M112 78q16-6 30 4q10 12 2 28q-12 14-28 6q-14-14-4-38z" fill="${C.leaf}" ${o(2.5)}/><path d="M60 128q16-4 24 8q2 16-12 22q-14-4-12-30z" fill="${C.leaf}" ${o(2.5)}/>
      <path d="M22 96q14-6 24 2M120 40q14-4 22 6M96 150q16-6 28 2" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".9"/></g></g>`;
  const sat = (x, y, s, rot) => `<g transform="translate(${x} ${y}) rotate(${rot || 0}) scale(${s})"><rect x="-74" y="-16" width="46" height="32" rx="4" fill="${C.deep}" ${O}/><path d="M-59-16v32M-43-16v32M-74 0h46" stroke="#9fd0ff" stroke-width="2"/><rect x="28" y="-16" width="46" height="32" rx="4" fill="${C.deep}" ${O}/><path d="M43-16v32M59-16v32M28 0h46" stroke="#9fd0ff" stroke-width="2"/><path d="M-28 0h56" ${O}/><rect x="-24" y="-26" width="48" height="52" rx="10" fill="${C.cream}" ${O}/><circle cx="0" cy="6" r="11" fill="${C.night}" ${O}/><circle cx="-3" cy="3" r="3" fill="#fff" opacity=".8"/><path d="M0-26v-14" ${O}/><circle cx="0" cy="-44" r="5" fill="${C.sun}" ${o(2.4)}/><rect x="-14" y="-18" width="28" height="8" rx="4" fill="${C.coral}" ${o(2)}/></g>`;
  const swirl = (cx, cy, r, cls) => `<g class="${cls || 'spin'}" style="transform-origin:${cx}px ${cy}px"><circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" opacity=".28"/>
      ${[0, 120, 240].map(a => `<path transform="rotate(${a} ${cx} ${cy})" d="M${cx} ${cy}c${r * .5}-${r * .1} ${r * .9} ${r * .3} ${r * .95} ${r * .8}c-${r * .25}-${r * .45}-${r * .55}-${r * .55}-${r * .95}-${r * .5}z" fill="#fff" ${o(2.5)}/>`).join('')}
      <circle cx="${cx}" cy="${cy}" r="${r * .16}" fill="${C.deep}" ${o(2.5)}/></g>`;
  const house = (x, y, s, roof) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="0" y="20" width="44" height="34" fill="${C.cream}" ${O}/><path d="M-6 22l28-24l28 24z" fill="${roof || C.coral}" ${O}/><rect x="17" y="34" width="12" height="20" rx="2" fill="${C.sun}" ${o(2.4)}/></g>`;
  const tree = (x, y, s, f) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-5" y="30" width="10" height="26" rx="3" fill="#b07a55" ${o(2.6)}/><path d="M0-30l26 34h-12l18 26h-64l18-26h-12z" fill="${f || C.leaf}" ${O}/></g>`;
  const flame = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><g class="flick"><path d="M0-40q22 22 16 42q-2 16-16 16t-16-16q-4-14 6-22q0 10 6 10q-4-16 4-30z" fill="${C.coral}" ${O}/><path d="M0-8q9 10 6 18q-1 6-6 6t-6-6q-2-8 6-18z" fill="${C.sun}"/></g></g>`;
  const smoke = (x, y) => `<g class="drift" opacity=".9"><circle cx="${x}" cy="${y}" r="18" fill="#b9aecb" ${o(2.4)}/><circle cx="${x + 20}" cy="${y - 26}" r="24" fill="#cbc2da" ${o(2.4)}/><circle cx="${x + 50}" cy="${y - 58}" r="30" fill="#ddd6e8" ${o(2.4)}/></g>`;
  const dish = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-6 60l-18 34h48l-18-34" fill="${C.lav}" ${O}/><path d="M-44 6q44 70 88-10z" fill="${C.cream}" ${O}/><path d="M2 20l22-34" ${O}/><circle cx="26" cy="-18" r="6" fill="${C.coral}" ${o(2.4)}/></g>`;
  const waves = (x, y, rot, cls) => `<g class="${cls || 'ping'}" transform="translate(${x} ${y}) rotate(${rot})" fill="none" stroke="${C.sun}" stroke-width="5" stroke-linecap="round"><path d="M-10-18q10 18 0 36"/><path d="M6-30q18 30 0 60"/><path d="M22-42q26 42 0 84"/></g>`;
  const frame = (inner, bg) => `<svg class="cm-art" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="800" height="450" fill="${bg}"/>${inner}</svg>`;
  const space = `<defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f9e"/><stop offset=".6" stop-color="#5a6fe0"/><stop offset="1" stop-color="#8fd3ff"/></linearGradient></defs><rect width="800" height="450" fill="url(#spg)"/>${stars(46, 800, 330, 11)}`;
  const echoAt = (x, y, s, mood, cls) => `<g class="${cls || 'bob'}"><svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 120 120" overflow="visible">${echo(mood).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></g>`;
  const dirAt = (x, y, s) => `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 120 120">${director().replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>`;

  // mission backdrops seen from above (the lower part of an "in orbit" panel)
  const below = {
    storm: `<path d="M0 330q400-90 800 0v120h-800z" fill="${C.sky}" ${O}/><path d="M560 318q90-22 240 12v120h-200q-60-60-40-132z" fill="${C.leaf}" ${O}/>${swirl(330, 372, 86)}`,
    fire: `<path d="M0 330q400-90 800 0v120h-800z" fill="${C.leaf}" ${O}/><path d="M0 380q200-50 420-10t380-20v100h-800z" fill="#58b96c"/>${tree(120, 372, .7)}${tree(200, 392, .6)}${tree(640, 380, .7)}${smoke(360, 350)}${flame(350, 392, .9)}${flame(400, 404, .6)}${house(540, 376, .8)}`,
    flood: `<path d="M0 330q400-90 800 0v120h-800z" fill="${C.leaf}" ${O}/><path class="wob" d="M-20 400q120-70 260-30t260-10t320-30v130h-840z" fill="${C.sky}" ${O}/>${house(560, 344, .8)}${house(620, 352, .7, C.lav)}${tree(120, 350, .6)}<path d="M470 388h70" stroke="${C.ink}" stroke-width="8" stroke-linecap="round"/>`,
  };

  /* ---------------- comic scenes (800 x 450) ---------------- */
  const SC = {
    // prologue
    title: () => frame(`${space}${earth(400, 520, 270)}${sat(640, 120, .7, -14)}${cloud(120, 330, 1.2)}`, C.night),
    earth: () => frame(`${space}${earth(400, 470, 250)}${sat(560, 150, .7, -14)}${echoAt(150, 110, 150, 'happy')}`, C.night),
    trio: () => frame(`<rect width="267" height="450" fill="#8fd3ff"/><rect x="267" width="266" height="450" fill="#ffd9a8"/><rect x="533" width="267" height="450" fill="#bfe3ff"/>
      ${swirl(133, 200, 92)}<path d="M0 360q133-40 267 0v90h-267z" fill="${C.deep}" ${O}/>
      <path d="M267 330q133-60 266 0v120h-266z" fill="${C.leaf}" ${O}/>${tree(320, 300, .8)}${tree(480, 320, .7)}${smoke(390, 250)}${flame(400, 310, 1.2)}
      ${cloud(600, 90, 1.4, '#e9eefc')}${cloud(700, 150, 1, '#dfe6fa')}<path d="M620 150l-12 40M660 160l-12 40M700 210l-12 40M580 200l-12 40" stroke="${C.deep}" stroke-width="5" stroke-linecap="round"/><path class="wob" d="M533 330q70-40 130-10t137-10v140h-267z" fill="${C.sky}" ${O}/>${house(690, 286, .9)}
      <path d="M267 0v450M533 0v450" stroke="${C.ink}" stroke-width="6"/>`, '#fff'),
    director: () => frame(`<rect width="800" height="450" fill="${C.cream}"/><rect y="330" width="800" height="120" fill="${C.mint}" ${O}/><rect x="60" y="50" width="250" height="160" rx="18" fill="${C.night}" ${O}/>${stars(14, 250, 150, 5).replace(/<(circle|path)/g, '<$1 transform="translate(60 50)"')}<circle cx="250" cy="160" r="60" fill="${C.sky}" ${O}/>
      <rect x="380" y="70" width="150" height="110" rx="10" fill="${C.peach}" ${O}/><path d="M400 150l30-40l26 22l34-46l20 30" fill="none" ${O}/>
      ${dirAt(430, 150, 300)}${echoAt(190, 190, 190, 'happy')}`, C.cream),
    door: () => frame(`<rect width="800" height="450" fill="${C.peach}"/><rect y="350" width="800" height="100" fill="${C.mint}" ${O}/><path d="M300 350v-200q0-90 100-90t100 90v200z" fill="${C.sky}" ${O}/><path d="M320 350v-195q0-72 80-72t80 72v195z" fill="${C.cream}" ${O}/><circle cx="460" cy="230" r="8" fill="${C.sun}" ${o(2.5)}/>
      <rect x="330" y="110" width="140" height="40" rx="12" fill="${C.coral}" ${O}/><text x="400" y="138" text-anchor="middle" font-family="Baloo 2,Fredoka,system-ui" font-weight="800" font-size="22" fill="#fff">ECHO</text>
      <path class="ray" d="M400 60l0-40M330 80l-26-30M470 80l26-30" stroke="${C.sun}" stroke-width="7" stroke-linecap="round"/>${echoAt(520, 210, 170, 'cheer')}`, C.peach),
    // mission briefs
    storm1: () => frame(`<rect width="800" height="450" fill="#9fdcff"/><path d="M0 250q400-40 800 0v200h-800z" fill="${C.deep}" ${O}/>${swirl(300, 190, 150)}<path d="M600 250q60-30 200-10v210h-240q-20-100 40-200z" fill="${C.leaf}" ${O}/>${house(650, 262, 1)}${house(712, 300, .8, C.lav)}${tree(610, 330, .7)}
      <path class="dash" d="M440 220q80 20 170 60" fill="none" stroke="${C.coral}" stroke-width="7" stroke-dasharray="14 12" stroke-linecap="round"/><path d="M604 262l14 20l-24 2z" fill="${C.coral}" ${o(2.4)}/>`, '#9fdcff'),
    storm2: () => frame(`<rect width="800" height="450" fill="${C.cream}"/><rect y="340" width="800" height="110" fill="${C.peach}" ${O}/><rect x="250" y="70" width="330" height="210" rx="18" fill="${C.night}" ${O}/><text x="415" y="205" text-anchor="middle" font-family="Baloo 2,system-ui" font-weight="800" font-size="110" fill="${C.sun}">?</text><rect x="390" y="280" width="50" height="40" fill="${C.lav}" ${O}/><rect x="330" y="316" width="170" height="16" rx="8" fill="${C.lav}" ${O}/>
      ${dirAt(40, 170, 250)}${echoAt(590, 190, 170, 'worry')}`, C.cream),
    orbit: m => frame(`${space}${below[m]}${sat(400, 130, .9, 0)}<path class="beam" d="M380 160l-90 160h220l-90-160z" fill="${C.sun}" opacity=".35"/>${echoAt(620, 60, 120, 'happy')}`, C.night),
    fire1: () => frame(`<rect width="800" height="450" fill="#ffcf9e"/><circle cx="660" cy="110" r="50" fill="${C.coral}" opacity=".7"/><path d="M0 300q200-90 400-30t400-40v220h-800z" fill="${C.leaf}" ${O}/><path d="M0 360q260-50 800-10v100h-800z" fill="#58b96c" ${O}/>
      ${tree(90, 280, 1)}${tree(180, 300, .8)}${tree(300, 270, .9)}${smoke(250, 200)}${flame(240, 300, 1.3)}${flame(310, 320, .9)}${flame(180, 330, .7)}${house(560, 300, 1)}${house(640, 316, .9, C.lav)}${tree(730, 300, .8)}`, '#ffcf9e'),
    fire2: () => frame(`<rect width="800" height="450" fill="${C.cream}"/><rect y="340" width="800" height="110" fill="${C.peach}" ${O}/><rect x="270" y="80" width="300" height="200" rx="14" fill="#e6f6dc" ${O}/><path d="M290 240q60-70 120-30t140-60" fill="none" ${O}/><circle cx="380" cy="170" r="16" fill="none" stroke="${C.coral}" stroke-width="6" stroke-dasharray="8 8"/><text x="470" y="150" font-family="Baloo 2,system-ui" font-weight="800" font-size="64" fill="${C.coral}">?</text>
      <rect x="610" y="270" width="150" height="70" rx="14" fill="${C.coral}" ${O}/><rect x="630" y="240" width="70" height="40" rx="8" fill="${C.sky}" ${O}/><circle cx="640" cy="344" r="16" fill="${C.ink}"/><circle cx="730" cy="344" r="16" fill="${C.ink}"/>
      ${dirAt(30, 170, 250)}`, C.cream),
    flood1: () => frame(`<rect width="800" height="450" fill="#bcd9f5"/>${cloud(120, 70, 1.6, '#dfe6fa')}${cloud(430, 50, 1.9, '#e9eefc')}${cloud(650, 100, 1.3, '#dfe6fa')}<path class="rain" d="M120 130l-14 44M190 140l-14 44M430 130l-14 44M520 140l-14 44M650 160l-14 44M330 150l-14 44" stroke="${C.deep}" stroke-width="5" stroke-linecap="round"/>
      <path d="M0 270q200-60 400-20t400-30v230h-800z" fill="${C.leaf}" ${O}/><path class="wob" d="M-20 350q140-90 300-40t280-20t260-40v200h-840z" fill="${C.sky}" ${O}/>${house(560, 250, 1)}${house(640, 262, .9, C.lav)}${house(500, 268, .8, C.sun)}<path d="M380 330h110" stroke="${C.ink}" stroke-width="10" stroke-linecap="round"/><path d="M380 330v-16M435 330v-16M490 330v-16" ${O}/>${tree(100, 250, .9)}`, '#bcd9f5'),
    flood2: () => frame(`<rect width="800" height="450" fill="${C.cream}"/><rect y="340" width="800" height="110" fill="${C.sky}" ${O}/><path d="M440 320h220l-30 50h-160z" fill="${C.coral}" ${O}/><rect x="270" y="80" width="300" height="190" rx="14" fill="#e6f1ff" ${O}/><path d="M290 150h80v100h-80zM380 150h80v100h-80zM470 150h80v100h-80z" fill="#fff" ${o(2.4)} stroke-dasharray="8 8"/><text x="420" y="130" text-anchor="middle" font-family="Baloo 2,system-ui" font-weight="800" font-size="34" fill="${C.deep}">3 zones · no map yet</text>
      ${dirAt(30, 170, 250)}${echoAt(600, 150, 150, 'think')}`, C.cream),
    // challenge beats
    observe: m => frame(`${space}${below[m]}${sat(400, 120, .85, 0)}<path class="beam" d="M385 150l-110 180h250l-110-180z" fill="${C.sun}" opacity=".4"/><rect class="snap" x="300" y="300" width="200" height="110" rx="10" fill="none" stroke="${C.sun}" stroke-width="6" stroke-dasharray="16 10"/>${echoAt(70, 70, 130, 'think')}`, C.night),
    storage: m => frame(`${space}${below[m]}${sat(330, 170, 1, -6)}${[0, 1, 2, 3, 4].map(i => `<g class="pop" style="animation-delay:${i * .25}s"><rect x="${470 + i * 34}" y="${90 + (i % 2) * 34}" width="60" height="46" rx="6" fill="#fff" ${O} transform="rotate(${-12 + i * 7} ${500 + i * 34} 110)"/><rect x="${478 + i * 34}" y="${98 + (i % 2) * 34}" width="44" height="24" fill="${[C.sky, C.mint, C.lav, C.peach, C.sun][i]}" transform="rotate(${-12 + i * 7} ${500 + i * 34} 110)"/></g>`).join('')}${echoAt(60, 60, 130, 'worry')}`, C.night),
    power: m => frame(`${space}<rect width="800" height="450" fill="#1c1f55" opacity=".45"/>${below[m]}${sat(400, 150, 1, 8)}<path class="zap" d="M470 96l-22 30h18l-16 34l40-44h-20l14-20z" fill="${C.sun}" ${o(2.6)}/><g transform="translate(560 90)"><rect width="150" height="70" rx="14" fill="#fff" ${O}/><rect x="150" y="22" width="14" height="26" rx="5" fill="${C.ink}"/><rect class="lowbat" x="10" y="10" width="42" height="50" rx="8" fill="${C.coral}"/></g>${echoAt(60, 60, 130, 'worry')}`, C.night),
    deliver: m => frame(`${space}${below[m]}${sat(250, 120, .85, 14)}${dish(640, 250, 1)}${waves(330, 160, 30)}${[0, 1, 2].map(i => `<rect class="fly" style="animation-delay:${i * .5}s" x="320" y="150" width="34" height="26" rx="5" fill="#fff" ${o(2.4)}/>`).join('')}<g transform="translate(90 250)"><circle r="46" fill="#fff" ${O}/><path d="M0-28v28l18 12" fill="none" ${o(5)}/></g>${echoAt(480, 30, 120, 'happy')}`, C.night),
    // endings
    success: m => frame(`<rect width="800" height="450" fill="#aee3ff"/><circle cx="130" cy="100" r="54" fill="${C.sun}" ${O}/><path d="M250 330a190 190 0 0 1 380 0" fill="none" stroke="${C.coral}" stroke-width="16"/><path d="M270 330a170 170 0 0 1 340 0" fill="none" stroke="${C.sun}" stroke-width="16"/><path d="M290 330a150 150 0 0 1 300 0" fill="none" stroke="${C.mint}" stroke-width="16"/>
      <path d="M0 330q400-70 800 0v120h-800z" fill="${C.leaf}" ${O}/>${house(160, 300, 1)}${house(240, 316, .9, C.lav)}${tree(80, 310, .8)}${tree(700, 310, .9)}${house(590, 306, 1, C.sun)}
      ${[...Array(16)].map((_, i) => `<rect class="conf" style="animation-delay:${(i % 8) * .2}s" x="${40 + i * 48}" y="${-10 - (i % 4) * 20}" width="12" height="18" rx="3" fill="${[C.coral, C.sun, C.mint, C.lav, C.pink][i % 5]}" transform="rotate(${i * 31} ${40 + i * 48} 0)"/>`).join('')}${echoAt(330, 130, 170, 'cheer')}`, '#aee3ff'),
    partial: m => frame(`<rect width="800" height="450" fill="#ffe2b8"/><circle cx="640" cy="120" r="56" fill="${C.sun}" ${O}/>${cloud(560, 110, 1.5)}<path d="M0 330q400-70 800 0v120h-800z" fill="${C.leaf}" ${O}/>${house(120, 300, 1)}${house(200, 316, .9, C.lav)}${tree(700, 310, .9)}${echoAt(330, 150, 170, 'think')}`, '#ffe2b8'),
    fail: m => frame(`${space}<g class="spin slow" style="transform-origin:560px 200px"><circle cx="560" cy="200" r="100" fill="#fff" opacity=".9" ${O}/><path d="M560 130v70l44 30" fill="none" ${o(8)}/></g><path d="M440 150q-40 50 0 110" fill="none" stroke="${C.sun}" stroke-width="10" stroke-linecap="round"/><path d="M424 140l22 4l-10 22z" fill="${C.sun}" ${o(2.4)}/>${echoAt(150, 140, 190, 'sad')}`, C.night),
    rewind: m => frame(`${space}<g class="spin rev" style="transform-origin:400px 220px"><circle cx="400" cy="220" r="120" fill="#fff" opacity=".92" ${O}/><path d="M400 130v90l-56 36" fill="none" ${o(9)}/></g>${[0, 60, 120, 180, 240, 300].map(a => `<circle transform="rotate(${a} 400 220)" cx="400" cy="70" r="10" fill="${C.sun}" ${o(2.4)}/>`).join('')}${echoAt(590, 250, 150, 'cheer')}`, C.night),
  };

  /* ---------------- the Mission Room (1600 x 900). g = gauges read from the engines; a = which hotspot is active ---------------- */
  function room(m, g) { g = g || {};
    const holo = { storm: swirl(800, 430, 44, 'spin'), fire: flame(800, 448, 1.15), flood: `<path class="wob" d="M756 440q22-22 44 0t44 0v24q-22 20-44 0t-44 0z" fill="#fff" ${o(2.6)}/><path class="wob" d="M762 416q20-18 38 0t38 0" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>` }[m || 'storm'];
    const mon = { storm: `<rect x="372" y="172" width="236" height="150" rx="10" fill="#8fd3ff"/>${swirl(490, 247, 52, 'spin')}`,
      fire: `<rect x="372" y="172" width="236" height="150" rx="10" fill="#bfe8b0"/><path d="M372 280q60-40 120-10t116-20v72h-236z" fill="#8ed48c"/>${flame(450, 262, .55)}${flame(540, 232, .45)}<rect x="400" y="196" width="80" height="60" fill="none" stroke="${C.sun}" stroke-width="4" stroke-dasharray="8 6"/>`,
      flood: `<rect x="372" y="172" width="236" height="150" rx="10" fill="#bfe8b0"/><path class="wob" d="M372 250q60-30 110 0t126-10v50q-60 24-120 0t-116 10z" fill="${C.sky}"/><path d="M451 172v150M530 172v150" stroke="#fff" stroke-width="3" stroke-dasharray="8 8"/>` }[m || 'storm'];
    const batt = Math.max(0, Math.min(100, g.batt == null ? 100 : g.batt)), stor = Math.max(0, Math.min(100, g.stor || 0)), nLed = Math.round(stor / 100 * 12);
    const bcol = batt < 30 ? C.coral : batt < 60 ? C.sun : C.mint;
    const orbit = !!g.flying;
    return `<svg class="room-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
     <defs><linearGradient id="rmWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3df"/><stop offset="1" stop-color="#ffe3c8"/></linearGradient>
      <linearGradient id="rmFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a6e6d6"/><stop offset="1" stop-color="#7fd6c2"/></linearGradient>
      <linearGradient id="rmSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${orbit ? '#34389a' : '#6fb7ff'}"/><stop offset="1" stop-color="${orbit ? '#6a7cf0' : '#ffd9a8'}"/></linearGradient>
      <radialGradient id="rmGlow"><stop offset="0" stop-color="#fff7b8" stop-opacity=".95"/><stop offset="1" stop-color="#fff7b8" stop-opacity="0"/></radialGradient>
      <clipPath id="rmWin"><path d="M640 400v-190q0-130 160-130t160 130v190z"/></clipPath></defs>
     <g class="par p1"><rect x="-40" width="1680" height="640" fill="url(#rmWall)"/>
      <path d="M-40 520h1680v120h-1680z" fill="#ffd2b3"/><path d="M-40 520h1680" ${O}/>
      ${[...Array(9)].map((_, i) => `<path d="M${80 + i * 190} 60q4 10 0 20M${150 + i * 190} 300q4 10 0 20" stroke="#ffcfa6" stroke-width="5" stroke-linecap="round"/>`).join('')}</g>
     <!-- window -->
     <g class="par p0" clip-path="url(#rmWin)"><rect x="620" y="60" width="360" height="360" fill="url(#rmSky)"/>
      ${orbit ? `${stars(22, 340, 200, 3).replace(/<(circle|path)/g, '<$1 transform="translate(630 80)"')}<g class="drift-slow">${earth(800, 520, 190)}</g>${sat(730, 170, .42, -12)}` : `${cloud(700, 150, .9)}${cloud(860, 210, .7)}<path d="M620 360q180-50 360 0v60h-360z" fill="${C.leaf}"/><g transform="translate(800 250)"><path d="M-16 110v-120q16-50 32 0v120z" fill="#fff" ${O}/><path d="M-16 60l-22 50h22zM16 60l22 50h-22z" fill="${C.coral}" ${O}/><circle cy="10" r="9" fill="${C.sky}" ${o(2.4)}/></g>`}</g>
     <path d="M640 400v-190q0-130 160-130t160 130v190z" fill="none" stroke="${C.ink}" stroke-width="10"/><path d="M800 80v320M640 250h320" stroke="${C.ink}" stroke-width="5" opacity=".55"/><rect x="622" y="396" width="356" height="22" rx="8" fill="${C.cream}" ${O}/>
     <g transform="translate(905 372)"><rect x="-16" y="0" width="32" height="26" rx="6" fill="${C.coral}" ${o(2.6)}/><path class="sway" d="M0 0q-18-26-6-44q10 16 6 44zM0 0q16-22 22-40q-2 24-22 40z" fill="${C.leaf}" ${o(2.6)}/></g>
     <!-- string lights + patches -->
     <path d="M60 70q380 90 760 14t740 30" fill="none" ${o(3)}/>
     ${[[150, 96, C.coral], [300, 118, C.sun], [450, 122, C.mint], [1100, 96, C.lav], [1260, 112, C.pink], [1420, 110, C.sky]].map(([x, y, f], i) => `<g class="sway" style="transform-origin:${x}px ${y - 8}px;animation-delay:${i * .4}s"><rect x="${x - 20}" y="${y}" width="40" height="46" rx="5" fill="#fff" ${o(2.6)}/><rect x="${x - 14}" y="${y + 6}" width="28" height="24" rx="3" fill="${f}"/></g>`).join('')}
     ${[[220, 110], [380, 124], [540, 112], [1020, 92], [1180, 108], [1340, 116], [1500, 104]].map(([x, y], i) => `<circle class="bulb" style="animation-delay:${i * .35}s" cx="${x}" cy="${y}" r="9" fill="${[C.sun, C.pink, C.mint, C.sky][i % 4]}" ${o(2.4)}/>`).join('')}
     <!-- posters -->
     <g transform="rotate(-3 180 250)"><rect x="110" y="170" width="140" height="170" rx="8" fill="${C.sky}" ${O}/><circle cx="180" cy="238" r="38" fill="${C.cream}" ${o(2.6)}/><text x="180" y="250" text-anchor="middle" font-family="Baloo 2,system-ui" font-weight="800" font-size="24" fill="${C.deep}">ECHO</text><text x="180" y="318" text-anchor="middle" font-family="Baloo 2,system-ui" font-weight="700" font-size="17" fill="#fff">for Earth</text></g>
     <!-- observation monitor (wall) -->
     <g class="hs" data-hs="obs"><rect x="356" y="156" width="268" height="182" rx="18" fill="${C.ink}"/><rect x="364" y="164" width="252" height="166" rx="12" fill="#24306e" ${o(2)}/>${mon}<rect x="372" y="172" width="236" height="150" rx="10" fill="none" ${o(2.5)}/><path class="scan" d="M372 180h236" stroke="#fff" stroke-width="3" opacity=".7"/><rect x="470" y="338" width="40" height="18" fill="${C.ink}"/><rect x="430" y="352" width="120" height="12" rx="6" fill="${C.ink}"/><circle class="led" cx="596" cy="336" r="5" fill="${C.mint}"/></g>
     <!-- report board (wall right) -->
     <g class="hs" data-hs="board"><rect x="1020" y="150" width="210" height="170" rx="12" fill="#e9b98a" ${O}/><rect x="1032" y="162" width="186" height="146" rx="6" fill="#ffe9c9"/><rect x="1044" y="174" width="70" height="52" fill="#fff" ${o(2.2)} transform="rotate(-4 1079 200)"/><path d="M1052 214l14-18l12 10l14-22" fill="none" stroke="${C.coral}" stroke-width="4" stroke-linecap="round" transform="rotate(-4 1079 200)"/><path d="M1168 178l8 17l19 2l-14 13l4 19l-17-10l-17 10l4-19l-14-13l19-2z" fill="${C.sun}" ${o(2.6)}/><rect x="1046" y="244" width="158" height="12" rx="6" fill="${C.lav}"/><rect x="1046" y="266" width="110" height="12" rx="6" fill="${C.mint}"/><rect x="1046" y="288" width="134" height="12" rx="6" fill="${C.pink}"/><circle cx="1125" cy="160" r="7" fill="${C.coral}" ${o(2.2)}/></g>
     <g transform="translate(1320 200)"><circle r="46" fill="#fff" ${O}/><circle r="38" fill="${C.cream}"/><path class="hand" d="M0 0v-26" ${o(5)}/><path d="M0 0l18 10" ${o(5)}/><circle r="4" fill="${C.coral}"/></g>
     <!-- floor -->
     <g class="par p2"><path d="M-40 640h1680v300h-1680z" fill="url(#rmFloor)"/><path d="M-40 640h1680" ${O}/>
      ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path d="M${100 + i * 200} 640l${-60 + i * 16} 260" stroke="#63c4ae" stroke-width="3" opacity=".7"/>`).join('')}
      <ellipse cx="800" cy="770" rx="330" ry="78" fill="${C.pink}" ${O}/><ellipse cx="800" cy="770" rx="280" ry="58" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="4 16" stroke-linecap="round"/></g>
     <!-- power console (left) -->
     <g class="hs" data-hs="power"><rect x="70" y="390" width="170" height="290" rx="22" fill="${C.lav}" ${O}/><rect x="96" y="420" width="118" height="150" rx="14" fill="#fff" ${O}/><rect x="136" y="406" width="38" height="16" rx="6" fill="${C.ink}"/>
      <rect x="106" y="${430 + 130 * (1 - batt / 100)}" width="98" height="${130 * batt / 100}" rx="8" fill="${bcol}" class="${batt < 30 ? 'lowbat' : ''}"/><path d="M160 458l-22 36h18l-10 30l30-42h-18l10-24z" fill="${C.sun}" ${o(2.6)}/>
      <rect x="96" y="590" width="50" height="30" rx="8" fill="${C.deep}" ${o(2.6)}/><path d="M112 590v30M129 590v30" stroke="#9fd0ff" stroke-width="2"/><circle class="led" cx="176" cy="604" r="9" fill="${bcol}" ${o(2.4)}/><circle cx="202" cy="604" r="9" fill="${C.cream}" ${o(2.4)}/><rect x="90" y="640" width="130" height="14" rx="7" fill="#9c88ea"/></g>
     <!-- workbench -->
     <g class="hs" data-hs="bench"><rect x="290" y="610" width="300" height="26" rx="10" fill="#e9b98a" ${O}/><path d="M310 636v120M570 636v120" stroke="${C.ink}" stroke-width="12" stroke-linecap="round"/><path d="M310 720h260" ${O}/>
      <rect x="306" y="560" width="96" height="50" rx="6" fill="#e6f1ff" ${o(2.6)} transform="rotate(-5 354 585)"/><path d="M318 596l20-22l16 12l22-26" fill="none" stroke="${C.deep}" stroke-width="3" transform="rotate(-5 354 585)"/>
      <g class="${orbit ? 'ghost' : 'bobs'}">${sat(480, 560, .62, -8)}</g><path d="M480 590v20" ${O}/><path d="M556 598l22-22" stroke="${C.ink}" stroke-width="9" stroke-linecap="round"/><circle cx="582" cy="572" r="10" fill="none" ${o(5)}/></g>
     <!-- Earth hologram (centre) -->
     <g class="hs" data-hs="holo"><ellipse cx="800" cy="640" rx="120" ry="26" fill="${C.ink}" opacity=".18"/><path d="M720 560h160l20 76h-200z" fill="${C.cream}" ${O}/><rect x="706" y="630" width="188" height="22" rx="10" fill="${C.sky}" ${O}/><ellipse cx="800" cy="560" rx="80" ry="14" fill="${C.sky}" ${O}/>
      <path class="holo-beam" d="M740 556l-30-150h180l-30 150z" fill="${C.sky}" opacity=".25"/><g class="bobs"><circle cx="800" cy="440" r="74" fill="#8fd9ff" opacity=".55" stroke="#fff" stroke-width="4" stroke-dasharray="6 10"/><path d="M752 420q20-26 50-14q18 6 16 26q-12 6-8 20q-22 14-40 0q-22-8-18-32z" fill="${C.mint}" opacity=".8"/>${holo}</g></g>
     <!-- launch console -->
     <g class="hs" data-hs="launch"><path d="M1010 600h280l24 150h-328z" fill="${C.sky}" ${O}/><path d="M1002 590h296l10 22h-316z" fill="${C.cream}" ${O}/><rect x="1040" y="634" width="220" height="80" rx="14" fill="#2d3a86" ${o(2.6)}/>
      ${[0, 1, 2, 3, 4].map(i => `<circle class="led" style="animation-delay:${i * .3}s" cx="${1066 + i * 22}" cy="660" r="6" fill="${[C.mint, C.sun, C.pink, C.mint, C.sky][i]}"/>`).join('')}<rect x="1060" y="682" width="100" height="14" rx="7" fill="${C.mint}"/>
      <ellipse cx="1216" cy="586" rx="38" ry="12" fill="${C.ink}"/><path class="btn-red" d="M1184 580q0-30 32-30t32 30z" fill="${C.coral}" ${O}/>
      <g transform="translate(1082 520)"><path d="M-14 68v-74q14-34 28 0v74z" fill="#fff" ${O}/><path d="M-14 36l-16 32h16zM14 36l16 32h-16z" fill="${C.coral}" ${O}/><circle cy="14" r="7" fill="${C.sky}" ${o(2.2)}/></g></g>
     <!-- data storage cabinet -->
     <g class="hs" data-hs="data"><rect x="1330" y="330" width="130" height="330" rx="16" fill="${C.mint}" ${O}/>
      ${[0, 1, 2, 3].map(r => `<rect x="1346" y="${350 + r * 74}" width="98" height="60" rx="10" fill="#fff" ${o(2.6)}/>${[0, 1, 2].map(c => { const i = (3 - r) * 3 + c; return `<rect x="${1356 + c * 28}" y="${362 + r * 74}" width="20" height="36" rx="5" fill="${i < nLed ? (stor > 85 ? C.coral : stor > 60 ? C.sun : C.sky) : '#e7e2f2'}" class="${i < nLed ? 'led' : ''}" style="animation-delay:${i * .12}s"/>`; }).join('')}`).join('')}<rect x="1350" y="646" width="90" height="8" rx="4" fill="${C.teal}"/></g>
     <!-- comms dish -->
     <g class="hs" data-hs="comms">${dish(1520, 560, 1.15)}${waves(1500, 500, -130, 'ping')}<rect x="1470" y="668" width="110" height="20" rx="8" fill="#9c88ea" ${O}/></g>
     <!-- cosy bits -->
     <g transform="translate(1180 800)"><path d="M-70 40q-10-80 70-80t70 80z" fill="${C.sun}" ${O}/><path d="M-40 4q40-20 80 0" fill="none" ${o(2.6)}/></g>
     <g transform="translate(250 808)"><rect x="-34" y="0" width="68" height="50" rx="10" fill="${C.coral}" ${O}/><path class="sway" d="M0 0q-30-40-14-80q18 30 14 80zM0 0q30-30 44-70q0 44-44 70zM0 0q-40-14-60-50q36 6 60 50z" fill="${C.leaf}" ${O}/></g>
    </svg>`; }

  window.EchoArt = { C, echo, director, scene: (id, m) => (SC[id] || SC.earth)(m || 'storm'), room, sat, earth };
})();

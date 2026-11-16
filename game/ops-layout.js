/* ops-layout.js — responsive sizing for all three missions' gameplay (ops) screens.
 * .ops/.view/.side/.dash are markup shared by Storm, Wildfire and Flood's gameplay
 * screens, so these rules apply to all three directly (this task explicitly asks
 * for consistency across all three missions, unlike the earlier Storm-only pass).
 * No coordinate math, overlay positions, or engine/scoring logic changed: scanbox,
 * satOverlay, hotspot and region/zone markers are already positioned in percent, so
 * a wider/taller .view does not distort them.
 */
'use strict';
document.head.insertAdjacentHTML('beforeend', `<style>
.ops{max-width:none;width:96vw;margin:0 auto;grid-template-columns:minmax(0,1fr) clamp(300px,27%,440px);gap:clamp(16px,2vw,24px);padding:20px clamp(16px,2vw,32px) 28px}
.ops .view{height:clamp(360px,54vh,640px)}
.ops .side{gap:16px}
.ops .dash{padding:18px 20px}
.gl-sum h4{font-size:18px}
.gl-sum .n{font-size:14px}
.gl-list li{font-size:14.5px;line-height:1.5}
.gl-dot{width:20px;height:20px}
.ops .decision{padding:clamp(20px,2.4vw,30px)}
.ops .dhead .ic{width:44px;height:44px}
.ops .dfoot{gap:16px}
.ops .res-grid{gap:16px;margin:16px 0 20px}
.ops .res{font-size:clamp(15px,1.1vw,16px);line-height:1.6;padding:16px 18px}
.ops .res h4{font-size:18px;margin-bottom:7px}
.ops .lesson{font-size:14.5px}
.ops .chip{font-size:13.5px;height:26px;padding:0 12px}
.ops .note{font-size:13px}
@media(max-width:1060px){.ops{grid-template-columns:1fr;width:94vw}.ops .view{height:clamp(320px,48vh,480px)}}
</style>`);

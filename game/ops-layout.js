/* ops-layout.js — responsive sizing for the Storm Watch gameplay screen only.
 * .ops/.decision/.opt/.res/.dfoot/.dash/.view are markup shared with Wildfire and
 * Flood's gameplay screens (fops/lops use the exact same classes), so none of their
 * base rules are edited here. Instead V.ops (index.html) is wrapped to add a
 * "storm-ops" class to Storm's own .ops container, and every rule below is scoped
 * under .storm-ops — Fire/Flood gameplay is completely untouched.
 * No coordinate math, overlay positions, or engine/scoring logic changed: scanbox,
 * satOverlay and hotspot markers are already positioned in percent, so a taller
 * .view does not distort them.
 */
'use strict';
document.head.insertAdjacentHTML('beforeend', `<style>
.storm-ops{max-width:none;width:96vw;margin:0 auto;grid-template-columns:minmax(0,1fr) clamp(300px,27%,440px);gap:clamp(16px,2vw,24px);padding:20px clamp(16px,2vw,32px) 28px}
.storm-ops .view{height:clamp(360px,54vh,640px)}
.storm-ops .side{gap:16px}
.storm-ops .dash{padding:18px 20px}
.storm-ops .dash h4{font-size:18px;margin-bottom:9px}
.storm-ops .kv{font-size:14px;padding:6px 0}
.storm-ops .d{font-size:13px}
.storm-ops .meter .row{font-size:13.5px;margin-bottom:7px}
.storm-ops .gl-sum h4{font-size:18px}
.storm-ops .gl-sum .n{font-size:14px}
.storm-ops .gl-list li{font-size:14.5px;line-height:1.5}
.storm-ops .gl-dot{width:20px;height:20px}
.storm-ops .decision{padding:clamp(20px,2.4vw,30px)}
.storm-ops .dhead .ic{width:44px;height:44px}
.storm-ops .dhead h3{font-size:clamp(24px,2.4vw,30px)}
.storm-ops .dhead p{font-size:clamp(15px,1.3vw,17px)}
.storm-ops .og .lab{font-size:14px;margin-bottom:10px}
.storm-ops .opt{padding:14px 16px;margin-bottom:10px}
.storm-ops .opt b{font-size:clamp(15px,1.2vw,17px)}
.storm-ops .opt span{font-size:14px}
.storm-ops .dfoot{gap:16px}
.storm-ops .pred{font-size:14.5px;padding:13px 16px}
.storm-ops .btn{font-size:clamp(15px,1.1vw,17px);height:50px;padding:0 26px}
.storm-ops .res-grid{gap:16px;margin:16px 0 20px}
.storm-ops .res{font-size:clamp(15px,1.1vw,16px);line-height:1.6;padding:16px 18px}
.storm-ops .res h4{font-size:18px;margin-bottom:7px}
.storm-ops .lesson{font-size:14.5px}
.storm-ops .chip{font-size:13.5px;height:26px;padding:0 12px}
.storm-ops .note{font-size:13px}
@media(max-width:1060px){.storm-ops{grid-template-columns:1fr;width:94vw}.storm-ops .view{height:clamp(320px,48vh,480px)}}
</style>`);
const _opsLayout_V_ops = V.ops;
V.ops = function () { return _opsLayout_V_ops().replace('<div class="ops">', '<div class="ops storm-ops">'); };

/* ==========================================================================
   EMTR — engine bootstrap.
   Demoted from hero to a fixed-angle diagnostic schematic. The heavy three.js
   core (~600KB) is only imported AFTER the gates pass, so it never downloads on
   mobile / reduced-motion / data-saver devices.
   ========================================================================== */

const canvas = document.getElementById("engine-canvas");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const saveData = !!(navigator.connection && navigator.connection.saveData);
const tooNarrow = window.innerWidth < 768;

if (canvas && !reduced && !saveData && !tooNarrow) {
  import("./engine-core.js?v=20")
    .then((m) => m.boot(canvas))
    .catch((e) => { console.warn("engine-core failed to load", e); });
}

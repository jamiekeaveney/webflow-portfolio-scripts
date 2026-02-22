// src/features/loader.js
//
// Counter loader: 0% → 24% → 72% → 100%
// Anchored bottom-right → rises to top-right with progress.
// Digit reels scroll vertically (slot-machine style).
// Everything driven by a single proxy value — reels + Y travel can never desync.

const DIGITS = {
  h: ["", "", "", "1"],
  t: ["", "2", "7", "0"],
  o: ["0", "4", "2", "0"],
  p: ["%", "%", "%", "%"],
};

const COLS = ["h", "t", "o", "p"];
const STEPS = [0, 0.24, 0.72, 1]; // vertical progress at each counter step

// ── DOM ──

function query() {
  const w = document.querySelector('[data-loader="wrap"]');
  if (!w) return null;
  const $ = (s) => w.querySelector(s);
  return {
    wrap: w,
    panel: $(".loader-panel"),
    brand: $(".loader-brand"),
    anchor: $("[data-loader-counter-anchor]"),
    main: $("[data-loader-counter-main]"),
    rails: Object.fromEntries(COLS.map((c) => [c, $(`[data-col="${c}"]`)])),
  };
}

// ── Build reel cells ──

function populate(e) {
  COLS.forEach((key) => {
    const rail = e.rails[key];
    if (!rail) return;
    rail.innerHTML = "";
    DIGITS[key].forEach((ch) => {
      const d = document.createElement("div");
      d.className = "loader-cell" + (ch ? "" : " loader-cell-blank");
      d.textContent = ch || "0";
      rail.appendChild(d);
    });
  });
}

// ── Measure glyphs → size windows to exact px ──

function measure(e) {
  if (!e.main) return;
  e.main.querySelectorAll(".loader-win").forEach((win) => {
    const rail = win.querySelector(".loader-rail");
    if (!rail) return;
    const cells = rail.children;
    if (!cells.length) return;

    // Reset
    win.style.width = win.style.height = "";
    rail.style.width = "";
    for (const c of cells) { c.style.height = ""; c.style.padding = ""; }

    let mw = 0, mh = 0;
    for (const c of cells) {
      const r = c.getBoundingClientRect();
      if (r.width > mw) mw = r.width;
      if (r.height > mh) mh = r.height;
    }

    const w = Math.ceil(mw);
    const h = Math.ceil(mh);

    win.style.width = w + "px";
    win.style.height = h + "px";
    rail.style.width = w + "px";
    for (const c of cells) c.style.height = h + "px";
  });
}

// ── Helpers ──

function cellH(rail) {
  const c = rail?.querySelector(".loader-cell");
  return c ? c.getBoundingClientRect().height : 0;
}

function getTravel(e) {
  const pad = parseFloat(getComputedStyle(e.panel).paddingTop) || 40;
  const ah = e.anchor?.getBoundingClientRect().height || 0;
  return Math.max(0, innerHeight - pad * 2 - ah);
}

// Snap all rails + anchor to a final integer step (no fractional drift)
function snapTo(e, stepIdx, dist) {
  COLS.forEach((k) => {
    const rail = e.rails[k];
    if (rail) rail.style.transform = `translate3d(0,${-stepIdx * cellH(rail)}px,0)`;
  });
  const p = STEPS[Math.min(stepIdx, 3)];
  e.anchor.style.transform = `translate3d(0,${-dist * p}px,0)`;
}

// ── Public API ──

export function loaderShow() {
  const e = query();
  if (!e) return Promise.resolve();
  const g = window.gsap;

  populate(e);

  if (!g) {
    e.wrap.style.cssText = "display:block;pointer-events:auto;opacity:1";
    measure(e);
    snapTo(e, 0, getTravel(e));
    return Promise.resolve();
  }

  g.killTweensOf([e.wrap, e.brand, e.anchor, ...Object.values(e.rails)]);
  g.set(e.wrap, { display: "block", pointerEvents: "auto", autoAlpha: 1 });
  g.set(e.brand, { autoAlpha: 0 });
  g.set(e.anchor, { autoAlpha: 0, y: 0 });

  measure(e);
  COLS.forEach((k) => { if (e.rails[k]) g.set(e.rails[k], { y: 0 }); });

  return Promise.resolve();
}

export function loaderHide() {
  const e = query();
  if (!e) return Promise.resolve();
  const g = window.gsap;
  if (!g) {
    e.wrap.style.cssText = "display:none;pointer-events:none;opacity:0";
    return Promise.resolve();
  }
  g.set(e.wrap, { display: "none", pointerEvents: "none", autoAlpha: 0 });
  g.set([e.brand, e.anchor, ...Object.values(e.rails)], { clearProps: "all" });
  return Promise.resolve();
}

/**
 * Single unified timeline.
 *
 * One proxy float (0→3) drives EVERYTHING:
 *   - Each column's reel position (with per-column stagger lag for the roll feel)
 *   - The anchor's vertical Y travel (via STEPS[] interpolation)
 *
 * Because both derive from the same value, they can never fall out of sync.
 */
export function loaderProgressTo(duration = 3.0) {
  const e = query();
  if (!e || !window.gsap) {
    if (e) snapTo(e, 3, getTravel(e));
    return Promise.resolve();
  }

  measure(e);

  const g = window.gsap;
  const tl = g.timeline();
  const dist = getTravel(e);

  // Column stagger offsets (step units) — creates the rolling feel
  const LAG = [0, 0.08, 0.16, 0.24];

  const proxy = { s: 0 };

  function apply() {
    const s = proxy.s;
    const idx = Math.min(Math.floor(s), 2); // 0, 1, or 2
    const frac = s - Math.floor(s);

    // Reels — each column lags behind the proxy slightly
    COLS.forEach((k, i) => {
      const rail = e.rails[k];
      if (!rail) return;
      const h = cellH(rail);
      const col = Math.max(0, Math.min(3, s - LAG[i]));
      rail.style.transform = `translate3d(0,${-col * h}px,0)`;
    });

    // Vertical travel — interpolate between STEPS
    const lo = STEPS[idx];
    const hi = STEPS[Math.min(idx + 1, 3)];
    const p = lo + (hi - lo) * Math.min(frac, 1);
    e.anchor.style.transform = `translate3d(0,${-dist * p}px,0)`;
  }

  // ── Intro fade (brand = pure opacity, no slide)
  tl.to(e.brand, { autoAlpha: 1, duration: 0.4, ease: "power2.out" }, 0);
  tl.to(e.anchor, { autoAlpha: 1, duration: 0.35, ease: "power2.out" }, 0.06);

  // ── Hold on 0%
  tl.to({}, { duration: 0.35 });

  // ── Count: 0→1→2→3
  const ease = "expo.inOut";

  tl.to(proxy, { s: 1, duration: duration * 0.30, ease, onUpdate: apply });
  tl.to(proxy, { s: 2, duration: duration * 0.38, ease, onUpdate: apply });
  tl.to(proxy, { s: 3, duration: duration * 0.32, ease, onUpdate: apply,
    onComplete: () => snapTo(e, 3, dist),
  });

  // ── 100% settle: staggered lift then settle
  tl.addLabel("settle");

  // Clear gsap transforms so we can do the settle relative to final snap positions
  tl.call(() => {
    COLS.forEach((k) => {
      const rail = e.rails[k];
      if (!rail) return;
      // Store current visual Y as the "base" for the settle bounce
      const base = -3 * cellH(rail);
      g.set(rail, { y: base });
    });
  });

  COLS.forEach((k, i) => {
    const rail = e.rails[k];
    if (!rail) return;
    tl.to(rail, { y: `-=3`, duration: 0.14, ease: "power2.out" }, `settle+=${i * 0.035}`);
  });

  tl.to(Object.values(e.rails).filter(Boolean), {
    y: (_, target) => -3 * cellH(target),
    duration: 0.16,
    ease: "power2.inOut",
  }, ">");

  // ── Final hold
  tl.to({}, { duration: 0.2 });

  return tl.then(() => {});
}

export function loaderOutro({ onRevealStart } = {}) {
  const e = query();
  if (!e || !window.gsap) return Promise.resolve();
  const tl = window.gsap.timeline();
  tl.call(() => { if (typeof onRevealStart === "function") onRevealStart(); }, [], 0.05);
  tl.to(e.wrap, { autoAlpha: 0, duration: 0.5, ease: "power1.out" }, 0);
  return tl.then(() => {});
}

export async function runLoader(duration = 3.0, _container = document, opts = {}) {
  await loaderShow();
  await loaderProgressTo(duration);
  await loaderOutro(opts);
  await loaderHide();
}

// ── Resize ──
let _raf = null;
addEventListener("resize", () => {
  const e = query();
  if (!e?.wrap || e.wrap.style.display === "none") return;
  if (_raf) cancelAnimationFrame(_raf);
  _raf = requestAnimationFrame(() => measure(e));
});
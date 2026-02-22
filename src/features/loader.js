// src/features/loader.js
//
// Counter loader  0% → 24% → 72% → 100%
// Bottom-right → top-right vertical travel synced with digit reels.
// 100% exit staggers columns upward (matching site letter-reveal language).

const DIGITS = {
  h: ["", "", "", "1"],
  t: ["", "2", "7", "0"],
  o: ["0", "4", "2", "0"],
  p: ["%", "%", "%", "%"],
};
const KEYS = ["h", "t", "o", "p"];
const STOPS = [0, 0.24, 0.72, 1]; // vertical progress per step

// ── DOM ────────────────────────────────────────────────

function dom() {
  const w = document.querySelector('[data-loader="wrap"]');
  if (!w) return null;
  const $ = (s) => w.querySelector(s);
  return {
    wrap: w,
    panel: $(".loader-panel"),
    brand: $(".loader-brand"),
    anchor: $("[data-loader-counter-anchor]"),
    main: $("[data-loader-counter-main]"),
    rail: Object.fromEntries(KEYS.map((k) => [k, $(`[data-col="${k}"]`)])),
  };
}

// ── Reel builder ──────────────────────────────────────

function buildReels(e) {
  KEYS.forEach((k) => {
    const r = e.rail[k];
    if (!r) return;
    r.innerHTML = DIGITS[k]
      .map((ch) =>
        ch
          ? `<div class="loader-cell">${ch}</div>`
          : `<div class="loader-cell loader-cell-blank">0</div>`
      )
      .join("");
  });
}

// ── Measure glyphs → size windows (px, not em) ───────

function size(e) {
  if (!e.main) return;
  e.main.querySelectorAll(".loader-win").forEach((win) => {
    const rail = win.querySelector(".loader-rail");
    if (!rail) return;
    const cells = [...rail.children];
    if (!cells.length) return;

    // Reset for clean measurement
    Object.assign(win.style, { width: "", height: "" });
    rail.style.width = "";
    cells.forEach((c) => Object.assign(c.style, { height: "", padding: "" }));

    let mw = 0, mh = 0;
    cells.forEach((c) => {
      const b = c.getBoundingClientRect();
      if (b.width > mw) mw = b.width;
      if (b.height > mh) mh = b.height;
    });

    const w = Math.ceil(mw), h = Math.ceil(mh);
    win.style.width = w + "px";
    win.style.height = h + "px";
    rail.style.width = w + "px";
    cells.forEach((c) => (c.style.height = h + "px"));
  });
}

// ── Helpers ───────────────────────────────────────────

function ch(rail) {
  const c = rail?.firstElementChild;
  return c ? c.getBoundingClientRect().height : 0;
}

function yTravel(e) {
  const pad = parseFloat(getComputedStyle(e.panel).paddingTop) || 40;
  return Math.max(0, innerHeight - pad * 2 - (e.anchor?.offsetHeight || 0));
}

function parkReels(e, step) {
  KEYS.forEach((k) => {
    const r = e.rail[k];
    if (r) r.style.transform = `translate3d(0,${-step * ch(r)}px,0)`;
  });
}

function setAnchorY(e, progress, dist) {
  const y = -dist * progress;
  e.anchor.style.transform = `translate3d(0,${y}px,0)`;
}

// ── Public ────────────────────────────────────────────

export function loaderShow() {
  const e = dom();
  if (!e) return Promise.resolve();

  buildReels(e);

  const g = window.gsap;
  if (!g) {
    e.wrap.style.cssText = "display:block;pointer-events:auto;opacity:1";
    size(e);
    parkReels(e, 0);
    setAnchorY(e, 0, yTravel(e));
    return Promise.resolve();
  }

  g.killTweensOf([e.wrap, e.brand, e.anchor, ...Object.values(e.rail)]);
  g.set(e.wrap, { display: "block", pointerEvents: "auto", autoAlpha: 1 });
  g.set(e.brand, { autoAlpha: 0 });
  g.set(e.anchor, { autoAlpha: 0 });

  size(e);
  parkReels(e, 0);
  g.set(e.anchor, { y: 0 });
  KEYS.forEach((k) => e.rail[k] && g.set(e.rail[k], { y: 0 }));

  return Promise.resolve();
}

export function loaderHide() {
  const e = dom();
  if (!e) return Promise.resolve();
  const g = window.gsap;
  if (!g) {
    e.wrap.style.cssText = "display:none;pointer-events:none;opacity:0";
    return Promise.resolve();
  }
  g.set(e.wrap, { display: "none", pointerEvents: "none", autoAlpha: 0 });
  g.set([e.brand, e.anchor, ...Object.values(e.rail)], { clearProps: "all" });
  return Promise.resolve();
}

/**
 * Full loader timeline.
 *
 * Architecture:
 *   - Y travel is ONE smooth tween per step (anchor moves).
 *   - Reel columns scroll via staggered .to() calls (0.09s apart)
 *     but share the SAME ease + similar duration so they land together.
 *   - The whole thing is one GSAP timeline — nothing can desync.
 *   - 100% exit: columns stagger upward by yPercent:120 (matching site reveals).
 */
export function loaderProgressTo(duration = 4.0) {
  const e = dom();
  if (!e || !window.gsap) {
    if (e) { parkReels(e, 3); setAnchorY(e, 1, yTravel(e)); }
    return Promise.resolve();
  }

  size(e);

  const g = window.gsap;
  const tl = g.timeline();
  const dist = yTravel(e);
  const ease = "expo.inOut";
  const stagger = 0.09; // matches your letter-reveal stagger
  const railDur = 1.2;  // each reel scroll duration

  // Helper: scroll all 4 reels to step index, staggered
  function reelTo(step, at) {
    KEYS.forEach((k, i) => {
      const r = e.rail[k];
      if (!r) return;
      tl.to(r, {
        y: -step * ch(r),
        duration: railDur,
        ease,
        overwrite: true,
      }, at + i * stagger);
    });
  }

  // ── Intro: fade in brand + counter
  tl.to(e.brand, { autoAlpha: 1, duration: 0.4, ease: "power2.out" }, 0);
  tl.to(e.anchor, { autoAlpha: 1, duration: 0.35, ease: "power2.out" }, 0.06);

  // ── Hold 0%
  tl.to({}, { duration: 0.35 });
  tl.addLabel("go");

  // ── Step 1: 0% → 24%
  const d1 = duration * 0.30;
  tl.to(e.anchor, { y: -dist * STOPS[1], duration: d1, ease }, "go");
  reelTo(1, tl.recent().startTime());

  // ── Step 2: 24% → 72%
  const d2 = duration * 0.38;
  tl.to(e.anchor, { y: -dist * STOPS[2], duration: d2, ease }, ">");
  reelTo(2, tl.recent().startTime());

  // ── Step 3: 72% → 100%
  const d3 = duration * 0.32;
  tl.to(e.anchor, { y: -dist * STOPS[3], duration: d3, ease }, ">");
  reelTo(3, tl.recent().startTime());

  // ── Hold at 100%
  tl.to({}, { duration: 0.3 });

  // ── 100% exit: stagger columns upward (like your letter reveals)
  tl.addLabel("exit");
  KEYS.forEach((k, i) => {
    const r = e.rail[k];
    if (!r) return;
    // Get the window (parent) that clips this rail
    const win = r.closest(".loader-win");
    if (!win) return;
    tl.to(win, {
      yPercent: -120,
      duration: 0.75,
      ease: "expo.out",
      overwrite: true,
    }, `exit+=${i * stagger}`);
  });

  tl.to({}, { duration: 0.1 });

  return tl.then(() => {});
}

export function loaderOutro({ onRevealStart } = {}) {
  const e = dom();
  if (!e || !window.gsap) return Promise.resolve();
  const tl = window.gsap.timeline();
  tl.call(() => { if (typeof onRevealStart === "function") onRevealStart(); }, [], 0.05);
  tl.to(e.wrap, { autoAlpha: 0, duration: 0.5, ease: "power1.out" }, 0);
  return tl.then(() => {});
}

export async function runLoader(duration = 4.0, _container = document, opts = {}) {
  await loaderShow();
  await loaderProgressTo(duration);
  await loaderOutro(opts);
  await loaderHide();
}

// ── Resize ──
let _raf = null;
addEventListener("resize", () => {
  const e = dom();
  if (!e?.wrap || e.wrap.style.display === "none") return;
  if (_raf) cancelAnimationFrame(_raf);
  _raf = requestAnimationFrame(() => size(e));
});
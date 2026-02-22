// src/features/loader.js
// ─── Loader counter animation (0 → 24 → 72 → 100%) ───
// Counter starts bottom-right, travels up to top-right as progress increases.
// Reel columns scroll vertically through digit cells (slot-machine style).

/* ── DOM ── */

function getEls() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;
  const q = (s) => wrap.querySelector(s);
  return {
    wrap,
    panel:  q(".loader-panel"),
    brand:  q(".loader-brand"),
    anchor: q("[data-loader-counter-anchor]"),
    main:   q("[data-loader-counter-main]"),
    colH:   q('[data-col="h"]'),
    colT:   q('[data-col="t"]'),
    colO:   q('[data-col="o"]'),
    colP:   q('[data-col="p"]'),
  };
}

/* ── Constants ── */

const REELS = {
  h: ["", "", "", "1"],
  t: ["", "2", "7", "0"],
  o: ["0", "4", "2", "0"],
  p: ["%", "%", "%", "%"],
};

const EASE = "expo.inOut";
const EASE_SOFT = "power2.out";

/* ── Reel building ── */

function buildRail(rail, chars) {
  if (!rail) return;
  rail.innerHTML = "";
  chars.forEach((ch) => {
    const cell = document.createElement("div");
    cell.className = "loader-col-cell";
    if (!ch) {
      cell.classList.add("loader-col-cell-empty");
      cell.textContent = "0"; // invisible but preserves metrics
      cell.setAttribute("aria-hidden", "true");
    } else {
      cell.textContent = ch;
    }
    rail.appendChild(cell);
  });
}

function buildReels(els) {
  Object.entries(REELS).forEach(([key, chars]) => {
    const col = key === "h" ? els.colH : key === "t" ? els.colT : key === "o" ? els.colO : els.colP;
    buildRail(col, chars);
  });
}

/* ── Dynamic sizing ──
   Measures actual rendered glyphs and sizes each window/cell to fit.
   Eliminates all fixed em guesses — fully font-aware. */

function sizeWindows(els) {
  if (!els?.main) return;

  els.main.querySelectorAll(".loader-col-window").forEach((win) => {
    const rail = win.querySelector(".loader-col-rail");
    if (!rail) return;

    const cells = Array.from(rail.querySelectorAll(".loader-col-cell"));
    if (!cells.length) return;

    // Reset so measurements are clean
    win.style.width = "";
    win.style.height = "";
    rail.style.width = "";
    cells.forEach((c) => { c.style.height = ""; c.style.padding = ""; });

    // Find widest + tallest glyph
    let maxW = 0, maxH = 0;
    cells.forEach((c) => {
      const r = c.getBoundingClientRect();
      if (r.width > maxW) maxW = r.width;
      if (r.height > maxH) maxH = r.height;
    });

    // Tiny breathing room for anti-aliasing
    const px = Math.ceil(maxH * 0.05);
    const py = Math.ceil(maxH * 0.08);
    const w = Math.ceil(maxW + px * 2);
    const h = Math.ceil(maxH + py * 2);

    win.style.width = `${w}px`;
    win.style.height = `${h}px`;
    rail.style.width = `${w}px`;

    cells.forEach((c) => {
      c.style.height = `${h}px`;
      c.style.paddingLeft = `${px}px`;
      c.style.paddingRight = `${px}px`;
    });
  });
}

/* ── Rail animation helpers ── */

function stepH(rail) {
  const cell = rail?.querySelector(".loader-col-cell");
  return cell ? cell.getBoundingClientRect().height : 0;
}

function setRail(rail, idx) {
  if (!rail) return;
  rail.style.transform = `translate3d(0,${-idx * stepH(rail)}px,0)`;
}

function animRail(rail, idx, delay = 0, dur = 0.95) {
  if (!rail || !window.gsap) return setRail(rail, idx);
  window.gsap.to(rail, {
    y: -idx * stepH(rail),
    duration: dur,
    delay,
    ease: EASE,
    overwrite: true,
  });
}

function setStep(els, i, opts = {}) {
  const { delay = 0, stagger = 0.045, dur = 0.95 } = opts;
  [els.colH, els.colT, els.colO, els.colP].forEach((col, n) => {
    animRail(col, i, delay + stagger * n, dur);
  });
}

function setStepImmediate(els, i) {
  [els.colH, els.colT, els.colO, els.colP].forEach((col) => setRail(col, i));
  if (window.gsap) {
    window.gsap.set([els.colH, els.colT, els.colO, els.colP], { clearProps: "y" });
  }
}

/* ── Vertical travel (anchor moves from bottom → top) ── */

function setYProgress(els, p) {
  if (!els?.anchor || !els?.panel) return;
  const pad = parseFloat(getComputedStyle(els.panel).paddingTop) || 40;
  const travel = Math.max(0, innerHeight - pad * 2 - (els.anchor.getBoundingClientRect().height || 0));
  const y = -travel * p;
  if (window.gsap) window.gsap.set(els.anchor, { y });
  else els.anchor.style.transform = `translate3d(0,${y}px,0)`;
}

/* ── Public API ── */

export function loaderShow() {
  const els = getEls();
  if (!els) return Promise.resolve();

  buildReels(els);

  if (!window.gsap) {
    Object.assign(els.wrap.style, { display: "block", pointerEvents: "auto", opacity: "1" });
    sizeWindows(els);
    setStepImmediate(els, 0);
    setYProgress(els, 0);
    if (els.brand) els.brand.style.opacity = "1";
    if (els.anchor) els.anchor.style.opacity = "1";
    return Promise.resolve();
  }

  const { gsap } = window;
  gsap.killTweensOf([els.wrap, els.brand, els.anchor, els.colH, els.colT, els.colO, els.colP]);
  gsap.set(els.wrap, { display: "block", pointerEvents: "auto", autoAlpha: 1 });
  gsap.set(els.brand, { autoAlpha: 0, y: 8 });
  gsap.set(els.anchor, { autoAlpha: 0, y: 0 });

  sizeWindows(els);
  setStepImmediate(els, 0);
  setYProgress(els, 0);

  return Promise.resolve();
}

export function loaderHide() {
  const els = getEls();
  if (!els) return Promise.resolve();

  if (!window.gsap) {
    Object.assign(els.wrap.style, { display: "none", pointerEvents: "none", opacity: "0" });
    return Promise.resolve();
  }

  window.gsap.set(els.wrap, { display: "none", pointerEvents: "none", autoAlpha: 0 });
  window.gsap.set([els.brand, els.anchor, els.colH, els.colT, els.colO, els.colP], {
    clearProps: "transform,y,opacity",
  });

  return Promise.resolve();
}

/**
 * Main progress timeline.
 * Sequence: intro fade → hold 0% → 0→24 → 24→72 → 72→100 → settle stagger → hold
 */
export function loaderProgressTo(duration = 3.0) {
  const els = getEls();
  if (!els) return Promise.resolve();

  if (!window.gsap) {
    setStepImmediate(els, 3);
    setYProgress(els, 1);
    return Promise.resolve();
  }

  sizeWindows(els);

  const { gsap } = window;
  const state = { p: 0 };
  const tl = gsap.timeline();

  // ── Intro fade
  tl.to(els.brand, { autoAlpha: 1, y: 0, duration: 0.45, ease: EASE_SOFT }, 0);
  tl.to(els.anchor, { autoAlpha: 1, duration: 0.4, ease: EASE_SOFT }, 0.08);

  // ── Hold on 0%
  tl.to({}, { duration: 0.6 });

  // ── 0 → 24
  tl.to(state, {
    p: 0.24,
    duration: duration * 0.30,
    ease: EASE,
    onStart: () => setStep(els, 1),
    onUpdate: () => setYProgress(els, state.p),
  });

  // Breathing pause
  tl.to({}, { duration: 0.1 });

  // ── 24 → 72
  tl.to(state, {
    p: 0.72,
    duration: duration * 0.40,
    ease: EASE,
    onStart: () => setStep(els, 2),
    onUpdate: () => setYProgress(els, state.p),
  });

  tl.to({}, { duration: 0.1 });

  // ── 72 → 100
  tl.to(state, {
    p: 1,
    duration: duration * 0.30,
    ease: EASE,
    onStart: () => setStep(els, 3, { dur: 1.0, stagger: 0.05 }),
    onUpdate: () => setYProgress(els, state.p),
    onComplete: () => setYProgress(els, 1),
  });

  // ── 100% settle stagger (micro lift + drop)
  const cols = [els.colH, els.colT, els.colO, els.colP];
  cols.forEach((col, i) => {
    tl.to(col, { y: "-=2", duration: 0.18, ease: EASE_SOFT }, `>-0.04+${i * 0.03}`);
  });
  tl.to(cols, { y: 0, duration: 0.2, ease: "power2.inOut" }, ">");

  // ── Hold finished state
  tl.to({}, { duration: 0.25 });

  return tl.then(() => {});
}

/**
 * Fade out the loader overlay.
 * onRevealStart fires just before fade so page content can start animating underneath.
 */
export function loaderOutro({ onRevealStart } = {}) {
  const els = getEls();
  if (!els || !window.gsap) return Promise.resolve();

  const tl = window.gsap.timeline();
  tl.call(() => { if (typeof onRevealStart === "function") onRevealStart(); }, [], 0.06);
  tl.to(els.wrap, { autoAlpha: 0, duration: 0.55, ease: "power1.out" }, 0);

  return tl.then(() => {});
}

export async function runLoader(duration = 3.0, container = document, opts = {}) {
  await loaderShow();
  await loaderProgressTo(duration);
  await loaderOutro(opts);
  await loaderHide();
}

/* ── Resize safety ── */
let _raf = null;
window.addEventListener("resize", () => {
  const els = getEls();
  if (!els?.wrap || els.wrap.style.display === "none") return;

  if (_raf) cancelAnimationFrame(_raf);
  _raf = requestAnimationFrame(() => {
    sizeWindows(els);

    // Re-derive vertical progress from current anchor Y
    const y = window.gsap ? (Number(window.gsap.getProperty(els.anchor, "y")) || 0) : 0;
    const pad = parseFloat(getComputedStyle(els.panel).paddingTop) || 40;
    const travel = Math.max(0, innerHeight - pad * 2 - (els.anchor.getBoundingClientRect().height || 0));
    const p = travel > 0 ? Math.min(1, Math.max(0, -y / travel)) : 0;
    setYProgress(els, p);
  });
});
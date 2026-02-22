// src/features/loader.js

const EASE_OUT = "expo.out";
const EASE_IN_OUT = "expo.inOut";

// The visible staged values (same numbers you want)
const LOADER_VALUES = [0, 24, 72, 100];

/**
 * Reels include an extra empty row at the end so 100% can roll up and disappear.
 * h = hundreds, t = tens, o = ones, p = percent symbol
 */
const REELS = {
  h: ["", "", "", "1", ""],
  t: ["", "2", "7", "0", ""],
  o: ["0", "4", "2", "0", ""],
  p: ["%", "%", "%", "%", ""]
};

let _resizeBound = false;
let _resizeRaf = 0;

// -------------------------------------
// DOM
// -------------------------------------
function getLoaderEls() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;

  return {
    wrap,
    panel: wrap.querySelector(".loader-panel"),
    brand: wrap.querySelector(".loader-brand"),
    anchor: wrap.querySelector("[data-loader-counter-anchor]"),
    counterMain: wrap.querySelector("[data-loader-counter-main]"),
    colH: wrap.querySelector('[data-col="h"]'),
    colT: wrap.querySelector('[data-col="t"]'),
    colO: wrap.querySelector('[data-col="o"]'),
    colP: wrap.querySelector('[data-col="p"]')
  };
}

function hasGSAP() {
  return typeof window !== "undefined" && !!window.gsap;
}

// -------------------------------------
// Reel building
// -------------------------------------
function buildRail(rail, chars) {
  if (!rail) return;
  rail.innerHTML = "";

  for (let i = 0; i < chars.length; i += 1) {
    const cell = document.createElement("div");
    cell.className = "loader-col-cell";

    const value = chars[i];
    if (!value) {
      cell.classList.add("loader-col-cell-empty");
      // keep dimensions for measuring while hidden
      cell.textContent = "0";
    } else {
      cell.textContent = value;
    }

    rail.appendChild(cell);
  }
}

function buildCounterReels(els) {
  buildRail(els.colH, REELS.h);
  buildRail(els.colT, REELS.t);
  buildRail(els.colO, REELS.o);
  buildRail(els.colP, REELS.p);
}

/**
 * Measure real rendered glyphs and apply exact clipping/window widths.
 * This removes "guessing" and prevents slit clipping.
 */
function measureAndApplyCounterMetrics(els) {
  if (!els?.counterMain) return;

  const cells = [
    ...(els.colH ? Array.from(els.colH.children) : []),
    ...(els.colT ? Array.from(els.colT.children) : []),
    ...(els.colO ? Array.from(els.colO.children) : []),
    ...(els.colP ? Array.from(els.colP.children) : [])
  ];

  if (!cells.length) return;

  let maxH = 0;
  let maxDigitW = 0;
  let maxSymbolW = 0;

  for (const cell of cells) {
    const rect = cell.getBoundingClientRect();
    if (rect.height > maxH) maxH = rect.height;

    const isEmpty = cell.classList.contains("loader-col-cell-empty");
    if (isEmpty) continue;

    const text = (cell.textContent || "").trim();
    if (text === "%") {
      if (rect.width > maxSymbolW) maxSymbolW = rect.width;
    } else {
      if (rect.width > maxDigitW) maxDigitW = rect.width;
    }
  }

  // tiny buffer avoids clipping on antialias edges
  const h = Math.ceil(maxH) + 2;
  const digitW = Math.ceil(maxDigitW) + 2;
  const symbolW = Math.ceil(maxSymbolW) + 2;

  els.wrap.style.setProperty("--loader-cell-h", `${h}px`);
  els.wrap.style.setProperty("--loader-col-w", `${digitW}px`);
  els.wrap.style.setProperty("--loader-col-w-symbol", `${symbolW}px`);
}

function getCellHeight(rail) {
  const cell = rail?.querySelector(".loader-col-cell");
  if (!cell) return 0;
  return cell.getBoundingClientRect().height || 0;
}

// -------------------------------------
// Reel positions
// -------------------------------------
function setRailIndex(rail, index) {
  if (!rail) return;
  const h = getCellHeight(rail);
  if (!h) return;

  rail.style.transform = `translate3d(0, ${-index * h}px, 0)`;
}

function animateRailTo(rail, index, delay = 0, duration = 0.8, ease = EASE_IN_OUT) {
  if (!rail) return;

  const h = getCellHeight(rail);
  if (!h) return;

  if (!hasGSAP()) {
    setRailIndex(rail, index);
    return;
  }

  window.gsap.to(rail, {
    y: -index * h,
    duration,
    delay,
    ease,
    overwrite: true
  });
}

function setCounterStepImmediate(els, stepIndex) {
  setRailIndex(els.colH, stepIndex);
  setRailIndex(els.colT, stepIndex);
  setRailIndex(els.colO, stepIndex);
  setRailIndex(els.colP, stepIndex);

  if (hasGSAP()) {
    window.gsap.set([els.colH, els.colT, els.colO, els.colP], { clearProps: "y" });
  }
}

function setCounterStep(els, stepIndex, duration = 0.78) {
  // slight stagger feels more premium / like original
  animateRailTo(els.colH, stepIndex, 0.00, duration, EASE_IN_OUT);
  animateRailTo(els.colT, stepIndex, 0.03, duration, EASE_IN_OUT);
  animateRailTo(els.colO, stepIndex, 0.06, duration, EASE_IN_OUT);
  animateRailTo(els.colP, stepIndex, 0.09, duration, EASE_IN_OUT);
}

// -------------------------------------
// Vertical travel (0 bottom-right -> 100 top-right)
// -------------------------------------
function computeTravelMetrics(els) {
  const panel = els.panel || els.wrap;
  const styles = window.getComputedStyle(panel);
  const padTop = parseFloat(styles.paddingTop || "40") || 40;
  const padBottom = parseFloat(styles.paddingBottom || "40") || 40;

  // use panel height (more robust than window.innerHeight if mobile UI shifts)
  const panelRect = panel.getBoundingClientRect();
  const panelH = panelRect.height || window.innerHeight;

  const anchorH = els.anchor?.getBoundingClientRect().height || 0;
  const travel = Math.max(0, panelH - padTop - padBottom - anchorH);

  return { padTop, padBottom, panelH, anchorH, travel };
}

/**
 * p is 0..1 where:
 * 0 = bottom (start)
 * 1 = top (end)
 *
 * Anchor is absolutely positioned at bottom, so moving up means negative Y.
 */
function setCounterVerticalProgress(els, p) {
  if (!els?.anchor) return;

  const { travel } = computeTravelMetrics(els);
  const y = -travel * p;

  if (hasGSAP()) {
    window.gsap.set(els.anchor, { y });
  } else {
    els.anchor.style.transform = `translate3d(0, ${y}px, 0)`;
  }
}

function animateCounterVerticalTo(els, fromProgress, toProgress, duration, ease = EASE_IN_OUT) {
  if (!els) return Promise.resolve();

  if (!hasGSAP()) {
    setCounterVerticalProgress(els, toProgress);
    return Promise.resolve();
  }

  const state = { p: fromProgress };

  return window.gsap.to(state, {
    p: toProgress,
    duration,
    ease,
    onUpdate: () => setCounterVerticalProgress(els, state.p)
  }).then(() => {});
}

// -------------------------------------
// Public API
// -------------------------------------
export function loaderShow() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  buildCounterReels(els);

  if (!hasGSAP()) {
    els.wrap.style.display = "block";
    els.wrap.style.pointerEvents = "auto";
    els.wrap.style.opacity = "1";

    // must be visible before measuring
    measureAndApplyCounterMetrics(els);

    setCounterStepImmediate(els, 0);     // "0%"
    setCounterVerticalProgress(els, 0);  // bottom-right

    if (els.brand) els.brand.style.opacity = "1";
    if (els.anchor) els.anchor.style.opacity = "1";

    bindResize();
    return Promise.resolve();
  }

  const g = window.gsap;

  g.killTweensOf([
    els.wrap,
    els.brand,
    els.anchor,
    els.colH,
    els.colT,
    els.colO,
    els.colP
  ]);

  g.set(els.wrap, {
    display: "block",
    pointerEvents: "auto",
    autoAlpha: 1
  });

  // visible before measuring
  g.set([els.brand, els.anchor], { autoAlpha: 0 });
  g.set(els.anchor, { y: 0 });

  measureAndApplyCounterMetrics(els);
  setCounterStepImmediate(els, 0);
  setCounterVerticalProgress(els, 0);

  bindResize();

  const tl = g.timeline();
  tl.to([els.brand, els.anchor], {
    autoAlpha: 1,
    duration: 0.35,
    ease: "power1.out"
  });

  return tl.then(() => {});
}

export function loaderHide() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  if (!hasGSAP()) {
    els.wrap.style.display = "none";
    els.wrap.style.pointerEvents = "none";
    els.wrap.style.opacity = "0";
    return Promise.resolve();
  }

  const g = window.gsap;

  g.set(els.wrap, {
    display: "none",
    pointerEvents: "none",
    autoAlpha: 0
  });

  g.set([els.anchor, els.brand, els.colH, els.colT, els.colO, els.colP], {
    clearProps: "transform,y,opacity"
  });

  return Promise.resolve();
}

/**
 * Feels much closer to the original:
 * - brief hold on 0
 * - staged jumps at 24 / 72 / 100
 * - smoother vertical travel with expo.inOut
 * - slightly staggered digit reels
 */
export function loaderProgressTo(duration = 3.0) {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  if (!hasGSAP()) {
    setCounterStepImmediate(els, 3);
    setCounterVerticalProgress(els, 1);
    return Promise.resolve();
  }

  const g = window.gsap;
  const tl = g.timeline();

  // Hold on 0 (matches the nicer "settle" feel)
  tl.to({}, { duration: 0.45 });

  // 0 -> 24
  tl.add(() => setCounterStep(els, 1, 0.78), 0);
  tl.add(animateCounterVerticalTo(els, 0.0, 0.24, duration * 0.30, EASE_IN_OUT), 0);

  // brief settle
  tl.to({}, { duration: 0.10 });

  // 24 -> 72
  tl.add(() => setCounterStep(els, 2, 0.78), 0);
  tl.add(animateCounterVerticalTo(els, 0.24, 0.72, duration * 0.36, EASE_IN_OUT), 0);

  // brief settle
  tl.to({}, { duration: 0.10 });

  // 72 -> 100
  tl.add(() => setCounterStep(els, 3, 0.78), 0);
  tl.add(animateCounterVerticalTo(els, 0.72, 1.0, duration * 0.34, EASE_IN_OUT), 0);

  return tl.then(() => {});
}

/**
 * 100% rolls upward (to empty row) before fade.
 * Then fade loader out and trigger reveal.
 */
export function loaderOutro({ onRevealStart } = {}) {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  if (!hasGSAP()) {
    if (typeof onRevealStart === "function") onRevealStart();
    els.wrap.style.opacity = "0";
    return Promise.resolve();
  }

  const g = window.gsap;
  const tl = g.timeline();

  // Hold 100 on screen
  tl.to({}, { duration: 0.22 });

  // Roll 100% out (index 4 = empty cells)
  tl.add(() => {
    animateRailTo(els.colH, 4, 0.00, 0.68, EASE_IN_OUT);
    animateRailTo(els.colT, 4, 0.03, 0.68, EASE_IN_OUT);
    animateRailTo(els.colO, 4, 0.06, 0.68, EASE_IN_OUT);
    animateRailTo(els.colP, 4, 0.09, 0.68, EASE_IN_OUT);
  }, 0);

  // Start page reveal while loader fades
  tl.call(() => {
    if (typeof onRevealStart === "function") onRevealStart();
  }, [], 0.10);

  tl.to(els.wrap, {
    autoAlpha: 0,
    duration: 0.55,
    ease: "power1.out"
  }, 0.10);

  return tl.then(() => {});
}

export async function runLoader(duration = 3.0, _container = document, opts = {}) {
  await loaderShow();
  await loaderProgressTo(duration);
  await loaderOutro(opts);
  await loaderHide();
}

// -------------------------------------
// Resize safety (keeps metrics exact while visible)
// -------------------------------------
function handleResize() {
  const els = getLoaderEls();
  if (!els || !els.wrap) return;

  const style = window.getComputedStyle(els.wrap);
  if (style.display === "none") return;

  cancelAnimationFrame(_resizeRaf);
  _resizeRaf = requestAnimationFrame(() => {
    measureAndApplyCounterMetrics(els);

    // Keep current visible vertical position by re-deriving progress from current y
    let currentY = 0;
    if (hasGSAP()) {
      currentY = Number(window.gsap.getProperty(els.anchor, "y")) || 0;
    }

    const { travel } = computeTravelMetrics(els);
    const p = travel > 0 ? Math.min(1, Math.max(0, -currentY / travel)) : 0;

    setCounterVerticalProgress(els, p);
  });
}

function bindResize() {
  if (_resizeBound) return;
  window.addEventListener("resize", handleResize);
  _resizeBound = true;
}
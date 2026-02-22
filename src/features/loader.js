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

const LOADER_VALUES = [0, 24, 72, 100];
const EASE_OUT = "expo.out";
const EASE_IN_OUT = "expo.inOut";

const REELS = {
  h: ["", "", "", "1", ""],   // extra empty for final roll-out
  t: ["", "2", "7", "0", ""],
  o: ["0", "4", "2", "0", ""],
  p: ["%", "%", "%", "%", ""]
};

function buildRail(rail, chars) {
  if (!rail) return;
  rail.innerHTML = "";

  for (let i = 0; i < chars.length; i += 1) {
    const cell = document.createElement("div");
    cell.className = "loader-col-cell";

    const value = chars[i];
    if (!value) {
      cell.classList.add("loader-col-cell-empty");
      cell.textContent = "0"; // preserves dimensions for measurement
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
 * Measure actual rendered glyph dimensions and set CSS vars exactly.
 * This removes the "slit" clipping and avoids width guessing.
 */
function measureAndApplyCounterMetrics(els) {
  if (!els?.counterMain) return;

  const cellsH = els.colH ? Array.from(els.colH.children) : [];
  const cellsT = els.colT ? Array.from(els.colT.children) : [];
  const cellsO = els.colO ? Array.from(els.colO.children) : [];
  const cellsP = els.colP ? Array.from(els.colP.children) : [];

  const allCells = [...cellsH, ...cellsT, ...cellsO, ...cellsP];
  if (!allCells.length) return;

  let maxH = 0;
  let maxDigitW = 0;
  let maxSymbolW = 0;

  for (const cell of allCells) {
    const rect = cell.getBoundingClientRect();
    if (rect.height > maxH) maxH = rect.height;

    const text = (cell.textContent || "").trim();
    if (cell.classList.contains("loader-col-cell-empty")) continue;

    if (text === "%") {
      if (rect.width > maxSymbolW) maxSymbolW = rect.width;
    } else {
      if (rect.width > maxDigitW) maxDigitW = rect.width;
    }
  }

  // Add tiny safety buffer so nothing ever clips on antialiasing edges
  const h = Math.ceil(maxH) + 2;
  const digitW = Math.ceil(maxDigitW) + 2;
  const symbolW = Math.ceil(maxSymbolW) + 2;

  els.wrap.style.setProperty("--loader-cell-h", `${h}px`);
  els.wrap.style.setProperty("--loader-col-w", `${digitW}px`);
  els.wrap.style.setProperty("--loader-col-w-symbol", `${symbolW}px`);
}

function setRailIndex(rail, index) {
  if (!rail) return;
  const cell = rail.querySelector(".loader-col-cell");
  if (!cell) return;
  const h = cell.getBoundingClientRect().height;
  rail.style.transform = `translate3d(0, ${-index * h}px, 0)`;
}

function animateRailTo(rail, index, delay = 0, duration = 0.8) {
  if (!rail) return;

  const cell = rail.querySelector(".loader-col-cell");
  if (!cell) return;
  const h = cell.getBoundingClientRect().height;

  if (!window.gsap) {
    setRailIndex(rail, index);
    return;
  }

  window.gsap.to(rail, {
    y: -index * h,
    duration,
    delay,
    ease: EASE_IN_OUT,
    overwrite: true
  });
}

function setCounterStep(els, stepIndex) {
  // nice staggered replacement
  animateRailTo(els.colH, stepIndex, 0.00, 0.78);
  animateRailTo(els.colT, stepIndex, 0.03, 0.78);
  animateRailTo(els.colO, stepIndex, 0.06, 0.78);
  animateRailTo(els.colP, stepIndex, 0.09, 0.78);
}

function setCounterStepImmediate(els, stepIndex) {
  setRailIndex(els.colH, stepIndex);
  setRailIndex(els.colT, stepIndex);
  setRailIndex(els.colO, stepIndex);
  setRailIndex(els.colP, stepIndex);

  if (window.gsap) {
    window.gsap.set([els.colH, els.colT, els.colO, els.colP], { clearProps: "y" });
  }
}

function setCounterVerticalProgress(els, progress) {
  if (!els?.anchor) return;

  // Use actual computed padding, not a guessed 16px-rem conversion
  const panelStyles = window.getComputedStyle(els.panel || els.wrap);
  const padTop = parseFloat(panelStyles.paddingTop || "40") || 40;
  const padBottom = parseFloat(panelStyles.paddingBottom || "40") || 40;

  const viewportH = window.innerHeight;
  const anchorH = els.anchor.getBoundingClientRect().height || 0;
  const travel = Math.max(0, viewportH - padTop - padBottom - anchorH);

  const y = -travel * progress;

  if (window.gsap) {
    window.gsap.set(els.anchor, { y });
  } else {
    els.anchor.style.transform = `translate3d(0, ${y}px, 0)`;
  }
}

function animateCounterVerticalTo(els, fromProgress, toProgress, duration, ease = EASE_IN_OUT) {
  if (!els) return Promise.resolve();

  if (!window.gsap) {
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

export function loaderShow() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  buildCounterReels(els);

  if (!window.gsap) {
    els.wrap.style.display = "block";
    els.wrap.style.pointerEvents = "auto";
    els.wrap.style.opacity = "1";

    measureAndApplyCounterMetrics(els);
    setCounterStepImmediate(els, 0);
    setCounterVerticalProgress(els, 0);

    if (els.brand) els.brand.style.opacity = "1";
    if (els.anchor) els.anchor.style.opacity = "1";
    return Promise.resolve();
  }

  window.gsap.killTweensOf([
    els.wrap,
    els.brand,
    els.anchor,
    els.colH,
    els.colT,
    els.colO,
    els.colP
  ]);

  window.gsap.set(els.wrap, {
    display: "block",
    pointerEvents: "auto",
    autoAlpha: 1
  });

  // Must be visible before measuring
  window.gsap.set([els.brand, els.anchor], { autoAlpha: 0 });
  window.gsap.set(els.anchor, { y: 0 });

  measureAndApplyCounterMetrics(els);
  setCounterStepImmediate(els, 0);
  setCounterVerticalProgress(els, 0);

  // Intro fade for 0% + brand
  const tl = window.gsap.timeline();
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

  if (!window.gsap) {
    els.wrap.style.display = "none";
    els.wrap.style.pointerEvents = "none";
    els.wrap.style.opacity = "0";
    return Promise.resolve();
  }

  window.gsap.set(els.wrap, {
    display: "none",
    pointerEvents: "none",
    autoAlpha: 0
  });

  window.gsap.set([els.anchor, els.brand, els.colH, els.colT, els.colO, els.colP], {
    clearProps: "transform,y,opacity"
  });

  return Promise.resolve();
}

/**
 * Slower, smoother staged progress:
 * 0 (hold) -> 24 -> 72 -> 100
 */
export function loaderProgressTo(duration = 3.0) {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  if (!window.gsap) {
    setCounterStepImmediate(els, 3);
    setCounterVerticalProgress(els, 1);
    return Promise.resolve();
  }

  const tl = window.gsap.timeline();

  // Hold 0 a little longer
  tl.to({}, { duration: 0.45 });

  // 0 -> 24
  tl.add(() => setCounterStep(els, 1), 0);
  tl.add(animateCounterVerticalTo(els, 0.0, 0.24, duration * 0.30, EASE_IN_OUT), 0);

  // brief settle
  tl.to({}, { duration: 0.10 });

  // 24 -> 72
  tl.add(() => setCounterStep(els, 2), 0);
  tl.add(animateCounterVerticalTo(els, 0.24, 0.72, duration * 0.36, EASE_IN_OUT), 0);

  // brief settle
  tl.to({}, { duration: 0.10 });

  // 72 -> 100
  tl.add(() => setCounterStep(els, 3), 0);
  tl.add(animateCounterVerticalTo(els, 0.72, 1.0, duration * 0.34, EASE_IN_OUT), 0);

  return tl.then(() => {});
}

/**
 * 100% should stagger/roll UP before homepage reveal.
 * Then fade loader out and fire reveal callback at fade start.
 */
export function loaderOutro({ onRevealStart } = {}) {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  const tl = window.gsap.timeline();

  // Hold 100% on screen a moment
  tl.to({}, { duration: 0.22 });

  // Roll 100% up out of frame (to the extra empty row at index 4)
  tl.add(() => {
    animateRailTo(els.colH, 4, 0.00, 0.68);
    animateRailTo(els.colT, 4, 0.03, 0.68);
    animateRailTo(els.colO, 4, 0.06, 0.68);
    animateRailTo(els.colP, 4, 0.09, 0.68);
  }, 0);

  // Fade out starts while that happens
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

export async function runLoader(duration = 3.0, container = document, opts = {}) {
  await loaderShow();
  await loaderProgressTo(duration, container);
  await loaderOutro(opts);
  await loaderHide();
}

/* Keep sizing accurate if viewport changes during loader */
window.addEventListener("resize", () => {
  const els = getLoaderEls();
  if (!els || !els.wrap) return;

  const display = window.getComputedStyle(els.wrap).display;
  if (display === "none") return;

  measureAndApplyCounterMetrics(els);

  // Re-clamp anchor to current visible position safely
  const y = window.gsap ? Number(window.gsap.getProperty(els.anchor, "y")) || 0 : 0;
  const panelStyles = window.getComputedStyle(els.panel || els.wrap);
  const padTop = parseFloat(panelStyles.paddingTop || "40") || 40;
  const padBottom = parseFloat(panelStyles.paddingBottom || "40") || 40;
  const viewportH = window.innerHeight;
  const anchorH = els.anchor.getBoundingClientRect().height || 0;
  const travel = Math.max(0, viewportH - padTop - padBottom - anchorH);
  const p = travel > 0 ? Math.min(1, Math.max(0, -y / travel)) : 0;

  setCounterVerticalProgress(els, p);
});
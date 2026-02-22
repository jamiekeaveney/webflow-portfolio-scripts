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

const EASE_COUNTER = "expo.inOut";
const EASE_PANEL = "power2.out";

/* Column reels for 0, 24, 72, 100 */
const REELS = {
  h: ["", "", "", "1"],    // hundreds
  t: ["", "2", "7", "0"],  // tens
  o: ["0", "4", "2", "0"], // ones
  p: ["%", "%", "%", "%"]  // symbol
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
      // Invisible placeholder preserves height/width metrics
      cell.textContent = "0";
      cell.setAttribute("aria-hidden", "true");
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
 * Measure actual rendered glyph dimensions and size each reel window dynamically.
 * This avoids clipping and avoids width "guesstimates".
 */
function sizeCounterWindows(els) {
  if (!els?.counterMain) return;

  const windows = els.counterMain.querySelectorAll(".loader-col-window");

  windows.forEach((win) => {
    const rail = win.querySelector(".loader-col-rail");
    if (!rail) return;

    const cells = Array.from(rail.querySelectorAll(".loader-col-cell"));
    if (!cells.length) return;

    // Reset first so measurements aren't biased by previous sizing
    win.style.width = "";
    win.style.height = "";
    rail.style.width = "";

    let maxW = 0;
    let maxH = 0;

    cells.forEach((cell) => {
      const rect = cell.getBoundingClientRect();
      if (rect.width > maxW) maxW = rect.width;
      if (rect.height > maxH) maxH = rect.height;
    });

    // Small safety padding to avoid clipping due to font rendering / anti-aliasing
    const padX = Math.ceil(maxH * 0.06);
    const padY = Math.ceil(maxH * 0.10);

    const finalW = Math.ceil(maxW + padX * 2);
    const finalH = Math.ceil(maxH + padY * 2);

    win.style.width = `${finalW}px`;
    win.style.height = `${finalH}px`;

    // Ensure all cells match the measured window height exactly
    cells.forEach((cell) => {
      cell.style.height = `${finalH}px`;
      cell.style.paddingLeft = `${padX}px`;
      cell.style.paddingRight = `${padX}px`;
    });

    rail.style.width = `${finalW}px`;
  });
}

function getRailStepHeight(rail) {
  if (!rail) return 0;
  const cell = rail.querySelector(".loader-col-cell");
  return cell ? cell.getBoundingClientRect().height : 0;
}

function setRailIndex(rail, index) {
  if (!rail) return;
  const h = getRailStepHeight(rail);
  rail.style.transform = `translate3d(0, ${-index * h}px, 0)`;
}

function animateRailTo(rail, index, delay = 0, duration = 0.95) {
  if (!rail || !window.gsap) {
    setRailIndex(rail, index);
    return;
  }

  const h = getRailStepHeight(rail);

  window.gsap.to(rail, {
    y: -index * h,
    duration,
    delay,
    ease: EASE_COUNTER,
    overwrite: true
  });
}

function setCounterStep(els, stepIndex, opts = {}) {
  const {
    baseDelay = 0,
    stagger = 0.045,
    railDuration = 0.95
  } = opts;

  // Staggered reel movement (smoother and less violent)
  animateRailTo(els.colH, stepIndex, baseDelay + stagger * 0, railDuration);
  animateRailTo(els.colT, stepIndex, baseDelay + stagger * 1, railDuration);
  animateRailTo(els.colO, stepIndex, baseDelay + stagger * 2, railDuration);
  animateRailTo(els.colP, stepIndex, baseDelay + stagger * 3, railDuration);
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
  if (!els?.wrap || !els?.anchor) return;

  // Read actual panel padding from CSS instead of assuming 2.5rem hard-coded
  const panelStyles = window.getComputedStyle(els.panel);
  const pad = parseFloat(panelStyles.paddingTop) || 40;

  const viewportH = window.innerHeight;
  const anchorH = els.anchor.getBoundingClientRect().height || 0;
  const travel = Math.max(0, viewportH - (pad * 2) - anchorH);

  const y = -travel * progress;

  if (window.gsap) {
    window.gsap.set(els.anchor, { y });
  } else {
    els.anchor.style.transform = `translate3d(0, ${y}px, 0)`;
  }
}

function refreshLoaderLayout(els) {
  if (!els) return;
  sizeCounterWindows(els);

  // Re-apply current visual step if visible (prevents drift after resize)
  // We derive current step from the ones rail y if gsap exists; fallback to 0
  if (!els.colO) return;

  const h = getRailStepHeight(els.colO);
  if (!h) return;

  let currentY = 0;
  if (window.gsap) {
    currentY = Number(window.gsap.getProperty(els.colO, "y")) || 0;
  } else {
    // Naive fallback (rarely used)
    currentY = 0;
  }

  const step = Math.round(Math.abs(currentY) / h);

  setCounterStepImmediate(els, Math.max(0, Math.min(3, step)));
}

export function loaderShow() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  buildCounterReels(els);

  if (!window.gsap) {
    els.wrap.style.display = "block";
    els.wrap.style.pointerEvents = "auto";
    els.wrap.style.opacity = "1";

    refreshLoaderLayout(els);

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

  // Initial hidden state for intro fade
  window.gsap.set(els.brand, { autoAlpha: 0, y: 8 });
  window.gsap.set(els.anchor, { autoAlpha: 0, y: 0 });

  refreshLoaderLayout(els);
  setCounterStepImmediate(els, 0);
  setCounterVerticalProgress(els, 0);

  return Promise.resolve();
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

  window.gsap.set([els.brand, els.anchor, els.colH, els.colT, els.colO, els.colP], {
    clearProps: "transform,y,opacity"
  });

  return Promise.resolve();
}

/**
 * Main loader progress:
 * - intro fade in for brand + 0%
 * - short hold on 0%
 * - 0 -> 24 -> 72 -> 100 (slower)
 * - 100% gets a final micro-stagger/settle before reveal
 */
export function loaderProgressTo(duration = 3.0) {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  if (!window.gsap) {
    setCounterStepImmediate(els, 3);
    setCounterVerticalProgress(els, 1);
    return Promise.resolve();
  }

  refreshLoaderLayout(els);

  const state = { p: 0 };
  const tl = window.gsap.timeline();

  // Intro fade-in
  tl.to(els.brand, {
    autoAlpha: 1,
    y: 0,
    duration: 0.45,
    ease: EASE_PANEL
  }, 0);

  tl.to(els.anchor, {
    autoAlpha: 1,
    duration: 0.4,
    ease: EASE_PANEL
  }, 0.08);

  // Hold 0% a little longer (your note)
  tl.to({}, { duration: 0.55 });

  // Step 1: 0 -> 24 (gentler start)
  tl.to(state, {
    p: 0.24,
    duration: duration * 0.30,
    ease: EASE_COUNTER,
    onStart: () => setCounterStep(els, 1, { railDuration: 0.95, stagger: 0.045 }),
    onUpdate: () => setCounterVerticalProgress(els, state.p)
  });

  // Tiny breathing gap helps the motion feel less "violent"
  tl.to({}, { duration: 0.08 });

  // Step 2: 24 -> 72
  tl.to(state, {
    p: 0.72,
    duration: duration * 0.40,
    ease: EASE_COUNTER,
    onStart: () => setCounterStep(els, 2, { railDuration: 0.95, stagger: 0.045 }),
    onUpdate: () => setCounterVerticalProgress(els, state.p)
  });

  // Tiny gap
  tl.to({}, { duration: 0.08 });

  // Step 3: 72 -> 100
  tl.to(state, {
    p: 1,
    duration: duration * 0.30,
    ease: EASE_COUNTER,
    onStart: () => setCounterStep(els, 3, { railDuration: 1.0, stagger: 0.05 }),
    onUpdate: () => setCounterVerticalProgress(els, state.p),
    onComplete: () => setCounterVerticalProgress(els, 1)
  });

  // Final "100% finished" stagger lift before reveal (subtle)
  tl.to(els.colH, { y: `-=${2}`, duration: 0.20, ease: "power2.out" }, "+=0.10");
  tl.to(els.colT, { y: `-=${2}`, duration: 0.20, ease: "power2.out" }, "<+0.03");
  tl.to(els.colO, { y: `-=${2}`, duration: 0.20, ease: "power2.out" }, "<+0.03");
  tl.to(els.colP, { y: `-=${2}`, duration: 0.20, ease: "power2.out" }, "<+0.03");

  tl.to([els.colH, els.colT, els.colO, els.colP], {
    y: 0,
    duration: 0.22,
    ease: "power2.inOut"
  }, ">");

  // Hold on finished state briefly before reveal
  tl.to({}, { duration: 0.22 });

  return tl.then(() => {});
}

/**
 * Fade loader out.
 * If you already wired onRevealStart before, this still supports it.
 */
export function loaderOutro({ onRevealStart } = {}) {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  const tl = window.gsap.timeline();

  tl.call(() => {
    if (typeof onRevealStart === "function") onRevealStart();
  }, [], 0.08);

  // Slightly softer exit
  tl.to(els.wrap, {
    autoAlpha: 0,
    duration: 0.55,
    ease: "power1.out"
  }, 0);

  return tl.then(() => {});
}

export async function runLoader(duration = 3.0, container = document, opts = {}) {
  await loaderShow();
  await loaderProgressTo(duration, container);
  await loaderOutro(opts);
  await loaderHide();
}

/* Keep reel sizing + vertical travel accurate on resize */
let _loaderResizeRaf = null;
window.addEventListener("resize", () => {
  const els = getLoaderEls();
  if (!els || !els.wrap || els.wrap.style.display === "none") return;

  if (_loaderResizeRaf) cancelAnimationFrame(_loaderResizeRaf);

  _loaderResizeRaf = requestAnimationFrame(() => {
    refreshLoaderLayout(els);

    // derive approximate progress from current anchor y and re-apply safely
    const y = window.gsap ? (Number(window.gsap.getProperty(els.anchor, "y")) || 0) : 0;

    const panelStyles = window.getComputedStyle(els.panel);
    const pad = parseFloat(panelStyles.paddingTop) || 40;

    const viewportH = window.innerHeight;
    const anchorH = els.anchor.getBoundingClientRect().height || 0;
    const travel = Math.max(0, viewportH - (pad * 2) - anchorH);
    const p = travel > 0 ? Math.min(1, Math.max(0, -y / travel)) : 0;

    setCounterVerticalProgress(els, p);
  });
});
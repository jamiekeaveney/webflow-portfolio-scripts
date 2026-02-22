function getLoaderEls() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;

  return {
    wrap,
    panel: wrap.querySelector(".loader-panel"),
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

/* Column reels for 0, 24, 72, 100 */
const REELS = {
  h: ["", "", "", "1"],   // hundreds
  t: ["", "2", "7", "0"], // tens
  o: ["0", "4", "2", "0"],// ones
  p: ["%", "%", "%", "%"] // symbol
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
      cell.textContent = "0"; // preserves exact height metrics
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

function getCellHeight(els) {
  if (!els?.counterMain) return 0;
  const cell = els.counterMain.querySelector(".loader-col-cell");
  return cell ? cell.getBoundingClientRect().height : 0;
}

function setRailIndex(rail, index) {
  if (!rail) return;
  const cell = rail.querySelector(".loader-col-cell");
  if (!cell) return;
  const h = cell.getBoundingClientRect().height;
  rail.style.transform = `translate3d(0, ${-index * h}px, 0)`;
}

function animateRailTo(rail, index, delay = 0) {
  if (!rail || !window.gsap) {
    setRailIndex(rail, index);
    return;
  }

  const cell = rail.querySelector(".loader-col-cell");
  if (!cell) return;
  const h = cell.getBoundingClientRect().height;

  window.gsap.to(rail, {
    y: -index * h,
    duration: 0.7,
    delay,
    ease: EASE_OUT,
    overwrite: true
  });
}

function setCounterStep(els, stepIndex) {
  // staggered reel replacement (no overlap)
  animateRailTo(els.colH, stepIndex, 0.00);
  animateRailTo(els.colT, stepIndex, 0.03);
  animateRailTo(els.colO, stepIndex, 0.06);
  animateRailTo(els.colP, stepIndex, 0.09);
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

  const pad = 2.5 * 16; // base assumption; visual is fine and consistent
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

export function loaderShow() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  buildCounterReels(els);

  if (!window.gsap) {
    els.wrap.style.display = "block";
    els.wrap.style.pointerEvents = "auto";
    els.wrap.style.opacity = "1";
    setCounterStepImmediate(els, 0);
    setCounterVerticalProgress(els, 0);
    return Promise.resolve();
  }

  window.gsap.killTweensOf([
    els.wrap,
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

  window.gsap.set(els.anchor, { y: 0 });
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

  window.gsap.set([els.anchor, els.colH, els.colT, els.colO, els.colP], {
    clearProps: "transform,y"
  });

  return Promise.resolve();
}

/**
 * Main loader progress:
 * 0 -> 24 -> 72 -> 100
 * counter position moves with actual progress value
 */
export function loaderProgressTo(duration = 1.5) {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  if (!window.gsap) {
    setCounterStepImmediate(els, 3);
    setCounterVerticalProgress(els, 1);
    return Promise.resolve();
  }

  const state = { p: 0 };
  const tl = window.gsap.timeline();

  // Step 1: 0 -> 24
  tl.to(state, {
    p: 0.24,
    duration: duration * 0.34,
    ease: EASE_OUT,
    onStart: () => setCounterStep(els, 1),
    onUpdate: () => setCounterVerticalProgress(els, state.p)
  });

  // Step 2: 24 -> 72
  tl.to(state, {
    p: 0.72,
    duration: duration * 0.40,
    ease: EASE_OUT,
    onStart: () => setCounterStep(els, 2),
    onUpdate: () => setCounterVerticalProgress(els, state.p)
  });

  // Step 3: 72 -> 100
  tl.to(state, {
    p: 1,
    duration: duration * 0.26,
    ease: EASE_IN_OUT,
    onStart: () => setCounterStep(els, 3),
    onUpdate: () => setCounterVerticalProgress(els, state.p),
    onComplete: () => setCounterVerticalProgress(els, 1)
  });

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
  }, [], 0);

  tl.to(els.wrap, {
    autoAlpha: 0,
    duration: 0.45,
    ease: "power1.out"
  }, 0);

  return tl.then(() => {});
}

export async function runLoader(duration = 1.5, container = document, opts = {}) {
  await loaderShow();
  await loaderProgressTo(duration, container);
  await loaderOutro(opts);
  await loaderHide();
}

/* Keeps vertical travel accurate on resize */
window.addEventListener("resize", () => {
  const els = getLoaderEls();
  if (!els || !els.wrap || els.wrap.style.display === "none") return;

  // read current visual step by rail position is overkill; just leave resize safe
  // if loader is visible during resize, this keeps anchor within bounds
  const rail = els.colO;
  if (!rail) return;

  const y = window.gsap ? (window.gsap.getProperty(els.anchor, "y") || 0) : 0;
  // derive approximate progress from current travel
  const pad = 2.5 * 16;
  const viewportH = window.innerHeight;
  const anchorH = els.anchor.getBoundingClientRect().height || 0;
  const travel = Math.max(0, viewportH - (pad * 2) - anchorH);
  const p = travel > 0 ? Math.min(1, Math.max(0, -y / travel)) : 0;
  setCounterVerticalProgress(els, p);
});
// src/features/loader.js

const STEPS = [0, 24, 72, 100];
let _resizeRaf = null;
let _activeTl = null;

/* -------------------------
   DOM helpers
------------------------- */

function getLoaderEls() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;

  const q = (s) => wrap.querySelector(s);

  return {
    wrap,
    panel: q(".loader-panel"),
    brand: q(".loader-brand"),
    progress: q("[data-loader-progress]"),
    block: q("[data-loader-block]"),
    valTop: q("[data-loader-val-top]"),
    valBot: q("[data-loader-val-bot]"),
  };
}

function getGsap() {
  return window.gsap || null;
}

/* -------------------------
   Value formatting
   (3 digits, no %)
   0 -> 000, 24 -> 024, 72 -> 072, 100 -> 100
------------------------- */

function formatDigits(n) {
  const v = Math.max(0, Math.min(100, Math.round(n)));
  return String(v).padStart(3, "0");
}

function setSlotValue(slotEl, n) {
  if (!slotEl) return;
  const chars = formatDigits(n).split("");
  const spans = slotEl.querySelectorAll("span");

  // If structure exists (3 spans), fill them
  if (spans.length >= 3) {
    spans[0].textContent = chars[0];
    spans[1].textContent = chars[1];
    spans[2].textContent = chars[2];
    return;
  }

  // Fallback if someone changes markup later
  slotEl.textContent = formatDigits(n);
}

/* -------------------------
   Vertical travel
------------------------- */

function calcTravelY(els, progress) {
  if (!els?.panel || !els?.block) return 0;

  const cs = getComputedStyle(els.panel);
  const padTop = parseFloat(cs.paddingTop) || 0;
  const padBottom = parseFloat(cs.paddingBottom) || padTop;

  const viewportH = window.innerHeight;
  const blockH = els.block.offsetHeight || 0;

  // move from top to bottom space range
  const travel = Math.max(0, viewportH - padTop - padBottom - blockH);

  // In the original feel: 0 is low-ish, 100 is high.
  // We move upward (negative y) as progress increases.
  return -travel * (progress / 100);
}

/* -------------------------
   Core states
------------------------- */

export function loaderShow() {
  const els = getLoaderEls();
  const gsap = getGsap();
  if (!els) return Promise.resolve();

  // kill any running timeline from previous nav
  if (_activeTl) {
    _activeTl.kill();
    _activeTl = null;
  }

  if (!gsap) {
    els.wrap.style.display = "block";
    els.wrap.style.opacity = "1";
    els.wrap.style.pointerEvents = "auto";
    setSlotValue(els.valTop, 0);
    setSlotValue(els.valBot, 0);
    return Promise.resolve();
  }

  gsap.killTweensOf([els.wrap, els.brand, els.progress, els.block, els.valTop, els.valBot]);

  gsap.set(els.wrap, {
    display: "block",
    autoAlpha: 1,
    pointerEvents: "auto",
  });

  gsap.set([els.brand, els.progress], { autoAlpha: 0 });

  setSlotValue(els.valTop, 0);
  setSlotValue(els.valBot, 0);

  gsap.set(els.valTop, { yPercent: 0 });
  gsap.set(els.valBot, { yPercent: 100 });

  gsap.set(els.block, {
    x: 0,
    y: calcTravelY(els, 0),
  });

  return Promise.resolve();
}

export function loaderHide() {
  const els = getLoaderEls();
  const gsap = getGsap();
  if (!els) return Promise.resolve();

  if (_activeTl) {
    _activeTl.kill();
    _activeTl = null;
  }

  if (!gsap) {
    els.wrap.style.display = "none";
    els.wrap.style.opacity = "0";
    els.wrap.style.pointerEvents = "none";
    return Promise.resolve();
  }

  gsap.set(els.wrap, {
    display: "none",
    autoAlpha: 0,
    pointerEvents: "none",
  });

  gsap.set([els.brand, els.progress, els.block, els.valTop, els.valBot], {
    clearProps: "all",
  });

  return Promise.resolve();
}

/* -------------------------
   Flip step (top exits up, bottom enters)
------------------------- */

function addFlipStep(tl, els, nextValue, duration, label) {
  const gsap = getGsap();
  if (!gsap || !tl) return;

  tl.addLabel(label);

  // travel block
  tl.to(
    els.block,
    {
      y: calcTravelY(els, nextValue),
      duration,
      ease: "sine.inOut",
    },
    label
  );

  // prep next digits
  tl.call(() => setSlotValue(els.valBot, nextValue), [], label);

  // reset positions before each flip
  tl.set(els.valTop, { yPercent: 0 }, label);
  tl.set(els.valBot, { yPercent: 100 }, label);

  // simultaneous flip
  tl.to(
    els.valTop,
    {
      yPercent: -100,
      duration,
      ease: "expo.inOut",
    },
    label
  );

  tl.to(
    els.valBot,
    {
      yPercent: 0,
      duration,
      ease: "expo.inOut",
    },
    label
  );

  // swap current at end
  tl.call(() => {
    setSlotValue(els.valTop, nextValue);
    gsap.set(els.valTop, { yPercent: 0 });
    gsap.set(els.valBot, { yPercent: 100 });
  });
}

export function loaderProgressTo(totalDuration = 4.8) {
  const els = getLoaderEls();
  const gsap = getGsap();
  if (!els || !gsap) return Promise.resolve();

  // distance-weighted timings (0→24, 24→72, 72→100)
  const d1 = totalDuration * 0.24;
  const d2 = totalDuration * 0.48;
  const d3 = totalDuration * 0.28;

  const tl = gsap.timeline();
  _activeTl = tl;

  // intro fade
  tl.to(els.brand, { autoAlpha: 1, duration: 0.35, ease: "power2.out" }, 0);
  tl.to(els.progress, { autoAlpha: 1, duration: 0.35, ease: "power2.out" }, 0.05);

  // short hold on 000
  tl.to({}, { duration: 0.35 });

  addFlipStep(tl, els, 24, d1, "step1");
  addFlipStep(tl, els, 72, d2, "step2");
  addFlipStep(tl, els, 100, d3, "step3");

  // hold at 100
  tl.to({}, { duration: 0.25 });

  // flip out 100
  tl.to(els.valTop, {
    yPercent: -120,
    duration: 0.65,
    ease: "expo.out",
  });

  return tl.then(() => {
    if (_activeTl === tl) _activeTl = null;
  });
}

export function loaderOutro({ onRevealStart } = {}) {
  const els = getLoaderEls();
  const gsap = getGsap();
  if (!els || !gsap) return Promise.resolve();

  const tl = gsap.timeline();
  _activeTl = tl;

  // trigger page reveals slightly before the loader fully disappears
  tl.call(() => {
    if (typeof onRevealStart === "function") onRevealStart();
  }, [], 0.04);

  tl.to(
    [els.brand, els.progress],
    {
      autoAlpha: 0,
      duration: 0.28,
      ease: "power1.out",
    },
    0
  );

  tl.to(
    els.wrap,
    {
      autoAlpha: 0,
      duration: 0.45,
      ease: "power1.out",
    },
    0.05
  );

  return tl.then(() => {
    if (_activeTl === tl) _activeTl = null;
  });
}

/* -------------------------
   Orchestrator (public)
------------------------- */

export async function runLoader(duration = 4.8, _container = document, opts = {}) {
  await loaderShow();
  await loaderProgressTo(duration);
  await loaderOutro(opts);
  await loaderHide();
}

/* -------------------------
   Resize correction
------------------------- */

function onResize() {
  const els = getLoaderEls();
  const gsap = getGsap();
  if (!els || !gsap) return;

  // only if visible
  const visible = getComputedStyle(els.wrap).display !== "none";
  if (!visible) return;

  if (_resizeRaf) cancelAnimationFrame(_resizeRaf);

  _resizeRaf = requestAnimationFrame(() => {
    const topText = els.valTop?.textContent || "000";
    const num = parseInt(topText.replace(/\D/g, ""), 10) || 0;
    gsap.set(els.block, { y: calcTravelY(els, num) });
  });
}

window.addEventListener("resize", onResize);
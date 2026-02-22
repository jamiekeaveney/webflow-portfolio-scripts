function getLoaderEls() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;

  return {
    wrap,
    stage: wrap.querySelector(".loader-stage") || wrap,
    shell: wrap.querySelector(".loader-shell"),
    counterAnchor: wrap.querySelector(".loader-counter-anchor"),
    counterClip: wrap.querySelector(".loader-counter-clip"),
    layerA: wrap.querySelector(".loader-counter-layer-a"),
    layerB: wrap.querySelector(".loader-counter-layer-b")
  };
}

const EASE_OUT = "expo.out";
const EASE_IN_OUT = "expo.inOut";

const LOADER_STEPS = [
  { value: 0, progress: 0.0 },
  { value: 24, progress: 0.24 },
  { value: 72, progress: 0.72 },
  { value: 100, progress: 1.0 }
];

const DIGIT_STAGGER = 0.035;
const DIGIT_DUR = 0.8;
const OUTRO_DUR = 0.5;

function formatCounter(value) {
  return `${value}%`;
}

function makeCounterHTML(text) {
  const chars = text.split("");
  return chars
    .map((char) => {
      const isPercent = char === "%";
      const cls = isPercent
        ? "loader-counter-char loader-counter-percent"
        : "loader-counter-char";
      const safe = char === " " ? "&nbsp;" : char;
      return `<span class="${cls}">${safe}</span>`;
    })
    .join("");
}

function setLayerText(layer, text) {
  if (!layer) return [];
  layer.innerHTML = makeCounterHTML(text);
  return Array.from(layer.querySelectorAll(".loader-counter-char"));
}

function getTravelY(els) {
  if (!els || !els.counterAnchor || !els.counterClip || !els.wrap) return 0;

  const wrapRect = els.wrap.getBoundingClientRect();
  const clipRect = els.counterClip.getBoundingClientRect();

  const style = window.getComputedStyle(els.shell || els.wrap);
  const topPad = parseFloat(style.paddingTop) || 40;
  const bottomPad = parseFloat(style.paddingBottom) || 40;

  const available = wrapRect.height - topPad - bottomPad - clipRect.height;
  return Math.max(0, available);
}

function setCounterVertical(els, progress) {
  if (!window.gsap || !els?.counterAnchor) return;
  const travel = getTravelY(els);
  const y = -travel * Math.max(0, Math.min(1, progress));
  window.gsap.set(els.counterAnchor, { y });
}

function tweenCounterVertical(tl, els, fromProgress, toProgress, duration, at, ease = EASE_OUT) {
  if (!els?.counterAnchor) return;

  const proxy = { p: fromProgress };
  tl.to(proxy, {
    p: toProgress,
    duration,
    ease,
    onUpdate: () => setCounterVertical(els, proxy.p)
  }, at);
}

function animateCounterSwap(tl, fromLayer, toLayer, nextValue, at) {
  const nextChars = setLayerText(toLayer, formatCounter(nextValue));
  const fromChars = fromLayer ? Array.from(fromLayer.querySelectorAll(".loader-counter-char")) : [];

  if (window.gsap) {
    window.gsap.set(toLayer, { autoAlpha: 1 });
    window.gsap.set(nextChars, { yPercent: 120 });
    window.gsap.set(fromLayer, { autoAlpha: 1 });
    window.gsap.set(fromChars, { yPercent: 0 });
  }

  // old out + new in (same "split" feeling)
  if (fromChars.length) {
    tl.to(fromChars, {
      yPercent: -120,
      duration: DIGIT_DUR,
      ease: EASE_OUT,
      stagger: { each: DIGIT_STAGGER, from: "start" }
    }, at);
  }

  if (nextChars.length) {
    tl.to(nextChars, {
      yPercent: 0,
      duration: DIGIT_DUR,
      ease: EASE_OUT,
      stagger: { each: DIGIT_STAGGER, from: "start" }
    }, at);
  }

  // hide old layer after swap completes
  tl.set(fromLayer, { autoAlpha: 0 }, at + DIGIT_DUR + 0.05);
}

export function loaderShow() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  if (!window.gsap) {
    els.wrap.style.display = "block";
    els.wrap.style.pointerEvents = "auto";
    els.wrap.style.opacity = "1";
    return Promise.resolve();
  }

  window.gsap.killTweensOf([
    els.wrap,
    els.counterAnchor,
    els.layerA,
    els.layerB
  ]);

  // Initial visible number = 0%
  setLayerText(els.layerA, formatCounter(0));
  setLayerText(els.layerB, "");

  window.gsap.set(els.wrap, {
    display: "block",
    pointerEvents: "auto",
    autoAlpha: 1
  });

  window.gsap.set(els.layerA, { autoAlpha: 1 });
  window.gsap.set(els.layerB, { autoAlpha: 0 });

  const charsA = Array.from(els.layerA.querySelectorAll(".loader-counter-char"));
  window.gsap.set(charsA, { yPercent: 0 });

  setCounterVertical(els, 0);

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
    autoAlpha: 0,
    display: "none",
    pointerEvents: "none"
  });

  window.gsap.set(els.counterAnchor, { clearProps: "transform" });
  window.gsap.set([els.layerA, els.layerB], { clearProps: "opacity,visibility" });

  return Promise.resolve();
}

export function loaderProgressTo(duration = 1.5) {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  const tl = window.gsap.timeline();

  // Timing split:
  // 0 -> 24 (nice intro)
  // 24 -> 72 (main progress)
  // 72 -> 100 (finish)
  const d1 = duration * 0.34;
  const d2 = duration * 0.40;
  const d3 = duration * 0.26;

  // Start state already shows 0%
  // Move 0 -> 24
  animateCounterSwap(tl, els.layerA, els.layerB, 24, 0.00);
  tweenCounterVertical(tl, els, 0.00, 0.24, d1, 0.00, EASE_OUT);

  // Move 24 -> 72
  animateCounterSwap(tl, els.layerB, els.layerA, 72, d1);
  tweenCounterVertical(tl, els, 0.24, 0.72, d2, d1, EASE_OUT);

  // Move 72 -> 100
  animateCounterSwap(tl, els.layerA, els.layerB, 100, d1 + d2);
  tweenCounterVertical(tl, els, 0.72, 1.00, d3, d1 + d2, EASE_IN_OUT);

  // final visible layer should be B (100%)
  tl.set(els.layerA, { autoAlpha: 0 }, d1 + d2 + d3 + 0.01);
  tl.set(els.layerB, { autoAlpha: 1 }, d1 + d2 + d3 + 0.01);

  return tl.then(() => {});
}

/**
 * Fade loader out.
 * onRevealStart fires at the same moment the fade starts,
 * so your homepage reveal anims become visible immediately.
 */
export function loaderOutro({ onRevealStart } = {}) {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  const tl = window.gsap.timeline();
  let fired = false;

  const fireReveal = () => {
    if (fired) return;
    fired = true;
    if (typeof onRevealStart === "function") onRevealStart();
  };

  // Counter exits only at 100
  const activeLayer = window.getComputedStyle(els.layerB).opacity !== "0" ? els.layerB : els.layerA;
  const activeChars = Array.from(activeLayer.querySelectorAll(".loader-counter-char"));

  tl.to(activeChars, {
    yPercent: -120,
    duration: 0.9,
    ease: EASE_OUT,
    stagger: { each: DIGIT_STAGGER, from: "start" }
  }, 0);

  // Start homepage reveal exactly when loader starts fading
  tl.call(fireReveal, [], 0.08);

  tl.to(els.wrap, {
    autoAlpha: 0,
    duration: OUTRO_DUR,
    ease: "none"
  }, 0.08);

  return tl.then(() => {});
}

export async function runLoader(duration = 1.5, container = document, opts = {}) {
  await loaderShow();
  await loaderProgressTo(duration, container);
  await loaderOutro(opts);
  await loaderHide();
}
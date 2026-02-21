function getLoaderEls() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;

  const stage = wrap.querySelector(".loader-stage") || wrap;

  return {
    wrap,
    stage,
    counterWrap: wrap.querySelector(".loader-counter-wrap"),
    progressTrack: wrap.querySelector(".loader-progress-track"),
    progressLine: wrap.querySelector(".loader-progress-line"),
    line1: wrap.querySelector('[data-loader-line="1"]'), // Hi
    line2: wrap.querySelector('[data-loader-line="2"]')  // I’m
  };
}

function getLoaderRoot(container) {
  return (
    (container && container.querySelector && container.querySelector('[data-loader="wrap"]')) ||
    document.querySelector('[data-loader="wrap"]') ||
    document.documentElement
  );
}

const EASE_OUT = "expo.out";
const EASE_IN_OUT = "expo.inOut";

const TEXT_DUR = 1.0;
const FADE_DUR = 0.45;
const LETTER_STAGGER_IN = 0.09;
const LETTER_STAGGER_OUT = 0.05;

function splitLoaderLine(el) {
  if (!el) return { chars: [] };

  // Reuse if already split
  if (el.__loaderChars && el.__loaderChars.length) {
    return { chars: el.__loaderChars };
  }

  // If GSAP SplitText exists, use it
  if (window.gsap && window.SplitText) {
    const split = new window.SplitText(el, {
      type: "chars",
      charsClass: "loader-char"
    });

    el.__loaderChars = split.chars || [];
    el.__loaderSplit = split;
    return { chars: el.__loaderChars };
  }

  // Fallback: manual span split
  const text = el.textContent || "";
  el.innerHTML = "";

  const frag = document.createDocumentFragment();
  const chars = [];

  for (const ch of text) {
    const span = document.createElement("span");
    span.className = "loader-char";
    span.textContent = ch === " " ? "\u00A0" : ch;
    frag.appendChild(span);
    chars.push(span);
  }

  el.appendChild(frag);
  el.__loaderChars = chars;

  return { chars };
}

function setProgress(root, value) {
  if (!root) return;
  root.style.setProperty("--_feedback---number-counter", String(value));
}

export function loaderShow() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  if (!window.gsap) {
    els.wrap.style.display = "block";
    els.wrap.style.pointerEvents = "auto";
    return Promise.resolve();
  }

  const line1Split = splitLoaderLine(els.line1);
  const line2Split = splitLoaderLine(els.line2);

  window.gsap.killTweensOf([
    els.wrap,
    els.stage,
    els.counterWrap,
    els.progressTrack,
    els.progressLine,
    ...(line1Split.chars || []),
    ...(line2Split.chars || [])
  ]);

  // reset progress
  setProgress(els.wrap, 0);

  window.gsap.set(els.wrap, {
    display: "block",
    pointerEvents: "auto",
    autoAlpha: 1
  });

  window.gsap.set(els.stage, { autoAlpha: 1 });

  if (els.progressTrack) window.gsap.set(els.progressTrack, { autoAlpha: 1 });
  if (els.counterWrap) window.gsap.set(els.counterWrap, { yPercent: 0, autoAlpha: 1 });

  // Prep text lines
  if (line1Split.chars.length) window.gsap.set(line1Split.chars, { yPercent: 120, autoAlpha: 1 });
  if (line2Split.chars.length) window.gsap.set(line2Split.chars, { yPercent: 120, autoAlpha: 1 });

  // Animate "Hi" in only (same as before vibe)
  if (line1Split.chars.length) {
    window.gsap.to(line1Split.chars, {
      yPercent: 0,
      duration: TEXT_DUR,
      ease: EASE_OUT,
      stagger: LETTER_STAGGER_IN,
      overwrite: "auto"
    });
  }

  return Promise.resolve();
}

export function loaderHide() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  if (!window.gsap) {
    els.wrap.style.display = "none";
    els.wrap.style.pointerEvents = "none";
    return Promise.resolve();
  }

  window.gsap.set(els.wrap, {
    display: "none",
    pointerEvents: "none",
    autoAlpha: 0
  });

  window.gsap.set(els.stage, { autoAlpha: 1 });

  if (els.progressTrack) window.gsap.set(els.progressTrack, { clearProps: "opacity" });
  if (els.counterWrap) window.gsap.set(els.counterWrap, { clearProps: "transform,opacity" });

  return Promise.resolve();
}

/**
 * FIRST PHASE ONLY:
 * Fill line to 60% while "Hi" is on screen.
 * (Keeps your existing text timing intact)
 */
export function loaderProgressTo(duration = 1.5, container = document) {
  const root = getLoaderRoot(container);
  if (!root) return Promise.resolve();

  setProgress(root, 0);

  if (!window.gsap) {
    setProgress(root, 0.6);
    return Promise.resolve();
  }

  const state = { value: 0 };

  return window.gsap.to(state, {
    value: 0.6,
    duration: duration * 0.65, // nice longer first phase
    ease: EASE_OUT,
    onUpdate: () => setProgress(root, state.value),
    onComplete: () => setProgress(root, 0.6)
  }).then(() => {});
}

/**
 * Outro sequence:
 * - "Hi" out
 * - counter out
 * - "I’m" in
 * - line finishes 60% -> 100% during "I’m"
 * - homepage reveal starts underneath
 * - "I’m" out
 * - loader fades away
 */
export function loaderOutro({ onRevealStart, container } = {}) {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  const root = getLoaderRoot(container || document);
  const line1Split = splitLoaderLine(els.line1);
  const line2Split = splitLoaderLine(els.line2);

  const tl = window.gsap.timeline();
  let revealStarted = false;

  const fireRevealStart = () => {
    if (revealStarted) return;
    revealStarted = true;
    if (typeof onRevealStart === "function") onRevealStart();
  };

  // State object for progress continuation
  const progressState = { value: 0.6 };

  // Keep your good timing feel:
  // "Hi" and counter move out together
  if (line1Split.chars.length) {
    tl.to(line1Split.chars, {
      yPercent: -100,
      duration: TEXT_DUR,
      ease: EASE_OUT,
      stagger: { each: LETTER_STAGGER_OUT, from: "start" }
    }, 0.02);
  }

  if (els.counterWrap) {
    tl.to(els.counterWrap, {
      yPercent: -100,
      duration: TEXT_DUR,
      ease: EASE_OUT
    }, 0.02);
  }

  // "I’m" comes in (same reveal style)
  if (line2Split.chars.length) {
    tl.to(line2Split.chars, {
      yPercent: 0,
      duration: TEXT_DUR,
      ease: EASE_OUT,
      stagger: { each: LETTER_STAGGER_IN, from: "start" }
    }, 0.28);
  }

  // Progress line finishes during the "I’m" phase (this is the main fix)
  tl.to(progressState, {
    value: 1,
    duration: 0.95,
    ease: EASE_IN_OUT,
    onUpdate: () => setProgress(root, progressState.value),
    onComplete: () => setProgress(root, 1)
  }, 0.30);

  // Start homepage reveal underneath while loader still visible
  tl.call(fireRevealStart, [], 0.62);

  // Hold timing then send "I’m" up
  if (line2Split.chars.length) {
    tl.to(line2Split.chars, {
      yPercent: -100,
      duration: TEXT_DUR,
      ease: EASE_OUT,
      stagger: { each: LETTER_STAGGER_OUT, from: "start" }
    }, 1.18);
  }

  // Fade loader away (no clip-path)
  tl.to(els.stage, {
    autoAlpha: 0,
    duration: FADE_DUR,
    ease: EASE_IN_OUT
  }, 1.34);

  return tl.then(() => {});
}

export async function runLoader(duration = 1.5, container = document, opts = {}) {
  await loaderShow();

  // Phase 1: progress to 60 while "Hi" sits there
  await loaderProgressTo(duration, container);

  // Phase 2: text transition + remaining progress + fade
  await loaderOutro({
    ...opts,
    container
  });

  await loaderHide();
}
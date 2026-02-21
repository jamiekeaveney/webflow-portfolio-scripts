// src/features/loader.js

function getLoaderEls() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;

  return {
    wrap,
    helloWord: wrap.querySelector('[data-loader-word="hello"]'),
    imWord: wrap.querySelector('[data-loader-word="im"]'),
    counterWrap: wrap.querySelector(".loader-counter-wrap"),
    progressLine: wrap.querySelector(".loader-progress-line")
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

const LINE_HEIGHT = "0.25rem";
const WORD_DUR = 1.0;
const WORD_STAGGER_IN = 0.09;
const WORD_STAGGER_OUT = 0.05;

function getLetters(wordEl) {
  if (!wordEl) return [];
  return Array.from(wordEl.querySelectorAll(".loader-word-letter"));
}

function setWordState(wordEl, yPercent = 120) {
  if (!window.gsap || !wordEl) return;
  const letters = getLetters(wordEl);
  if (!letters.length) return;
  window.gsap.set(letters, { yPercent });
}

function animateWordIn(tl, wordEl, at = 0) {
  if (!wordEl) return;
  const letters = getLetters(wordEl);
  if (!letters.length) return;

  tl.to(
    letters,
    {
      yPercent: 0,
      duration: WORD_DUR,
      ease: EASE_OUT,
      stagger: WORD_STAGGER_IN,
      overwrite: "auto"
    },
    at
  );
}

function animateWordOut(tl, wordEl, at = 0) {
  if (!wordEl) return;
  const letters = getLetters(wordEl);
  if (!letters.length) return;

  tl.to(
    letters,
    {
      yPercent: -100,
      duration: WORD_DUR,
      ease: EASE_OUT,
      stagger: { each: WORD_STAGGER_OUT, from: "start" },
      overwrite: "auto"
    },
    at
  );
}

export function loaderShow() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  if (!window.gsap) {
    els.wrap.style.display = "block";
    els.wrap.style.pointerEvents = "auto";
    return Promise.resolve();
  }

  window.gsap.killTweensOf([
    els.wrap,
    els.counterWrap,
    els.progressLine,
    ...getLetters(els.helloWord),
    ...getLetters(els.imWord)
  ]);

  // Reset progress var (CSS width uses this)
  els.wrap.style.setProperty("--_feedback---number-counter", "0");

  window.gsap.set(els.wrap, {
    display: "block",
    pointerEvents: "auto",
    autoAlpha: 1
  });

  if (els.progressLine) {
    window.gsap.set(els.progressLine, {
      height: LINE_HEIGHT
    });
  }

  if (els.counterWrap) {
    window.gsap.set(els.counterWrap, { yPercent: 0, autoAlpha: 1 });
  }

  // Prepare words
  setWordState(els.helloWord, 120);
  setWordState(els.imWord, 120);

  // Intro timeline (keep the timing feel you liked)
  const tl = window.gsap.timeline();

  animateWordIn(tl, els.helloWord, 0);

  // Hello exits and I'm enters around the same feel as before
  animateWordOut(tl, els.helloWord, 0.95);
  animateWordIn(tl, els.imWord, 1.05);

  return tl.then(() => {});
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

  if (els.progressLine) {
    window.gsap.set(els.progressLine, {
      clearProps: "height"
    });
  }

  if (els.counterWrap) {
    window.gsap.set(els.counterWrap, {
      yPercent: 0,
      autoAlpha: 1
    });
  }

  // Reset words back below for next hard refresh
  setWordState(els.helloWord, 120);
  setWordState(els.imWord, 120);

  return Promise.resolve();
}

/**
 * Progress is synced in two stages:
 * - 0 -> 60% while "Hello" is on screen
 * - 60 -> 100% while "I'm" is on screen
 */
export function loaderProgressTo(duration = 1.5, container = document) {
  const root = getLoaderRoot(container);
  if (!root) return Promise.resolve();

  root.style.setProperty("--_feedback---number-counter", "0");

  if (!window.gsap) {
    root.style.setProperty("--_feedback---number-counter", "1");
    return Promise.resolve();
  }

  const state = { value: 0 };
  const tl = window.gsap.timeline();

  // Stage 1: to 60%
  tl.to(state, {
    value: 0.6,
    duration: duration * 0.62,
    ease: EASE_OUT,
    onUpdate: () => {
      root.style.setProperty("--_feedback---number-counter", String(state.value));
    }
  });

  // Stage 2: 60 -> 100
  tl.to(state, {
    value: 1,
    duration: duration * 0.38,
    ease: EASE_IN_OUT,
    onUpdate: () => {
      root.style.setProperty("--_feedback---number-counter", String(state.value));
    },
    onComplete: () => {
      root.style.setProperty("--_feedback---number-counter", "1");
    }
  });

  return tl.then(() => {});
}

/**
 * Final text outro + loader fade.
 * onRevealStart fires exactly when fade begins so homepage reveals start then.
 */
export function loaderOutro({ onRevealStart } = {}) {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  const tl = window.gsap.timeline();
  let fired = false;

  const fireRevealStart = () => {
    if (fired) return;
    fired = true;
    if (typeof onRevealStart === "function") onRevealStart();
  };

  // "I'm" exits first at the end (not the counter)
  animateWordOut(tl, els.imWord, 0);

  // Counter exits at 100% (this fixes your main issue)
  if (els.counterWrap) {
    tl.to(
      els.counterWrap,
      {
        yPercent: -100,
        duration: WORD_DUR,
        ease: EASE_OUT
      },
      0.06
    );
  }

  // Trigger home reveal the moment loader fade begins
  tl.call(fireRevealStart, [], 0.22);

  // Fade loader away (simple, no clip path now)
  tl.to(
    els.wrap,
    {
      autoAlpha: 0,
      duration: 0.5,
      ease: EASE_IN_OUT
    },
    0.22
  );

  return tl.then(() => {});
}

export async function runLoader(duration = 1.5, container = document, opts = {}) {
  await loaderShow();
  await loaderProgressTo(duration, container);
  await loaderOutro(opts);
  await loaderHide();
}
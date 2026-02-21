// src/features/loader.js

function getLoaderEls() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;

  // Keep this flexible so it works with your current markup
  const stage = wrap.querySelector(".loader-stage") || wrap;

  // Two-word loader setup (Hi -> I'm)
  const wordHi =
    wrap.querySelector('[data-loader-word="hi"]') ||
    wrap.querySelector(".loader-word-hi") ||
    wrap.querySelector(".loader-copy-hi");

  const wordIm =
    wrap.querySelector('[data-loader-word="im"]') ||
    wrap.querySelector(".loader-word-im") ||
    wrap.querySelector(".loader-copy-im");

  const counterWrap = wrap.querySelector(".loader-counter-wrap");
  const progressTrack = wrap.querySelector(".loader-progress-track");
  const progressLine = wrap.querySelector(".loader-progress-line");

  return {
    wrap,
    stage,
    wordHi,
    wordIm,
    counterWrap,
    progressTrack,
    progressLine
  };
}

function getLetters(el) {
  if (!el) return [];
  // Works with your split.js output first, falls back to manual spans if present
  return Array.from(el.querySelectorAll(".single-letter, .loader-hero-letter"));
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
const LETTER_STAGGER_IN = 0.09;  // matches your home feel
const LETTER_STAGGER_OUT = 0.06;
const WORD_DUR = 1.0;

// ---------- SHOW / HIDE ----------

export function loaderShow() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  const hiLetters = getLetters(els.wordHi);
  const imLetters = getLetters(els.wordIm);

  if (!window.gsap) {
    els.wrap.style.display = "block";
    els.wrap.style.pointerEvents = "auto";
    return Promise.resolve();
  }

  window.gsap.killTweensOf([
    els.wrap,
    els.stage,
    els.counterWrap,
    els.progressTrack,
    els.progressLine,
    ...hiLetters,
    ...imLetters
  ]);

  // Reset progress variable
  els.wrap.style.setProperty("--_feedback---number-counter", "0");

  // Show loader
  window.gsap.set(els.wrap, {
    display: "block",
    pointerEvents: "auto",
    autoAlpha: 1
  });

  // No clip-path outro needed anymore, but keep stage reset if present
  if (els.stage) {
    window.gsap.set(els.stage, {
      clipPath: "inset(0% 0% 0% 0%)"
    });
  }

  // Track / line visible
  if (els.progressTrack) {
    window.gsap.set(els.progressTrack, { autoAlpha: 1 });
  }

  if (els.progressLine) {
    window.gsap.set(els.progressLine, {
      height: LINE_HEIGHT,
      bottom: 0,
      left: 0
      // width is controlled by CSS var
    });
  }

  // Counter visible (do NOT animate it out here)
  if (els.counterWrap) {
    window.gsap.set(els.counterWrap, {
      yPercent: 0,
      autoAlpha: 1
    });
  }

  // Prep words
  if (els.wordHi) window.gsap.set(els.wordHi, { autoAlpha: 1 });
  if (els.wordIm) window.gsap.set(els.wordIm, { autoAlpha: 1 });

  // "Hi" starts hidden below
  if (hiLetters.length) {
    window.gsap.set(hiLetters, { yPercent: 120 });
    window.gsap.to(hiLetters, {
      yPercent: 0,
      duration: WORD_DUR,
      ease: EASE_OUT,
      stagger: LETTER_STAGGER_IN,
      overwrite: "auto"
    });
  }

  // "I'm" starts hidden below (will animate later)
  if (imLetters.length) {
    window.gsap.set(imLetters, { yPercent: 120 });
  }

  return Promise.resolve();
}

export function loaderHide() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  const hiLetters = getLetters(els.wordHi);
  const imLetters = getLetters(els.wordIm);

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

  if (els.stage) {
    window.gsap.set(els.stage, {
      clipPath: "inset(0% 0% 0% 0%)"
    });
  }

  if (els.progressTrack) {
    window.gsap.set(els.progressTrack, { autoAlpha: 1 });
  }

  if (els.progressLine) {
    window.gsap.set(els.progressLine, {
      clearProps: "height,bottom,left"
    });
  }

  if (els.counterWrap) {
    window.gsap.set(els.counterWrap, {
      clearProps: "transform,opacity"
    });
  }

  if (hiLetters.length) window.gsap.set(hiLetters, { clearProps: "transform,opacity" });
  if (imLetters.length) window.gsap.set(imLetters, { clearProps: "transform,opacity" });

  return Promise.resolve();
}

// ---------- PROGRESS + WORD SWITCH ----------
// This is where we keep the nice timing and sync the line:
// - progress to ~60% while "Hi" is on screen
// - switch to "I'm"
// - finish progress to 100%

export function loaderProgressTo(duration = 1.5, container = document) {
  const root = getLoaderRoot(container);
  const els = getLoaderEls();
  if (!root || !els) return Promise.resolve();

  const hiLetters = getLetters(els.wordHi);
  const imLetters = getLetters(els.wordIm);

  root.style.setProperty("--_feedback---number-counter", "0");

  if (!window.gsap) {
    root.style.setProperty("--_feedback---number-counter", "1");
    return Promise.resolve();
  }

  const state = { value: 0 };
  const tl = window.gsap.timeline();

  // STEP 1: 0 -> 60% while "Hi" is on screen
  tl.to(state, {
    value: 0.6,
    duration: duration * 0.62,
    ease: EASE_OUT,
    onUpdate: () => {
      root.style.setProperty("--_feedback---number-counter", String(state.value));
    }
  });

  // Word transition: "Hi" out, "I'm" in
  if (hiLetters.length) {
    tl.to(hiLetters, {
      yPercent: -100,
      duration: WORD_DUR,
      ease: EASE_OUT,
      stagger: { each: LETTER_STAGGER_OUT, from: "start" }
    }, ">-0.06");
  }

  if (imLetters.length) {
    tl.to(imLetters, {
      yPercent: 0,
      duration: WORD_DUR,
      ease: EASE_OUT,
      stagger: { each: LETTER_STAGGER_IN, from: "start" }
    }, "<0.14");
  }

  // STEP 2: 60% -> 100% while "I'm" is on screen
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
  }, "<0.18");

  return tl.then(() => {});
}

// ---------- OUTRO ----------
// Counter exits only at 100% (not at 60)
// Fire home reveal right when loader starts fading (not after fade finishes)

export function loaderOutro({ onRevealStart } = {}) {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  const imLetters = getLetters(els.wordIm);
  let revealStarted = false;

  const fireRevealStart = () => {
    if (revealStarted) return;
    revealStarted = true;
    if (typeof onRevealStart === "function") onRevealStart();
  };

  const tl = window.gsap.timeline();

  // "I'm" exits upward at the end
  if (imLetters.length) {
    tl.to(imLetters, {
      yPercent: -100,
      duration: WORD_DUR,
      ease: EASE_OUT,
      stagger: { each: LETTER_STAGGER_OUT, from: "start" }
    }, 0);
  }

  // Counter exits at the same time (at 100%)
  if (els.counterWrap) {
    tl.to(els.counterWrap, {
      yPercent: -100,
      duration: WORD_DUR,
      ease: EASE_OUT
    }, 0.02);
  }

  // Start homepage reveal as soon as loader starts fading
  tl.call(fireRevealStart, [], 0.12);

  // Simple fade out (no clip-path wipe now)
  tl.to(els.wrap, {
    autoAlpha: 0,
    duration: 0.45,
    ease: EASE_IN_OUT
  }, 0.12);

  return tl.then(() => {});
}

export async function runLoader(duration = 1.5, container = document, opts = {}) {
  await loaderShow();
  await loaderProgressTo(duration, container);
  await loaderOutro(opts);
  await loaderHide();
}
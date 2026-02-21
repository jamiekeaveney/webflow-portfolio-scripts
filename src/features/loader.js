function getLoaderEls() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;

  const stage = wrap.querySelector(".loader-stage") || wrap;

  return {
    wrap,
    stage,
    heroLetters: wrap.querySelectorAll(".loader-hero-letter"),
    counterWrap: wrap.querySelector(".loader-counter-wrap"),
    progressTrack: wrap.querySelector(".loader-progress-track"),
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

const EASE = "expo.out";
const EASE_IN_OUT = "expo.inOut";
const LINE_HEIGHT = "0.25rem";
const LETTER_STAGGER_IN = 0.09;
const LETTER_STAGGER_OUT = 0.05;
const TRANSFORM_DUR = 1.0;

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
    els.stage,
    els.counterWrap,
    els.progressTrack,
    els.progressLine,
    ...(els.heroLetters ? Array.from(els.heroLetters) : [])
  ]);

  // reset progress var so CSS width starts at 0
  els.wrap.style.setProperty("--_feedback---number-counter", "0");

  window.gsap.set(els.wrap, {
    display: "block",
    pointerEvents: "auto",
    autoAlpha: 1
  });

  window.gsap.set(els.stage, {
    clipPath: "inset(0% 0% 0% 0%)"
  });

  if (els.progressTrack) {
    window.gsap.set(els.progressTrack, { autoAlpha: 1 });
  }

  if (els.progressLine) {
    // IMPORTANT: do NOT set width here, CSS var controls width
    window.gsap.set(els.progressLine, {
      height: LINE_HEIGHT,
      bottom: 0,
      left: 0
    });
  }

  if (els.counterWrap) {
    window.gsap.set(els.counterWrap, { yPercent: 0 });
  }

  if (els.heroLetters?.length) {
    window.gsap.set(els.heroLetters, { yPercent: 120 });

    window.gsap.to(els.heroLetters, {
      yPercent: 0,
      duration: TRANSFORM_DUR,
      ease: EASE,
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

  window.gsap.set(els.stage, {
    clipPath: "inset(0% 0% 0% 0%)"
  });

  if (els.progressTrack) {
    window.gsap.set(els.progressTrack, { autoAlpha: 1 });
  }

  if (els.progressLine) {
    // keep CSS width logic intact; only clear animated props
    window.gsap.set(els.progressLine, {
      clearProps: "height,bottom,left"
    });
  }

  if (els.counterWrap) {
    window.gsap.set(els.counterWrap, { yPercent: 0 });
  }

  if (els.heroLetters?.length) {
    window.gsap.set(els.heroLetters, { clearProps: "transform" });
  }

  return Promise.resolve();
}

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

  // 2-step progress curve (expo family only)
  tl.to(state, {
    value: 0.84,
    duration: duration * 0.68,
    ease: EASE,
    onUpdate: () => {
      root.style.setProperty("--_feedback---number-counter", String(state.value));
    }
  });

  tl.to(state, {
    value: 1,
    duration: duration * 0.32,
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
 * Loader outro with optional overlap callback.
 * onRevealStart fires while the loader is still covering the page,
 * so your homepage reveal can start underneath.
 */
export function loaderOutro({ onRevealStart } = {}) {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  const tl = window.gsap.timeline();
  let revealStarted = false;

  const fireRevealStart = () => {
    if (revealStarted) return;
    revealStarted = true;
    if (typeof onRevealStart === "function") onRevealStart();
  };

  if (els.counterWrap) {
    tl.to(els.counterWrap, {
      yPercent: -100,
      duration: TRANSFORM_DUR,
      ease: EASE
    }, 0.04);
  }

  // Jamie remains visible through wipe, exits later
  if (els.heroLetters?.length) {
    tl.to(els.heroLetters, {
      yPercent: -100,
      duration: TRANSFORM_DUR,
      ease: EASE,
      stagger: { each: LETTER_STAGGER_OUT, from: "start" }
    }, 0.90);
  }

  // White line expands upward from the bottom (same element)
  if (els.progressLine) {
    tl.to(els.progressLine, {
      height: "100vh",
      duration: 1.0,
      ease: EASE_IN_OUT
    }, 0.15);
  }

  if (els.progressTrack) {
    tl.to(els.progressTrack, {
      autoAlpha: 0,
      duration: 0.25,
      ease: "none"
    }, 0.45);
  }

  // Start the homepage reveal earlier, while the loader is still on top
  tl.call(fireRevealStart, [], 0.35);

  // Clip the whole stage before white fully tops out
  if (els.stage) {
    tl.to(els.stage, {
      clipPath: "inset(0% 0% 100% 0%)",
      duration: 0.9,
      ease: EASE_IN_OUT
    }, 0.52);
  }

  return tl.then(() => {});
}

export async function runLoader(duration = 1.5, container = document, opts = {}) {
  await loaderShow();
  await loaderProgressTo(duration, container);
  await loaderOutro(opts);
  await loaderHide();
}
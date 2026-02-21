function getLoaderEls() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;

  return {
    wrap,
    clip: wrap.querySelector('[data-loader="clip"]'),
    heroLetters: wrap.querySelectorAll(".loader-hero-letter"),
    counterWrap: wrap.querySelector(".loader-counter-wrap"),
    progressTrack: wrap.querySelector(".loader-progress-track"),
    progressRange: wrap.querySelector(".loader-progress-range"),
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
const LINE_HEIGHT_MOBILE = "0.2rem";
const LETTER_STAGGER_IN = 0.09;
const LETTER_STAGGER_OUT = 0.05;
const TRANSFORM_DUR = 1.0;

/**
 * Choose:
 * - "cover"     => big Jamie stays, white wipe covers it
 * - "exit-first" => big Jamie staggers up before white wipe grows
 */
const HERO_OUT_MODE = "cover";

function getBaseLineHeight() {
  return window.matchMedia("(max-width: 48rem)").matches ? LINE_HEIGHT_MOBILE : LINE_HEIGHT;
}

export function loaderShow() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  const baseLineHeight = getBaseLineHeight();

  if (!window.gsap) {
    els.wrap.style.display = "block";
    els.wrap.style.pointerEvents = "auto";
    if (els.clip) els.clip.style.clipPath = "inset(0% 0% 0% 0%)";
    return Promise.resolve();
  }

  const killTargets = [
    els.wrap,
    els.clip,
    els.counterWrap,
    els.progressTrack,
    els.progressRange,
    els.progressLine,
    ...(els.heroLetters ? Array.from(els.heroLetters) : [])
  ].filter(Boolean);

  window.gsap.killTweensOf(killTargets);

  window.gsap.set(els.wrap, {
    display: "block",
    pointerEvents: "auto",
    autoAlpha: 1
  });

  if (els.clip) {
    window.gsap.set(els.clip, {
      clipPath: "inset(0% 0% 0% 0%)"
    });
  }

  if (els.progressTrack) {
    window.gsap.set(els.progressTrack, {
      height: baseLineHeight,
      autoAlpha: 1
    });
  }

  if (els.progressRange) {
    window.gsap.set(els.progressRange, { autoAlpha: 1 });
  }

  if (els.progressLine) {
    window.gsap.set(els.progressLine, {
      width: "0%",
      height: "100%"
    });
  }

  if (els.counterWrap) {
    window.gsap.set(els.counterWrap, { yPercent: 0 });
  }

  if (els.heroLetters && els.heroLetters.length) {
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

  const baseLineHeight = getBaseLineHeight();

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

  if (els.clip) {
    window.gsap.set(els.clip, {
      clipPath: "inset(0% 0% 0% 0%)"
    });
  }

  if (els.progressTrack) {
    window.gsap.set(els.progressTrack, {
      height: baseLineHeight,
      autoAlpha: 1
    });
  }

  if (els.progressRange) {
    window.gsap.set(els.progressRange, { autoAlpha: 1 });
  }

  if (els.progressLine) {
    window.gsap.set(els.progressLine, {
      width: "0%",
      height: "100%"
    });
  }

  if (els.counterWrap) {
    window.gsap.set(els.counterWrap, { yPercent: 0 });
  }

  if (els.heroLetters && els.heroLetters.length) {
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

  // smooth “designer” progression; no weird pulse
  tl.to(state, {
    value: 0.74,
    duration: duration * 0.56,
    ease: EASE,
    onUpdate: () => {
      root.style.setProperty("--_feedback---number-counter", String(state.value));
    }
  });

  tl.to(state, {
    value: 0.93,
    duration: duration * 0.24,
    ease: "power2.out",
    onUpdate: () => {
      root.style.setProperty("--_feedback---number-counter", String(state.value));
    }
  });

  tl.to(state, {
    value: 1,
    duration: duration * 0.20,
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

export function loaderOutro() {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  const tl = window.gsap.timeline();

  // Counter exits upward (clipped)
  if (els.counterWrap) {
    tl.to(els.counterWrap, {
      yPercent: -100,
      duration: TRANSFORM_DUR,
      ease: EASE
    }, 0.00);
  }

  // Optional big Jamie exit BEFORE wipe grows
  if (HERO_OUT_MODE === "exit-first" && els.heroLetters && els.heroLetters.length) {
    tl.to(els.heroLetters, {
      yPercent: -100,
      duration: TRANSFORM_DUR,
      ease: EASE,
      stagger: {
        each: LETTER_STAGGER_OUT,
        from: "start"
      }
    }, 0.00);
  }

  // White progress line becomes wipe (height grows)
  if (els.progressLine) {
    tl.to(els.progressLine, {
      height: "100vh",
      duration: 1.0,
      ease: EASE_IN_OUT
    }, HERO_OUT_MODE === "exit-first" ? 0.18 : 0.10);
  }

  // Track/range can fade once wipe starts
  if (els.progressTrack) {
    tl.to(els.progressTrack, {
      autoAlpha: 0,
      duration: 0.25,
      ease: "none"
    }, 0.38);
  }

  // If cover mode, Jamie exits later (or comment this out entirely to let clip hide it)
  if (HERO_OUT_MODE === "cover" && els.heroLetters && els.heroLetters.length) {
    tl.to(els.heroLetters, {
      yPercent: -100,
      duration: TRANSFORM_DUR,
      ease: EASE,
      stagger: {
        each: LETTER_STAGGER_OUT,
        from: "start"
      }
    }, 0.85);
  }

  // Clip the whole loader away BEFORE wipe fully settles (prevents white hold)
  if (els.clip) {
    tl.to(els.clip, {
      clipPath: "inset(0% 0% 100% 0%)",
      duration: 0.78,
      ease: EASE_IN_OUT
    }, 0.78);
  }

  return tl.then(() => {});
}

export async function runLoader(duration = 1.5, container = document) {
  await loaderShow();
  await loaderProgressTo(duration, container);
  await loaderOutro();
  await loaderHide();
}
function getLoaderEls() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;

  return {
    wrap,
    nameShell: wrap.querySelector(".loader-name-shell"),
    counterWrap: wrap.querySelector(".loader-counter-wrap"),
    progressTrack: wrap.querySelector(".loader-progress-track")
  };
}

function getLoaderRoot(container) {
  return (
    (container && container.querySelector && container.querySelector("[data-loader]")) ||
    (container && container.querySelector && container.querySelector('[data-loader="wrap"]')) ||
    document.querySelector("[data-loader]") ||
    document.querySelector('[data-loader="wrap"]') ||
    document.documentElement
  );
}

const EASE = "expo.out";
const EASE_IN_OUT = "expo.inOut";

// Branded timing defaults
const LINE_BASE_HEIGHT = "0.2rem";
const LINE_PULSE_HEIGHT = "0.28rem";

export function loaderShow() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  if (window.gsap) {
    window.gsap.set(els.wrap, {
      display: "block",
      pointerEvents: "auto",
      autoAlpha: 1,
      clipPath: "inset(0% 0% 0% 0%)",
      willChange: "clip-path"
    });

    if (els.progressTrack) {
      window.gsap.set(els.progressTrack, {
        height: LINE_BASE_HEIGHT,
        transformOrigin: "bottom center",
        willChange: "height"
      });
    }

    if (els.nameShell) {
      window.gsap.set(els.nameShell, {
        yPercent: 0,
        autoAlpha: 1,
        willChange: "transform, opacity"
      });
    }

    if (els.counterWrap) {
      window.gsap.set(els.counterWrap, {
        y: 0,
        autoAlpha: 1,
        willChange: "transform, opacity"
      });
    }
  } else {
    els.wrap.style.display = "block";
    els.wrap.style.pointerEvents = "auto";
    els.wrap.style.clipPath = "inset(0% 0% 0% 0%)";
  }

  return Promise.resolve();
}

export function loaderHide() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  if (window.gsap) {
    // Clear performance hints too
    if (els.nameShell) window.gsap.set(els.nameShell, { clearProps: "willChange" });
    if (els.counterWrap) window.gsap.set(els.counterWrap, { clearProps: "willChange" });
    if (els.progressTrack) window.gsap.set(els.progressTrack, { clearProps: "willChange" });

    window.gsap.set(els.wrap, {
      display: "none",
      pointerEvents: "none",
      autoAlpha: 0,
      clipPath: "inset(0% 0% 0% 0%)",
      clearProps: "willChange"
    });
  } else {
    els.wrap.style.display = "none";
    els.wrap.style.pointerEvents = "none";
  }

  return Promise.resolve();
}

/**
 * Main progress driver
 * Keeps your single CSS variable as the source of truth.
 *
 * Enhanced feel:
 * - Progress curve is shaped (fast start, slight settle, confident finish)
 * - Subtle micro-motion on name/counter during load
 * - Tiny line pulse near the end for polish
 */
export function loaderProgressTo(duration = 1.5, container = document) {
  const root = getLoaderRoot(container);
  const els = getLoaderEls();
  if (!root) return Promise.resolve();

  root.style.setProperty("--_feedback---number-counter", "0");

  if (!window.gsap) {
    root.style.setProperty("--_feedback---number-counter", "1");
    return Promise.resolve();
  }

  const state = { value: 0 };
  const tl = window.gsap.timeline();

  // Subtle micro-motion so the loader doesn't feel static
  if (els?.nameShell) {
    tl.to(
      els.nameShell,
      {
        yPercent: -1.4,
        duration: duration,
        ease: "none"
      },
      0
    );
  }

  if (els?.counterWrap) {
    tl.to(
      els.counterWrap,
      {
        y: "-0.12rem",
        duration: duration,
        ease: "none"
      },
      0
    );
  }

  // Progress shape:
  // 0 -> 0.84 (fast)
  // 0.84 -> 0.96 (slight settle)
  // 0.96 -> 1.00 (final push)
  tl.to(state, {
    value: 0.84,
    duration: duration * 0.68,
    ease: EASE,
    onUpdate: () => {
      root.style.setProperty("--_feedback---number-counter", String(state.value));
    }
  }, 0);

  tl.to(state, {
    value: 0.96,
    duration: duration * 0.20,
    ease: "power2.out",
    onUpdate: () => {
      root.style.setProperty("--_feedback---number-counter", String(state.value));
    }
  });

  // Small premium "pulse" before completion
  if (els?.progressTrack) {
    tl.to(
      els.progressTrack,
      {
        height: LINE_PULSE_HEIGHT,
        duration: 0.32,
        ease: EASE
      },
      duration * 0.78
    );

    tl.to(
      els.progressTrack,
      {
        height: LINE_BASE_HEIGHT,
        duration: 0.32,
        ease: EASE
      },
      duration * 0.98
    );
  }

  tl.to(state, {
    value: 1,
    duration: duration * 0.12,
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
 * Premium outro:
 * 1) Name and counter clear out cleanly
 * 2) Progress line thickens and becomes the full-screen white wipe
 * 3) Black loader plane clips upward to reveal page (no abrupt hide)
 */
export function loaderOutro() {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  const tl = window.gsap.timeline();

  // Clear text first (slightly staggered, same easing family)
  if (els.nameShell) {
    tl.to(els.nameShell, {
      yPercent: -12,
      autoAlpha: 0,
      duration: 0.75,
      ease: EASE
    }, 0);
  }

  if (els.counterWrap) {
    tl.to(els.counterWrap, {
      autoAlpha: 0,
      y: "-0.45rem",
      duration: 0.5,
      ease: EASE
    }, 0.04);
  }

  // Let the line become the visual wipe
  if (els.progressTrack) {
    tl.to(els.progressTrack, {
      height: "100vh",
      duration: 1.0,
      ease: EASE_IN_OUT
    }, 0.16);
  }

  // Hold the white screen just a touch, then clip the loader away
  // This makes the transition feel intentional, not like a toggle.
  tl.to(els.wrap, {
    clipPath: "inset(0% 0% 100% 0%)",
    duration: 0.85,
    ease: EASE_IN_OUT
  }, 0.78);

  return tl.then(() => {});
}

export async function runLoader(duration = 1.5, container = document) {
  await loaderShow();
  await loaderProgressTo(duration, container);
  await loaderOutro();
  await loaderHide();
}
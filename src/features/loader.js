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
const LINE_BASE_HEIGHT = "0.2rem";

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
 * Progress curve:
 * - quick confidence at the start
 * - controlled slow-down near the end
 * - final short push to 100
 *
 * No pulses / gimmicks — just better pacing.
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

  // subtle drift while loading (keeps it alive, very restrained)
  if (els?.nameShell) {
    tl.to(els.nameShell, {
      yPercent: -1.2,
      duration,
      ease: "none"
    }, 0);
  }

  if (els?.counterWrap) {
    tl.to(els.counterWrap, {
      y: "-0.1rem",
      duration,
      ease: "none"
    }, 0);
  }

  // Nice editorial-style progression:
  // 0 -> 0.78 (fast)
  // 0.78 -> 0.94 (gentle decel)
  // 0.94 -> 1.00 (decisive finish)
  tl.to(state, {
    value: 0.78,
    duration: duration * 0.58,
    ease: EASE,
    onUpdate: () => {
      root.style.setProperty("--_feedback---number-counter", String(state.value));
    }
  }, 0);

  tl.to(state, {
    value: 0.94,
    duration: duration * 0.24,
    ease: "power2.out",
    onUpdate: () => {
      root.style.setProperty("--_feedback---number-counter", String(state.value));
    }
  });

  tl.to(state, {
    value: 1,
    duration: duration * 0.18,
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
 * Outro:
 * - type leaves first
 * - progress line becomes the white plane
 * - black loader clips away
 */
export function loaderOutro() {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  const tl = window.gsap.timeline();

  if (els.nameShell) {
    tl.to(els.nameShell, {
      yPercent: -14,
      autoAlpha: 0,
      duration: 0.75,
      ease: EASE
    }, 0);
  }

  if (els.counterWrap) {
    tl.to(els.counterWrap, {
      autoAlpha: 0,
      y: "-0.4rem",
      duration: 0.5,
      ease: EASE
    }, 0.06);
  }

  if (els.progressTrack) {
    tl.to(els.progressTrack, {
      height: "100vh",
      duration: 1.0,
      ease: EASE_IN_OUT
    }, 0.18);
  }

  tl.to(els.wrap, {
    clipPath: "inset(0% 0% 100% 0%)",
    duration: 0.8,
    ease: EASE_IN_OUT
  }, 0.82);

  return tl.then(() => {});
}

export async function runLoader(duration = 1.5, container = document) {
  await loaderShow();
  await loaderProgressTo(duration, container);
  await loaderOutro();
  await loaderHide();
}
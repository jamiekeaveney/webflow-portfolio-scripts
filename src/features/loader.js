function getLoaderEls() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;

  return {
    wrap,
    bg: wrap.querySelector('[data-loader="bg"]') || wrap,
    content: wrap.querySelector('[data-loader="content"]') || null,
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

/**
 * Header CSS handles initial visible state.
 * This just ensures a consistent runtime state.
 */
export function loaderShow() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  if (window.gsap) {
    window.gsap.set(els.wrap, {
      display: "block",
      pointerEvents: "auto",
      autoAlpha: 1,
      clipPath: "inset(0% 0% 0% 0%)"
    });

    if (els.progressTrack) {
      window.gsap.set(els.progressTrack, { height: "0.12rem" });
    }

    if (els.nameShell) {
      window.gsap.set(els.nameShell, { yPercent: 0, autoAlpha: 1 });
    }

    if (els.counterWrap) {
      window.gsap.set(els.counterWrap, { y: 0, autoAlpha: 1 });
    }
  } else {
    els.wrap.style.display = "block";
    els.wrap.style.pointerEvents = "auto";
    els.wrap.style.clipPath = "inset(0% 0% 0% 0%)";
  }

  return Promise.resolve();
}

/**
 * Just turns it off after wipe finishes
 */
export function loaderHide() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  if (window.gsap) {
    window.gsap.set(els.wrap, {
      display: "none",
      pointerEvents: "none",
      autoAlpha: 0,
      clipPath: "inset(0% 0% 0% 0%)"
    });
  } else {
    els.wrap.style.display = "none";
    els.wrap.style.pointerEvents = "none";
  }

  return Promise.resolve();
}

/**
 * Drives:
 * - name reveal fill width
 * - bottom progress line width
 * - .counter via loader-counter.js
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

  return window.gsap.to(state, {
    value: 1,
    duration,
    ease: "expo.out",
    onUpdate: () => {
      root.style.setProperty("--_feedback---number-counter", String(state.value));
    }
  }).then(() => {
    root.style.setProperty("--_feedback---number-counter", "1");
  });
}

/**
 * Outro:
 * 1) name slides up + fades
 * 2) counter fades
 * 3) bottom white line expands to full screen
 * 4) whole loader clips upward to reveal page (no abrupt toggle)
 */
export function loaderOutro() {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  const tl = window.gsap.timeline();

  if (els.nameShell) {
    tl.to(els.nameShell, {
      yPercent: -14,
      autoAlpha: 0,
      duration: 0.35,
      ease: "expo.inOut"
    }, 0);
  }

  if (els.counterWrap) {
    tl.to(els.counterWrap, {
      autoAlpha: 0,
      y: "-0.4rem",
      duration: 0.25,
      ease: "expo.out"
    }, 0);
  }

  if (els.progressTrack) {
    tl.to(els.progressTrack, {
      height: "100vh",
      duration: 0.5,
      ease: "expo.inOut"
    }, 0.06);
  }

  // Hold the white fullscreen for a beat, then wipe it up
  tl.to(els.wrap, {
    clipPath: "inset(0% 0% 100% 0%)",
    duration: 0.6,
    ease: "expo.inOut"
  }, 0.42);

  return tl.then(() => {});
}

export async function runLoader(duration = 1.5, container = document) {
  await loaderShow();
  await loaderProgressTo(duration, container);
  await loaderOutro();
  await loaderHide();
}
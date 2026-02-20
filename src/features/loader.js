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

    if (els.progressTrack) window.gsap.set(els.progressTrack, { height: "0.2rem" });
    if (els.nameShell) window.gsap.set(els.nameShell, { yPercent: 0, autoAlpha: 1 });
    if (els.counterWrap) window.gsap.set(els.counterWrap, { y: 0, autoAlpha: 1 });
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
    ease: EASE,
    onUpdate: () => {
      root.style.setProperty("--_feedback---number-counter", String(state.value));
    }
  }).then(() => {
    root.style.setProperty("--_feedback---number-counter", "1");
  });
}

export function loaderOutro() {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  const tl = window.gsap.timeline();

  // Fade timings: 250ms / 500ms
  // Transform timings: ~0.75s to 1s
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
      y: "-0.4rem",
      duration: 0.5,
      ease: EASE
    }, 0);
  }

  if (els.progressTrack) {
    tl.to(els.progressTrack, {
      height: "100vh",
      duration: 1.0,
      ease: EASE_IN_OUT
    }, 0.12);
  }

  // Wipe loader away (so it doesn't just disappear)
  tl.to(els.wrap, {
    clipPath: "inset(0% 0% 100% 0%)",
    duration: 0.75,
    ease: EASE_IN_OUT
  }, 0.65);

  return tl.then(() => {});
}

export async function runLoader(duration = 1.5, container = document) {
  await loaderShow();
  await loaderProgressTo(duration, container);
  await loaderOutro();
  await loaderHide();
}
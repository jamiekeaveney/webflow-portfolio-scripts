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
const LINE_BASE_HEIGHT = "0.25rem";

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

    if (els.progressTrack) window.gsap.set(els.progressTrack, { height: LINE_BASE_HEIGHT });
    if (els.nameShell) window.gsap.set(els.nameShell, { yPercent: 0 });
    if (els.counterWrap) window.gsap.set(els.counterWrap, { yPercent: 0 });
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

/* smoother, editorial progress shaping */
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

  tl.to(state, {
    value: 0.72,
    duration: duration * 0.52,
    ease: EASE,
    onUpdate: () => {
      root.style.setProperty("--_feedback---number-counter", String(state.value));
    }
  });

  tl.to(state, {
    value: 0.92,
    duration: duration * 0.28,
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

  // text exits upward, clipped by parent wrappers (no fade)
  if (els.nameShell) {
    tl.to(els.nameShell, {
      yPercent: -100,
      duration: 1.0,
      ease: EASE
    }, 0);
  }

  if (els.counterWrap) {
    tl.to(els.counterWrap, {
      yPercent: -100,
      duration: 1.0,
      ease: EASE
    }, 0.06);
  }

  // line becomes white plane
  if (els.progressTrack) {
    tl.to(els.progressTrack, {
      height: "100vh",
      duration: 1.0,
      ease: EASE_IN_OUT
    }, 0.18);
  }

  // then black loader clips away upward to reveal page
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
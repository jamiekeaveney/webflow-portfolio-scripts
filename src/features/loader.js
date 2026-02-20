function getLoaderEls() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;

  return {
    wrap,
    bg: wrap.querySelector('[data-loader="bg"]') || wrap,
    content: wrap.querySelector('[data-loader="content"]') || null,
    heroHeading: wrap.querySelector('[data-loader-hero="heading"]'),
    heroLetters: wrap.querySelectorAll(".loader-hero-letter"),
    counterWrap: wrap.querySelector(".loader-counter-wrap"),
    progressTrack: wrap.querySelector(".loader-progress-track"),
    planeWhite: wrap.querySelector(".loader-plane-white"),
    planeGrey: wrap.querySelector(".loader-plane-grey")
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
const LINE_HEIGHT = "0.25rem";
const LETTER_STAGGER = 0.09;
const TRANSFORM_DUR = 1.0; // 1000ms (your standard)

export function loaderShow() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  if (!window.gsap) {
    els.wrap.style.display = "block";
    els.wrap.style.pointerEvents = "auto";
    els.wrap.style.clipPath = "inset(0% 0% 0% 0%)";
    return Promise.resolve();
  }

  window.gsap.killTweensOf([
    els.wrap,
    els.bg,
    els.counterWrap,
    els.progressTrack,
    els.planeWhite,
    els.planeGrey,
    ...(els.heroLetters ? Array.from(els.heroLetters) : [])
  ]);

  window.gsap.set(els.wrap, {
    display: "block",
    pointerEvents: "auto",
    autoAlpha: 1,
    clipPath: "inset(0% 0% 0% 0%)"
  });

  if (els.progressTrack) {
    window.gsap.set(els.progressTrack, { height: LINE_HEIGHT });
  }

  if (els.planeWhite) {
    window.gsap.set(els.planeWhite, { height: "0%" });
  }

  if (els.planeGrey) {
    window.gsap.set(els.planeGrey, { height: "0%" });
  }

  if (els.counterWrap) {
    window.gsap.set(els.counterWrap, { yPercent: 0 });
  }

  if (els.heroLetters && els.heroLetters.length) {
    // Split-text style entrance from below
    window.gsap.set(els.heroLetters, { yPercent: 120 });

    window.gsap.to(els.heroLetters, {
      yPercent: 0,
      duration: TRANSFORM_DUR,
      ease: EASE,
      stagger: LETTER_STAGGER,
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
    autoAlpha: 0,
    clipPath: "inset(0% 0% 0% 0%)"
  });

  if (els.progressTrack) window.gsap.set(els.progressTrack, { height: LINE_HEIGHT });
  if (els.planeWhite) window.gsap.set(els.planeWhite, { height: "0%" });
  if (els.planeGrey) window.gsap.set(els.planeGrey, { height: "0%" });
  if (els.counterWrap) window.gsap.set(els.counterWrap, { yPercent: 0 });
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

  // Nice editorial curve (same flavour as expo)
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

  // Counter slides up and clips (no fade)
  if (els.counterWrap) {
    tl.to(els.counterWrap, {
      yPercent: -100,
      duration: TRANSFORM_DUR,
      ease: EASE
    }, 0);
  }

  // Hero letters slide up and clip (same motion language as your split text)
  if (els.heroLetters && els.heroLetters.length) {
    tl.to(els.heroLetters, {
      yPercent: -100,
      duration: TRANSFORM_DUR,
      ease: EASE,
      stagger: {
        each: 0.05,
        from: "start"
      }
    }, 0.04);
  }

  // White plane rises first
  if (els.planeWhite) {
    tl.to(els.planeWhite, {
      height: "100%",
      duration: 1.0,
      ease: EASE_IN_OUT
    }, 0.16);
  }

  // Grey plane follows, also rising (slightly delayed)
  if (els.planeGrey) {
    tl.to(els.planeGrey, {
      height: "100%",
      duration: 1.0,
      ease: EASE_IN_OUT
    }, 0.42);
  }

  // Optional: hide bottom progress track once wipe has clearly started
  if (els.progressTrack) {
    tl.to(els.progressTrack, {
      autoAlpha: 0,
      duration: 0.25,
      ease: "none"
    }, 0.35);
  }

  // Final loader clip upward (reveals real page beneath)
  tl.to(els.wrap, {
    clipPath: "inset(0% 0% 100% 0%)",
    duration: 0.8,
    ease: EASE_IN_OUT
  }, 1.08);

  return tl.then(() => {});
}

export async function runLoader(duration = 1.5, container = document) {
  await loaderShow();
  await loaderProgressTo(duration, container);
  await loaderOutro();
  await loaderHide();
}
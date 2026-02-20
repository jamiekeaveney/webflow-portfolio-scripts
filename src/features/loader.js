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

// Match your site motion language
const LETTER_STAGGER = 0.09;   // same flavour as your hero split
const TRANSFORM_DUR = 1.0;     // 1000ms like your site
const FADE_DUR = 0.5;          // only used if ever needed

export function loaderShow() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  if (!window.gsap) {
    els.wrap.style.display = "block";
    els.wrap.style.pointerEvents = "auto";
    els.wrap.style.clipPath = "inset(0% 0% 0% 0%)";
    return Promise.resolve();
  }

  els.wrap.classList.remove("is-wipe-phase");

  window.gsap.set(els.wrap, {
    display: "block",
    pointerEvents: "auto",
    autoAlpha: 1,
    clipPath: "inset(0% 0% 0% 0%)"
  });

  if (els.progressTrack) {
    window.gsap.set(els.progressTrack, { height: LINE_BASE_HEIGHT });
  }

  if (els.counterWrap) {
    window.gsap.set(els.counterWrap, { yPercent: 0 });
  }

  if (els.heroLetters && els.heroLetters.length) {
    // Start letters below, same upward reveal language as your split text
    window.gsap.set(els.heroLetters, {
      yPercent: 120
    });

    // Animate loader hero letters in immediately
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

  if (window.gsap) {
    els.wrap.classList.remove("is-wipe-phase");

    window.gsap.set(els.wrap, {
      display: "none",
      pointerEvents: "none",
      autoAlpha: 0,
      clipPath: "inset(0% 0% 0% 0%)"
    });

    if (els.heroLetters && els.heroLetters.length) {
      window.gsap.set(els.heroLetters, { clearProps: "transform" });
    }
    if (els.counterWrap) window.gsap.set(els.counterWrap, { clearProps: "transform" });
    if (els.progressTrack) window.gsap.set(els.progressTrack, { clearProps: "height" });
  } else {
    els.wrap.style.display = "none";
    els.wrap.style.pointerEvents = "none";
  }

  return Promise.resolve();
}

/**
 * Progress variable driver
 * Keeps your counter + bar tied to one CSS variable
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

  // Editorial progression curve (same flavour as expo)
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

/**
 * Outro:
 * - Counter slides up and clips out
 * - Giant "Jamie" letters slide up and clip out (same motion language)
 * - Progress line expands into white plane
 * - Blend mode flips text while wipe is happening
 * - Loader clips away upward
 */
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
    }, 0);
  }

  // Hero letters exit upward, staggered (clipped)
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

  // Enter wipe phase so giant text inverts on white
  tl.call(() => {
    els.wrap.classList.add("is-wipe-phase");
  }, [], 0.14);

  // White line becomes full-screen white plane
  if (els.progressTrack) {
    tl.to(els.progressTrack, {
      height: "100vh",
      duration: 1.0,
      ease: EASE_IN_OUT
    }, 0.16);
  }

  // Then clip the black loader away upward
  tl.to(els.wrap, {
    clipPath: "inset(0% 0% 100% 0%)",
    duration: 0.8,
    ease: EASE_IN_OUT
  }, 0.84);

  return tl.then(() => {});
}

export async function runLoader(duration = 1.5, container = document) {
  await loaderShow();
  await loaderProgressTo(duration, container);
  await loaderOutro();
  await loaderHide();
}
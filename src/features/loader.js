function getLoaderEls() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;

  const stage = wrap.querySelector(".loader-stage") || wrap;

  return {
    wrap,
    stage,
    counterWrap: wrap.querySelector(".loader-counter-wrap"),
    progressTrack: wrap.querySelector(".loader-progress-track"),
    progressLine: wrap.querySelector(".loader-progress-line"),
    line1: wrap.querySelector('[data-loader-line="1"]'),
    line2: wrap.querySelector('[data-loader-line="2"]')
  };
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

const TEXT_DUR = 1.0;
const FADE_DUR = 0.5;
const LETTER_STAGGER = 0.09;
const LETTER_STAGGER_OUT = 0.05;

function splitLoaderLine(el) {
  if (!el) return null;

  if (el.__loaderChars && el.__loaderChars.length) {
    return { chars: el.__loaderChars, revert: el.__loaderRevert || null };
  }

  if (window.gsap && window.SplitText) {
    const split = new window.SplitText(el, {
      type: "chars",
      charsClass: "loader-char"
    });

    const chars = split.chars || [];
    el.__loaderChars = chars;
    el.__loaderRevert = () => {
      try { split.revert(); } catch (_) {}
      el.__loaderChars = null;
      el.__loaderRevert = null;
    };

    return { chars, revert: el.__loaderRevert };
  }

  const text = el.textContent || "";
  el.innerHTML = "";

  const frag = document.createDocumentFragment();
  const chars = [];

  for (const ch of text) {
    const span = document.createElement("span");
    span.className = "loader-char";
    span.textContent = ch === " " ? "\u00A0" : ch;
    frag.appendChild(span);
    chars.push(span);
  }

  el.appendChild(frag);

  el.__loaderChars = chars;
  el.__loaderRevert = null;

  return { chars, revert: null };
}

function setProgress(root, value) {
  if (!root) return;
  root.style.setProperty("--_feedback---number-counter", String(value));
}

export function loaderShow() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  if (!window.gsap) {
    els.wrap.style.display = "block";
    els.wrap.style.pointerEvents = "auto";
    return Promise.resolve();
  }

  const split1 = splitLoaderLine(els.line1);
  const split2 = splitLoaderLine(els.line2);

  window.gsap.killTweensOf([
    els.wrap,
    els.stage,
    els.counterWrap,
    els.progressTrack,
    els.progressLine,
    ...(split1?.chars || []),
    ...(split2?.chars || [])
  ]);

  setProgress(els.wrap, 0);

  window.gsap.set(els.wrap, {
    display: "block",
    pointerEvents: "auto",
    autoAlpha: 1
  });

  window.gsap.set(els.stage, { autoAlpha: 1 });

  if (els.progressTrack) window.gsap.set(els.progressTrack, { autoAlpha: 1 });
  if (els.counterWrap) window.gsap.set(els.counterWrap, { yPercent: 0, autoAlpha: 1 });

  // Prep line 1 (Hi) hidden below, line 2 (I’m) hidden below too
  if (split1?.chars?.length) {
    window.gsap.set(split1.chars, { yPercent: 120, autoAlpha: 1 });
  }
  if (split2?.chars?.length) {
    window.gsap.set(split2.chars, { yPercent: 120, autoAlpha: 1 });
  }

  // Animate "Hi" in immediately
  if (split1?.chars?.length) {
    window.gsap.to(split1.chars, {
      yPercent: 0,
      duration: TEXT_DUR,
      ease: EASE_OUT,
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
    autoAlpha: 0
  });

  window.gsap.set(els.stage, { autoAlpha: 1 });

  if (els.counterWrap) window.gsap.set(els.counterWrap, { clearProps: "transform,opacity" });
  if (els.progressTrack) window.gsap.set(els.progressTrack, { clearProps: "opacity" });

  return Promise.resolve();
}

/**
 * Progress is split intentionally:
 * - first chunk during "Hi" (to 60%)
 * - second chunk during "I’m" (to 100%)
 */
export function loaderProgressTo(duration = 1.5, container = document) {
  const root = getLoaderRoot(container);
  if (!root) return Promise.resolve();

  setProgress(root, 0);

  if (!window.gsap) {
    setProgress(root, 1);
    return Promise.resolve();
  }

  const state = { value: 0 };
  const tl = window.gsap.timeline();

  // Stage 1: up to 60% while "Hi" is on
  tl.to(state, {
    value: 0.6,
    duration: duration * 0.62,
    ease: EASE_OUT,
    onUpdate: () => setProgress(root, state.value)
  });

  // Small hold to sync with transition into "I’m"
  tl.to({}, {
    duration: duration * 0.08
  });

  // Stage 2: finish during "I’m"
  tl.to(state, {
    value: 1,
    duration: duration * 0.30,
    ease: EASE_IN_OUT,
    onUpdate: () => setProgress(root, state.value),
    onComplete: () => setProgress(root, 1)
  });

  return tl.then(() => {});
}

export function loaderOutro({ onRevealStart } = {}) {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  const split1 = splitLoaderLine(els.line1);
  const split2 = splitLoaderLine(els.line2);

  const tl = window.gsap.timeline();
  let revealStarted = false;

  const fireRevealStart = () => {
    if (revealStarted) return;
    revealStarted = true;
    if (typeof onRevealStart === "function") onRevealStart();
  };

  // "Hi" out
  if (split1?.chars?.length) {
    tl.to(split1.chars, {
      yPercent: -100,
      duration: TEXT_DUR,
      ease: EASE_OUT,
      stagger: { each: LETTER_STAGGER_OUT, from: "start" }
    }, 0.02);
  }

  // Counter out (same upward motion)
  if (els.counterWrap) {
    tl.to(els.counterWrap, {
      yPercent: -100,
      duration: TEXT_DUR,
      ease: EASE_OUT
    }, 0.02);
  }

  // "I’m" in (same stagger style as "Hi")
  if (split2?.chars?.length) {
    tl.to(split2.chars, {
      yPercent: 0,
      duration: TEXT_DUR,
      ease: EASE_OUT,
      stagger: { each: LETTER_STAGGER, from: "start" }
    }, 0.28);
  }

  // Start homepage reveal while "I’m" is still visible
  tl.call(fireRevealStart, [], 0.62);

  // Hold your current timing feel, then slide "I’m" out
  if (split2?.chars?.length) {
    tl.to(split2.chars, {
      yPercent: -100,
      duration: TEXT_DUR,
      ease: EASE_OUT,
      stagger: { each: LETTER_STAGGER_OUT, from: "start" }
    }, 1.18);
  }

  // Clean fade only (no clip-path)
  tl.to(els.stage, {
    autoAlpha: 0,
    duration: FADE_DUR,
    ease: EASE_IN_OUT
  }, 1.32);

  return tl.then(() => {});
}

export async function runLoader(duration = 1.5, container = document, opts = {}) {
  await loaderShow();

  // Run progress and text sequence together so they stay synced
  await Promise.all([
    loaderProgressTo(duration, container),
    loaderOutro(opts)
  ]);

  await loaderHide();
}
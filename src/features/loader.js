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

    // Keep your existing class setup
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
const FADE_DUR = 0.45;
const LETTER_STAGGER_IN = 0.09;
const LETTER_STAGGER_OUT = 0.05;

function splitLoaderLine(el) {
  if (!el) return { chars: [] };

  // Reuse if already split
  if (el.__loaderChars && el.__loaderChars.length) {
    return { chars: el.__loaderChars };
  }

  // Prefer GSAP SplitText if available
  if (window.gsap && window.SplitText) {
    const split = new window.SplitText(el, {
      type: "chars",
      charsClass: "loader-char"
    });

    el.__loaderChars = split.chars || [];
    el.__loaderSplit = split;
    return { chars: el.__loaderChars };
  }

  // Fallback manual split
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

  return { chars };
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
    ...(split1.chars || []),
    ...(split2.chars || [])
  ]);

  // Reset progress var
  setProgress(els.wrap, 0);

  // Show loader
  window.gsap.set(els.wrap, {
    display: "block",
    pointerEvents: "auto",
    autoAlpha: 1
  });

  if (els.stage) {
    window.gsap.set(els.stage, { autoAlpha: 1 });
  }

  if (els.progressTrack) {
    window.gsap.set(els.progressTrack, { autoAlpha: 1 });
  }

  if (els.counterWrap) {
    window.gsap.set(els.counterWrap, {
      yPercent: 0,
      autoAlpha: 1
    });
  }

  // Prep text lines (same markup, same classes)
  if (split1.chars.length) {
    window.gsap.set(split1.chars, { yPercent: 120, autoAlpha: 1 });
    window.gsap.to(split1.chars, {
      yPercent: 0,
      duration: TEXT_DUR,
      ease: EASE_OUT,
      stagger: LETTER_STAGGER_IN,
      overwrite: "auto"
    });
  }

  if (split2.chars.length) {
    window.gsap.set(split2.chars, { yPercent: 120, autoAlpha: 1 });
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

  if (els.stage) {
    window.gsap.set(els.stage, { autoAlpha: 1 });
  }

  if (els.progressTrack) {
    window.gsap.set(els.progressTrack, { clearProps: "opacity" });
  }

  if (els.counterWrap) {
    window.gsap.set(els.counterWrap, { clearProps: "transform,opacity" });
  }

  return Promise.resolve();
}

/**
 * Phase 1 only:
 * Fill to ~60% while line 1 ("Hi") is on screen.
 */
export function loaderProgressTo(duration = 1.5, container = document) {
  const root = getLoaderRoot(container);
  if (!root) return Promise.resolve();

  setProgress(root, 0);

  if (!window.gsap) {
    setProgress(root, 0.6);
    return Promise.resolve();
  }

  const state = { value: 0 };

  return window.gsap.to(state, {
    value: 0.6,
    duration: duration * 0.62,
    ease: EASE_OUT,
    onUpdate: () => setProgress(root, state.value),
    onComplete: () => setProgress(root, 0.6)
  }).then(() => {});
}

/**
 * Phase 2:
 * - line1 out
 * - line2 in
 * - progress 60 -> 100
 * - line2 out + counter out at 100
 * - fire homepage reveal when loader fade starts
 * - fade loader
 */
export function loaderOutro({ onRevealStart, container } = {}) {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  const root = getLoaderRoot(container || document);
  const split1 = splitLoaderLine(els.line1);
  const split2 = splitLoaderLine(els.line2);

  const progressState = { value: 0.6 };
  let revealStarted = false;

  const fireRevealStart = () => {
    if (revealStarted) return;
    revealStarted = true;
    if (typeof onRevealStart === "function") onRevealStart();
  };

  const tl = window.gsap.timeline();

  // "Hi" out (keep your timing feel)
  if (split1.chars.length) {
    tl.to(split1.chars, {
      yPercent: -100,
      duration: TEXT_DUR,
      ease: EASE_OUT,
      stagger: { each: LETTER_STAGGER_OUT, from: "start" }
    }, 0.02);
  }

  // "I'm" in
  if (split2.chars.length) {
    tl.to(split2.chars, {
      yPercent: 0,
      duration: TEXT_DUR,
      ease: EASE_OUT,
      stagger: { each: LETTER_STAGGER_IN, from: "start" }
    }, 0.28);
  }

  // Finish progress during "I'm"
  tl.to(progressState, {
    value: 1,
    duration: 0.95,
    ease: EASE_IN_OUT,
    onUpdate: () => setProgress(root, progressState.value),
    onComplete: () => setProgress(root, 1)
  }, 0.30);

  // At 100%: counter exits (FIX)
  if (els.counterWrap) {
    tl.to(els.counterWrap, {
      yPercent: -100,
      duration: TEXT_DUR,
      ease: EASE_OUT
    }, 1.18);
  }

  // "I'm" exits
  if (split2.chars.length) {
    tl.to(split2.chars, {
      yPercent: -100,
      duration: TEXT_DUR,
      ease: EASE_OUT,
      stagger: { each: LETTER_STAGGER_OUT, from: "start" }
    }, 1.18);
  }

  // Start homepage reveal the moment loader begins fading
  tl.call(fireRevealStart, [], 1.32);

  // Fade loader (simple, no clip-path)
  if (els.stage) {
    tl.to(els.stage, {
      autoAlpha: 0,
      duration: FADE_DUR,
      ease: EASE_IN_OUT
    }, 1.32);
  } else {
    tl.to(els.wrap, {
      autoAlpha: 0,
      duration: FADE_DUR,
      ease: EASE_IN_OUT
    }, 1.32);
  }

  return tl.then(() => {});
}

export async function runLoader(duration = 1.5, container = document, opts = {}) {
  await loaderShow();
  await loaderProgressTo(duration, container);
  await loaderOutro({ ...opts, container });
  await loaderHide();
}
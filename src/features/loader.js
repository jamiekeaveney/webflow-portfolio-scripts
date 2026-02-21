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

const PROGRESS_LINE_HOLD = 0.25; // visual line thickness already in CSS
const TEXT_DUR = 1.0;            // your transform flavour
const FADE_DUR = 0.5;            // your fade flavour
const LETTER_STAGGER = 0.09;

/**
 * Split loader line into chars with SplitText (preferred),
 * fallback to manual spans if SplitText not present.
 */
function splitLoaderLine(el) {
  if (!el) return null;

  // Re-use if already split this session
  if (el.__loaderChars && el.__loaderChars.length) {
    return { chars: el.__loaderChars, revert: el.__loaderRevert || null };
  }

  // GSAP SplitText route
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

  // Fallback route (manual spans)
  const text = el.textContent || "";
  el.innerHTML = "";

  const frag = document.createDocumentFragment();
  const chars = [];

  for (const ch of text) {
    const span = document.createElement("span");
    span.className = "loader-char";
    span.style.display = "inline-block";
    span.textContent = ch === " " ? "\u00A0" : ch;
    frag.appendChild(span);
    chars.push(span);
  }

  el.appendChild(frag);

  el.__loaderChars = chars;
  el.__loaderRevert = null;

  return { chars, revert: null };
}

function prepLineChars(chars, y = 120, autoAlpha = 1) {
  if (!window.gsap || !chars?.length) return;
  window.gsap.set(chars, {
    yPercent: y,
    autoAlpha,
    willChange: "transform, opacity"
  });
}

function animateLineIn(chars, opts = {}) {
  if (!window.gsap || !chars?.length) return null;
  return window.gsap.to(chars, {
    yPercent: 0,
    autoAlpha: 1,
    duration: opts.duration ?? TEXT_DUR,
    ease: opts.ease ?? EASE_OUT,
    stagger: opts.stagger ?? LETTER_STAGGER,
    overwrite: "auto"
  });
}

function animateLineOut(chars, opts = {}) {
  if (!window.gsap || !chars?.length) return null;
  return window.gsap.to(chars, {
    yPercent: -100,
    autoAlpha: opts.fade ? 0 : 1,
    duration: opts.duration ?? TEXT_DUR,
    ease: opts.ease ?? EASE_OUT,
    stagger: opts.stagger ?? 0.05,
    overwrite: "auto"
  });
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

  // reset progress var
  els.wrap.style.setProperty("--_feedback---number-counter", "0");

  // base visible states
  window.gsap.set(els.wrap, {
    display: "block",
    pointerEvents: "auto",
    autoAlpha: 1
  });

  window.gsap.set(els.stage, {
    clipPath: "inset(0% 0% 0% 0%)",
    autoAlpha: 1
  });

  if (els.progressTrack) window.gsap.set(els.progressTrack, { autoAlpha: 1 });
  if (els.progressLine) window.gsap.set(els.progressLine, { clearProps: "transform" });

  if (els.counterWrap) {
    window.gsap.set(els.counterWrap, { yPercent: 0, autoAlpha: 1 });
  }

  // prep copy
  if (els.line1) window.gsap.set(els.line1, { autoAlpha: 1 });
  if (els.line2) window.gsap.set(els.line2, { autoAlpha: 1 });

  prepLineChars(split1?.chars, 120, 1);
  prepLineChars(split2?.chars, 120, 1);

  // animate first line in
  animateLineIn(split1?.chars);

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

  window.gsap.set(els.stage, {
    clipPath: "inset(0% 0% 0% 0%)",
    autoAlpha: 1
  });

  if (els.counterWrap) window.gsap.set(els.counterWrap, { clearProps: "transform,opacity" });
  if (els.progressTrack) window.gsap.set(els.progressTrack, { clearProps: "opacity" });
  if (els.progressLine) window.gsap.set(els.progressLine, { clearProps: "transform" });

  // NOTE: we intentionally do not revert SplitText here
  // to avoid flashes/rebuilds during the session.
  // If you want a hard reset on page refresh only, this is fine.

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

  // 2-step only (expo family)
  tl.to(state, {
    value: 0.84,
    duration: duration * 0.68,
    ease: EASE_OUT,
    onUpdate: () => {
      root.style.setProperty("--_feedback---number-counter", String(state.value));
    }
  });

  tl.to(state, {
    value: 1,
    duration: duration * 0.32,
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
 * Text sequence:
 * - "Hi" out
 * - "I’m" in
 * - quick hold
 * - loader exits (fade + clip up)
 *
 * onRevealStart fires BEFORE full hide so homepage reveal can start under it.
 */
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

  // Counter slides up (clipped)
  if (els.counterWrap) {
    tl.to(els.counterWrap, {
      yPercent: -100,
      duration: TEXT_DUR,
      ease: EASE_OUT
    }, 0);
  }

  // "Hi" out
  if (split1?.chars?.length) {
    tl.to(split1.chars, {
      yPercent: -100,
      duration: TEXT_DUR,
      ease: EASE_OUT,
      stagger: { each: 0.05, from: "start" }
    }, 0.02);
  }

  // "I’m" in (slightly overlaps)
  if (split2?.chars?.length) {
    tl.to(split2.chars, {
      yPercent: 0,
      duration: TEXT_DUR,
      ease: EASE_OUT,
      stagger: { each: LETTER_STAGGER, from: "start" }
    }, 0.28);
  }

  // Start homepage reveal while loader still visible (important)
  tl.call(fireRevealStart, [], 0.6);

  // Small hold, then loader exits quickly so the homepage is visible immediately
  tl.to(els.stage, {
    autoAlpha: 0,
    duration: FADE_DUR,
    ease: EASE_IN_OUT
  }, 1.15);

  // Optional subtle clip for polish (very short)
  tl.to(els.stage, {
    clipPath: "inset(0% 0% 100% 0%)",
    duration: 0.75,
    ease: EASE_IN_OUT
  }, 1.05);

  return tl.then(() => {});
}

export async function runLoader(duration = 1.5, container = document, opts = {}) {
  await loaderShow();
  await loaderProgressTo(duration, container);
  await loaderOutro(opts);
  await loaderHide();
}
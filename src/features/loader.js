// src/features/loader.js

function getLoaderEls() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;

  const stage = wrap.querySelector(".loader-stage") || wrap;

  return {
    wrap,
    stage,
    meta: wrap.querySelector(".loader-meta"),
    metaLines: wrap.querySelectorAll(".loader-meta-line"),

    counterLane: wrap.querySelector(".loader-counter-lane"),
    counterPos: wrap.querySelector(".loader-counter-pos"),
    counterRow: wrap.querySelector(".loader-counter-row"),
    symbol: wrap.querySelector(".loader-counter-symbol"),
    symbolWindow: wrap.querySelector(".loader-symbol-window"),

    hundredsWindow: wrap.querySelector('[data-digit="hundreds"]'),
    tensWindow: wrap.querySelector('[data-digit="tens"]'),
    onesWindow: wrap.querySelector('[data-digit="ones"]'),

    hundredsReel: wrap.querySelector('[data-digit="hundreds"] .loader-digit-reel'),
    tensReel: wrap.querySelector('[data-digit="tens"] .loader-digit-reel'),
    onesReel: wrap.querySelector('[data-digit="ones"] .loader-digit-reel')
  };
}

const EASE = "expo.out";
const EASE_IN_OUT = "expo.inOut";

const DIGIT_REPEAT = 3; // enough for smooth wraps
const DIGITS_0_9 = ["0","1","2","3","4","5","6","7","8","9"];

const loaderState = {
  built: false,
  digitHeight: 0,
  travelPx: 0,
  lastPercent: 0,
  reelIndex: {
    hundreds: 0,
    tens: 0,
    ones: 0
  }
};

function buildReelHTML(type = "normal") {
  if (type === "hundreds") {
    // Hundreds only needs 0 and 1 for 0..100
    // repeat a little for clean movement
    return Array.from({ length: 4 }, (_, i) => {
      const v = i < 3 ? "0" : "1";
      return `<span class="loader-digit-char">${v}</span>`;
    }).join("");
  }

  // tens/ones: repeat 0..9 several times
  let html = "";
  for (let r = 0; r < DIGIT_REPEAT; r++) {
    for (let i = 0; i < 10; i++) {
      html += `<span class="loader-digit-char">${DIGITS_0_9[i]}</span>`;
    }
  }
  return html;
}

function ensureReelsBuilt(els) {
  if (!els) return;

  if (els.hundredsReel && !els.hundredsReel.children.length) {
    els.hundredsReel.innerHTML = buildReelHTML("hundreds");
  }
  if (els.tensReel && !els.tensReel.children.length) {
    els.tensReel.innerHTML = buildReelHTML("normal");
  }
  if (els.onesReel && !els.onesReel.children.length) {
    els.onesReel.innerHTML = buildReelHTML("normal");
  }

  loaderState.built = true;
}

function measureLoader(els) {
  if (!els) return;

  const sampleDigit =
    els.onesReel?.querySelector(".loader-digit-char") ||
    els.tensReel?.querySelector(".loader-digit-char") ||
    els.hundredsReel?.querySelector(".loader-digit-char");

  loaderState.digitHeight = sampleDigit ? sampleDigit.getBoundingClientRect().height : 0;

  const laneRect = els.counterLane?.getBoundingClientRect();
  const rowRect = els.counterRow?.getBoundingClientRect();

  const laneH = laneRect ? laneRect.height : 0;
  const rowH = rowRect ? rowRect.height : 0;

  loaderState.travelPx = Math.max(0, laneH - rowH);
}

function resetReels(els) {
  loaderState.lastPercent = 0;
  loaderState.reelIndex.hundreds = 0;
  loaderState.reelIndex.tens = 0;
  loaderState.reelIndex.ones = 0;

  if (!window.gsap || !els) return;

  if (els.hundredsReel) {
    // first "0"
    window.gsap.set(els.hundredsReel, { y: 0 });
  }
  if (els.tensReel) {
    // start on first cycle "0"
    window.gsap.set(els.tensReel, { y: 0 });
  }
  if (els.onesReel) {
    window.gsap.set(els.onesReel, { y: 0 });
  }

  if (els.counterPos) {
    window.gsap.set(els.counterPos, { y: 0, autoAlpha: 1 });
  }

  if (els.meta) {
    window.gsap.set(els.meta, { autoAlpha: 1, y: 0 });
  }

  if (els.metaLines?.length) {
    window.gsap.set(els.metaLines, { yPercent: 0, autoAlpha: 1 });
  }

  if (els.symbolWindow) {
    window.gsap.set(els.symbolWindow, { yPercent: 0, autoAlpha: 1 });
  }

  if (els.wrap) {
    els.wrap.style.setProperty("--_feedback---number-counter", "0");
  }
}

function percentToDigits(percent) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const str = String(p).padStart(3, "0");
  return {
    percent: p,
    hundreds: Number(str[0]),
    tens: Number(str[1]),
    ones: Number(str[2])
  };
}

function updateCounterVisual(els, progress01) {
  if (!els) return;

  const progress = Math.max(0, Math.min(1, progress01));
  const percent = progress * 100;
  const { hundreds, tens, ones, percent: pInt } = percentToDigits(percent);

  // expose var if anything else reads it
  els.wrap.style.setProperty("--_feedback---number-counter", String(progress));

  // Move entire counter from bottom -> top
  const y = -loaderState.travelPx * progress;
  if (els.counterPos && window.gsap) {
    window.gsap.set(els.counterPos, { y });
  }

  // Digit rolling (upwards only)
  // hundreds: 0 until 100, then 1
  const hIndex = hundreds === 1 ? 3 : 0; // based on buildReelHTML("hundreds")
  const tIndexBase = tens;
  const oIndexBase = ones;

  // Keep tens/ones rolling upward across wraps
  // We only advance index; never move backwards.
  let tIndex = loaderState.reelIndex.tens;
  let oIndex = loaderState.reelIndex.ones;

  if (pInt >= loaderState.lastPercent) {
    // advance to next valid indices
    const currentTMod = ((tIndex % 10) + 10) % 10;
    const currentOMod = ((oIndex % 10) + 10) % 10;

    if (tIndex === 0 && loaderState.lastPercent === 0) {
      tIndex = tIndexBase;
    } else {
      const tDelta = (tIndexBase - currentTMod + 10) % 10;
      tIndex += tDelta;
    }

    if (oIndex === 0 && loaderState.lastPercent === 0) {
      oIndex = oIndexBase;
    } else {
      const oDelta = (oIndexBase - currentOMod + 10) % 10;
      oIndex += oDelta;
    }

    // Special case 100: force clean ending "100"
    if (pInt >= 100) {
      tIndex += (10 - (tIndex % 10)) % 10; // land on 0
      oIndex += (10 - (oIndex % 10)) % 10; // land on 0
    }
  }

  loaderState.reelIndex.hundreds = hIndex;
  loaderState.reelIndex.tens = tIndex;
  loaderState.reelIndex.ones = oIndex;
  loaderState.lastPercent = pInt;

  const dh = loaderState.digitHeight || 0;
  if (window.gsap && dh) {
    if (els.hundredsReel) window.gsap.set(els.hundredsReel, { y: -(hIndex * dh) });
    if (els.tensReel) window.gsap.set(els.tensReel, { y: -(tIndex * dh) });
    if (els.onesReel) window.gsap.set(els.onesReel, { y: -(oIndex * dh) });
  }
}

export function loaderShow() {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  ensureReelsBuilt(els);

  if (!window.gsap) {
    els.wrap.style.display = "block";
    els.wrap.style.pointerEvents = "auto";
    return Promise.resolve();
  }

  window.gsap.killTweensOf([
    els.wrap,
    els.stage,
    els.meta,
    els.counterPos,
    els.hundredsReel,
    els.tensReel,
    els.onesReel,
    els.symbolWindow,
    ...(els.metaLines ? Array.from(els.metaLines) : [])
  ]);

  window.gsap.set(els.wrap, {
    display: "block",
    pointerEvents: "auto",
    autoAlpha: 1
  });

  window.gsap.set(els.stage, {
    clearProps: "clipPath"
  });

  // Wait one frame so dimensions are correct
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      measureLoader(els);
      resetReels(els);
      updateCounterVisual(els, 0);
      resolve();
    });
  });
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

  return Promise.resolve();
}

export function loaderProgressTo(duration = 1.5) {
  const els = getLoaderEls();
  if (!els) return Promise.resolve();

  if (!window.gsap) {
    updateCounterVisual(els, 1);
    return Promise.resolve();
  }

  // Keep the nice timing feel:
  // phase 1 to 60%
  // phase 2 to 100%
  const state = { value: 0 };
  const tl = window.gsap.timeline();

  tl.to(state, {
    value: 0.6,
    duration: duration * 0.62,
    ease: EASE,
    onUpdate: () => updateCounterVisual(els, state.value)
  });

  tl.to(state, {
    value: 1,
    duration: duration * 0.38,
    ease: EASE_IN_OUT,
    onUpdate: () => updateCounterVisual(els, state.value),
    onComplete: () => updateCounterVisual(els, 1)
  });

  return tl.then(() => {});
}

/**
 * Text/number-led outro:
 * - counter exits upward (staggered windows)
 * - meta fades/slides
 * - homepage reveal callback fires at fade start
 * - loader fades out (no clip-path wipe)
 */
export function loaderOutro({ onRevealStart } = {}) {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  let revealStarted = false;
  const fireRevealStart = () => {
    if (revealStarted) return;
    revealStarted = true;
    if (typeof onRevealStart === "function") onRevealStart();
  };

  const parts = [
    els.hundredsWindow,
    els.tensWindow,
    els.onesWindow,
    els.symbolWindow
  ].filter(Boolean);

  const tl = window.gsap.timeline();

  // Start homepage reveal exactly when loader fade starts
  tl.call(fireRevealStart, [], 0);

  // Stagger the counter pieces up (your preferred direction)
  if (parts.length) {
    tl.to(parts, {
      yPercent: -115,
      duration: 0.9,
      ease: EASE,
      stagger: 0.05
    }, 0);
  }

  // Meta text exits a touch later
  if (els.metaLines?.length) {
    tl.to(els.metaLines, {
      yPercent: -110,
      autoAlpha: 0,
      duration: 0.8,
      ease: EASE,
      stagger: 0.04
    }, 0.08);
  } else if (els.meta) {
    tl.to(els.meta, {
      y: -24,
      autoAlpha: 0,
      duration: 0.8,
      ease: EASE
    }, 0.08);
  }

  // Fade loader off (simple + clean)
  tl.to(els.wrap, {
    autoAlpha: 0,
    duration: 0.45,
    ease: "power2.out"
  }, 0.12);

  return tl.then(() => {});
}

export async function runLoader(duration = 1.5, _container = document, opts = {}) {
  await loaderShow();
  await loaderProgressTo(duration);
  await loaderOutro(opts);
  await loaderHide();
}
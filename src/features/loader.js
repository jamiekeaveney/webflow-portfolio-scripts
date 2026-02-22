// src/features/loader.js

const SEQUENCE = [0, 24, 72, 100];

function q(root, sel) {
  return root.querySelector(sel);
}

function getEls(scope = document) {
  const wrap =
    q(scope, '[data-loader="wrap"]') ||
    q(document, '[data-loader="wrap"]') ||
    q(scope, ".Loader_loader") ||
    q(document, ".Loader_loader");

  if (!wrap) return null;

  const progress =
    q(wrap, "[data-loader-progress]") || q(wrap, ".Loader_progress");
  const block = q(wrap, "[data-loader-block]") || q(wrap, ".Loader_progressBlock");
  const valTop = q(wrap, "[data-loader-val-top]") || q(wrap, ".Loader_maxTop");
  const valBot = q(wrap, "[data-loader-val-bot]") || q(wrap, ".Loader_maxVal");
  const desc = q(wrap, ".Loader_appDescription");

  return { wrap, progress, block, valTop, valBot, desc };
}

function pad3(n) {
  const s = String(Math.max(0, Math.min(999, Math.round(n))));
  return s.padStart(3, "0");
}

function setDigits(rowEl, n) {
  if (!rowEl) return;
  const digits = pad3(n).split("");
  const spans = rowEl.querySelectorAll("span");

  // Ensure exactly 3 digit spans
  if (spans.length < 3) {
    rowEl.innerHTML = `<span>0</span><span>0</span><span>0</span>`;
  }

  const finalSpans = rowEl.querySelectorAll("span");
  for (let i = 0; i < 3; i++) {
    if (finalSpans[i]) finalSpans[i].textContent = digits[i];
  }
}

function getLineHeightPx(block) {
  // Block height is our clipping window height (one line)
  const h = block?.offsetHeight || 0;
  if (h > 0) return h;

  // Fallback from computed font-size * line-height
  const cs = window.getComputedStyle(block);
  const fs = parseFloat(cs.fontSize) || 94;
  const line = parseFloat(cs.lineHeight);
  if (!Number.isNaN(line)) return line;
  return fs * 0.875;
}

/**
 * Moves the counter block vertically based on overall progress (0..100):
 * - 0   => bottom-right
 * - 100 => top-right
 */
function calcBlockTranslateY(els, progressPercent) {
  const { wrap, block } = els;
  if (!wrap || !block) return 0;

  const padTop = parseFloat(getComputedStyle(wrap).paddingTop) || 0;
  const padBottom = parseFloat(getComputedStyle(wrap).paddingBottom) || 0;
  const blockH = block.offsetHeight || getLineHeightPx(block);

  const viewportH = window.innerHeight;
  const travel = Math.max(0, viewportH - padTop - padBottom - blockH);

  // 0 at bottom, 100 at top
  return travel * (1 - progressPercent / 100);
}

function setBlockPosition(els, progressPercent) {
  if (!els?.block) return;
  const y = calcBlockTranslateY(els, progressPercent);
  els.block.style.transform = `translate3d(0, ${y}px, 0)`;
}

function gsapRef() {
  return window.gsap || null;
}

function setRows(els, topY, botY) {
  const g = gsapRef();
  if (g) {
    g.set(els.valTop, { yPercent: topY });
    g.set(els.valBot, { yPercent: botY });
  } else {
    if (els.valTop) els.valTop.style.transform = `translate3d(0, ${topY}%, 0)`;
    if (els.valBot) els.valBot.style.transform = `translate3d(0, ${botY}%, 0)`;
  }
}

function animateRows(els, duration = 0.85) {
  const g = gsapRef();

  if (!g) {
    // Fallback (no GSAP): instant swap
    setRows(els, -100, 0);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const tl = g.timeline({ onComplete: resolve });

    tl.to(
      els.valTop,
      {
        yPercent: -100,
        duration,
        ease: "expo.inOut"
      },
      0
    ).to(
      els.valBot,
      {
        yPercent: 0,
        duration,
        ease: "expo.inOut"
      },
      0
    );
  });
}

function swapRows(els) {
  if (!els?.valTop || !els?.valBot) return;

  // Swap class semantics so "top" remains the current visible row
  els.valTop.classList.remove("Loader_maxTop");
  els.valTop.classList.add("Loader_maxVal");

  els.valBot.classList.remove("Loader_maxVal");
  els.valBot.classList.add("Loader_maxTop");

  const tmp = els.valTop;
  els.valTop = els.valBot;
  els.valBot = tmp;
}

function ensureLoaderVisible(els) {
  if (!els?.wrap) return;
  els.wrap.classList.remove("Loader_wipeOut", "is-hidden");
  els.wrap.style.opacity = "1";
  els.wrap.style.visibility = "visible";
  els.wrap.style.pointerEvents = "none";
}

export async function loaderHide() {
  const els = getEls(document);
  if (!els?.wrap) return Promise.resolve();

  const g = gsapRef();

  if (!g) {
    els.wrap.classList.add("is-hidden");
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    g.to(els.wrap, {
      autoAlpha: 0,
      duration: 0.55,
      ease: "expo.out",
      onComplete: () => {
        els.wrap.classList.add("is-hidden");
        resolve();
      }
    });
  });
}

export async function runLoader(minDuration = 1.4, scope = document, opts = {}) {
  const els = getEls(scope);
  if (!els) return Promise.resolve();

  ensureLoaderVisible(els);

  // Initial state
  setDigits(els.valTop, 0);
  setDigits(els.valBot, 0);
  setRows(els, 0, 100);
  setBlockPosition(els, 0);

  // Recompute position on resize while loader is active
  const onResize = () => {
    // If animation mid-way this snaps to nearest known state, acceptable
    // because loader is brief. You can track exact state if needed.
  };
  window.addEventListener("resize", onResize);

  const start = performance.now();
  const g = gsapRef();

  try {
    // Step through the sequence
    for (let i = 1; i < SEQUENCE.length; i++) {
      const prev = SEQUENCE[i - 1];
      const next = SEQUENCE[i];

      // Move whole block to the correct vertical spot for NEXT value
      if (g) {
        await new Promise((resolve) => {
          g.to(els.block, {
            y: 0, // clear gsap y so transform string remains consistent
            duration: 0
          });

          // animate via quick setter on transform target
          const yPx = calcBlockTranslateY(els, next);
          g.to(els.block, {
            duration: 0.95,
            ease: "expo.inOut",
            onUpdate: function () {
              // interpolate manually from prev position to next
              const p = this.progress();
              const yPrev = calcBlockTranslateY(els, prev);
              const y = yPrev + (yPx - yPrev) * p;
              els.block.style.transform = `translate3d(0, ${y}px, 0)`;
            },
            onComplete: () => {
              els.block.style.transform = `translate3d(0, ${yPx}px, 0)`;
              resolve();
            }
          });
        });
      } else {
        setBlockPosition(els, next);
      }

      // Prepare incoming row and flip
      setDigits(els.valBot, next);
      setRows(els, 0, 100); // current visible in place, next below
      await animateRows(els, 0.85);

      // Reset positions after swap so classes remain logical
      swapRows(els);
      setRows(els, 0, 100);
    }

    // Ensure total runtime
    const elapsed = (performance.now() - start) / 1000;
    if (elapsed < minDuration) {
      await new Promise((r) => setTimeout(r, (minDuration - elapsed) * 1000));
    }

    if (typeof opts.onRevealStart === "function") {
      opts.onRevealStart();
    }

    // Fade out loader
    await loaderHide();
  } finally {
    window.removeEventListener("resize", onResize);
  }

  return Promise.resolve();
}
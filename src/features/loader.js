// src/features/loader.js
//
// Two-slot flip counter: 0% → 24% → 72% → 100%
// Current value sits visible. When progress changes, current flips up (exits)
// and next value flips up into position (enters from below).
// The whole counter block travels vertically based on progress %.

const SEQUENCE = [0, 24, 72, 100];

// ── DOM ──

function dom() {
  const w = document.querySelector('[data-loader="wrap"]');
  if (!w) return null;
  const $ = (s) => w.querySelector(s);
  return {
    wrap: w,
    panel: $(".loader-panel"),
    brand: $(".loader-brand"),
    progress: $("[data-loader-progress]"),
    block: $("[data-loader-block]"),
    valTop: $("[data-loader-val-top]"),
    valBot: $("[data-loader-val-bot]"),
  };
}

// Format: "0%", "24%", "72%", "100%"
function fmt(n) {
  return `${n}%`;
}

// Compute translateY from progress (0–100)
// At 0% → counter at bottom. At 100% → counter at top.
function calcY(e, progress) {
  const pad = parseFloat(getComputedStyle(e.panel).paddingTop) || 40;
  const blockH = e.block?.offsetHeight || 0;
  const travel = Math.max(0, innerHeight - pad * 2 - blockH);
  return -travel * (progress / 100);
}

// ── Flip animation ──
// Both slots move up by 100% of the window height.
// Top (current) exits upward, bottom (next) enters from below.

function flip(e, nextValue, g, duration = 1.2) {
  return new Promise((resolve) => {
    // Set the incoming value text
    e.valBot.textContent = fmt(nextValue);

    // Reset positions: top at 0%, bottom at 100% (below, hidden)
    g.set(e.valTop, { yPercent: 0 });
    g.set(e.valBot, { yPercent: 100 });

    const ease = "expo.inOut";

    // Animate both up together
    g.to(e.valTop, {
      yPercent: -100,
      duration,
      ease,
    });

    g.to(e.valBot, {
      yPercent: 0,
      duration,
      ease,
      onComplete() {
        // Swap: bottom becomes the new "current"
        e.valTop.textContent = fmt(nextValue);
        g.set(e.valTop, { yPercent: 0 });
        g.set(e.valBot, { yPercent: 100 });
        resolve();
      },
    });
  });
}

// ── Flip OUT (100% exit — staggers up and away) ──

function flipOut(e, g) {
  return new Promise((resolve) => {
    g.to(e.valTop, {
      yPercent: -120,
      duration: 0.75,
      ease: "expo.out",
      onComplete: resolve,
    });
  });
}

// ── Y travel animation ──
// Moves the progress block to match the current percentage position.

function travelTo(e, progress, g, duration = 1.2) {
  const y = calcY(e, progress);
  return g.to(e.block, {
    y,
    duration,
    ease: "sine.inOut",
  });
}

// ── Public API ──

export function loaderShow() {
  const e = dom();
  if (!e) return Promise.resolve();
  const g = window.gsap;

  if (!g) {
    e.wrap.style.cssText = "display:block;pointer-events:auto;opacity:1";
    e.valTop.textContent = fmt(0);
    e.block.style.transform = "translate3d(0,0,0)";
    return Promise.resolve();
  }

  g.killTweensOf([e.wrap, e.brand, e.block, e.valTop, e.valBot]);
  g.set(e.wrap, { display: "block", pointerEvents: "auto", autoAlpha: 1 });
  g.set(e.brand, { autoAlpha: 0 });
  g.set(e.block, { autoAlpha: 0, y: 0 });

  e.valTop.textContent = fmt(0);
  e.valBot.textContent = "";
  g.set(e.valTop, { yPercent: 0 });
  g.set(e.valBot, { yPercent: 100 });

  return Promise.resolve();
}

export function loaderHide() {
  const e = dom();
  if (!e) return Promise.resolve();
  const g = window.gsap;
  if (!g) {
    e.wrap.style.cssText = "display:none;pointer-events:none;opacity:0";
    return Promise.resolve();
  }
  g.set(e.wrap, { display: "none", pointerEvents: "none", autoAlpha: 0 });
  g.set([e.brand, e.block, e.valTop, e.valBot], { clearProps: "all" });
  return Promise.resolve();
}

/**
 * Main sequence:
 *   1. Fade in brand + "0%"
 *   2. Hold briefly
 *   3. For each step (24, 72, 100):
 *      - Flip the number (staggered text swap)
 *      - Travel Y to match the new percentage
 *      Both happen simultaneously — flip duration ≈ travel duration
 *   4. Hold at 100%
 *   5. Flip 100% out (exits upward)
 */
export function loaderProgressTo(duration = 5.0) {
  const e = dom();
  if (!e || !window.gsap) {
    if (e) {
      e.valTop.textContent = fmt(100);
      e.block.style.transform = `translate3d(0,${calcY(e, 100)}px,0)`;
    }
    return Promise.resolve();
  }

  const g = window.gsap;
  const tl = g.timeline();

  // Step durations proportional to distance
  // 0→24 = 24%, 24→72 = 48%, 72→100 = 28%
  const d1 = duration * 0.26;
  const d2 = duration * 0.46;
  const d3 = duration * 0.28;

  // ── Intro fade
  tl.to(e.brand, { autoAlpha: 1, duration: 0.4, ease: "power2.out" }, 0);
  tl.to(e.block, { autoAlpha: 1, duration: 0.35, ease: "power2.out" }, 0.06);

  // ── Hold on 0%
  tl.to({}, { duration: 0.4 });

  // ── Step 1: 0% → 24%
  tl.addLabel("s1");
  tl.to(e.block, { y: calcY(e, 24), duration: d1, ease: "sine.inOut" }, "s1");
  // Flip number
  tl.set(e.valBot, { yPercent: 100 }, "s1");
  tl.call(() => { e.valBot.textContent = fmt(24); }, [], "s1");
  tl.to(e.valTop, { yPercent: -100, duration: d1, ease: "sine.inOut" }, "s1");
  tl.to(e.valBot, { yPercent: 0, duration: d1, ease: "sine.inOut" }, "s1");
  // Swap at end of step
  tl.call(() => {
    e.valTop.textContent = fmt(24);
    g.set(e.valTop, { yPercent: 0 });
    g.set(e.valBot, { yPercent: 100 });
  });

  // ── Step 2: 24% → 72%
  tl.addLabel("s2");
  tl.to(e.block, { y: calcY(e, 72), duration: d2, ease: "sine.inOut" }, "s2");
  tl.set(e.valBot, { yPercent: 100 }, "s2");
  tl.call(() => { e.valBot.textContent = fmt(72); }, [], "s2");
  tl.to(e.valTop, { yPercent: -100, duration: d2, ease: "sine.inOut" }, "s2");
  tl.to(e.valBot, { yPercent: 0, duration: d2, ease: "sine.inOut" }, "s2");
  tl.call(() => {
    e.valTop.textContent = fmt(72);
    g.set(e.valTop, { yPercent: 0 });
    g.set(e.valBot, { yPercent: 100 });
  });

  // ── Step 3: 72% → 100%
  tl.addLabel("s3");
  tl.to(e.block, { y: calcY(e, 100), duration: d3, ease: "sine.inOut" }, "s3");
  tl.set(e.valBot, { yPercent: 100 }, "s3");
  tl.call(() => { e.valBot.textContent = fmt(100); }, [], "s3");
  tl.to(e.valTop, { yPercent: -100, duration: d3, ease: "sine.inOut" }, "s3");
  tl.to(e.valBot, { yPercent: 0, duration: d3, ease: "sine.inOut" }, "s3");
  tl.call(() => {
    e.valTop.textContent = fmt(100);
    g.set(e.valTop, { yPercent: 0 });
    g.set(e.valBot, { yPercent: 100 });
  });

  // ── Hold at 100%
  tl.to({}, { duration: 0.35 });

  // ── 100% exit: flip out upward
  tl.to(e.valTop, {
    yPercent: -120,
    duration: 0.75,
    ease: "expo.out",
  });

  tl.to({}, { duration: 0.1 });

  return tl.then(() => {});
}

export function loaderOutro({ onRevealStart } = {}) {
  const e = dom();
  if (!e || !window.gsap) return Promise.resolve();
  const tl = window.gsap.timeline();
  tl.call(() => { if (typeof onRevealStart === "function") onRevealStart(); }, [], 0.05);
  tl.to(e.wrap, { autoAlpha: 0, duration: 0.5, ease: "power1.out" }, 0);
  return tl.then(() => {});
}

export async function runLoader(duration = 5.0, _container = document, opts = {}) {
  await loaderShow();
  await loaderProgressTo(duration);
  await loaderOutro(opts);
  await loaderHide();
}

// ── Resize ──
let _raf = null;
addEventListener("resize", () => {
  const e = dom();
  if (!e?.wrap || e.wrap.style.display === "none") return;
  if (_raf) cancelAnimationFrame(_raf);
  _raf = requestAnimationFrame(() => {
    // Recalculate Y position based on current displayed value
    const text = e.valTop.textContent || "0%";
    const num = parseInt(text) || 0;
    const g = window.gsap;
    if (g) g.set(e.block, { y: calcY(e, num) });
  });
});
// src/features/loader.js
//
// Two-slot flip counter: 0% → 24% → 72% → 100%
//
// Follows the richardekwonye.com reference exactly:
//   - .loader-block is overflow:hidden, height = 1 line (0.875em)
//   - Current value at top:0, next value at top:0.875em (below, hidden)
//   - Flip = CSS animation moves both up by 0.875em
//   - Vertical travel = CSS transition on block transform
//   - Block transform: translate3d(0, calc(0.875em - Xpx), 0)
//     where X = progress * viewportTravel

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
    top: $("[data-loader-top]"),
    bot: $("[data-loader-bot]"),
  };
}

// ── Helpers ──

// Split a number into digit spans: 24 → "<span>2</span><span>4</span><span>%</span>"
function digitSpans(n) {
  return String(n)
    .split("")
    .map((d) => `<span>${d}</span>`)
    .concat("<span>%</span>")
    .join("");
}

// The block travel uses the same formula as the reference:
// translate3d(0, calc(0.875em - Xpx), 0)
// At progress=0: X=0, so transform = translate3d(0, 0.875em, 0) — but we start at 0
// At progress=1: X = full viewport travel
//
// Actually looking more carefully at the reference: at 100% the transform is
// calc(0.875em - 701px). The 701px ≈ viewport height - padding.
// This means at 0% the block is at bottom (transform: translate3d(0,0,0))
// and at 100% it's at translate3d(0, calc(0.875em - ~700px), 0) = way up top.
//
// The 0.875em offset is so the NEXT value (which sits at top:0.875em) ends up
// visible at the very top of the viewport area.

function getTravel(e) {
  // Full travel = viewport - top padding - bottom padding
  const pad = parseFloat(getComputedStyle(e.panel).paddingTop) || 40;
  return Math.max(0, innerHeight - pad * 2);
}

function setBlockY(e, progress01) {
  const travel = getTravel(e);
  const px = travel * progress01;
  // Match reference formula: calc(0.875em - Xpx)
  // At progress 0: just "0" (no movement)
  // At progress > 0: moves up
  if (progress01 === 0) {
    e.block.style.transform = "translate3d(0, 0, 0)";
  } else {
    e.block.style.transform = `translate3d(0, calc(0.875em - ${px}px), 0)`;
  }
}

// Promise that resolves after a CSS animation ends on an element
function onAnimEnd(el) {
  return new Promise((resolve) => {
    const handler = () => {
      el.removeEventListener("animationend", handler);
      resolve();
    };
    el.addEventListener("animationend", handler);
  });
}

// Wait ms
function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Flip sequence ──
// 1. Set next value text in bot slot
// 2. Add is-flipping class → CSS animation moves both up
// 3. Wait for animation to end
// 4. Update top slot text to the new value
// 5. Remove is-flipping class (resets positions)
// 6. Update block translateY for the new progress position

async function flip(e, nextValue, progress01) {
  // Set the incoming value
  e.bot.innerHTML = digitSpans(nextValue);

  // Trigger flip animation
  e.block.classList.add("is-flipping");

  // Update vertical position (CSS transition handles the smooth movement)
  setBlockY(e, progress01);

  // Wait for the flip animation to complete
  await onAnimEnd(e.bot);

  // Swap: put new value in top, clear bot, remove flip class
  e.top.innerHTML = digitSpans(nextValue);
  e.bot.innerHTML = "";
  e.block.classList.remove("is-flipping");
}

// ── Public API ──

export function loaderShow() {
  const e = dom();
  if (!e) return Promise.resolve();
  const g = window.gsap;

  // Set initial state
  e.top.innerHTML = digitSpans(0);
  e.bot.innerHTML = "";

  if (!g) {
    e.wrap.style.cssText = "display:block;pointer-events:auto;opacity:1";
    setBlockY(e, 0);
    return Promise.resolve();
  }

  g.killTweensOf(e.wrap);
  g.set(e.wrap, { display: "block", pointerEvents: "auto", autoAlpha: 1 });
  g.set(e.brand, { autoAlpha: 0 });
  g.set(e.progress, { autoAlpha: 0 });

  // Disable CSS transition initially so the block snaps to start position
  e.block.style.transition = "none";
  setBlockY(e, 0);

  // Re-enable transition after a frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      e.block.style.transition = "";
    });
  });

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
  g.set([e.brand, e.progress], { clearProps: "all" });
  e.block.style.transition = "";
  e.block.style.transform = "";
  e.block.classList.remove("is-flipping");
  return Promise.resolve();
}

/**
 * Main sequence:
 *   1. Fade in brand + counter
 *   2. Hold on 0% briefly
 *   3. Flip 0→24 + travel to 24% position
 *   4. Short pause
 *   5. Flip 24→72 + travel to 72% position
 *   6. Short pause
 *   7. Flip 72→100 + travel to 100% position
 *   8. Hold at 100%
 *
 * The flips are CSS-animation driven (smooth, hardware-accelerated).
 * The vertical travel is CSS-transition driven (1.25s cubic-bezier).
 * JS just orchestrates the timing.
 */
export async function loaderProgressTo(_duration = 5.0) {
  const e = dom();
  if (!e) return;

  const g = window.gsap;

  if (!g) {
    e.top.innerHTML = digitSpans(100);
    setBlockY(e, 1);
    return;
  }

  // ── Intro fade
  await g.to(e.brand, { autoAlpha: 1, duration: 0.4, ease: "power2.out" });
  g.to(e.progress, { autoAlpha: 1, duration: 0.35, ease: "power2.out" });

  // ── Hold on 0%
  await wait(500);

  // ── Step 1: 0% → 24%
  await flip(e, 24, 0.24);

  // ── Pause (let the user register the number)
  await wait(400);

  // ── Step 2: 24% → 72%
  await flip(e, 72, 0.72);

  // ── Pause
  await wait(300);

  // ── Step 3: 72% → 100%
  await flip(e, 100, 1);

  // ── Hold at 100%
  await wait(400);
}

export function loaderOutro({ onRevealStart } = {}) {
  const e = dom();
  if (!e) return Promise.resolve();

  if (typeof onRevealStart === "function") onRevealStart();

  // Use CSS class-based wipe (like the reference)
  e.wrap.classList.add("is-wipe");

  return new Promise((resolve) => {
    setTimeout(() => {
      e.wrap.classList.add("is-hidden");
      resolve();
    }, 800);
  });
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
    const num = parseInt(e.top.textContent) || 0;
    // Temporarily disable transition for instant repositioning
    e.block.style.transition = "none";
    setBlockY(e, num / 100);
    requestAnimationFrame(() => {
      e.block.style.transition = "";
    });
  });
});
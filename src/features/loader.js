// src/features/loader.js
//
// Two-slot flip counter  0% → 24% → 72% → 100%
//
// Architecture (from reference):
//   .loader-block has overflow:hidden, height = 1 line.
//   Current value sits at top:0, next sits at top:100% (below, hidden).
//   To flip: translate block up by 1 slot height → current exits, next enters.
//   On complete: swap text, reset translateY to 0.
//
// The counter container (.loader-counter) moves vertically via a separate
// transform to represent progress position (bottom-right → top-right).

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
    counter: $("[data-loader-counter]"),
    block: $("[data-loader-block]"),
    current: $("[data-loader-current]"),
    next: $("[data-loader-next]"),
  };
}

// ── Helpers ──

function fmt(n) {
  return n + "%";
}

// The slot height = the rendered height of .loader-block
function slotH(e) {
  return e.block?.getBoundingClientRect().height || 0;
}

// Vertical travel for the counter container (bottom → top within padding)
function counterTravel(e) {
  const pad = parseFloat(getComputedStyle(e.panel).paddingTop) || 40;
  const ch = e.counter?.offsetHeight || 0;
  return Math.max(0, innerHeight - pad * 2 - ch);
}

// Set the counter container's vertical position (0 = bottom, 1 = top)
function setCounterY(e, progress01) {
  const y = -counterTravel(e) * progress01;
  e.counter.style.transform = `translate3d(0,${y}px,0)`;
}

// ── Public API ──

export function loaderShow() {
  const e = dom();
  if (!e) return Promise.resolve();
  const g = window.gsap;

  e.current.textContent = fmt(0);
  e.next.textContent = "";

  if (!g) {
    e.wrap.style.cssText = "display:block;pointer-events:auto;opacity:1";
    setCounterY(e, 0);
    return Promise.resolve();
  }

  g.killTweensOf([e.wrap, e.brand, e.counter, e.block]);
  g.set(e.wrap, { display: "block", pointerEvents: "auto", autoAlpha: 1 });
  g.set(e.brand, { autoAlpha: 0 });
  g.set(e.counter, { autoAlpha: 0 });
  g.set(e.block, { y: 0 });
  setCounterY(e, 0);

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
  g.set([e.brand, e.counter, e.block], { clearProps: "all" });
  return Promise.resolve();
}

/**
 * Main timeline.
 *
 * For each step (0→24, 24→72, 72→100):
 *   - Set next value text
 *   - Simultaneously:
 *       a) Translate .loader-block up by 1 slot height (flip the number)
 *       b) Translate .loader-counter to the new Y position (move the whole thing)
 *   - On complete: swap text into current, reset block Y to 0
 *
 * All steps share the same ease (sine.inOut) and flow directly into each other.
 * The 100% exit flips the number out upward one more time (no swap back).
 */
export function loaderProgressTo(duration = 5.0) {
  const e = dom();
  if (!e || !window.gsap) {
    if (e) {
      e.current.textContent = fmt(100);
      setCounterY(e, 1);
    }
    return Promise.resolve();
  }

  const g = window.gsap;
  const tl = g.timeline();
  const h = slotH(e);
  const ease = "sine.inOut";

  // Step durations proportional to distance covered
  // 0→24 = 24%, 24→72 = 48%, 72→100 = 28%
  const d1 = duration * 0.26;
  const d2 = duration * 0.46;
  const d3 = duration * 0.28;

  // ── Intro fade
  tl.to(e.brand, { autoAlpha: 1, duration: 0.4, ease: "power2.out" }, 0);
  tl.to(e.counter, { autoAlpha: 1, duration: 0.35, ease: "power2.out" }, 0.06);

  // ── Hold on 0%
  tl.to({}, { duration: 0.4 });

  // ── Step 1: 0% → 24%
  tl.call(() => { e.next.textContent = fmt(24); });
  tl.addLabel("s1");
  // Flip block up (reveals next value)
  tl.to(e.block, { y: -h, duration: d1, ease }, "s1");
  // Move counter container to 24% position
  tl.to(e.counter, { y: -counterTravel(e) * 0.24, duration: d1, ease }, "s1");
  // Swap at end
  tl.call(() => {
    e.current.textContent = fmt(24);
    e.next.textContent = "";
    g.set(e.block, { y: 0 });
  });

  // ── Step 2: 24% → 72%
  tl.call(() => { e.next.textContent = fmt(72); });
  tl.addLabel("s2");
  tl.to(e.block, { y: -h, duration: d2, ease }, "s2");
  tl.to(e.counter, { y: -counterTravel(e) * 0.72, duration: d2, ease }, "s2");
  tl.call(() => {
    e.current.textContent = fmt(72);
    e.next.textContent = "";
    g.set(e.block, { y: 0 });
  });

  // ── Step 3: 72% → 100%
  tl.call(() => { e.next.textContent = fmt(100); });
  tl.addLabel("s3");
  tl.to(e.block, { y: -h, duration: d3, ease }, "s3");
  tl.to(e.counter, { y: -counterTravel(e) * 1, duration: d3, ease }, "s3");
  tl.call(() => {
    e.current.textContent = fmt(100);
    e.next.textContent = "";
    g.set(e.block, { y: 0 });
  });

  // ── Hold at 100%
  tl.to({}, { duration: 0.35 });

  // ── 100% exit: flip current up and out
  tl.to(e.block, {
    y: -h * 1.2,
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
    // Recalculate counter Y from current displayed value
    const num = parseInt(e.current.textContent) || 0;
    setCounterY(e, num / 100);
  });
});
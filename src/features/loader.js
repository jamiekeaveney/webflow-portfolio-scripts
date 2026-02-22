// src/features/loader.js
//
// Two-slot flip counter: 0% → 24% → 72% → 100%
// Individual digit spans stagger via CSS animation-delay (--i index).

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

// Build digit spans with --i index for stagger: "24%" → 3 spans with --i:0,1,2
function digitSpans(n) {
  const chars = String(n).split("").concat("%");
  return chars
    .map((ch, i) => `<span style="--i:${i}">${ch}</span>`)
    .join("");
}

function getTravel(e) {
  const pad = parseFloat(getComputedStyle(e.panel).paddingTop) || 40;
  return Math.max(0, innerHeight - pad * 2);
}

function setBlockY(e, progress01) {
  const travel = getTravel(e);
  const px = travel * progress01;
  if (progress01 === 0) {
    e.block.style.transform = "translate3d(0, 0, 0)";
  } else {
    e.block.style.transform = `translate3d(0, calc(0.875em - ${px}px), 0)`;
  }
}

// Wait for the LAST span's animation to end (it has the highest delay)
function onLastSpanAnimEnd(container) {
  return new Promise((resolve) => {
    const spans = container.querySelectorAll("span");
    if (!spans.length) return resolve();
    const last = spans[spans.length - 1];
    const handler = () => {
      last.removeEventListener("animationend", handler);
      resolve();
    };
    last.addEventListener("animationend", handler);
  });
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Flip ──

async function flip(e, nextValue, progress01) {
  // Set next value with indexed spans
  e.bot.innerHTML = digitSpans(nextValue);

  // Trigger staggered flip animation
  e.block.classList.add("is-flipping");

  // Update vertical position (CSS transition handles smooth movement)
  setBlockY(e, progress01);

  // Wait for the last digit's animation to complete
  await onLastSpanAnimEnd(e.bot);

  // Swap: new value becomes current, clear next, remove flip
  e.top.innerHTML = digitSpans(nextValue);
  e.bot.innerHTML = "";
  e.block.classList.remove("is-flipping");
}

// ── Public API ──

export function loaderShow() {
  const e = dom();
  if (!e) return Promise.resolve();
  const g = window.gsap;

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

  // Snap to start (no transition)
  e.block.style.transition = "none";
  setBlockY(e, 0);
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

  // ── Flip 0→24 + travel
  await flip(e, 24, 0.24);
  await wait(400);

  // ── Flip 24→72 + travel
  await flip(e, 72, 0.72);
  await wait(300);

  // ── Flip 72→100 + travel
  await flip(e, 100, 1);
  await wait(400);
}

export function loaderOutro({ onRevealStart } = {}) {
  const e = dom();
  if (!e) return Promise.resolve();

  if (typeof onRevealStart === "function") onRevealStart();

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
    e.block.style.transition = "none";
    setBlockY(e, num / 100);
    requestAnimationFrame(() => {
      e.block.style.transition = "";
    });
  });
});
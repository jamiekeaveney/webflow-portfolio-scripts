// src/features/loader.js
//
// Two-slot flip counter with randomised intermediate values.
// 0% → ~24±8% → ~72±8% → 100%
// Y position = exact percentage of vertical travel.
// 100% exit: digits stagger out, brand fades, then loader hides.

// ── Randomised sequence ──
// Each intermediate value jitters ±8 so it feels organic.

function sequence() {
  const jitter = (base, range) => base + Math.floor(Math.random() * range * 2) - range;
  return [0, jitter(24, 8), jitter(72, 8), 100];
}

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

function digits(n) {
  return String(n)
    .split("")
    .concat("%")
    .map((ch, i) => `<span class="loader-digit" style="--d:${i}">${ch}</span>`)
    .join("");
}

function travel(e) {
  const pad = parseFloat(getComputedStyle(e.panel).paddingTop) || 40;
  return Math.max(0, innerHeight - pad * 2);
}

function positionBlock(e, pct) {
  const px = travel(e) * (pct / 100);
  e.block.style.transform = pct === 0
    ? "translate3d(0,0,0)"
    : `translate3d(0,calc(0.875em - ${px}px),0)`;
}

function lastDigitAnimEnd(container) {
  return new Promise((resolve) => {
    const spans = container.querySelectorAll(".loader-digit");
    if (!spans.length) return resolve();
    const last = spans[spans.length - 1];
    function done() {
      last.removeEventListener("animationend", done);
      resolve();
    }
    last.addEventListener("animationend", done);
  });
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Flip in ──

async function flip(e, value) {
  e.bot.innerHTML = digits(value);
  e.block.classList.add("is-flipping");
  // Y position = actual percentage
  positionBlock(e, value);
  await lastDigitAnimEnd(e.bot);
  e.top.innerHTML = digits(value);
  e.bot.innerHTML = "";
  e.block.classList.remove("is-flipping");
}

// ── Flip out (100% exit) ──

async function exit(e) {
  e.block.classList.add("is-exiting");
  await lastDigitAnimEnd(e.top);
  // Clear content so nothing can flash back
  e.top.innerHTML = "";
  e.block.classList.remove("is-exiting");
}

// ── Public API ──

export function loaderShow() {
  const e = dom();
  if (!e) return Promise.resolve();
  const g = window.gsap;

  e.top.innerHTML = digits(0);
  e.bot.innerHTML = "";

  if (!g) {
    e.wrap.style.cssText = "display:block;pointer-events:auto;opacity:1";
    e.brand.style.opacity = "1";
    e.progress.style.opacity = "1";
    positionBlock(e, 0);
    return Promise.resolve();
  }

  g.killTweensOf([e.wrap, e.brand, e.progress]);
  // Loader fully visible, covering everything underneath
  g.set(e.wrap, { display: "block", pointerEvents: "auto", autoAlpha: 1 });
  g.set(e.brand, { autoAlpha: 0 });
  g.set(e.progress, { autoAlpha: 0 });

  // Snap block to start with no transition
  e.block.style.transition = "none";
  positionBlock(e, 0);
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
  e.block.classList.remove("is-flipping", "is-exiting");
  e.top.innerHTML = "";
  e.bot.innerHTML = "";
  return Promise.resolve();
}

export async function loaderProgressTo() {
  const e = dom();
  if (!e) return;
  const g = window.gsap;
  const steps = sequence();

  if (!g) {
    e.top.innerHTML = digits(100);
    positionBlock(e, 100);
    return;
  }

  // ── Intro: fade in brand + counter simultaneously
  g.to(e.brand, { autoAlpha: 1, duration: 0.4, ease: "power2.out" });
  await g.to(e.progress, { autoAlpha: 1, duration: 0.4, ease: "power2.out" });

  // ── Hold on 0%
  await wait(500);

  // ── Step 1
  await flip(e, steps[1]);
  await wait(50);

  // ── Step 2
  await flip(e, steps[2]);
  await wait(50);

  // ── Step 3: always 100
  await flip(e, 100);
  await wait(50);

  // ── 100% exit: digits stagger out + brand fades
  g.to(e.brand, { autoAlpha: 0, duration: 0.5, ease: "expo.out" });
  await exit(e);
}

export function loaderOutro({ onRevealStart } = {}) {
  const e = dom();
  if (!e) return Promise.resolve();

  if (typeof onRevealStart === "function") onRevealStart();

  if (window.gsap) {
    return window.gsap.to(e.wrap, {
      autoAlpha: 0,
      duration: 0.45,
      ease: "power1.out",
    }).then(() => {});
  }

  return new Promise((resolve) => {
    e.wrap.style.opacity = "0";
    setTimeout(resolve, 500);
  });
}

export async function runLoader(duration = 5.0, _container = document, opts = {}) {
  await loaderShow();
  await loaderProgressTo();
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
    positionBlock(e, num);
    requestAnimationFrame(() => { e.block.style.transition = ""; });
  });
});
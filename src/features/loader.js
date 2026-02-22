// src/features/loader.js

const SEQUENCE = [0, 24, 72, 100];

function dom() {
  const w = document.querySelector('[data-loader="wrap"]');
  if (!w) return null;
  const q = (s) => w.querySelector(s);
  return {
    wrap: w,
    panel: q(".loader-panel"),
    brand: q(".loader-brand"),
    progress: q("[data-loader-progress]"),
    block: q("[data-loader-block]"),
    top: q("[data-loader-top]"),
    bot: q("[data-loader-bot]"),
  };
}

function digits(n) {
  return String(n).split("").concat("%")
    .map((ch, i) => `<span class="loader-digit" style="--i:${i}">${ch}</span>`)
    .join("");
}

function travel(e) {
  const pad = parseFloat(getComputedStyle(e.panel).paddingTop) || 40;
  return Math.max(0, innerHeight - pad * 2);
}

function blockY(e, p) {
  const px = travel(e) * p;
  e.block.style.transform = p === 0
    ? "translate3d(0,0,0)"
    : `translate3d(0,calc(0.875em - ${px}px),0)`;
}

function lastDigitAnimEnd(container) {
  return new Promise((resolve) => {
    const spans = container.querySelectorAll(".loader-digit");
    if (!spans.length) return resolve();
    const last = spans[spans.length - 1];
    last.addEventListener("animationend", resolve, { once: true });
  });
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function flip(e, value, p) {
  e.bot.innerHTML = digits(value);
  e.block.classList.add("is-flipping");
  blockY(e, p);
  await lastDigitAnimEnd(e.bot);
  e.top.innerHTML = digits(value);
  e.bot.innerHTML = "";
  e.block.classList.remove("is-flipping");
}

async function exitFlip(e) {
  e.block.classList.add("is-exiting");
  await lastDigitAnimEnd(e.top);
  // Do NOT remove is-exiting or touch innerHTML — prevents flash-back
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
    blockY(e, 0);
    return Promise.resolve();
  }

  g.killTweensOf(e.wrap);
  g.set(e.wrap, { display: "block", pointerEvents: "auto", autoAlpha: 1 });
  g.set(e.brand, { autoAlpha: 0 });
  g.set(e.progress, { autoAlpha: 0 });

  e.block.style.transition = "none";
  blockY(e, 0);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { e.block.style.transition = ""; });
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
  e.block.classList.remove("is-flipping", "is-exiting");
  e.block.style.transition = "";
  e.block.style.transform = "";
  e.top.innerHTML = "";
  e.bot.innerHTML = "";
  return Promise.resolve();
}

export async function loaderProgressTo() {
  const e = dom();
  if (!e) return;
  const g = window.gsap;

  if (!g) {
    e.top.innerHTML = digits(100);
    blockY(e, 1);
    return;
  }

  // Intro fade
  await g.to(e.brand, { autoAlpha: 1, duration: 0.4, ease: "power2.out" });
  g.to(e.progress, { autoAlpha: 1, duration: 0.35, ease: "power2.out" });

  // Hold on 0%
  await wait(500);

  // 0 → 24
  await flip(e, 24, 0.24);
  await wait(100);

  // 24 → 72
  await flip(e, 72, 0.72);
  await wait(100);

  // 72 → 100
  await flip(e, 100, 1);
  await wait(100);

  // 100% exit: digits stagger out + brand fades
  g.to(e.brand, { autoAlpha: 0, duration: 0.5, ease: "expo.out" });
  await exitFlip(e);
}

export function loaderOutro({ onRevealStart } = {}) {
  const e = dom();
  if (!e) return Promise.resolve();

  if (typeof onRevealStart === "function") onRevealStart();

  if (window.gsap) {
    return window.gsap.to(e.wrap, {
      autoAlpha: 0,
      duration: 0.5,
      ease: "power1.out",
    }).then(() => {});
  }

  return new Promise((resolve) => {
    e.wrap.style.opacity = "0";
    setTimeout(resolve, 700);
  });
}

export async function runLoader(duration = 5.0, _container = document, opts = {}) {
  await loaderShow();
  await loaderProgressTo();
  await loaderOutro(opts);
  await loaderHide();
}

let _raf = null;
addEventListener("resize", () => {
  const e = dom();
  if (!e?.wrap || e.wrap.style.display === "none") return;
  if (_raf) cancelAnimationFrame(_raf);
  _raf = requestAnimationFrame(() => {
    const num = parseInt(e.top.textContent) || 0;
    e.block.style.transition = "none";
    blockY(e, num / 100);
    requestAnimationFrame(() => { e.block.style.transition = ""; });
  });
});
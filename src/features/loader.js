// src/features/loader.js

function seq() {
  const j = (base, r) => base + Math.floor(Math.random() * r * 2) - r;
  return [0, j(24, 8), j(72, 8), 100];
}

function dom() {
  const w = document.querySelector('[data-loader="wrap"]');
  if (!w) return null;
  const $ = (s) => w.querySelector(s);
  return {
    wrap: w, panel: $(".loader-panel"),
    footer: $("[data-loader-footer]"),
    copy: $("[data-loader-copy]"), status: $("[data-loader-status]"),
    progress: $("[data-loader-progress]"), block: $("[data-loader-block]"),
    top: $("[data-loader-top]"), bot: $("[data-loader-bot]"),
  };
}

// ── Char helpers ──

function chars(text, cls) {
  return text.split("").map((c, i) =>
    `<span class="${cls}" style="--d:${i}">${c === " " ? "&nbsp;" : c}</span>`
  ).join("");
}

function digs(n) {
  return String(n).split("").concat("%").map((c, i) =>
    `<span class="loader-digit" style="--d:${i}">${c}</span>`
  ).join("");
}

function padNum(n) {
  return n < 10 ? "0" + n : String(n);
}

// Wait for last animated child to finish
function lastAnimOf(el, selector) {
  return new Promise((res) => {
    const items = el.querySelectorAll(selector);
    if (!items.length) return res();
    const last = items[items.length - 1];
    last.addEventListener("animationend", function h() {
      last.removeEventListener("animationend", h); res();
    });
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Y position ──

function posY(e, pct) {
  const pad = parseFloat(getComputedStyle(e.panel).paddingTop) || 40;
  const bh = e.block.getBoundingClientRect().height;
  const total = Math.max(0, innerHeight - pad * 2 - bh);
  e.block.style.transform = `translate3d(0,${-(total * pct / 100)}px,0)`;
}

// ── Counter flip ──

async function flip(e, val) {
  e.bot.innerHTML = digs(val);
  e.block.classList.add("is-flipping");
  posY(e, val);
  await lastAnimOf(e.bot, ".loader-digit");
  e.top.innerHTML = digs(val);
  e.bot.innerHTML = "";
  e.block.classList.remove("is-flipping");
}

// ── Status flip (swap messages char by char) ──

async function flipStatus(e, text) {
  // Build top/bot wrappers with chars
  const topText = e.status.querySelector(".loader-status-top")?.textContent || "";
  e.status.innerHTML =
    `<span class="loader-status-top">${chars(topText, "loader-char")}</span>` +
    `<span class="loader-status-bot">${chars(text, "loader-char")}</span>`;
  e.status.classList.add("is-flipping");
  await lastAnimOf(e.status, ".loader-status-bot > .loader-char");
  // Swap — set new text, clear old, remove class
  e.status.innerHTML = `<span class="loader-status-top">${chars(text, "loader-char")}</span>`;
  e.status.classList.remove("is-flipping");
}

// ── Stagger text in ──

async function enterText(el, text) {
  el.innerHTML = chars(text, "loader-char");
  el.classList.add("is-entering");
  await lastAnimOf(el, ".loader-char");
  el.classList.remove("is-entering");
}

// ── Stagger text out ──

async function exitText(el) {
  el.classList.add("is-exiting");
  await lastAnimOf(el, ".loader-char");
  el.innerHTML = "";
  el.classList.remove("is-exiting");
}

// ── Counter exit ──

async function exitCounter(e) {
  e.block.classList.add("is-exiting");
  await lastAnimOf(e.top, ".loader-digit");
  e.top.innerHTML = "";
  e.block.classList.remove("is-exiting");
}

// ── Public API ──

export function loaderShow() {
  const e = dom();
  if (!e) return Promise.resolve();
  const g = window.gsap;

  e.top.innerHTML = digs(padNum(0));
  e.bot.innerHTML = "";
  e.copy.innerHTML = "";
  e.status.innerHTML = "";

  if (!g) {
    Object.assign(e.wrap.style, { display: "block", pointerEvents: "auto", opacity: "1" });
    posY(e, 0);
    return Promise.resolve();
  }

  g.killTweensOf([e.wrap, e.footer, e.progress]);
  g.set(e.wrap, { display: "block", pointerEvents: "auto", autoAlpha: 1 });
  g.set(e.progress, { autoAlpha: 0 });
  e.block.style.transition = "none";
  posY(e, 0);
  requestAnimationFrame(() => requestAnimationFrame(() => { e.block.style.transition = ""; }));
  return Promise.resolve();
}

export function loaderHide() {
  const e = dom();
  if (!e) return Promise.resolve();
  const g = window.gsap;
  if (!g) { e.wrap.style.cssText = "display:none;pointer-events:none;opacity:0"; return Promise.resolve(); }
  g.set(e.wrap, { display: "none", pointerEvents: "none", autoAlpha: 0 });
  g.set(e.progress, { clearProps: "all" });
  e.block.style.transition = "";
  e.block.style.transform = "";
  e.block.classList.remove("is-flipping", "is-exiting");
  e.copy.classList.remove("is-entering", "is-exiting");
  e.status.classList.remove("is-entering", "is-exiting", "is-flipping");
  e.top.innerHTML = "";
  e.bot.innerHTML = "";
  e.copy.innerHTML = "";
  e.status.innerHTML = "";
  return Promise.resolve();
}

export async function loaderProgressTo() {
  const e = dom();
  if (!e) return;
  const g = window.gsap;
  const steps = seq();
  if (!g) { e.top.innerHTML = digs(100); posY(e, 100); return; }

  // Fade in counter
  g.to(e.progress, { autoAlpha: 1, duration: 0.5, ease: "power2.out" });

  // Stagger in copyright + "Hold tight" simultaneously
  enterText(e.copy, "©2026 Jamie Keaveney");
  enterText(e.status, "Hold tight");

  // Wait for fade-in to settle
  await wait(500);

  // Step 1 — counter flips, footer text stays
  await flip(e, steps[1]);
  await wait(50);

  // Step 2 — counter flips + status flips to "Hi there!"
  flipStatus(e, "Hi there!");
  await flip(e, steps[2]);
  await wait(50);

  // Step 3 — 100%
  await flip(e, 100);
  await wait(50);

  // Everything exits together — all char by char
  exitText(e.copy);
  exitText(e.status);
  await exitCounter(e);
}

export function loaderOutro({ onRevealStart } = {}) {
  const e = dom();
  if (!e) return Promise.resolve();
  if (typeof onRevealStart === "function") onRevealStart();
  if (window.gsap) {
    return window.gsap.to(e.wrap, { autoAlpha: 0, duration: 0.35, ease: "power1.out" }).then(() => {});
  }
  e.wrap.style.opacity = "0";
  return new Promise((r) => setTimeout(r, 400));
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
    const n = parseInt(e.top.textContent) || 0;
    e.block.style.transition = "none";
    posY(e, n);
    requestAnimationFrame(() => { e.block.style.transition = ""; });
  });
});
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
    wrap: w, panel: $(".loader-panel"), bar: $("[data-loader-bar]"),
    footer: $("[data-loader-footer]"),
    copy: $("[data-loader-copy]"), status: $("[data-loader-status]"),
    msgTop: $("[data-loader-msg-top]"), msgBot: $("[data-loader-msg-bot]"),
    progress: $("[data-loader-progress]"), block: $("[data-loader-block]"),
    top: $("[data-loader-top]"), bot: $("[data-loader-bot]"),
  };
}

// ── Char helpers ──

// Stagger for message text: spread evenly across the flip duration
// so all chars complete within ~1s regardless of text length
function msgChars(text) {
  const len = text.length;
  const stagger = Math.max(0.02, Math.min(0.05, 0.8 / len));
  return text.split("").map((c, i) =>
    `<span class="loader-char" style="--d:${i};--msg-stagger:${stagger}s">${c === " " ? "&nbsp;" : c}</span>`
  ).join("");
}

function digs(n) {
  const s = n < 10 ? "0" + n : String(n);
  return s.split("").concat("%").map((c, i) =>
    `<span class="loader-digit" style="--d:${i}">${c}</span>`
  ).join("");
}

function lastAnimOf(el, sel) {
  return new Promise((res) => {
    const items = el.querySelectorAll(sel);
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
  e.bar.style.width = val + "%";
  await lastAnimOf(e.bot, ".loader-digit");
  e.top.innerHTML = digs(val);
  e.bot.innerHTML = "";
  e.block.classList.remove("is-flipping");
}

// ── Status: stagger in first message ──

async function enterMsg(e, text) {
  e.msgTop.innerHTML = msgChars(text);
  e.msgBot.innerHTML = "";
  e.status.classList.add("is-entering");
  await lastAnimOf(e.status, ".loader-char");
  e.status.classList.remove("is-entering");
}

// ── Status: flip from current to new message ──

async function flipMsg(e, text) {
  const current = e.msgTop.textContent || "";
  e.msgTop.innerHTML = msgChars(current);
  e.msgBot.innerHTML = msgChars(text);
  e.status.classList.add("is-flipping");
  await lastAnimOf(e.msgBot, ".loader-char");
  e.msgTop.innerHTML = msgChars(text);
  e.msgBot.innerHTML = "";
  e.status.classList.remove("is-flipping");
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

  e.top.innerHTML = digs(0);
  e.bot.innerHTML = "";
  e.msgTop.innerHTML = "";
  e.msgBot.innerHTML = "";
  e.bar.style.width = "0%";

  if (!g) {
    Object.assign(e.wrap.style, { display: "block", pointerEvents: "auto", opacity: "1" });
    posY(e, 0);
    return Promise.resolve();
  }

  g.killTweensOf([e.wrap, e.footer, e.progress]);
  g.set(e.wrap, { display: "block", pointerEvents: "auto", autoAlpha: 1 });
  g.set(e.footer, { autoAlpha: 0 });
  g.set(e.progress, { autoAlpha: 0 });
  e.block.style.transition = "none";
  e.bar.style.transition = "none";
  posY(e, 0);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    e.block.style.transition = "";
    e.bar.style.transition = "";
  }));
  return Promise.resolve();
}

export function loaderHide() {
  const e = dom();
  if (!e) return Promise.resolve();
  const g = window.gsap;
  if (!g) { e.wrap.style.cssText = "display:none;pointer-events:none;opacity:0"; return Promise.resolve(); }
  g.set(e.wrap, { display: "none", pointerEvents: "none", autoAlpha: 0 });
  g.set([e.footer, e.progress], { clearProps: "all" });
  e.block.style.transition = "";
  e.block.style.transform = "";
  e.bar.style.width = "0%";
  e.block.classList.remove("is-flipping", "is-exiting");
  e.status.classList.remove("is-entering", "is-flipping");
  e.top.innerHTML = "";
  e.bot.innerHTML = "";
  e.msgTop.innerHTML = "";
  e.msgBot.innerHTML = "";
  return Promise.resolve();
}

export async function loaderProgressTo() {
  const e = dom();
  if (!e) return;
  const g = window.gsap;
  const steps = seq();
  if (!g) { e.top.innerHTML = digs(100); posY(e, 100); return; }

  // Fade in footer + counter
  g.to(e.footer, { autoAlpha: 1, duration: 0.5, ease: "power2.out" });
  g.to(e.progress, { autoAlpha: 1, duration: 0.5, ease: "power2.out" });
  await wait(500);

  // Step 1: counter flips + "Hold tight" staggers in
  enterMsg(e, "Hold tight");
  await flip(e, steps[1]);
  await wait(50);

  // Step 2: counter flips + status flips to "Hi there!"
  flipMsg(e, "Hi there!");
  await flip(e, steps[2]);
  await wait(50);

  // Step 3: 100%
  await flip(e, 100);
  await wait(50);

  // Exit: 100% staggers out, footer + bar fade out
  g.to(e.footer, { autoAlpha: 0, duration: 0.5, ease: "power2.out" });
  g.to(e.bar, { autoAlpha: 0, duration: 0.5, ease: "power2.out" });
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
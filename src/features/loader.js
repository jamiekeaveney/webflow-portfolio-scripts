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

// ── Helpers ──

function mkChars(text) {
  const len = text.length;
  const ms = Math.max(0.02, Math.min(0.05, 0.8 / len));
  return text.split("").map((c, i) =>
    `<span class="loader-char" style="--d:${i};--ms:${ms.toFixed(3)}s">${c === " " ? "&nbsp;" : c}</span>`
  ).join("");
}

function mkDigs(n) {
  const s = n < 10 ? "0" + n : String(n);
  return s.split("").concat("%").map((c, i) =>
    `<span class="loader-digit" style="--d:${i}">${c}</span>`
  ).join("");
}

function awaitAnim(el, sel) {
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

function posY(e, pct) {
  const pad = parseFloat(getComputedStyle(e.panel).paddingTop) || 40;
  const bh = e.block.getBoundingClientRect().height;
  const total = Math.max(0, innerHeight - pad * 2 - bh);
  e.block.style.transform = `translate3d(0,${-(total * pct / 100)}px,0)`;
}

// ── Counter ──

async function flipNum(e, val) {
  e.bot.innerHTML = mkDigs(val);
  e.block.classList.add("is-flipping");
  posY(e, val);
  e.bar.style.width = val + "%";
  await awaitAnim(e.bot, ".loader-digit");
  e.top.innerHTML = mkDigs(val);
  e.bot.innerHTML = "";
  e.block.classList.remove("is-flipping");
}

async function exitNum(e) {
  e.block.classList.add("is-exiting");
  await awaitAnim(e.top, ".loader-digit");
  e.top.innerHTML = "";
  e.block.classList.remove("is-exiting");
}

// ── Status message ──
// enterMsg: staggers chars in from below (called once)
// flipMsg: old text exits up, new text enters from below (called once)
// These use unique class names so they never accidentally re-trigger

function enterMsg(e, text) {
  e.msgTop.innerHTML = mkChars(text);
  e.msgBot.innerHTML = "";
  e.status.classList.add("is-msg-entering");
  // Don't await — runs alongside the counter flip
  awaitAnim(e.status, ".loader-char").then(() => {
    e.status.classList.remove("is-msg-entering");
  });
}

function flipMsg(e, text) {
  // Rebuild current text as chars for animation
  const current = e.msgTop.textContent || "";
  e.msgTop.innerHTML = mkChars(current);
  e.msgBot.innerHTML = mkChars(text);
  e.status.classList.add("is-msg-flipping");
  awaitAnim(e.msgBot, ".loader-char").then(() => {
    // Swap: new text becomes static in top slot
    e.msgTop.innerHTML = mkChars(text);
    e.msgBot.innerHTML = "";
    e.status.classList.remove("is-msg-flipping");
  });
}

// ── Public API ──

export function loaderShow() {
  const e = dom();
  if (!e) return Promise.resolve();
  const g = window.gsap;

  e.top.innerHTML = mkDigs(0);
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
  e.status.classList.remove("is-msg-entering", "is-msg-flipping");
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
  if (!g) { e.top.innerHTML = mkDigs(100); posY(e, 100); return; }

  // Fade in
  g.to(e.footer, { autoAlpha: 1, duration: 0.5, ease: "power2.out" });
  g.to(e.progress, { autoAlpha: 1, duration: 0.5, ease: "power2.out" });
  await wait(500);

  // Step 1: 0→~24, "Hold tight" staggers in alongside
  enterMsg(e, "Hold tight");
  await flipNum(e, steps[1]);
  await wait(50);

  // Step 2: ~24→~72, status untouched — just counter flips
  await flipNum(e, steps[2]);
  await wait(50);

  // Step 3: ~72→100, status flips "Hold tight" → "Hi there!" alongside
  flipMsg(e, "Hi there!");
  await flipNum(e, 100);
  await wait(50);

  // Exit: 100% staggers out, footer + bar fade out
  g.to(e.footer, { autoAlpha: 0, duration: 0.5, ease: "power2.out" });
  g.to(e.bar, { autoAlpha: 0, duration: 0.5, ease: "power2.out" });
  await exitNum(e);
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
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
    footer: $(".loader-footer"), copy: $(".loader-copy"), status: $(".loader-status"),
    statusTop: $("[data-loader-status-top]"), statusBot: $("[data-loader-status-bot]"),
    progress: $("[data-loader-progress]"), block: $("[data-loader-block]"),
    top: $("[data-loader-top]"), bot: $("[data-loader-bot]"),
  };
}

function digs(n) {
  return String(n).split("").concat("%")
    .map((c, i) => `<span class="loader-digit" style="--d:${i}">${c}</span>`)
    .join("");
}

function posY(e, pct) {
  const pad = parseFloat(getComputedStyle(e.panel).paddingTop) || 40;
  const bh = e.block.getBoundingClientRect().height;
  const total = Math.max(0, innerHeight - pad * 2 - bh);
  e.block.style.transform = `translate3d(0,${-(total * pct / 100)}px,0)`;
}

function lastAnim(el) {
  return new Promise((res) => {
    const spans = el.querySelectorAll(".loader-digit");
    if (!spans.length) return res();
    const last = spans[spans.length - 1];
    last.addEventListener("animationend", function h() {
      last.removeEventListener("animationend", h); res();
    });
  });
}

function animEnd(el) {
  return new Promise((res) => {
    el.addEventListener("animationend", function h() {
      el.removeEventListener("animationend", h); res();
    });
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function flip(e, val) {
  e.bot.innerHTML = digs(val);
  e.block.classList.add("is-flipping");
  posY(e, val);
  await lastAnim(e.bot);
  e.top.innerHTML = digs(val);
  e.bot.innerHTML = "";
  e.block.classList.remove("is-flipping");
}

async function flipStatus(e, text) {
  e.statusBot.textContent = text;
  e.status.classList.add("is-flipping");
  await animEnd(e.statusBot);
  e.statusTop.textContent = text;
  e.statusBot.textContent = "";
  e.status.classList.remove("is-flipping");
}

async function exitAll(e) {
  // Numbers stagger out
  e.block.classList.add("is-exiting");
  // Footer text slides out (staggered slightly after)
  e.copy.classList.add("is-exiting");
  e.status.classList.add("is-exiting");

  await lastAnim(e.top);

  e.top.innerHTML = "";
  e.block.classList.remove("is-exiting");
  e.copy.classList.remove("is-exiting");
  e.status.classList.remove("is-exiting");
}

export function loaderShow() {
  const e = dom();
  if (!e) return Promise.resolve();
  const g = window.gsap;
  e.top.innerHTML = digs(0);
  e.bot.innerHTML = "";
  e.statusTop.textContent = "Hi there";
  e.statusBot.textContent = "";

  if (!g) {
    Object.assign(e.wrap.style, { display: "block", pointerEvents: "auto", opacity: "1" });
    e.footer.style.opacity = "1";
    e.progress.style.opacity = "1";
    posY(e, 0);
    return Promise.resolve();
  }

  g.killTweensOf([e.wrap, e.footer, e.progress]);
  g.set(e.wrap, { display: "block", pointerEvents: "auto", autoAlpha: 1 });
  g.set(e.footer, { autoAlpha: 0 });
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
  g.set([e.footer, e.progress], { clearProps: "all" });
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
  const steps = seq();
  if (!g) { e.top.innerHTML = digs(100); posY(e, 100); return; }

  // Fade in footer + counter together
  g.to(e.footer, { autoAlpha: 1, duration: 0.5, ease: "power2.out" });
  await g.to(e.progress, { autoAlpha: 1, duration: 0.5, ease: "power2.out" });

  // Step 1 — status stays "Hi there"
  await flip(e, steps[1]);
  await wait(50);

  // Step 2 — status flips to "Loading..."
  flipStatus(e, "Loading...");
  await flip(e, steps[2]);
  await wait(50);

  // Step 3 — 100%
  await flip(e, 100);
  await wait(50);

  // Everything exits together
  await exitAll(e);
}

export function loaderOutro({ onRevealStart } = {}) {
  const e = dom();
  if (!e) return Promise.resolve();
  if (typeof onRevealStart === "function") onRevealStart();

  // Straight to homepage — just hide the loader
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
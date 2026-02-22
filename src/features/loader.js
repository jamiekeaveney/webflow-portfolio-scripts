// src/features/loader.js
// Loader sequence: 0% -> 24% -> 72% -> 100%
// 0% starts bottom-right, 100% ends top-right.
// Requires global loader markup with:
// [data-loader="wrap"], .loader-panel, .loader-brand,
// [data-loader-progress], [data-loader-block],
// [data-loader-val-top], [data-loader-val-bot]

const STEPS = [24, 72, 100];

// -------------------------
// DOM helpers
// -------------------------
function dom(scope = document) {
  const wrap =
    document.querySelector('[data-loader="wrap"]') ||
    scope.querySelector?.('[data-loader="wrap"]');

  if (!wrap) return null;

  return {
    wrap,
    panel: wrap.querySelector(".loader-panel"),
    brand: wrap.querySelector(".loader-brand"),
    progress: wrap.querySelector("[data-loader-progress]"),
    block: wrap.querySelector("[data-loader-block]"),
    valTop: wrap.querySelector("[data-loader-val-top]"),
    valBot: wrap.querySelector("[data-loader-val-bot]")
  };
}

function hasGSAP() {
  return typeof window !== "undefined" && !!window.gsap;
}

function fmt(n) {
  return `${Math.round(n)}%`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -------------------------
// Travel maths
// -------------------------
// Returns the Y offset (in px) for the progress block.
// 0% = bottom, 100% = top.
function calcY(e, progress) {
  if (!e?.panel || !e?.block) return 0;

  const panelRect = e.panel.getBoundingClientRect();
  const panelH = panelRect.height || window.innerHeight;

  const styles = getComputedStyle(e.panel);
  const padTop = parseFloat(styles.paddingTop) || 0;
  const padBottom = parseFloat(styles.paddingBottom) || 0;

  const blockH = e.block.offsetHeight || 0;

  // block y=0 is top aligned to panel content box
  const travel = Math.max(0, panelH - padTop - padBottom - blockH);

  // 0% => bottom (travel), 100% => top (0)
  return travel * (1 - progress / 100);
}

// -------------------------
// Flip helpers
// -------------------------
function resetFlipSlots(e, g, value = 0) {
  e.valTop.textContent = fmt(value);
  e.valBot.textContent = fmt(value);

  if (g) {
    // top visible, bottom below (hidden by overflow)
    g.set(e.valTop, { yPercent: 0 });
    g.set(e.valBot, { yPercent: 100 });
  } else {
    e.valTop.style.transform = "translate3d(0,0%,0)";
    e.valBot.style.transform = "translate3d(0,100%,0)";
  }
}

function flipTo(e, nextValue, duration = 0.8) {
  const g = hasGSAP() ? window.gsap : null;

  if (!g) {
    e.valTop.textContent = fmt(nextValue);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    // incoming text sits below
    e.valBot.textContent = fmt(nextValue);
    g.set(e.valBot, { yPercent: 100 });

    const ease = "expo.inOut";

    // animate both upward together
    g.to(e.valTop, {
      yPercent: -100,
      duration,
      ease
    });

    g.to(e.valBot, {
      yPercent: 0,
      duration,
      ease,
      onComplete: () => {
        // promote bottom to top/current
        e.valTop.textContent = fmt(nextValue);
        g.set(e.valTop, { yPercent: 0 });
        g.set(e.valBot, { yPercent: 100 });
        resolve();
      }
    });
  });
}

function flipOut(e, duration = 0.65) {
  const g = hasGSAP() ? window.gsap : null;

  if (!g) return Promise.resolve();

  return new Promise((resolve) => {
    g.to(e.valTop, {
      yPercent: -120,
      duration,
      ease: "expo.out",
      onComplete: resolve
    });
  });
}

// -------------------------
// Public visibility API
// -------------------------
export function loaderShow() {
  const e = dom();
  if (!e) return Promise.resolve();

  const g = hasGSAP() ? window.gsap : null;

  // reset content
  if (g) {
    g.killTweensOf([e.wrap, e.brand, e.block, e.valTop, e.valBot]);
  }

  resetFlipSlots(e, g, 0);

  const y0 = calcY(e, 0);

  if (!g) {
    e.wrap.style.opacity = "1";
    e.wrap.style.visibility = "visible";
    e.wrap.style.pointerEvents = "auto";
    e.brand.style.opacity = "1";
    e.block.style.opacity = "1";
    e.block.style.transform = `translate3d(0, ${y0}px, 0)`;
    return Promise.resolve();
  }

  g.set(e.wrap, {
    autoAlpha: 1,
    visibility: "visible",
    pointerEvents: "auto"
  });

  g.set(e.brand, { autoAlpha: 0, y: 8 });
  g.set(e.block, { autoAlpha: 0, x: 0, y: y0 });

  const tl = g.timeline();
  tl.to(e.brand, {
    autoAlpha: 1,
    y: 0,
    duration: 0.35,
    ease: "power2.out"
  }, 0);

  tl.to(e.block, {
    autoAlpha: 1,
    duration: 0.25,
    ease: "none"
  }, 0.06);

  return tl.then(() => {});
}

export function loaderHide() {
  const e = dom();
  if (!e) return Promise.resolve();

  const g = hasGSAP() ? window.gsap : null;

  if (!g) {
    e.wrap.style.opacity = "0";
    e.wrap.style.visibility = "hidden";
    e.wrap.style.pointerEvents = "none";
    return Promise.resolve();
  }

  g.killTweensOf([e.wrap, e.brand, e.block, e.valTop, e.valBot]);

  g.set(e.wrap, {
    autoAlpha: 0,
    visibility: "hidden",
    pointerEvents: "none"
  });

  // Keep transforms clean for next run
  g.set([e.brand, e.block, e.valTop, e.valBot], { clearProps: "all" });

  return Promise.resolve();
}

// -------------------------
// Progress animation
// -------------------------
export function loaderProgressTo(totalDuration = 4.8) {
  const e = dom();
  if (!e) return Promise.resolve();

  const g = hasGSAP() ? window.gsap : null;

  if (!g) {
    e.valTop.textContent = "100%";
    e.block.style.transform = `translate3d(0, ${calcY(e, 100)}px, 0)`;
    return Promise.resolve();
  }

  // durations weighted by distance:
  // 0→24 (24), 24→72 (48), 72→100 (28)
  const d1 = totalDuration * 0.24;
  const d2 = totalDuration * 0.48;
  const d3 = totalDuration * 0.28;

  const tl = g.timeline();

  // hold 0 briefly
  tl.to({}, { duration: 0.25 });

  // 0 -> 24
  tl.addLabel("s1");
  tl.to(e.block, {
    y: calcY(e, 24),
    duration: d1,
    ease: "sine.inOut"
  }, "s1");
  tl.call(() => flipTo(e, 24, d1), [], "s1");

  // 24 -> 72
  tl.addLabel("s2");
  tl.to(e.block, {
    y: calcY(e, 72),
    duration: d2,
    ease: "sine.inOut"
  }, "s2");
  tl.call(() => flipTo(e, 72, d2), [], "s2");

  // 72 -> 100
  tl.addLabel("s3");
  tl.to(e.block, {
    y: calcY(e, 100),
    duration: d3,
    ease: "sine.inOut"
  }, "s3");
  tl.call(() => flipTo(e, 100, d3), [], "s3");

  // hold at 100
  tl.to({}, { duration: 0.2 });

  return tl.then(() => {});
}

// -------------------------
// Outro (fade loader out + trigger page reveals)
// -------------------------
export function loaderOutro({ onRevealStart } = {}) {
  const e = dom();
  if (!e) return Promise.resolve();

  const g = hasGSAP() ? window.gsap : null;

  if (!g) {
    if (typeof onRevealStart === "function") onRevealStart();
    e.wrap.style.opacity = "0";
    return Promise.resolve();
  }

  const tl = g.timeline();

  tl.call(() => {
    if (typeof onRevealStart === "function") onRevealStart();
  }, [], 0.05);

  // Optional: flip 100% out before fade
  tl.call(() => flipOut(e, 0.55), [], 0);

  tl.to([e.brand, e.block], {
    autoAlpha: 0,
    duration: 0.35,
    ease: "power2.out"
  }, 0.12);

  tl.to(e.wrap, {
    autoAlpha: 0,
    duration: 0.45,
    ease: "power2.inOut"
  }, 0.18);

  return tl.then(() => {});
}

// -------------------------
// Main API used by home.js
// -------------------------
export async function runLoader(totalDuration = 4.8, _container = document, opts = {}) {
  await loaderShow();
  await loaderProgressTo(totalDuration);
  await loaderOutro(opts);
  await loaderHide();
}

// -------------------------
// Keep correct Y on resize while visible
// -------------------------
let _resizeRaf = 0;

function onResize() {
  const e = dom();
  if (!e?.wrap) return;

  const wrapVisible =
    getComputedStyle(e.wrap).visibility !== "hidden" &&
    getComputedStyle(e.wrap).opacity !== "0";

  if (!wrapVisible) return;

  cancelAnimationFrame(_resizeRaf);
  _resizeRaf = requestAnimationFrame(() => {
    const text = (e.valTop.textContent || "0%").replace("%", "");
    const num = Number(text) || 0;
    const y = calcY(e, num);

    const g = hasGSAP() ? window.gsap : null;
    if (g) {
      g.set(e.block, { y });
    } else {
      e.block.style.transform = `translate3d(0, ${y}px, 0)`;
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("resize", onResize);
}
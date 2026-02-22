// src/features/loader.js
//
// Counter loader  0% → 24% → 72% → 100%
// Three stepped Y tweens, back-to-back, no gaps.
// Reel digits stagger at the start of each step.
// 100% exit: columns stagger upward.

const DIGITS = {
  h: ["", "", "", "1"],
  t: ["", "2", "7", "0"],
  o: ["0", "4", "2", "0"],
  p: ["%", "%", "%", "%"],
};
const KEYS = ["h", "t", "o", "p"];
const STOPS = [0, 0.24, 0.72, 1]; // Y progress at each step

// ── DOM ──

function dom() {
  const w = document.querySelector('[data-loader="wrap"]');
  if (!w) return null;
  const $ = (s) => w.querySelector(s);
  return {
    wrap: w,
    panel: $(".loader-panel"),
    brand: $(".loader-brand"),
    anchor: $("[data-loader-counter-anchor]"),
    main: $("[data-loader-counter-main]"),
    rail: Object.fromEntries(KEYS.map((k) => [k, $(`[data-col="${k}"]`)])),
  };
}

// ── Build + measure ──

function buildReels(e) {
  KEYS.forEach((k) => {
    const r = e.rail[k];
    if (!r) return;
    r.innerHTML = DIGITS[k]
      .map((ch) =>
        ch
          ? `<div class="loader-cell">${ch}</div>`
          : `<div class="loader-cell loader-cell-blank">0</div>`
      )
      .join("");
  });
}

function measure(e) {
  if (!e.main) return;
  e.main.querySelectorAll(".loader-win").forEach((win) => {
    const rail = win.querySelector(".loader-rail");
    if (!rail) return;
    const cells = [...rail.children];
    if (!cells.length) return;

    Object.assign(win.style, { width: "", height: "" });
    rail.style.width = "";
    cells.forEach((c) => Object.assign(c.style, { height: "", padding: "" }));

    let mw = 0, mh = 0;
    cells.forEach((c) => {
      const b = c.getBoundingClientRect();
      if (b.width > mw) mw = b.width;
      if (b.height > mh) mh = b.height;
    });

    const w = Math.ceil(mw), h = Math.ceil(mh);
    win.style.width = w + "px";
    win.style.height = h + "px";
    rail.style.width = w + "px";
    cells.forEach((c) => (c.style.height = h + "px"));
  });
}

// ── Helpers ──

function cellH(rail) {
  return rail?.firstElementChild?.getBoundingClientRect().height || 0;
}

function totalTravel(e) {
  const pad = parseFloat(getComputedStyle(e.panel).paddingTop) || 40;
  return Math.max(0, innerHeight - pad * 2 - (e.anchor?.offsetHeight || 0));
}

// ── Public API ──

export function loaderShow() {
  const e = dom();
  if (!e) return Promise.resolve();
  const g = window.gsap;

  buildReels(e);

  if (!g) {
    e.wrap.style.cssText = "display:block;pointer-events:auto;opacity:1";
    measure(e);
    KEYS.forEach((k) => { if (e.rail[k]) e.rail[k].style.transform = "translate3d(0,0,0)"; });
    e.anchor.style.transform = "translate3d(0,0,0)";
    return Promise.resolve();
  }

  g.killTweensOf([e.wrap, e.brand, e.anchor, ...Object.values(e.rail)]);
  g.set(e.wrap, { display: "block", pointerEvents: "auto", autoAlpha: 1 });
  g.set(e.brand, { autoAlpha: 0 });
  g.set(e.anchor, { autoAlpha: 0 });

  measure(e);
  KEYS.forEach((k) => e.rail[k] && g.set(e.rail[k], { y: 0 }));
  g.set(e.anchor, { y: 0 });

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
  g.set([e.brand, e.anchor, ...Object.values(e.rail)], { clearProps: "all" });
  e.main?.querySelectorAll(".loader-win").forEach((w) => g.set(w, { clearProps: "all" }));
  return Promise.resolve();
}

/**
 * Main timeline.
 *
 * Three Y steps placed back-to-back with ZERO gap:
 *   Step 1:  Y 0% → 24%,   reels stagger to index 1 (shows "24%")
 *   Step 2:  Y 24% → 72%,  reels stagger to index 2 (shows "72%")
 *   Step 3:  Y 72% → 100%, reels stagger to index 3 (shows "100%")
 *
 * All use expo.inOut — the deceleration of one step merges smoothly
 * into the acceleration of the next. No hard stops.
 *
 * Reel scrolls share the same ease + duration as the Y tween for that step,
 * so digits and position land together.
 */
export function loaderProgressTo(duration = 4.5) {
  const e = dom();
  if (!e || !window.gsap) {
    if (e) {
      KEYS.forEach((k) => {
        const r = e.rail[k];
        if (r) r.style.transform = `translate3d(0,${-3 * cellH(r)}px,0)`;
      });
      e.anchor.style.transform = `translate3d(0,${-totalTravel(e)}px,0)`;
    }
    return Promise.resolve();
  }

  measure(e);

  const g = window.gsap;
  const tl = g.timeline();
  const dist = totalTravel(e);
  const ease = "expo.inOut";
  const reelStagger = 0.09;

  // Step durations (proportional to distance travelled)
  // 0→24 = 24%, 24→72 = 48%, 72→100 = 28%
  const d1 = duration * 0.28;
  const d2 = duration * 0.44;
  const d3 = duration * 0.28;

  // ── Intro fade
  tl.to(e.brand, { autoAlpha: 1, duration: 0.4, ease: "power2.out" }, 0);
  tl.to(e.anchor, { autoAlpha: 1, duration: 0.35, ease: "power2.out" }, 0.06);

  // ── Hold on 0%
  tl.to({}, { duration: 0.35 });

  // ── Step 1: 0% → 24%
  tl.addLabel("s1");
  tl.to(e.anchor, { y: -dist * STOPS[1], duration: d1, ease }, "s1");
  KEYS.forEach((k, i) => {
    const r = e.rail[k];
    if (!r) return;
    tl.to(r, { y: -1 * cellH(r), duration: d1, ease }, `s1+=${i * reelStagger}`);
  });

  // ── Step 2: 24% → 72%  (starts IMMEDIATELY after step 1 — no gap)
  tl.addLabel("s2", `s1+=${d1}`);
  tl.to(e.anchor, { y: -dist * STOPS[2], duration: d2, ease }, "s2");
  KEYS.forEach((k, i) => {
    const r = e.rail[k];
    if (!r) return;
    tl.to(r, { y: -2 * cellH(r), duration: d2, ease }, `s2+=${i * reelStagger}`);
  });

  // ── Step 3: 72% → 100%  (starts IMMEDIATELY after step 2)
  tl.addLabel("s3", `s2+=${d2}`);
  tl.to(e.anchor, { y: -dist * STOPS[3], duration: d3, ease }, "s3");
  KEYS.forEach((k, i) => {
    const r = e.rail[k];
    if (!r) return;
    tl.to(r, { y: -3 * cellH(r), duration: d3, ease }, `s3+=${i * reelStagger}`);
  });

  // ── Hold at 100%
  tl.to({}, { duration: 0.3 }, `s3+=${d3}`);

  // ── 100% exit: stagger columns upward
  tl.addLabel("exit");
  KEYS.forEach((k, i) => {
    const win = e.rail[k]?.closest(".loader-win");
    if (!win) return;
    tl.to(win, {
      yPercent: -120,
      duration: 0.75,
      ease: "expo.out",
    }, `exit+=${i * reelStagger}`);
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

export async function runLoader(duration = 4.5, _container = document, opts = {}) {
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
  _raf = requestAnimationFrame(() => measure(e));
});
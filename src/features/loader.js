// src/features/loader.js
//
// Counter loader  0% → 24% → 72% → 100%
// One continuous vertical glide. Reel digits change at threshold points.
// 100% exit: columns stagger upward matching site letter-reveal language.

const DIGITS = {
  h: ["", "", "", "1"],
  t: ["", "2", "7", "0"],
  o: ["0", "4", "2", "0"],
  p: ["%", "%", "%", "%"],
};
const KEYS = ["h", "t", "o", "p"];

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

// Scroll one rail to step index (staggered call, but shared ease/duration)
function scrollRail(rail, step, g) {
  if (!rail) return;
  g.to(rail, {
    y: -step * cellH(rail),
    duration: 1.0,
    ease: "expo.inOut",
    overwrite: true,
  });
}

// Stagger all 4 rails to a step
function scrollReels(e, step, g) {
  KEYS.forEach((k, i) => {
    setTimeout(() => scrollRail(e.rail[k], step, g), i * 90);
  });
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
  // Reset wins too (the 100% exit moves them)
  e.main?.querySelectorAll(".loader-win").forEach((w) => g.set(w, { clearProps: "all" }));
  return Promise.resolve();
}

/**
 * Main timeline.
 *
 * ONE continuous Y tween (anchor) from 0 → full travel.
 * Reel changes fire at threshold crossings (24%, 72%, 100%) via onUpdate.
 * No stops, no holds between steps — just one smooth glide.
 * 100% exit: stagger columns up yPercent:-120.
 */
export function loaderProgressTo(duration = 5.0) {
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

  // ── Intro fade
  tl.to(e.brand, { autoAlpha: 1, duration: 0.4, ease: "power2.out" }, 0);
  tl.to(e.anchor, { autoAlpha: 1, duration: 0.35, ease: "power2.out" }, 0.06);

  // ── Hold on 0%
  tl.to({}, { duration: 0.35 });

  // ── ONE continuous glide from bottom to top
  // Reel changes fire at threshold points during this single tween.
  let firedStep1 = false;
  let firedStep2 = false;
  let firedStep3 = false;

  const proxy = { p: 0 };

  tl.to(proxy, {
    p: 1,
    duration: duration,
    ease: "expo.inOut",
    onUpdate() {
      // Move anchor
      e.anchor.style.transform = `translate3d(0,${-dist * proxy.p}px,0)`;

      // Fire reel changes at thresholds
      if (!firedStep1 && proxy.p >= 0.08) {
        firedStep1 = true;
        scrollReels(e, 1, g); // → 24%
      }
      if (!firedStep2 && proxy.p >= 0.35) {
        firedStep2 = true;
        scrollReels(e, 2, g); // → 72%
      }
      if (!firedStep3 && proxy.p >= 0.70) {
        firedStep3 = true;
        scrollReels(e, 3, g); // → 100%
      }
    },
  });

  // ── Brief hold at 100%
  tl.to({}, { duration: 0.25 });

  // ── 100% exit: stagger columns up
  tl.addLabel("exit");
  const stagger = 0.09;
  KEYS.forEach((k, i) => {
    const win = e.rail[k]?.closest(".loader-win");
    if (!win) return;
    tl.to(win, {
      yPercent: -120,
      duration: 0.75,
      ease: "expo.out",
    }, `exit+=${i * stagger}`);
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
  _raf = requestAnimationFrame(() => measure(e));
});
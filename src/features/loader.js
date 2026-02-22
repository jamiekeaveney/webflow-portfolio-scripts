// src/features/loader.js
//
// Counter loader  0% → 24% → 72% → 100%
// ONE master progress tween drives Y position + reel changes.
// Feels like one continuous swing between positions.

const DIGITS = {
  h: ["", "", "", "1"],
  t: ["", "2", "7", "0"],
  o: ["0", "4", "2", "0"],
  p: ["%", "%", "%", "%"],
};
const KEYS = ["h", "t", "o", "p"];

// Progress thresholds where reels change
// (slightly before the positional midpoint so reels finish as we arrive)
const THRESHOLDS = [0, 0.02, 0.30, 0.68];
// Y stops: where the counter should be at each step
const Y_STOPS = [0, 0.24, 0.72, 1];

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

function cellH(rail) {
  return rail?.firstElementChild?.getBoundingClientRect().height || 0;
}

function getTravel(e) {
  const pad = parseFloat(getComputedStyle(e.panel).paddingTop) || 40;
  return Math.max(0, innerHeight - pad * 2 - (e.anchor?.offsetHeight || 0));
}

// Map a 0→1 master progress to Y position
// Uses the Y_STOPS to create a piecewise linear mapping:
//   progress 0.00–0.24 → Y 0%–24%
//   progress 0.24–0.72 → Y 24%–72%
//   progress 0.72–1.00 → Y 72%–100%
function progressToY(p) {
  if (p <= 0) return 0;
  if (p >= 1) return 1;

  // Find which segment we're in
  for (let i = 0; i < Y_STOPS.length - 1; i++) {
    const lo = Y_STOPS[i];
    const hi = Y_STOPS[i + 1];
    if (p <= hi) {
      const segFrac = (p - lo) / (hi - lo);
      return lo + (hi - lo) * segFrac;
    }
  }
  return 1;
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
 * ONE master tween: progress 0→1 over full duration with sine.inOut.
 *
 * On every frame:
 *   - Anchor Y = progress mapped through Y_STOPS (linear, since the ease is on the master)
 *   - When progress crosses a threshold, reel scrolls fire with stagger
 *
 * The reel scroll duration = time remaining until the next threshold
 * (estimated from the master tween's progress rate), clamped to feel natural.
 * This means digits finish changing right as we arrive at the position.
 *
 * sine.inOut gives a gentle, swinging feel — no hard braking.
 */
export function loaderProgressTo(duration = 5.0) {
  const e = dom();
  if (!e || !window.gsap) {
    if (e) {
      KEYS.forEach((k) => {
        const r = e.rail[k];
        if (r) r.style.transform = `translate3d(0,${-3 * cellH(r)}px,0)`;
      });
      e.anchor.style.transform = `translate3d(0,${-getTravel(e)}px,0)`;
    }
    return Promise.resolve();
  }

  measure(e);

  const g = window.gsap;
  const tl = g.timeline();
  const dist = getTravel(e);

  // ── Intro fade
  tl.to(e.brand, { autoAlpha: 1, duration: 0.4, ease: "power2.out" }, 0);
  tl.to(e.anchor, { autoAlpha: 1, duration: 0.35, ease: "power2.out" }, 0.06);
  tl.to({}, { duration: 0.35 }); // hold on 0%

  // ── Master progress tween
  const proxy = { p: 0 };
  let currentStep = 0;
  const reelStagger = 0.09;
  const reelEase = "expo.inOut";

  tl.to(proxy, {
    p: 1,
    duration,
    ease: "sine.inOut",
    onUpdate() {
      const p = proxy.p;

      // Y position — direct mapping
      e.anchor.style.transform = `translate3d(0,${-dist * p}px,0)`;

      // Check if we've crossed into the next step
      while (currentStep < 3 && p >= THRESHOLDS[currentStep + 1]) {
        currentStep++;

        // Estimate time remaining to next threshold (or end)
        const nextT = currentStep < 3 ? THRESHOLDS[currentStep + 1] : 1;
        const progressRemaining = nextT - p;
        // The master tween is eased, so this is approximate — but close enough
        const timeRemaining = progressRemaining * duration;
        // Reel duration: enough to finish within the step, min 0.6s, max 1.4s
        const reelDur = Math.max(0.6, Math.min(1.4, timeRemaining * 0.85));

        // Fire staggered reel scrolls
        KEYS.forEach((k, i) => {
          const r = e.rail[k];
          if (!r) return;
          g.to(r, {
            y: -currentStep * cellH(r),
            duration: reelDur,
            ease: reelEase,
            delay: i * reelStagger,
            overwrite: true,
          });
        });
      }
    },
    onComplete() {
      // Snap everything to final positions
      KEYS.forEach((k) => {
        const r = e.rail[k];
        if (r) g.set(r, { y: -3 * cellH(r) });
      });
      g.set(e.anchor, { y: -dist });
    },
  });

  // ── Hold at 100%
  tl.to({}, { duration: 0.3 });

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
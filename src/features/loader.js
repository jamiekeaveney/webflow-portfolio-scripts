// src/features/loader.js

// ------------------------
// helpers
// ------------------------
const pad3 = (num) => `  ${Math.max(0, Math.min(100, Math.round(num)))}`.slice(-3);

function q(root, sel) {
  return root.querySelector(sel);
}

function getDOM() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;

  return {
    wrap,
    title: q(wrap, "[data-loader-title]"),
    year: q(wrap, "[data-loader-year]"),
    progress: q(wrap, "[data-loader-progress]"),
    block: q(wrap, "[data-loader-block]"),

    digitsClip: q(wrap, "[data-loader-digits-clip]"),
    digitsStack: q(wrap, "[data-loader-digits-stack]"),
    rowTop: q(wrap, "[data-loader-row-top]"),
    rowBot: q(wrap, "[data-loader-row-bot]"),

    percentClip: q(wrap, "[data-loader-percent-clip]"),
    percentStack: q(wrap, "[data-loader-percent-stack]"),

    measure: q(wrap, "[data-loader-measure]"),
    measureDigits: q(wrap, "[data-loader-measure-digits]"),
    measurePercent: q(wrap, "[data-loader-measure-percent]")
  };
}

function gsapRef() {
  return typeof window !== "undefined" ? window.gsap : null;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ------------------------
// state
// ------------------------
let _running = false;
let _resizeBound = false;
let _currentProgress = 0;

// ------------------------
// precise measurement
// ------------------------
function measureAndApply(e) {
  // Ensure year is current
  if (e.year) e.year.textContent = new Date().getFullYear();

  // Force measurement text
  e.measureDigits.textContent = "000";
  e.measurePercent.textContent = "%";

  // Read actual glyph boxes
  const dRect = e.measureDigits.getBoundingClientRect();
  const pRect = e.measurePercent.getBoundingClientRect();

  // Use exact rendered height, rounded to avoid fractional drift
  const lineH = Math.ceil(dRect.height);
  const digitsW = Math.ceil(dRect.width);
  const percentW = Math.ceil(pRect.width);

  // Apply exact sizing vars
  e.wrap.style.setProperty("--loader-line-h", `${lineH}px`);
  e.wrap.style.setProperty("--loader-digits-w", `${digitsW}px`);
  e.wrap.style.setProperty("--loader-percent-w", `${percentW}px`);

  // Make rows exactly lineH and stack exactly two rows
  [e.rowTop, e.rowBot].forEach((el) => {
    el.style.height = `${lineH}px`;
    el.style.lineHeight = `${lineH}px`;
  });

  e.digitsClip.style.height = `${lineH}px`;
  e.percentClip.style.height = `${lineH}px`;

  // Reset stacks to top-visible / bottom-hidden
  e.digitsStack.style.transform = "translate3d(0,0,0)";
  e.percentStack.style.transform = "translate3d(0,0,0)";

  return { lineH, digitsW, percentW };
}

// ------------------------
// travel maths
// 0% bottom-right -> 100% top-right
// ------------------------
function getTravelY(e, progress) {
  const p = Math.max(0, Math.min(100, progress));

  const progressRect = e.progress.getBoundingClientRect();
  const blockRect = e.block.getBoundingClientRect();

  // block y within progress area:
  // top = 0
  // bottom = progressHeight - blockHeight
  const maxY = Math.max(0, progressRect.height - blockRect.height);
  const y = maxY * (1 - p / 100);

  return y;
}

// ------------------------
// visual setters
// ------------------------
function setRows(e, currentNum, incomingNum = currentNum) {
  e.rowTop.textContent = pad3(currentNum);
  e.rowBot.textContent = pad3(incomingNum);
}

function setStackOffsets(e, topY = 0, botY = 0) {
  // We move the whole stack, not individual rows, so stack starts at 0.
  // Rows are naturally stacked (rowTop then rowBot)
  e.digitsStack.style.transform = `translate3d(0, ${topY}px, 0)`;
  e.percentStack.style.transform = `translate3d(0, ${botY}px, 0)`;
}

// ------------------------
// exact flip animation (measured)
// ------------------------
async function flipTo(e, nextValue, opts = {}) {
  const g = gsapRef();
  const lineH = parseFloat(getComputedStyle(e.wrap).getPropertyValue("--loader-line-h")) || e.rowTop.getBoundingClientRect().height;

  // Stacks contain [current, next]
  e.rowBot.textContent = pad3(nextValue);

  if (!g) {
    // fallback
    e.rowTop.textContent = pad3(nextValue);
    e.digitsStack.style.transform = "translate3d(0,0,0)";
    e.percentStack.style.transform = "translate3d(0,0,0)";
    return;
  }

  const duration = opts.duration ?? 1.4;
  const ease = opts.ease ?? "expo.inOut";

  // Reset stack positions
  g.set([e.digitsStack, e.percentStack], { y: 0 });

  // Animate stack up by exactly one measured line height
  await Promise.all([
    new Promise((resolve) => {
      g.to(e.digitsStack, {
        y: -lineH,
        duration,
        ease,
        onComplete: resolve
      });
    }),
    new Promise((resolve) => {
      g.to(e.percentStack, {
        y: -lineH,
        duration,
        ease,
        onComplete: resolve
      });
    })
  ]);

  // Promote bottom row to top, reset stacks
  e.rowTop.textContent = pad3(nextValue);
  e.rowBot.textContent = pad3(nextValue);
  g.set([e.digitsStack, e.percentStack], { y: 0 });
}

// ------------------------
// progress block movement
// ------------------------
function moveBlockTo(e, progress, { duration = 0.8, ease = "sine.inOut" } = {}) {
  const g = gsapRef();
  _currentProgress = progress;

  const y = getTravelY(e, progress);

  if (!g) {
    e.block.style.transform = `translate3d(0, ${y}px, 0)`;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    g.to(e.block, {
      y,
      duration,
      ease,
      onComplete: resolve
    });
  });
}

// ------------------------
// visibility API
// ------------------------
export async function loaderShow() {
  const e = getDOM();
  if (!e) return;

  const g = gsapRef();

  measureAndApply(e);

  // Initial state
  setRows(e, 0, 0);

  const y0 = getTravelY(e, 0);

  if (!g) {
    e.wrap.style.visibility = "visible";
    e.wrap.style.pointerEvents = "auto";
    e.wrap.style.opacity = "1";
    e.title.style.opacity = "1";
    e.block.style.opacity = "1";
    e.block.style.transform = `translate3d(0, ${y0}px, 0)`;
    return;
  }

  g.killTweensOf([e.wrap, e.title, e.block, e.digitsStack, e.percentStack]);

  g.set(e.wrap, { autoAlpha: 1, visibility: "visible", pointerEvents: "auto" });
  g.set(e.title, { autoAlpha: 0, y: 8 });
  g.set(e.block, { autoAlpha: 0, y: y0 });
  g.set([e.digitsStack, e.percentStack], { y: 0 });

  await new Promise((resolve) => {
    const tl = g.timeline({ onComplete: resolve });
    tl.to(e.title, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" }, 0);
    tl.to(e.block, { autoAlpha: 1, duration: 0.25, ease: "none" }, 0.05);
  });
}

export async function loaderHide() {
  const e = getDOM();
  if (!e) return;

  const g = gsapRef();

  if (!g) {
    e.wrap.style.opacity = "0";
    e.wrap.style.visibility = "hidden";
    e.wrap.style.pointerEvents = "none";
    return;
  }

  g.killTweensOf([e.wrap, e.title, e.block, e.digitsStack, e.percentStack]);
  g.set(e.wrap, { autoAlpha: 0, visibility: "hidden", pointerEvents: "none" });
  g.set([e.title, e.block, e.digitsStack, e.percentStack], { clearProps: "all" });

  // Keep exact vars (don’t clear measured sizing)
}

// ------------------------
// organic chunked fake preload progress
// ------------------------
function makeProgressSequence() {
  // Same spirit as your React version: chunky / organic
  // We emit values that eventually hit 100.
  const values = [];
  let current = 0;

  const checkpoints = [
    8 + Math.floor(Math.random() * 8),   // ~8-15
    24 + Math.floor(Math.random() * 10), // ~24-33
    52 + Math.floor(Math.random() * 12), // ~52-63
    72 + Math.floor(Math.random() * 10), // ~72-81
    90 + Math.floor(Math.random() * 6),  // ~90-95
    100
  ];

  checkpoints.forEach((target) => {
    while (current < target) {
      const step = Math.max(1, Math.floor(Math.random() * 8)); // 1-7
      let next = Math.min(target, current + step);

      // organic jitter except endpoints
      if (next !== 0 && next !== 100) {
        next = Math.max(current + 1, Math.min(99, next - 2 + Math.round(4 * Math.random())));
      }

      if (next > current) {
        values.push(next);
        current = next;
      }
    }
  });

  if (values[values.length - 1] !== 100) values.push(100);
  return values;
}

// ------------------------
// main run
// ------------------------
export async function runLoader(totalDuration = 4.8, _container = document, opts = {}) {
  if (_running) return;
  _running = true;

  const e = getDOM();
  if (!e) {
    _running = false;
    return;
  }

  const g = gsapRef();

  await loaderShow();

  // Re-measure after visible (important for exact glyph dimensions)
  measureAndApply(e);

  // Build a sequence that fills totalDuration
  const sequence = makeProgressSequence();
  const steps = sequence.length;
  const perStep = Math.max(220, Math.floor((totalDuration * 1000) / Math.max(steps, 1)));

  let visibleValue = 0;
  setRows(e, 0, 0);

  for (let i = 0; i < sequence.length; i++) {
    const next = sequence[i];
    const isLast = next === 100;

    // Move and flip in parallel
    await Promise.all([
      moveBlockTo(e, next, {
        duration: Math.min(1.4, perStep / 1000),
        ease: isLast ? "expo.inOut" : "sine.inOut"
      }),
      flipTo(e, next, {
        duration: 1.4, // matches the feel from your source
        ease: "expo.inOut"
      })
    ]);

    visibleValue = next;

    // tiny hold between chunks
    if (!isLast) {
      await wait(120);
    }
  }

  // Let page reveals start before wipe
  if (typeof opts.onRevealStart === "function") {
    opts.onRevealStart();
  }

  // Wipe/fade out (same idea as your React wipeOut + hide)
  e.wrap.classList.add("wipeOut");

  if (g) {
    await new Promise((resolve) => {
      g.to(e.wrap, {
        autoAlpha: 0,
        duration: 0.7,
        ease: "power2.inOut",
        delay: 0.2,
        onComplete: resolve
      });
    });
  } else {
    await wait(900);
    e.wrap.style.opacity = "0";
  }

  e.wrap.classList.remove("wipeOut");
  await loaderHide();

  _running = false;
}

// ------------------------
// resize handling (re-measure + keep progress position exact)
// ------------------------
function onResize() {
  const e = getDOM();
  if (!e) return;

  const isVisible = getComputedStyle(e.wrap).visibility !== "hidden";
  if (!isVisible) return;

  measureAndApply(e);

  const y = getTravelY(e, _currentProgress);
  const g = gsapRef();

  if (g) {
    g.set(e.block, { y });
  } else {
    e.block.style.transform = `translate3d(0, ${y}px, 0)`;
  }
}

if (typeof window !== "undefined" && !_resizeBound) {
  window.addEventListener("resize", onResize);
  _resizeBound = true;
}
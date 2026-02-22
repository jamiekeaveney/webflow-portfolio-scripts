// src/features/loader.js

const gsap = () => window.gsap;

let _running = false;
let _resizeBound = false;
let _currentProgress = 0;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const pad3 = (num) => `  ${clamp(Math.round(num), 0, 100)}`.slice(-3);

function q(root, sel) {
  return root.querySelector(sel);
}
function qa(root, sel) {
  return Array.from(root.querySelectorAll(sel));
}

function getDOM() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;

  const digitClips = qa(wrap, ".loader__digitClip");
  const digitStacks = qa(wrap, ".loader__digitStack");

  const cols = digitClips.map((clip) => {
    const stack = q(clip, ".loader__digitStack");
    return {
      clip,
      stack,
      top: q(clip, "[data-top]"),
      bot: q(clip, "[data-bot]")
    };
  });

  return {
    wrap,
    title: q(wrap, "[data-loader-title]"),
    year: q(wrap, "[data-loader-year]"),
    progress: q(wrap, "[data-loader-progress]"),
    block: q(wrap, "[data-loader-block]"),

    cols,

    percentClip: q(wrap, "[data-loader-percent-clip]"),
    percentStack: q(wrap, "[data-loader-percent-stack]"),

    measure: q(wrap, "[data-loader-measure]"),
    measureDigits: q(wrap, "[data-loader-measure-digits]"),
    measureDigit: q(wrap, "[data-loader-measure-digit]"),
    measurePercent: q(wrap, "[data-loader-measure-percent]")
  };
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* --------------------------
   Exact measuring (no guesses)
--------------------------- */
function measureAndApply(e) {
  if (e.year) e.year.textContent = new Date().getFullYear();

  // Measure one digit width, total height, and % width using actual font
  e.measureDigit.textContent = "0";
  e.measureDigits.textContent = "000";
  e.measurePercent.textContent = "%";

  const digitRect = e.measureDigit.getBoundingClientRect();
  const digitsRect = e.measureDigits.getBoundingClientRect();
  const percentRect = e.measurePercent.getBoundingClientRect();

  const lineH = Math.ceil(digitRect.height);
  const digitW = Math.ceil(digitsRect.width / 3); // exact per-column width
  const percentW = Math.ceil(percentRect.width);

  e.wrap.style.setProperty("--loader-line-h", `${lineH}px`);
  e.wrap.style.setProperty("--loader-digit-w", `${digitW}px`);
  e.wrap.style.setProperty("--loader-percent-w", `${percentW}px`);

  // Force exact sizes on rows/clips
  e.cols.forEach((col) => {
    col.clip.style.height = `${lineH}px`;
    col.clip.style.width = `${digitW}px`;

    [col.top, col.bot].forEach((row) => {
      row.style.height = `${lineH}px`;
      row.style.lineHeight = `${lineH}px`;
      row.style.width = `${digitW}px`;
    });
  });

  e.percentClip.style.height = `${lineH}px`;
  e.percentClip.style.width = `${percentW}px`;

  qa(e.percentStack, ".loader__percentRow").forEach((row) => {
    row.style.height = `${lineH}px`;
    row.style.lineHeight = `${lineH}px`;
    row.style.width = `${percentW}px`;
  });

  return { lineH, digitW, percentW };
}

/* --------------------------
   Travel: 0% bottom-right -> 100% top-right
--------------------------- */
function getTravelY(e, progress) {
  const p = clamp(progress, 0, 100);
  const progressRect = e.progress.getBoundingClientRect();
  const blockRect = e.block.getBoundingClientRect();

  const maxY = Math.max(0, progressRect.height - blockRect.height);
  return maxY * (1 - p / 100);
}

/* --------------------------
   Digits
--------------------------- */
function splitDigits(num) {
  const s = pad3(num); // "  0", " 24", "100"
  // Convert spaces to 0 visually for the loader look
  return s.replace(/ /g, "0").split("");
}

function setTopAndBottomDigits(e, topNum, botNum = topNum) {
  const topDigits = splitDigits(topNum);
  const botDigits = splitDigits(botNum);

  e.cols.forEach((col, i) => {
    col.top.textContent = topDigits[i];
    col.bot.textContent = botDigits[i];
  });
}

function resetStacks(e) {
  const g = gsap();
  if (g) {
    g.set(e.cols.map((c) => c.stack), { y: 0 });
    g.set(e.percentStack, { y: 0 });
  } else {
    e.cols.forEach((c) => (c.stack.style.transform = "translate3d(0,0,0)"));
    e.percentStack.style.transform = "translate3d(0,0,0)";
  }
}

/* --------------------------
   Flip with stagger (simple, chunky)
--------------------------- */
async function flipTo(e, nextValue) {
  const g = gsap();
  const lineH =
    parseFloat(getComputedStyle(e.wrap).getPropertyValue("--loader-line-h")) ||
    e.cols[0].top.getBoundingClientRect().height;

  // Set bottom incoming digits
  const currentTop = e.cols.map((c) => c.top.textContent).join("");
  const nextDigits = splitDigits(nextValue);

  e.cols.forEach((col, i) => {
    col.bot.textContent = nextDigits[i];
  });

  if (!g) {
    // fallback
    setTopAndBottomDigits(e, nextValue, nextValue);
    return;
  }

  // IMPORTANT: no CSS transitions on these elements, GSAP only
  // Stagger by place value (ones first feels best)
  const order = [2, 1, 0]; // ones, tens, hundreds
  const stacks = order.map((i) => e.cols[i].stack);

  await Promise.all([
    new Promise((resolve) => {
      const tl = g.timeline({ onComplete: resolve });

      // digits flip up by exactly one line
      tl.to(stacks, {
        y: -lineH,
        duration: 1.05,
        ease: "expo.inOut",
        stagger: 0.06
      }, 0);

      // % flips with them (tiny delay)
      tl.to(e.percentStack, {
        y: -lineH,
        duration: 1.05,
        ease: "expo.inOut"
      }, 0.03);
    })
  ]);

  // promote bottom -> top and reset
  e.cols.forEach((col) => {
    col.top.textContent = col.bot.textContent;
  });
  resetStacks(e);
}

/* --------------------------
   Move progress block
--------------------------- */
function moveBlockTo(e, progress, duration = 1.05) {
  const g = gsap();
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
      ease: "expo.inOut",
      onComplete: resolve
    });
  });
}

/* --------------------------
   Public API
--------------------------- */
export async function loaderShow() {
  const e = getDOM();
  if (!e) return;

  const g = gsap();
  measureAndApply(e);

  setTopAndBottomDigits(e, 0, 0);
  resetStacks(e);

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

  g.killTweensOf([e.wrap, e.title, e.block, ...e.cols.map((c) => c.stack), e.percentStack]);
  g.set(e.wrap, { autoAlpha: 1, visibility: "visible", pointerEvents: "auto" });
  g.set(e.title, { autoAlpha: 0, y: 8 });
  g.set(e.block, { autoAlpha: 0, y: y0 });
  resetStacks(e);

  await new Promise((resolve) => {
    const tl = g.timeline({ onComplete: resolve });
    tl.to(e.title, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" }, 0);
    tl.to(e.block, { autoAlpha: 1, duration: 0.25, ease: "none" }, 0.05);
  });
}

export async function loaderHide() {
  const e = getDOM();
  if (!e) return;

  const g = gsap();

  if (!g) {
    e.wrap.style.opacity = "0";
    e.wrap.style.visibility = "hidden";
    e.wrap.style.pointerEvents = "none";
    return;
  }

  g.killTweensOf([e.wrap, e.title, e.block, ...e.cols.map((c) => c.stack), e.percentStack]);
  g.set(e.wrap, { autoAlpha: 0, visibility: "hidden", pointerEvents: "none" });
}

/* --------------------------
   Chunked progress sequence (not 1% ticking)
   You can tweak this to mimic Richard:
   e.g. [0, 24, 72, 100]
--------------------------- */
function buildChunkSequence() {
  // slight variation while staying chunky
  const a = 20 + Math.round(Math.random() * 8);  // 20-28
  const b = 68 + Math.round(Math.random() * 12); // 68-80
  return [0, a, b, 100];
}

export async function runLoader(totalDuration = 4.8, _container = document, opts = {}) {
  if (_running) return;
  _running = true;

  const e = getDOM();
  if (!e) {
    _running = false;
    return;
  }

  const g = gsap();

  await loaderShow();

  // Re-measure once visible (fonts/layout final)
  measureAndApply(e);

  const seq = buildChunkSequence(); // [0, ~24, ~72, 100]
  const stepDuration = 1.05;
  const gapDuration = 0.24;

  // Start at 0 (already visible)
  setTopAndBottomDigits(e, 0, 0);
  await moveBlockTo(e, 0, 0.01);

  // Add a small intro pause like the original
  await wait(450);

  // Chunked jumps only
  for (let i = 1; i < seq.length; i++) {
    const target = seq[i];

    // move + flip together
    await Promise.all([
      moveBlockTo(e, target, stepDuration),
      flipTo(e, target)
    ]);

    if (target !== 100) {
      await wait(gapDuration * 1000);
    }
  }

  // Optional callback hook
  if (typeof opts.onRevealStart === "function") {
    opts.onRevealStart();
  }

  // Wipe / hide
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
  }

  e.wrap.classList.remove("wipeOut");
  await loaderHide();

  _running = false;
}

/* --------------------------
   Resize: re-measure + maintain exact position
--------------------------- */
function onResize() {
  const e = getDOM();
  if (!e) return;

  const visible = getComputedStyle(e.wrap).visibility !== "hidden";
  if (!visible) return;

  measureAndApply(e);

  const y = getTravelY(e, _currentProgress);
  const g = gsap();
  if (g) g.set(e.block, { y });
  else e.block.style.transform = `translate3d(0, ${y}px, 0)`;
}

if (typeof window !== "undefined" && !_resizeBound) {
  window.addEventListener("resize", onResize);
  _resizeBound = true;
}
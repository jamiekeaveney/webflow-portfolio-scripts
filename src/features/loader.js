function getLoaderEls() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;

  return {
    wrap,
    bg: wrap.querySelector('[data-loader="bg"]') || wrap,
    content: wrap.querySelector('[data-loader="content"]') || null,
    nameShell: wrap.querySelector(".loader-name-shell"),
    counterWrap: wrap.querySelector(".loader-counter-wrap"),
    progressTrack: wrap.querySelector(".loader-progress-track")
  };
}

function getLoaderRoot(container) {
  return (
    (container && container.querySelector && container.querySelector("[data-loader]")) ||
    (container && container.querySelector && container.querySelector('[data-loader="wrap"]')) ||
    document.querySelector("[data-loader]") ||
    document.querySelector('[data-loader="wrap"]') ||
    document.documentElement
  );
}

export function loaderShow() {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  window.gsap.set(els.wrap, { display: "block", pointerEvents: "auto" });
  return window.gsap.to(els.bg, {
    autoAlpha: 1,
    duration: 0.2,
    overwrite: "auto"
  }).then(() => {});
}

export function loaderHide() {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  const tl = window.gsap.timeline();
  tl.to(els.bg, { autoAlpha: 0, duration: 0.35, overwrite: "auto" })
    .set(els.wrap, { display: "none", pointerEvents: "none" });

  return tl.then(() => {});
}

export function loaderProgressTo(duration = 1.5, container = document) {
  const root = getLoaderRoot(container);
  if (!root) return Promise.resolve();

  root.style.setProperty("--_feedback---number-counter", "0");

  if (!window.gsap) {
    root.style.setProperty("--_feedback---number-counter", "1");
    return Promise.resolve();
  }

  const state = { value: 0 };

  return window.gsap.to(state, {
    value: 1,
    duration,
    ease: "expo.out",
    onUpdate: () => {
      root.style.setProperty("--_feedback---number-counter", String(state.value));
    }
  }).then(() => {
    root.style.setProperty("--_feedback---number-counter", "1");
  });
}

/**
 * Optional loader outro:
 * - name slides up slightly
 * - counter fades
 * - bottom line scales up to full screen wipe feel
 */
export function loaderOutro() {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  const tl = window.gsap.timeline();

  if (els.nameShell) {
    tl.to(els.nameShell, {
      yPercent: -18,
      autoAlpha: 0,
      duration: 0.45,
      ease: "expo.inOut"
    }, 0);
  }

  if (els.counterWrap) {
    tl.to(els.counterWrap, {
      autoAlpha: 0,
      y: -0.4 + "rem",
      duration: 0.3,
      ease: "expo.out"
    }, 0);
  }

  if (els.progressTrack) {
    tl.to(els.progressTrack, {
      height: "100vh",
      duration: 0.55,
      ease: "expo.inOut"
    }, 0.08);
  }

  return tl.then(() => {});
}

export async function runLoader(duration = 1.5, container = document) {
  await loaderShow();
  await loaderProgressTo(duration, container);
  await loaderOutro();
  await loaderHide();
}
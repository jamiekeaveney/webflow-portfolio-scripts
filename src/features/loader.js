function getLoaderEls() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;

  return {
    wrap,
    bg: wrap.querySelector('[data-loader="bg"]') || wrap,
    content: wrap.querySelector('[data-loader="content"]') || null
  };
}

function getLoaderRoot(container) {
  if (container && container.querySelector) {
    return (
      container.querySelector("[data-loader]") ||
      container.querySelector('[data-loader="wrap"]') ||
      document.querySelector("[data-loader]") ||
      document.querySelector('[data-loader="wrap"]') ||
      document.documentElement
    );
  }

  return (
    document.querySelector("[data-loader]") ||
    document.querySelector('[data-loader="wrap"]') ||
    document.documentElement
  );
}

/**
 * Show loader (fade in backdrop)
 */
export function loaderShow() {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  window.gsap.set(els.wrap, { display: "block", pointerEvents: "auto" });
  return window.gsap
    .to(els.bg, {
      autoAlpha: 1,
      duration: 0.35,
      overwrite: "auto"
    })
    .then(() => {});
}

/**
 * Hide loader (fade out backdrop, disable interaction)
 */
export function loaderHide() {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();

  const tl = window.gsap.timeline();
  tl.to(els.bg, {
    autoAlpha: 0,
    duration: 0.45,
    overwrite: "auto"
  }).set(els.wrap, {
    display: "none",
    pointerEvents: "none"
  });

  return tl.then(() => {});
}

/**
 * Animate CSS progress var used by:
 * - text reveal width
 * - bottom line width
 * - loader-counter.js (.counter text)
 *
 * CSS var expected on [data-loader] or [data-loader="wrap"]:
 * --_feedback---number-counter: 0..1
 */
export function loaderProgressTo(duration = 1.5, container = document) {
  const root = getLoaderRoot(container);
  if (!root) return Promise.resolve();

  // reset to 0 before animating
  root.style.setProperty("--_feedback---number-counter", "0");

  // Prefer GSAP if available (matches your easing)
  if (window.gsap) {
    const state = { value: 0 };

    return window.gsap
      .to(state, {
        value: 1,
        duration,
        ease: "power4.out", // close to cubic-bezier(.19,1,.22,1)
        onUpdate: () => {
          root.style.setProperty("--_feedback---number-counter", String(state.value));
        }
      })
      .then(() => {
        root.style.setProperty("--_feedback---number-counter", "1");
      });
  }

  // Fallback (no GSAP)
  return new Promise((resolve) => {
    const start = performance.now();
    const total = duration * 1000;

    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const tick = (now) => {
      const raw = Math.min((now - start) / total, 1);
      const eased = easeOutQuart(raw);

      root.style.setProperty("--_feedback---number-counter", String(eased));

      if (raw < 1) {
        requestAnimationFrame(tick);
        return;
      }

      root.style.setProperty("--_feedback---number-counter", "1");
      resolve();
    };

    requestAnimationFrame(tick);
  });
}

/**
 * One-call sequence:
 * show -> progress -> hide
 */
export async function runLoader(duration = 1.5, container = document) {
  await loaderShow();
  await loaderProgressTo(duration, container);
  await loaderHide();
}
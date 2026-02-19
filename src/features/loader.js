function getLoaderEls() {
  const wrap = document.querySelector('[data-loader="wrap"]');
  if (!wrap) return null;
  return {
    wrap,
    bg: wrap.querySelector('[data-loader="bg"]') || wrap,
    content: wrap.querySelector('[data-loader="content"]') || null
  };
}

export function loaderShow() {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();
  window.gsap.set(els.wrap, { display: "block", pointerEvents: "auto" });
  return window.gsap.to(els.bg, { autoAlpha: 1, duration: 0.35, overwrite: "auto" }).then(() => {});
}

export function loaderHide() {
  const els = getLoaderEls();
  if (!els || !window.gsap) return Promise.resolve();
  const tl = window.gsap.timeline();
  tl.to(els.bg, { autoAlpha: 0, duration: 0.45, overwrite: "auto" })
    .set(els.wrap, { display: "none", pointerEvents: "none" });
  return tl.then(() => {});
}

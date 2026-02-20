// src/features/lenis-centre.js
import { addCleanup } from "../core/cleanup.js";

/**
 * Home-only:
 * Click any element with [data-lenis-centre] to smooth-scroll it to centre.
 * Uses Lenis if available, and GSAP easing if available.
 */
export function initLenisCentre(container) {
  // container is unused for now, but kept for consistency/future scoping
  // (and so this matches your other initFeature(container) pattern).
  const handler = (ev) => {
    const l = window.lenis;
    if (!l || typeof l.scrollTo !== "function") return;

    const target = ev.target?.closest?.("[data-lenis-centre]");
    if (!target) return;

    if (target.tagName === "A") ev.preventDefault();
    if (typeof l.start === "function") l.start();

    const duration = 0.75;

    const easing =
      window.gsap && typeof window.gsap.parseEase === "function"
        ? window.gsap.parseEase("cubic-bezier(.19,1,.22,1)")
        : null;

    l.scrollTo(target, {
      offset: -(window.innerHeight - target.offsetHeight) / 2,
      duration,
      ...(easing ? { easing } : {})
    });
  };

  document.addEventListener("click", handler);

  // ensure it never “sticks” across Barba navigations
  addCleanup(() => {
    document.removeEventListener("click", handler);
  });
}
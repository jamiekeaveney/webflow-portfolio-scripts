import { addCleanup } from "../core/cleanup.js";

const staggerDefault = 0.075;
const durationDefault = 0.8;

export function initTextScroll(container) {
  if (!window.gsap || !window.ScrollTrigger) return;
  if (!container) return;

  container.querySelectorAll('[data-reveal="scroll"]').forEach((wrap) => {
    const lines = wrap.querySelectorAll(".single-line");
    if (!lines.length) return;

    window.gsap.set(lines, { yPercent: 120 });

    const tween = window.gsap.to(lines, {
      yPercent: 0,
      duration: durationDefault + 0.2,
      stagger: staggerDefault,
      scrollTrigger: {
        trigger: wrap,
        start: "top 90%",
        once: true
      }
    });

    addCleanup(() => { try { tween.kill(); } catch (_) {} });
    addCleanup(() => { try { tween.scrollTrigger && tween.scrollTrigger.kill(); } catch (_) {} });
  });
}

export function initRevealScroll(container) {
  if (!window.gsap || !window.ScrollTrigger) return;
  if (!container) return;

  container.querySelectorAll('[data-reveal="fade"]').forEach((el) => {
    const tween = window.gsap.from(el, {
      y: 20,
      autoAlpha: 0,
      duration: durationDefault + 0.2,
      scrollTrigger: {
        trigger: el,
        start: "top bottom",
        once: true
      }
    });

    addCleanup(() => { try { tween.kill(); } catch (_) {} });
    addCleanup(() => { try { tween.scrollTrigger && tween.scrollTrigger.kill(); } catch (_) {} });
  });
}

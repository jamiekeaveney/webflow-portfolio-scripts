import { addCleanup } from "../core/cleanup.js";

const staggerDefault = 0.075;

export function initRevealLoad(container = document, ctx = {}) {
  if (!window.gsap) return null;

  let items = Array.from(container.querySelectorAll('[data-reveal="load"]'));
  if (!items.length) return null;

  function shouldRun(el) {
    const on = (el.getAttribute("data-reveal-on") || "both").toLowerCase();
    if (on === "both") return true;
    if (on === "first") return !!ctx.isFirstLoad;
    if (on === "nav") return !!ctx.isNavigation;
    return true;
  }

  items = items.filter(shouldRun);
  if (!items.length) return null;

  items.sort((a, b) => {
    const ao = parseFloat(a.getAttribute("data-reveal-order"));
    const bo = parseFloat(b.getAttribute("data-reveal-order"));
    const aHas = !Number.isNaN(ao), bHas = !Number.isNaN(bo);
    if (aHas && bHas) return ao - bo;
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return 0;
  });

  const baseDelay = ctx.isNavigation ? 0.15 : 0;
  const tl = window.gsap.timeline({ delay: baseDelay });

  items.forEach((el, idx) => {
    let delay = parseFloat(el.getAttribute("data-reveal-delay"));
    delay = Number.isNaN(delay) ? 0 : delay;

    let dur = parseFloat(el.getAttribute("data-reveal-duration"));
    dur = Number.isNaN(dur) ? null : dur;

    const ease = el.getAttribute("data-reveal-ease") || null;

    const lines = el.querySelectorAll(".single-line");
    const letters = el.querySelectorAll(".single-letter");

    let yDefault = parseFloat(el.getAttribute("data-reveal-y"));
    if (Number.isNaN(yDefault)) yDefault = (letters.length || lines.length) ? 120 : 20;

    if (letters.length) window.gsap.set(letters, { yPercent: yDefault, autoAlpha: 0 });
    else if (lines.length) window.gsap.set(lines, { yPercent: yDefault });
    else window.gsap.set(el, { y: yDefault, autoAlpha: 0 });

    const at = delay + (idx * staggerDefault);

    if (letters.length) {
      let ls = parseFloat(el.getAttribute("data-letters-stagger"));
      ls = Number.isNaN(ls) ? 0.02 : ls;

      tl.to(letters, {
        yPercent: 0,
        autoAlpha: 1,
        stagger: ls,
        duration: dur || 0.75,
        ease: ease || "expo.out",
        overwrite: "auto"
      }, at);

    } else if (lines.length) {
      let lns = parseFloat(el.getAttribute("data-lines-stagger"));
      lns = Number.isNaN(lns) ? 0.09 : lns;

      tl.to(lines, {
        yPercent: 0,
        stagger: lns,
        duration: dur || 0.95,
        ease: ease || "expo.out",
        overwrite: "auto"
      }, at);

    } else {
      tl.to(el, {
        y: 0,
        autoAlpha: 1,
        duration: dur || 0.9,
        ease: ease || "expo.out",
        overwrite: "auto"
      }, at);
    }
  });

  addCleanup(() => { try { tl.kill(); } catch (_) {} });
  return tl;
}

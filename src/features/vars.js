import { addCleanup } from "../core/cleanup.js";

export function initVarsGrouped(container = document, ctx = {}) {
  if (!window.gsap) return;

  function gate(el) {
    const on = (el.getAttribute("data-reveal-on") || el.getAttribute("data-vars-on") || "both").toLowerCase();
    if (on === "both") return true;
    if (on === "first") return !!ctx.isFirstLoad;
    if (on === "nav") return !!ctx.isNavigation;
    return true;
  }

  const groups = Array.from(container.querySelectorAll("[data-vars-group]"));
  if (!groups.length) return;

  groups.forEach((group) => {
    if (!gate(group)) return;

    const mode = (group.getAttribute("data-vars-group") || "").trim(); // e.g. "load"
    if (!mode) return;

    let stagger = parseFloat(group.getAttribute("data-vars-stagger"));
    stagger = Number.isNaN(stagger) ? 0 : stagger;

    let baseDelay = parseFloat(group.getAttribute("data-vars-base-delay"));
    baseDelay = Number.isNaN(baseDelay) ? 0 : baseDelay;

    // children in group that opt-in to this mode
    let kids = Array.from(group.querySelectorAll('[data-vars]')).filter((el) => {
      if (!gate(el)) return false;
      const v = (el.getAttribute("data-vars") || "");
      return (" " + v + " ").indexOf(" " + mode + " ") !== -1;
    });

    if (!kids.length) return;

    kids.sort((a, b) => {
      const ao = parseFloat(a.getAttribute("data-vars-order"));
      const bo = parseFloat(b.getAttribute("data-vars-order"));
      const aHas = !Number.isNaN(ao), bHas = !Number.isNaN(bo);
      if (aHas && bHas) return ao - bo;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return 0;
    });

    kids.forEach((el, i) => {
      let childDelay = parseFloat(el.getAttribute("data-var-delay"));
      childDelay = Number.isNaN(childDelay) ? 0 : childDelay;

      const computed = baseDelay + (i * stagger) + childDelay;
      el.setAttribute("data-var-delay-computed", String(computed));
    });
  });

  addCleanup(() => {
    Array.from(container.querySelectorAll("[data-var-delay-computed]")).forEach((el) => {
      try { el.removeAttribute("data-var-delay-computed"); } catch (_) {}
    });
  });
}

export function initVarsLoad(container = document, ctx = {}, mode = "load") {
  if (!window.gsap) return;

  function gate(el) {
    const on = (el.getAttribute("data-reveal-on") || el.getAttribute("data-vars-on") || "both").toLowerCase();
    if (on === "both") return true;
    if (on === "first") return !!ctx.isFirstLoad;
    if (on === "nav") return !!ctx.isNavigation;
    return true;
  }

  function hasMode(el) {
    const v = (el.getAttribute("data-vars") || "");
    return (" " + v + " ").indexOf(" " + mode + " ") !== -1;
  }

  const els = Array.from(container.querySelectorAll("[data-vars][data-var]"))
    .filter(gate)
    .filter(hasMode);

  if (!els.length) return;

  els.sort((a, b) => {
    const ao = parseFloat(a.getAttribute("data-vars-order"));
    const bo = parseFloat(b.getAttribute("data-vars-order"));
    const aHas = !Number.isNaN(ao), bHas = !Number.isNaN(bo);
    if (aHas && bHas) return ao - bo;
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return 0;
  });

  const tweens = [];

  els.forEach((el) => {
    const prop = (el.getAttribute("data-var") || "").trim();
    if (!prop || prop.indexOf("var(") === 0) return;

    const from = parseFloat(el.getAttribute("data-var-from"));
    const to = parseFloat(el.getAttribute("data-var-to"));
    if (Number.isNaN(from) || Number.isNaN(to)) return;

    const delayAttr = el.getAttribute("data-var-delay-computed") || el.getAttribute("data-var-delay");
    let delay = parseFloat(delayAttr);
    delay = Number.isNaN(delay) ? 0 : delay;

    let dur = parseFloat(el.getAttribute("data-var-duration"));
    dur = Number.isNaN(dur) ? 1 : dur;

    const ease = (el.getAttribute("data-var-ease") || "expo.out").trim();

    // prevent flashes
    el.style.setProperty(prop, String(from));

    const tween = window.gsap.to(el, {
      duration: dur,
      delay,
      ease,
      overwrite: "auto",
      css: { [prop]: to }
    });

    tweens.push(tween);
  });

  addCleanup(() => {
    tweens.forEach((t) => { try { t.kill(); } catch (_) {} });
  });
}

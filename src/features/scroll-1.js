import { addCleanup } from "../core/cleanup.js";
import { createST } from "../core/scrolltrigger.js";

export function initScroll1(container) {
  if (!container) return;
  if (!window.gsap || !window.ScrollTrigger) return;

  window.gsap.registerPlugin(window.ScrollTrigger);

  container.querySelectorAll(".scroll-1_component").forEach((component) => {
    if (component.hasAttribute("data-scroll-1")) return;
    component.setAttribute("data-scroll-1", "");

    const triggers = component.querySelectorAll(".scroll-1_trigger_item");
    const targets  = component.querySelectorAll(".scroll-1_target_item");

    function makeActive(index) {
      triggers.forEach((el, i) => el.classList.toggle("is-active", i === index));
      targets.forEach((el, i) => el.classList.toggle("is-active", i === index));
    }

    makeActive(0);

    triggers.forEach((el, i) => {
      createST({
        trigger: el,
        start: "top center",
        end: "bottom center",
        onToggle: (self) => { if (self.isActive) makeActive(i); }
      });
    });

    addCleanup(() => {
      try { component.removeAttribute("data-scroll-1"); } catch (_) {}
    });
  });
}
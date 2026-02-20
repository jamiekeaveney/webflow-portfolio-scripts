import { runCleanups } from "../core/cleanup.js";
import { stopLenis, destroyLenis } from "../core/lenis.js";
import { killAllScrollTriggers } from "../core/scrolltrigger.js";
import {
  syncWebflowPageIdFromNextHtml,
  reinitWebflowIX2,
  resetWCurrent
} from "../core/webflow.js";
import { destroyPage } from "../pages/index.js";

function resetScrollTop() {
  window.scrollTo(0, 0);
}

function getNamespace(data, which = "next") {
  try {
    const obj = data?.[which];
    if (!obj) return "";
    if (obj.namespace) return obj.namespace;

    const c = obj.container;
    if (c?.getAttribute) return c.getAttribute("data-barba-namespace") || "";

    return "";
  } catch (_) {
    return "";
  }
}

export function initBarba({ initContainer }) {
  if (!window.barba) {
    console.warn("Barba not loaded.");
    return;
  }

  function preventBarba({ el } = {}) {
    if (!el) return false;
    if (el.hasAttribute?.("data-barba-prevent")) return true;

    const href = el.getAttribute?.("href");
    if (!href) return false;

    if (el.target === "_blank") return true;
    if (href.startsWith("#")) return true;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return true;

    if (/^https?:\/\//i.test(href)) {
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return true;
      } catch (_) {}
    }

    return false;
  }

  try {
    history.scrollRestoration = "manual";
  } catch (_) {}

  window.barba.hooks.leave((data) => {
    stopLenis();
    runCleanups();
    destroyLenis();
    killAllScrollTriggers();

    const ns = getNamespace(data, "current");
    destroyPage(ns);
  });

  window.barba.hooks.enter(() => resetScrollTop());

  window.barba.init({
    preventRunning: true,
    prevent: preventBarba,

    transitions: [
      {
        name: "site",

        async once(data) {
          resetWCurrent();

          const container = data?.next?.container || document;
          const ns = getNamespace(data, "next");

          // IMPORTANT: await async initContainer so home loader finishes before load-reveals run
          await initContainer(container, {
            isFirstLoad: true,
            isNavigation: false,
            namespace: ns
          });
        },

        async leave(data) {
          // Your normal page transition only (no loader here)
          if (window.gsap) {
            await window.gsap.to(data.current.container, {
              autoAlpha: 0,
              duration: 0.5,
              ease: "expo.out"
            });
          }

          try {
            data.current.container.remove();
          } catch (_) {}
        },

        enter(data) {
          if (window.gsap) {
            window.gsap.set(data.next.container, { autoAlpha: 0 });
          }
        },

        async afterEnter(data) {
          syncWebflowPageIdFromNextHtml(data?.next?.html || "");
          reinitWebflowIX2();
          resetWCurrent();

          const container = data?.next?.container || document;
          const ns = getNamespace(data, "next");

          // IMPORTANT: await async initContainer here too
          await initContainer(container, {
            isFirstLoad: false,
            isNavigation: true,
            namespace: ns
          });

          if (window.gsap) {
            await window.gsap.to(data.next.container, {
              autoAlpha: 1,
              duration: 0.5,
              ease: "expo.out"
            });
          }
        }
      }
    ]
  });
}
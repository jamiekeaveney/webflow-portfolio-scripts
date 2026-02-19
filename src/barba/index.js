import { runCleanups } from "../core/cleanup.js";
import { stopLenis, destroyLenis } from "../core/lenis.js";
import { killAllScrollTriggers } from "../core/scrolltrigger.js";
import { loaderShow, loaderHide } from "../features/loader.js";
import { syncWebflowPageIdFromNextHtml, reinitWebflowIX2, resetWCurrent } from "../core/webflow.js";
import { destroyPage } from "../pages/index.js";

function resetScrollTop() {
  window.scrollTo(0, 0);
}

function getNamespace(data, which = "next") {
  try { return data && data[which] ? (data[which].namespace || "") : ""; } catch (_) { return ""; }
}

/**
 * Improvements vs the "kill everything" approach:
 * - Prefer view cleanup registry for per-page listeners/observers/tweens.
 * - Only fall back to ScrollTrigger global kill if something leaks.
 * - Ensure Webflow page-id + IX2 gets re-initialised after container swap.
 */
export function initBarba({ initContainer }) {
  if (!window.barba) {
    console.warn("Barba not loaded.");
    return;
  }

  // Prevent Barba on explicit opt-out links
  function preventBarba({ el }) {
    return !!(el && el.hasAttribute && el.hasAttribute("data-barba-prevent"));
  }

  // Optional: avoid Barba for external links / new tabs automatically
  // (Barba does this fairly well already, but this adds safety)
  window.barba.hooks.prevent((data) => {
    const el = data && data.el;
    if (!el) return false;
    const href = el.getAttribute && el.getAttribute("href");
    if (!href) return false;
    if (el.target === "_blank") return true;
    if (/^https?:\/\//i.test(href)) {
      try {
        const url = new URL(href, location.href);
        if (url.origin !== location.origin) return true;
      } catch (_) {}
    }
    return false;
  });

  // Set manual scroll restoration (recommended with SPA transitions)
  try { history.scrollRestoration = "manual"; } catch (_) {}

  // Global leave: stop scroll + cleanup view-level resources
  window.barba.hooks.leave((data) => {
    stopLenis();
    runCleanups();
    destroyLenis();

    // If anything slipped past the cleanup registry, this prevents ST stacking:
    killAllScrollTriggers();

    // Per-page destroy hook (optional)
    const ns = getNamespace(data, "current");
    destroyPage(ns);
  });

  // Global enter: scroll to top before we show the new container
  window.barba.hooks.enter(() => resetScrollTop());

  window.barba.init({
    preventRunning: true,
    prevent: preventBarba,

    transitions: [{
      name: "site",

      async once(data) {
        resetWCurrent();

        // On first load, hide loader then init
        await loaderHide();

        const container = data?.next?.container || document;
        const ns = getNamespace(data, "next");

        initContainer(container, {
          isFirstLoad: true,
          isNavigation: false,
          namespace: ns
        });
      },

      async leave(data) {
        await loaderShow();

        // Fade out current container for polish
        if (window.gsap) {
          await window.gsap.to(data.current.container, { autoAlpha: 0, duration: 0.35 });
        }

        // Barba removes old container automatically unless you do manual removal.
        // Keeping it explicit avoids odd overlaps in Webflow sometimes:
        try { data.current.container.remove(); } catch (_) {}
      },

      enter(data) {
        if (window.gsap) window.gsap.set(data.next.container, { autoAlpha: 0 });
      },

      async afterEnter(data) {
        // Webflow: sync page id BEFORE ix2 init
        syncWebflowPageIdFromNextHtml(data?.next?.html || "");
        reinitWebflowIX2();
        resetWCurrent();

        const container = data?.next?.container || document;
        const ns = getNamespace(data, "next");

        initContainer(container, {
          isFirstLoad: false,
          isNavigation: true,
          namespace: ns
        });

        if (window.gsap) {
          await window.gsap.to(data.next.container, { autoAlpha: 1, duration: 0.55 });
        }

        await loaderHide();
      }
    }]
  });
}

import { runCleanups } from "../core/cleanup.js";
import { stopLenis, destroyLenis } from "../core/lenis.js";
import { killAllScrollTriggers } from "../core/scrolltrigger.js";
import { loaderShow, loaderHide } from "../features/loader.js";
import {
  syncWebflowPageIdFromNextHtml,
  reinitWebflowIX2,
  resetWCurrent
} from "../core/webflow.js";
import { destroyPage } from "../pages/index.js";

function resetScrollTop() {
  window.scrollTo(0, 0);
}

/**
 * Barba usually provides `data.next.namespace`, but in some edge cases
 * it’s safer to fall back to the container attribute.
 */
function getNamespace(data, which = "next") {
  try {
    const obj = data?.[which];
    if (!obj) return "";

    // Preferred: Barba-provided namespace
    if (obj.namespace) return obj.namespace;

    // Fallback: read from the container attribute
    const c = obj.container;
    if (c?.getAttribute) return c.getAttribute("data-barba-namespace") || "";

    return "";
  } catch (_) {
    return "";
  }
}

/**
 * Pro setup notes:
 * - Per-view cleanup registry runs on leave
 * - Webflow page-id sync + IX2 re-init after container swap
 * - Prevent handles external/new-tab/hash/mail/tel + manual opt-out attribute
 */
export function initBarba({ initContainer }) {
  if (!window.barba) {
    console.warn("Barba not loaded.");
    return;
  }

  // Correct place to prevent navigation in Barba is the `prevent` option.
  function preventBarba({ el } = {}) {
    if (!el) return false;

    // Manual opt-out (add this attribute to any link you don't want Barba to intercept)
    if (el.hasAttribute?.("data-barba-prevent")) return true;

    const href = el.getAttribute?.("href");
    if (!href) return false;

    // New tab
    if (el.target === "_blank") return true;

    // Hash links / anchors
    if (href.startsWith("#")) return true;

    // Protocol links
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return true;

    // External links
    if (/^https?:\/\//i.test(href)) {
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return true;
      } catch (_) {}
    }

    return false;
  }

  // Manual scroll restoration is recommended for SPA transitions
  try {
    history.scrollRestoration = "manual";
  } catch (_) {}

  // Global leave: stop scroll + cleanup view-level resources
  window.barba.hooks.leave((data) => {
    stopLenis();

    // kill any listeners/observers/timelines created by the current view
    runCleanups();

    // fully tear down Lenis instance
    destroyLenis();

    // fallback safety: prevent ST stacking if anything slipped past cleanup registry
    killAllScrollTriggers();

    // per-page destroy hook (optional)
    const ns = getNamespace(data, "current");
    destroyPage(ns);
  });

  // Global enter: scroll to top
  window.barba.hooks.enter(() => resetScrollTop());

  window.barba.init({
    preventRunning: true,
    prevent: preventBarba,

    transitions: [
      {
        name: "site",

        async once(data) {
          resetWCurrent();

          // Hide loader (safe no-op if you don't have loader elements)
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

          if (window.gsap) {
            await window.gsap.to(data.current.container, {
              autoAlpha: 0,
              duration: 0.35
            });
          }

          // Explicit remove helps avoid odd overlaps in some Webflow setups
          try {
            data.current.container.remove();
          } catch (_) {}
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
            await window.gsap.to(data.next.container, {
              autoAlpha: 1,
              duration: 0.55
            });
          }

          await loaderHide();
        }
      }
    ]
  });
}
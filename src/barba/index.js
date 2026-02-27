import { runCleanups } from "../core/cleanup.js";
import { stopLenis, destroyLenis } from "../core/lenis.js";
import { killAllScrollTriggers } from "../core/scrolltrigger.js";
import {
  syncWebflowPageIdFromNextHtml,
  reinitWebflowIX2,
  resetWCurrent
} from "../core/webflow.js";
import { closeNav, isFromPanel, clearFromPanel } from "../core/nav.js";
import { destroyPage } from "../pages/index.js";

var VT_DURATION = 1.25;
var VT_EASE = "expo.out";

function resetScrollTop() {
  window.scrollTo(0, 0);
}

function getNamespace(data, which) {
  if (!which) which = "next";
  try {
    var obj = data?.[which];
    if (!obj) return "";
    if (obj.namespace) return obj.namespace;

    var c = obj.container;
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

    var href = el.getAttribute?.("href");
    if (!href) return false;

    if (el.target === "_blank") return true;
    if (href.startsWith("#")) return true;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return true;

    if (/^https?:\/\//i.test(href)) {
      try {
        var url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return true;
      } catch (_) {}
    }

    return false;
  }

  try {
    history.scrollRestoration = "manual";
  } catch (_) {}

  window.barba.hooks.leave(function (data) {
    closeNav();
    stopLenis();
    runCleanups();
    destroyLenis();
    killAllScrollTriggers();

    var ns = getNamespace(data, "current");
    destroyPage(ns);
  });

  window.barba.hooks.enter(function () {
    resetScrollTop();
  });

  window.barba.init({
    preventRunning: true,
    prevent: preventBarba,

    transitions: [
      {
        name: "site",

        async once(data) {
          resetWCurrent();

          var container = data?.next?.container || document;
          var ns = getNamespace(data, "next");

          await initContainer(container, {
            isFirstLoad: true,
            isNavigation: false,
            namespace: ns
          });
        },

        async leave(data) {
          var skipAnimation = isFromPanel();

          if (skipAnimation) {
            // Panel navigation — no page transition, just remove
            if (window.gsap) {
              window.gsap.set(data.current.container, { autoAlpha: 0 });
            }
          } else {
            // Standard navigation — old page slides up, scales down, fades
            if (window.gsap) {
              await window.gsap.to(data.current.container, {
                yPercent: -50,
                scale: 0.92,
                autoAlpha: 0,
                duration: VT_DURATION,
                ease: VT_EASE,
                transformOrigin: "50% 0%"
              });
            }
          }

          try {
            data.current.container.remove();
          } catch (_) {}
        },

        enter(data) {
          var skipAnimation = isFromPanel();

          if (window.gsap) {
            if (skipAnimation) {
              // Panel navigation — new page appears instantly
              window.gsap.set(data.next.container, { autoAlpha: 1 });
            } else {
              // Standard navigation — new page starts below viewport
              window.gsap.set(data.next.container, {
                y: "100vh",
                autoAlpha: 1
              });
            }
          }
        },

        async afterEnter(data) {
          syncWebflowPageIdFromNextHtml(data?.next?.html || "");
          reinitWebflowIX2();
          resetWCurrent();

          var container = data?.next?.container || document;
          var ns = getNamespace(data, "next");

          await initContainer(container, {
            isFirstLoad: false,
            isNavigation: true,
            namespace: ns
          });

          var skipAnimation = isFromPanel();
          clearFromPanel();

          if (skipAnimation) {
            // Already visible — nothing to animate
          } else {
            // Slide new page up from bottom
            if (window.gsap) {
              await window.gsap.to(data.next.container, {
                y: 0,
                duration: VT_DURATION,
                ease: VT_EASE
              });
            }
          }
        }
      }
    ]
  });
}
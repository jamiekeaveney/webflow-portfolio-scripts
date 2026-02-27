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

// DEBUG — bright body colour so you can see containers vs background
// Remove this line (or set to your real bg) once transitions look right
var DEBUG_BODY_BG = "#ff00ff";

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

  // DEBUG — set body bg so you can see the layers
  document.body.style.backgroundColor = DEBUG_BODY_BG;

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
            // Panel navigation — let menu close animation play,
            // then just hide the old container
            // Wait for menu close transition (~0.8s) before proceeding
            await new Promise(function (resolve) {
              setTimeout(resolve, 850);
            });

            try {
              data.current.container.remove();
            } catch (_) {}
            return;
          }

          // Standard navigation — old page slides up + scales
          // Pin the old container to viewport so it only moves
          // what's visible, not the entire document height
          var current = data.current.container;

          if (window.gsap) {
            // Capture scroll position before fixing
            var scrollY = window.scrollY || window.pageYOffset || 0;

            // Fix the container to viewport so we animate
            // only the visible portion, not thousands of px
            window.gsap.set(current, {
              position: "fixed",
              top: -scrollY,
              left: 0,
              width: "100%",
              height: "auto",
              zIndex: 1,
              overflow: "hidden"
            });

            // Clip to viewport height so only visible area shows
            window.gsap.set(current, {
              clipPath: "inset(0 0 0 0)"
            });

            // Animate: slide up 50vh + scale down, no fade
            await window.gsap.to(current, {
              y: "-50vh",
              scale: 0.92,
              duration: VT_DURATION,
              ease: VT_EASE,
              transformOrigin: "50% 0%"
            });
          }

          try {
            current.remove();
          } catch (_) {}
        },

        enter(data) {
          var skipAnimation = isFromPanel();

          if (window.gsap) {
            if (skipAnimation) {
              // Panel navigation — page just appears
              window.gsap.set(data.next.container, {
                visibility: "visible"
              });
            } else {
              // Standard navigation — new page starts below viewport
              // Position it fixed over everything, stacked on top
              window.gsap.set(data.next.container, {
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100vh",
                overflow: "hidden",
                y: "100vh",
                zIndex: 2,
                visibility: "visible"
              });
            }
          }
        },

        async afterEnter(data) {
          syncWebflowPageIdFromNextHtml(data?.next?.html || "");
          reinitWebflowIX2();
          resetWCurrent();

          var skipAnimation = isFromPanel();
          var container = data?.next?.container || document;
          var ns = getNamespace(data, "next");

          if (skipAnimation) {
            clearFromPanel();

            await initContainer(container, {
              isFirstLoad: false,
              isNavigation: true,
              namespace: ns
            });
            return;
          }

          // Slide new page up into view (stacked on top of old)
          if (window.gsap) {
            await window.gsap.to(data.next.container, {
              y: 0,
              duration: VT_DURATION,
              ease: VT_EASE
            });

            // Reset container to normal flow after animation
            window.gsap.set(data.next.container, {
              clearProps: "position,top,left,width,height,overflow,y,zIndex,transform"
            });
          }

          clearFromPanel();

          await initContainer(container, {
            isFirstLoad: false,
            isNavigation: true,
            namespace: ns
          });
        }
      }
    ]
  });
}
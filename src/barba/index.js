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

// DEBUG — remove or change once transitions look correct
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

  // DEBUG
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
          /*
           * BOTH containers exist in the DOM right now.
           * data.current.container = old page (visible)
           * data.next.container    = new page (appended by Barba, hidden)
           *
           * We animate both simultaneously, then remove the old one.
           */

          var skipAnimation = isFromPanel();
          var current = data.current.container;
          var next = data.next.container;

          if (skipAnimation) {
            // Panel navigation — instant swap, no page animation.
            // Menu close CSS transition plays on persistent header.
            try {
              current.remove();
            } catch (_) {}
            return;
          }

          // Standard navigation — simultaneous slide transition
          if (window.gsap) {
            var scrollY = window.scrollY || window.pageYOffset || 0;

            // OLD PAGE: pin to viewport at current scroll offset,
            // clip to viewport so only visible portion shows
            window.gsap.set(current, {
              position: "fixed",
              top: -scrollY,
              left: 0,
              width: "100%",
              zIndex: 0,
              clipPath: "inset(" + scrollY + "px 0 0 0)"
            });

            // NEW PAGE: position below viewport, on top of old
            window.gsap.set(next, {
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100vh",
              overflow: "hidden",
              y: "100vh",
              zIndex: 1,
              visibility: "visible",
              opacity: 1
            });

            // Animate both at the same time
            var tl = window.gsap.timeline();

            tl.to(current, {
              y: "-50vh",
              scale: 0.92,
              duration: VT_DURATION,
              ease: VT_EASE,
              transformOrigin: "50% 0%"
            }, 0);

            tl.to(next, {
              y: 0,
              duration: VT_DURATION,
              ease: VT_EASE
            }, 0);

            await tl;
          }

          try {
            current.remove();
          } catch (_) {}
        },

        enter(data) {
          // New container already positioned and animated in leave.
          // Just ensure it's visible in case GSAP wasn't available.
          if (window.gsap) {
            // Already handled in leave — nothing to do
          } else {
            data.next.container.style.visibility = "visible";
          }
        },

        async afterEnter(data) {
          syncWebflowPageIdFromNextHtml(data?.next?.html || "");
          reinitWebflowIX2();
          resetWCurrent();

          var container = data?.next?.container || document;
          var ns = getNamespace(data, "next");

          // Reset container to normal document flow
          if (window.gsap) {
            window.gsap.set(container, {
              clearProps: "position,top,left,width,height,overflow,y,zIndex,visibility,opacity,transform,clipPath"
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
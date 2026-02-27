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

var VT_DURATION = 1.5;
var VT_EASE = "expo.out";
var VT_FADE_TO = 0.5; // set to 0.2–0.4 if you want only a slight fade instead of full fade-out

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

  /* ──────────────────────────────────────────────────────
     HOOKS — run on every transition regardless of type
     ────────────────────────────────────────────────────── */

  // ✅ Removed: forcing next.container to position:fixed
  // That was making the incoming page not contribute to document height,
  // so the old page remained the scroll owner until the transition finished.

  window.barba.hooks.after(function (data) {
    // Reset containers to normal flow / remove any forced styles
    if (window.gsap) {
      // Clear for next container (you already had this)
      window.gsap.set(data.next.container, {
        clearProps:
          "position,top,left,width,height,overflow,y,zIndex,visibility,opacity,transform,clipPath,scale"
      });

      // Also clear for current container (in case we fixed it during leave)
      if (data?.current?.container) {
        window.gsap.set(data.current.container, {
          clearProps: "position,top,left,width,height,overflow"
        });
      }
    }

    // Your existing behaviour
    resetScrollTop();
    syncWebflowPageIdFromNextHtml(data?.next?.html || "");
    reinitWebflowIX2();
    resetWCurrent();
    clearFromPanel();
  });

  /* ──────────────────────────────────────────────────────
     INIT
     ────────────────────────────────────────────────────── */

  window.barba.init({
    preventRunning: true,
    prevent: preventBarba,

    transitions: [
      /* ── Mobile panel navigation — no page animation ── */
      {
        name: "panel-nav",
        sync: false,

        custom: function () {
          return isFromPanel();
        },

        leave(data) {
          closeNav();
          stopLenis();
          runCleanups();
          destroyLenis();
          killAllScrollTriggers();

          var ns = getNamespace(data, "current");
          destroyPage(ns);

          // Instant removal
          try {
            data.current.container.remove();
          } catch (_) {}
        },

        async enter(data) {},

        async afterEnter(data) {
          var container = data?.next?.container || document;
          var ns = getNamespace(data, "next");

          await initContainer(container, {
            isFirstLoad: false,
            isNavigation: true,
            namespace: ns
          });
        }
      },

      /* ── Standard navigation — simultaneous slide ── */
      {
        name: "slide",
        sync: true,

        leave(data) {
          closeNav();
          stopLenis();
          runCleanups();
          destroyLenis();
          killAllScrollTriggers();

          var ns = getNamespace(data, "current");
          destroyPage(ns);

          // ✅ Make the NEW page the scroll owner immediately
          // 1) Jump to top right away (so user can scroll the incoming page instantly)
          resetScrollTop();

          if (!window.gsap) return;

          // 2) Freeze old page in place and remove it from document flow
          window.gsap.set(data.current.container, {
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            overflow: "hidden",
            zIndex: 1
          });

          // Ensure incoming page sits above while animating
          window.gsap.set(data.next.container, {
            position: "relative",
            zIndex: 2
          });

          var tl = window.gsap.timeline();

          tl.to(data.current.container, {
            y: "-50vh",
            scale: 0.95,
            opacity: VT_FADE_TO,
            duration: VT_DURATION,
            ease: VT_EASE,
            transformOrigin: "50% 0%"
          });

          return tl;
        },

        enter(data) {
          if (!window.gsap) return;

          var tl = window.gsap.timeline();

          tl.from(data.next.container, {
            y: "100vh",
            duration: VT_DURATION,
            ease: VT_EASE
          });

          return tl;
        },

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

        async after(data) {
          var container = data?.next?.container || document;
          var ns = getNamespace(data, "next");

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
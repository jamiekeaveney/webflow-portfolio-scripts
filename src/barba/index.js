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

const VT_DURATION = 1.5;
const VT_EASE = "expo.out";
const VT_FADE_TO = 0.5; // 0 = full fade, 0.2–0.5 = subtle

const resetScrollTop = () => window.scrollTo(0, 0);

function getNamespace(data, which = "next") {
  const obj = data?.[which];
  if (!obj) return "";
  return (
    obj.namespace ||
    obj.container?.getAttribute?.("data-barba-namespace") ||
    ""
  );
}

export function initBarba({ initContainer }) {
  if (!window.barba) return console.warn("Barba not loaded.");

  const preventBarba = ({ el } = {}) => {
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
  };

  try {
    history.scrollRestoration = "manual";
  } catch (_) {}

  window.barba.hooks.after((data) => {
    // ✅ DO NOT reset scroll here — it nukes any scroll the user did during the transition
    syncWebflowPageIdFromNextHtml(data?.next?.html || "");
    reinitWebflowIX2();
    resetWCurrent();
    clearFromPanel();

    // keep this if you rely on it, but don’t touch scroll here
    window.gsap?.set(data.next.container, {
      clearProps: "position,top,left,width,height,overflow,zIndex,opacity,transform"
    });
  });

  window.barba.init({
    preventRunning: true,
    prevent: preventBarba,

    transitions: [
      {
        name: "panel-nav",
        sync: false,
        custom: () => isFromPanel(),

        leave(data) {
          closeNav();
          stopLenis();
          runCleanups();
          destroyLenis();
          killAllScrollTriggers();
          destroyPage(getNamespace(data, "current"));

          try {
            data.current.container.remove();
          } catch (_) {}
        },

        async afterEnter(data) {
          await initContainer(data?.next?.container || document, {
            isFirstLoad: false,
            isNavigation: true,
            namespace: getNamespace(data, "next")
          });
        }
      },

      {
        name: "slide",
        sync: true,

        leave(data) {
          closeNav();
          stopLenis();
          runCleanups();
          destroyLenis();
          killAllScrollTriggers();
          destroyPage(getNamespace(data, "current"));

          // ✅ If you want every navigation to start at top, do it ONCE here.
          //    User scroll during transition will then persist (because we don't reset in hooks.after).
          resetScrollTop();

          const gsap = window.gsap;
          if (!gsap) return;

          // ✅ Make outgoing page non-scroll-owner immediately + transparent background immediately
          gsap.set(data.current.container, {
            position: "fixed",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "hidden",
            zIndex: 1,
            backgroundColor: "transparent" // 👈 outgoing .page-wrapper/container goes transparent instantly
          });

          // Ensure incoming page sits above and is the one the browser scrolls
          gsap.set(data.next.container, { zIndex: 2 });

          return gsap.timeline().to(data.current.container, {
            y: "-50vh",
            scale: 0.95,
            opacity: VT_FADE_TO,
            duration: VT_DURATION,
            ease: VT_EASE,
            transformOrigin: "50% 0%"
          });
        },

        enter(data) {
          const gsap = window.gsap;
          if (!gsap) return;

          return gsap.timeline().from(data.next.container, {
            y: "100vh",
            duration: VT_DURATION,
            ease: VT_EASE
          });
        },

        async once(data) {
          resetWCurrent();
          await initContainer(data?.next?.container || document, {
            isFirstLoad: true,
            isNavigation: false,
            namespace: getNamespace(data, "next")
          });
        },

        async after(data) {
          await initContainer(data?.next?.container || document, {
            isFirstLoad: false,
            isNavigation: true,
            namespace: getNamespace(data, "next")
          });
        }
      }
    ]
  });
}
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

function getNamespace(data, which = "next") {
  const obj = data?.[which];
  return (
    obj?.namespace ||
    obj?.container?.getAttribute?.("data-barba-namespace") ||
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
    // Don't touch scroll here (keeps any scroll during transition)
    syncWebflowPageIdFromNextHtml(data?.next?.html || "");
    reinitWebflowIX2();
    resetWCurrent();
    clearFromPanel();

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

          const gsap = window.gsap;
          if (!gsap) return;

          const y = window.scrollY || window.pageYOffset || 0;

          // Freeze outgoing page at CURRENT scroll position (so it animates out from where you are)
          gsap.set(data.current.container, {
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            overflow: "hidden",
            zIndex: 1,
            y: -y, // ✅ keep current viewport slice
            backgroundColor: "transparent"
            // pointerEvents: "none"
          });

          // Incoming above
          gsap.set(data.next.container, { zIndex: 2 });

          // Now make the NEW page the scroll owner immediately (at top)
          window.scrollTo(0, 0);

          // Animate old page out (relative move, so it stays consistent)
          return gsap.timeline().to(data.current.container, {
            y: `-=${window.innerHeight * 0.5}`, // additional -50vh from frozen position
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
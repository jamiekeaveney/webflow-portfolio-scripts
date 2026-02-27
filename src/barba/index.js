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
const VT_FADE_TO = 0.5;

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

          // Capture scroll position BEFORE resetting
          const scrollY = window.scrollY || window.pageYOffset || 0;

          // Reset scroll so new page starts at top
          resetScrollTop();

          // Pin old page at its current visual position.
          // top: -scrollY keeps the visible viewport portion in place.
          gsap.set(data.current.container, {
            position: "fixed",
            top: -scrollY,
            left: 0,
            width: "100%",
            height: "auto",
            overflow: "hidden",
            zIndex: 1,
            backgroundColor: "transparent"
          });

          // New page sits on top
          gsap.set(data.next.container, { zIndex: 2 });

          // Animate the old page out from its current visual position
          return gsap.timeline().to(data.current.container, {
            y: "-50vh",
            scale: 0.95,
            opacity: VT_FADE_TO,
            duration: VT_DURATION,
            ease: VT_EASE,
            transformOrigin: "50% 0%"
          });
        },

        async enter(data) {
          const gsap = window.gsap;
          if (!gsap) return;

          // Fire initContainer NOW so reveals start during the slide-in,
          // not after it completes
          const initPromise = initContainer(data?.next?.container || document, {
            isFirstLoad: false,
            isNavigation: true,
            namespace: getNamespace(data, "next")
          });

          // Slide new page up — runs simultaneously with leave (sync: true)
          // and simultaneously with initContainer/reveals
          const tl = gsap.timeline().from(data.next.container, {
            y: "100vh",
            duration: VT_DURATION,
            ease: VT_EASE
          });

          // Wait for both the animation and init to finish
          await Promise.all([tl, initPromise]);
        },

        async once(data) {
          resetWCurrent();
          await initContainer(data?.next?.container || document, {
            isFirstLoad: true,
            isNavigation: false,
            namespace: getNamespace(data, "next")
          });
        },

        // after is handled by the global hooks.after above
        // initContainer already ran in enter, so nothing needed here
        after() {}
      }
    ]
  });
}
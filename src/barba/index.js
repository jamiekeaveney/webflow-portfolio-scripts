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
const VT_EASE = "cubic-bezier(0.25, 0.1, 0.25, 1)";
const VT_FADE_TO = 0.5;

const HTML_BUSY = "is-transitioning";
const LEAVING = "is-leaving";
const ENTERING = "is-entering";

const html = document.documentElement;
const setBusy = (on) => html.classList.toggle(HTML_BUSY, !!on);
const setFreezeY = (px) => html.style.setProperty("--freezeY", `${px}px`);
const clearFreezeY = () => html.style.removeProperty("--freezeY");

function getNamespace(data, which = "next") {
  const obj = data?.[which];
  return (
    obj?.namespace ||
    obj?.container?.getAttribute?.("data-barba-namespace") ||
    ""
  );
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
      return url.origin !== window.location.origin;
    } catch (_) {}
  }
  return false;
}

export function initBarba({ initContainer }) {
  if (!window.barba) return console.warn("Barba not loaded.");

  try {
    history.scrollRestoration = "manual";
  } catch (_) {}

  window.barba.hooks.before(() => setBusy(true));

  window.barba.hooks.after((data) => {
    setBusy(false);
    clearFreezeY();

    data?.next?.container?.classList.remove(ENTERING);
    data?.current?.container?.classList.remove(LEAVING);

    syncWebflowPageIdFromNextHtml(data?.next?.html || "");
    reinitWebflowIX2();
    resetWCurrent();
    clearFromPanel();

    // Keep GSAP’s inline styles clean if you ever add more tweens later
    window.gsap?.set(data?.next?.container, {
      clearProps: "transform,opacity,willChange"
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

          const scrollY = window.scrollY || window.pageYOffset || 0;

          setFreezeY(scrollY);
          data.current.container.classList.add(LEAVING);
          data.next.container.classList.add(ENTERING);

          // New page becomes scroll owner immediately
          window.scrollTo(0, 0);

          return gsap.timeline().to(data.current.container, {
            y: "-25vh",
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

          // Start page init during the slide-in (mobile-friendly perceived speed)
          const initPromise = initContainer(data?.next?.container || document, {
            isFirstLoad: false,
            isNavigation: true,
            namespace: getNamespace(data, "next")
          });

          const tl = gsap.timeline().from(data.next.container, {
            y: "100vh",
            duration: VT_DURATION,
            ease: VT_EASE
          });

          await Promise.all([tl, initPromise]);
        },

        async once(data) {
          resetWCurrent();
          await initContainer(data?.next?.container || document, {
            isFirstLoad: true,
            isNavigation: false,
            namespace: getNamespace(data, "next")
          });
        }
      }
    ]
  });
}
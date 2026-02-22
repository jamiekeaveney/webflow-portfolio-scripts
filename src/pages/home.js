// src/pages/home.js
import { initScroll1 } from "../features/scroll-1.js";
import { initLenisCentre } from "../features/lenis-centre.js";
import { runLoader, loaderHide } from "../features/loader.js";

export async function initHome(container, ctx) {
  if (!container) return Promise.resolve();

  let homeStarted = false;

  const startHomeNow = () => {
    if (homeStarted) return;
    homeStarted = true;

    // Start homepage systems underneath loader fade
    initScroll1(container);
    initLenisCentre(container);

    // Trigger reveal-load immediately when loader fade starts
    if (ctx && typeof ctx.startLoadReveals === "function") {
      ctx.startLoadReveals();
    }
  };

  if (ctx && ctx.isFirstLoad) {
    await runLoader(1.5, container, {
      onRevealStart: startHomeNow
    });

    // Fallback safety
    startHomeNow();
  } else {
    await loaderHide();
    startHomeNow();
  }

  return Promise.resolve();
}

export function destroyHome() {
  // no-op: global cleanup handles this
}
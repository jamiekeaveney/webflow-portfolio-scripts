// src/pages/home.js
import { initScroll1 } from "../features/scroll-1.js";
import { initLenisCentre } from "../features/lenis-centre.js";
import { initLoaderCounter } from "../features/loader-counter.js";
import { runLoader, loaderHide } from "../features/loader.js";

export async function initHome(container, ctx) {
  if (!container) return Promise.resolve();

  initLoaderCounter(container);

  let started = false;
  const startHomeSystems = () => {
    if (started) return;
    started = true;

    // Start global/page load reveals early (from app.js)
    if (ctx && typeof ctx.startLoadReveals === "function") {
      ctx.startLoadReveals();
    }

    // Start home-specific systems
    initScroll1(container);
    initLenisCentre(container);
  };

  if (ctx && ctx.isFirstLoad) {
    await runLoader(1.5, container, {
      onRevealStart: startHomeSystems
    });
  } else {
    await loaderHide();
    startHomeSystems();
  }

  return Promise.resolve();
}

export function destroyHome() {
  // no-op: global cleanup handles this
}
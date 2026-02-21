// src/pages/home.js
import { initScroll1 } from "../features/scroll-1.js";
import { initLenisCentre } from "../features/lenis-centre.js";
import { initLoaderCounter } from "../features/loader-counter.js";
import { runLoader, loaderHide } from "../features/loader.js";

export async function initHome(container, ctx) {
  if (!container) return Promise.resolve();

  initLoaderCounter(container);

  const startHomeFeatures = () => {
    initScroll1(container);
    initLenisCentre(container);
  };

  if (ctx && ctx.isFirstLoad) {
    let started = false;
    const once = () => {
      if (started) return;
      started = true;
      startHomeFeatures();
    };

    await runLoader(1.5, container, {
      onRevealStart: once
    });

    // safety (in case callback didn't fire for any reason)
    once();
  } else {
    await loaderHide();
    startHomeFeatures();
  }

  return Promise.resolve();
}

export function destroyHome() {
  // no-op: global cleanup handles this
}
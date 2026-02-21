// src/pages/home.js
import { initScroll1 } from "../features/scroll-1.js";
import { initLenisCentre } from "../features/lenis-centre.js";
import { initLoaderCounter } from "../features/loader-counter.js";
import { runLoader, loaderHide } from "../features/loader.js";
import { primeRevealLoad, initRevealLoad } from "../features/reveal-load.js";

export async function initHome(container, ctx) {
  if (!container) return Promise.resolve();

  initLoaderCounter(container);

  // Prime reveal states immediately so nothing flashes underneath loader
  primeRevealLoad(container, ctx);

  if (ctx && ctx.isFirstLoad) {
    let startedHomeReveal = false;

    await runLoader(1.5, container, {
      onRevealStart: () => {
        if (startedHomeReveal) return;
        startedHomeReveal = true;

        // Start homepage load reveals under the fading loader
        initRevealLoad(container, ctx, { skipPrime: true });
      }
    });
  } else {
    await loaderHide();

    // Non-first loads: run standard page reveal immediately
    initRevealLoad(container, ctx, { skipPrime: true });
  }

  initScroll1(container);
  initLenisCentre(container);

  return Promise.resolve();
}

export function destroyHome() {
  // no-op: global cleanup handles this
}
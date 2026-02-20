// src/pages/home.js
import { initScroll1 } from "../features/scroll-1.js";
import { initLenisCentre } from "../features/lenis-centre.js";
import { initLoaderCounter } from "../features/loader-counter.js";
import { runLoader } from "../features/loader.js";

export async function initHome(container, ctx) {
  if (!container) return;

  // Counter must be active before progress starts
  initLoaderCounter(container);

  // Run loader first (show -> 1.5s progress -> outro -> hide)
  await runLoader(1.5, container);

  // Then the rest of the page features
  initScroll1(container);
  initLenisCentre(container);
}

export function destroyHome() {
  // no-op: global cleanup handles this
}
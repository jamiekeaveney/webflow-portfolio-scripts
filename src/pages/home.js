// src/pages/home.js
import { initScroll1 } from "../features/scroll-1.js";
import { initLenisCentre } from "../features/lenis-centre.js";
import { initLoaderCounter } from "../features/loader-counter.js";

export function initHome(container, ctx) {
  if (!container) return;

  initScroll1(container);
  initLenisCentre(container);
  initLoaderCounter(container);
}

export function destroyHome() {
  // no-op: global runCleanups() handles it on Barba leave
}
// src/pages/home.js
import { initScroll1 } from "../features/scroll-1.js";
import { initLenisCentre } from "../features/lenis-centre.js";

/**
 * Home page only
 */
export function initHome(container, ctx) {
  if (!container) return;

  initScroll1(container);
  initLenisCentre(container);
}

export function destroyHome() {
  // No-op: Barba leave hook runs runCleanups() globally.
}
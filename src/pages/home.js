// src/pages/home.js
import { initScroll1 } from "../features/scroll-1.js";

/**
 * Home page only
 * Runs scroll-1 behaviour on `.scroll-1_component` sections.
 * Cleanup is handled via addCleanup() inside initScroll1,
 * and runCleanups() runs on each new Barba container init.
 */
export function initHome(container, ctx) {
  if (!container) return;
  initScroll1(container);
}

export function destroyHome() {
  // No-op. Global runCleanups() handles it.
}
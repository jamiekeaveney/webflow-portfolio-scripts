import { initScroll1 } from "../features/scroll-1.js";

/**
 * Home page only
 * Runs scroll-1 behaviour on `.scroll-1_component` sections.
 * Cleanup is handled automatically via the global cleanup registry (run on Barba leave).
 */
export function initHome(container, ctx) {
  if (!container) return;

  // Only initialise the homepage-specific feature(s)
  initScroll1(container);
}

export function destroyHome() {
  // No-op.
  // Any ScrollTriggers/listeners created inside initScroll1 should be registered via addCleanup()
  // and will be run by runCleanups() on Barba leave.
}
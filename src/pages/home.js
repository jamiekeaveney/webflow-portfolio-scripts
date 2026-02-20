<<<<<<< HEAD
import { initScroll1 } from "../features/scroll-1.js";

/**
 * Home page only
 * Runs scroll-1 behaviour on `.scroll-1_component` sections.
 * Cleanup is handled automatically via the global cleanup registry (run on Barba leave).
 */
export function initHome(container, ctx) {
  if (!container) return;

  // Only initialise the homepage-specific feature(s)
=======
// src/pages/home.js
import { initScroll1 } from "../features/scroll-1.js";

export function initHome(container, ctx) {
  // Home-only modules live in features/, and home turns them on.
>>>>>>> 666cd7e1a5244d0326d30cb0a1a46c574c015fd4
  initScroll1(container);
}

export function destroyHome() {
<<<<<<< HEAD
  // No-op.
  // Any ScrollTriggers/listeners created inside initScroll1 should be registered via addCleanup()
  // and will be run by runCleanups() on Barba leave.
=======
  // Usually not needed because Barba leave() runs runCleanups() globally.
>>>>>>> 666cd7e1a5244d0326d30cb0a1a46c574c015fd4
}
import { addCleanup } from "./cleanup.js";

export function safeRefreshScrollTrigger() {
  if (!window.ScrollTrigger) return;
  try { window.ScrollTrigger.refresh(); } catch (_) {}
  requestAnimationFrame(() => {
    try { window.ScrollTrigger.refresh(); } catch (_) {}
  });
  setTimeout(() => {
    try { window.ScrollTrigger.refresh(); } catch (_) {}
  }, 200);
}

/** Prefer killing only view-created ScrollTriggers via addCleanup(). This is a fallback. */
export function killAllScrollTriggers() {
  if (!window.ScrollTrigger) return;
  try {
    window.ScrollTrigger.getAll().forEach((t) => {
      try { t.kill(); } catch (_) {}
    });
  } catch (_) {}
}

/**
 * Helper: create a ScrollTrigger and auto-kill it on view cleanup.
 * Usage: const st = createST({ ... });
 */
export function createST(vars) {
  if (!window.ScrollTrigger) return null;
  const st = window.ScrollTrigger.create(vars);
  addCleanup(() => { try { st && st.kill(); } catch (_) {} });
  return st;
}

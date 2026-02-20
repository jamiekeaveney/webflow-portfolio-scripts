// src/features/loader-counter.js
import { addCleanup } from "../core/cleanup.js";

/**
 * Home-only loader counter.
 * Reads CSS var --_feedback---number-counter (0..1) and renders 00..100 into .counter.
 *
 * Expected markup:
 * - [data-loader] wrapper (optional; falls back to container / documentElement)
 * - .counter inside it
 */
export function initLoaderCounter(container = document) {
  const root =
    (container && container.querySelector && container.querySelector("[data-loader]")) ||
    document.querySelector("[data-loader]") ||
    document.documentElement;

  const counter = root && root.querySelector ? root.querySelector(".counter") : null;
  if (!counter) return;

  let rafId = 0;
  let stopped = false;

  const tick = () => {
    if (stopped) return;

    const val = getComputedStyle(root)
      .getPropertyValue("--_feedback---number-counter")
      .trim();

    const progress = Math.max(0, Math.min(parseFloat(val) || 0, 1));
    const percent = Math.round(progress * 100);

    counter.textContent = String(percent).padStart(2, "0");
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);

  addCleanup(() => {
    stopped = true;
    if (rafId) cancelAnimationFrame(rafId);
  });
}
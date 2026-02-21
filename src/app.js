import { onReady } from "./core/ready.js";
import { runCleanups } from "./core/cleanup.js";
import { safeRefreshScrollTrigger } from "./core/scrolltrigger.js";
import { createLenis, startLenis } from "./core/lenis.js";

import { initSplit } from "./features/split.js";
import { initVideoAuto } from "./features/video-auto.js";
import { initRevealLoad, primeRevealLoad } from "./features/reveal-load.js";
import { initVarsGrouped, initVarsLoad, primeVarsLoad } from "./features/vars.js";
import { initTextScroll, initRevealScroll } from "./features/reveal-scroll.js";

import { initPage } from "./pages/index.js";
import { initBarba } from "./barba/index.js";

const durationDefault = 0.8;

function configureGSAPDefaults() {
  if (!window.gsap) return;
  window.gsap.defaults({ ease: "expo.out", duration: durationDefault });
  window.gsap.config({ nullTargetWarn: false });
}

/**
 * Single init pipeline for every Barba container.
 * Anything created here should register cleanup via addCleanup() utilities in modules.
 */
export async function initContainer(container, ctx = {}) {
  container = container || document;

  // clean slate for this view
  runCleanups();

  // scroll runtime
  createLenis();

  // split first so reveals can find .single-letter/.single-line
  initSplit(container);

  // media + components
  initVideoAuto(container);

  // Group delays first (vars)
  initVarsGrouped(container, ctx);

  // Prime reveal/var states BEFORE loader so nothing flashes
  primeRevealLoad(container, ctx);
  primeVarsLoad(container, ctx, "load");

  // One guarded starter for load reveals (can be called early by home.js)
  let loadRevealsStarted = false;
  const startLoadReveals = () => {
    if (loadRevealsStarted) return;
    loadRevealsStarted = true;

    initRevealLoad(container, ctx, { skipPrime: true });
    initVarsLoad(container, ctx, "load", { skipPrime: true });
  };

  // Expose to page-level hooks
  ctx.startLoadReveals = startLoadReveals;

  // Per-page hooks first (home.js can run loader and trigger startLoadReveals early)
  await initPage(ctx.namespace || "", container, ctx);

  // Fallback (non-home pages / if not started early)
  startLoadReveals();

  // scroll reveals
  initTextScroll(container);
  initRevealScroll(container);

  safeRefreshScrollTrigger();
  startLenis();
}

onReady(() => {
  configureGSAPDefaults();

  // Boot Barba once
  initBarba({
    initContainer
  });
});
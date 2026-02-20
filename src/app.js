import { onReady } from "./core/ready.js";
import { runCleanups } from "./core/cleanup.js";
import { safeRefreshScrollTrigger } from "./core/scrolltrigger.js";
import { createLenis, startLenis } from "./core/lenis.js";

import { initSplit } from "./features/split.js";
import { initVideoAuto } from "./features/video-auto.js";
import { initRevealLoad } from "./features/reveal-load.js";
import { initVarsGrouped, initVarsLoad } from "./features/vars.js";
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

  // Per-page hooks first (home.js can run loader here before load reveals)
  await initPage(ctx.namespace || "", container, ctx);

  // load reveal (text/DOM-based)
  initRevealLoad(container, ctx);

  // vars grouped -> vars load
  initVarsGrouped(container, ctx);
  initVarsLoad(container, ctx, "load");

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
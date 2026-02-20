// src/app.js
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
import { loaderHide } from "./features/loader.js";

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
export function initContainer(container, ctx = {}) {
  container = container || document;

  // clean slate for this view
  runCleanups();

  // scroll runtime
  createLenis();

  // split first so reveals can find .single-letter/.single-line
  initSplit(container);

  // media + components
  initVideoAuto(container);

  // load reveal (text/DOM-based)
  initRevealLoad(container, ctx);

  // vars grouped -> vars load
  initVarsGrouped(container, ctx);
  initVarsLoad(container, ctx, "load");

  // scroll reveals
  initTextScroll(container);
  initRevealScroll(container);

  // per-page hooks (THIS is where home-only stuff should run)
  initPage(ctx.namespace || "", container, ctx);

  safeRefreshScrollTrigger();
  startLenis();
}

onReady(() => {
  configureGSAPDefaults();

  // If you have a loader, hide it on initial ready (safe no-op if missing)
  loaderHide();

  // Boot Barba once
  initBarba({
    initContainer,
  });
});
// src/pages/home.js
import { initScroll1 } from "../features/scroll-1.js";
import { initLenisCentre } from "../features/lenis-centre.js";
import { initLoaderCounter } from "../features/loader-counter.js";
import { runLoader } from "../features/loader.js";

export async function initHome(container, ctx) {
  if (!container) return;

  // Start the counter reader first (it reads the CSS var)
  initLoaderCounter(container);

  // Run loader sequence on home only:
  // show -> animate progress (1.5s) -> hide
  await runLoader(1.5, container);

  // Then continue with the rest of the home features
  initScroll1(container);
  initLenisCentre(container);
}

export function destroyHome() {
  // no-op: global runCleanups() handles it on Barba leave
}
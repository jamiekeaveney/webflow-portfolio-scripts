// src/pages/home.js
import { initScroll1 } from "../features/scroll-1.js";

export function initHome(container, ctx) {
  // Home-only modules live in features/, and home turns them on.
  initScroll1(container);
}

export function destroyHome() {
  // Usually not needed because Barba leave() runs runCleanups() globally.
}
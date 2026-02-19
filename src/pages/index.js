import { initHome, destroyHome } from "./home.js";
import { initAbout, destroyAbout } from "./about.js";
import { initApproach, destroyApproach } from "./approach.js";
import { initWork, destroyWork } from "./work.js";

const pages = {
  home: { init: initHome, destroy: destroyHome },
  about: { init: initAbout, destroy: destroyAbout },
  approach: { init: initApproach, destroy: destroyApproach },
  work: { init: initWork, destroy: destroyWork },
};

export function initPage(namespace, container, ctx) {
  const p = pages[namespace];
  if (p && typeof p.init === "function") p.init(container, ctx);
}

export function destroyPage(namespace) {
  const p = pages[namespace];
  if (p && typeof p.destroy === "function") p.destroy();
}

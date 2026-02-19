/**
 * Simple per-view cleanup registry.
 * Anything that binds listeners/observers/timelines should register a cleanup.
 */
let cleanups = [];

export function addCleanup(fn) {
  if (typeof fn === "function") cleanups.push(fn);
  return fn;
}

export function runCleanups() {
  const list = cleanups;
  cleanups = [];
  for (let i = 0; i < list.length; i++) {
    try { list[i](); } catch (_) {}
  }
}

/** Utility: bind event listener + auto cleanup */
export function on(el, event, handler, options) {
  if (!el || !el.addEventListener) return () => {};
  el.addEventListener(event, handler, options);
  const off = () => {
    try { el.removeEventListener(event, handler, options); } catch (_) {}
  };
  addCleanup(off);
  return off;
}

/** Utility: IntersectionObserver + auto cleanup */
export function observe(el, options, cb) {
  if (!el || typeof cb !== "function") return () => {};
  const io = new IntersectionObserver((entries) => {
    for (let i = 0; i < entries.length; i++) cb(entries[i]);
  }, options);
  io.observe(el);
  const stop = () => { try { io.disconnect(); } catch (_) {} };
  addCleanup(stop);
  return stop;
}

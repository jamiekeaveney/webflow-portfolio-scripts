import { addCleanup } from "../core/cleanup.js";

export function initSplit(container = document) {
  if (!window.gsap) return;
  if (typeof window.SplitText === "undefined") return;

  const splitInstances = [];
  const targets = container.querySelectorAll("[data-split]");
  if (!targets.length) return;

  targets.forEach((el) => {
    if (el.hasAttribute("data-split-ran")) return;

    const mode = (el.getAttribute("data-split") || "").toLowerCase();

    if (mode === "lines" || mode === "both") {
      const linesSplit = new window.SplitText(el, { type: "lines", linesClass: "single-line" });
      splitInstances.push(linesSplit);

      linesSplit.lines.forEach((line) => {
        if (line.parentElement && line.parentElement.classList.contains("single-line-wrap")) return;
        const wrap = document.createElement("div");
        wrap.classList.add("single-line-wrap");
        line.parentNode.insertBefore(wrap, line);
        wrap.appendChild(line);
      });
    }

    if (mode === "letters" || mode === "both") {
      const lettersSplit = new window.SplitText(el, { type: "words, chars", charsClass: "single-letter" });
      splitInstances.push(lettersSplit);
    }

    el.setAttribute("data-split-ran", "true");
  });

  addCleanup(() => {
    splitInstances.forEach((inst) => { try { inst.revert(); } catch (_) {} });
    targets.forEach((el) => { try { el.removeAttribute("data-split-ran"); } catch (_) {} });
  });
}

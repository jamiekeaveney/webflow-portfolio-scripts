(function () {
  const loaderWrap = document.querySelector(".loader-wrap");
  const loaderPad = document.querySelector(".loader-pad");
  const loaderMeta = document.querySelector(".loader-meta");
  const counterAnchor = document.querySelector(".loader-counter-anchor");
  const counterPos = document.querySelector(".loader-counter-pos");
  const numberSlot = document.querySelector(".loader-number-slot");

  if (!loaderWrap || !loaderPad || !counterAnchor || !counterPos || !numberSlot) return;

  const steps = [
    { value: 0, progress: 0.00, hold: 0.45 },
    { value: 24, progress: 0.24, hold: 0.55 },
    { value: 72, progress: 0.72, hold: 0.60 },
    { value: 100, progress: 1.00, hold: 0.55 }
  ];

  const staggerStep = 0.06;
  const enterDur = 0.9;
  const leaveDur = 0.8;

  let currentNode = null;
  let travelRem = 0;

  function pxToRem(px) {
    const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return px / rootSize;
  }

  function measureTravel() {
    const laneRect = counterAnchor.getBoundingClientRect();
    const rowRect = counterPos.getBoundingClientRect();
    const travelPx = Math.max(0, laneRect.height - rowRect.height);
    travelRem = pxToRem(travelPx);
  }

  function setCounterVertical(progress) {
    const yRem = -(travelRem * progress);
    counterPos.style.transform = `translateY(${yRem}rem)`;
  }

  function charClassFor(char) {
    if (char === "1") return "loader-char loader-char-tight";
    if (char === "0") return "loader-char loader-char-wide";
    return "loader-char";
  }

  function makeNumberNode(value) {
    const node = document.createElement("div");
    node.className = "loader-number";
    const text = String(value);

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const span = document.createElement("span");
      span.className = charClassFor(char) + " loader-enter";
      span.textContent = char;
      node.appendChild(span);
    }

    return node;
  }

  function getChars(node) {
    return Array.from(node.children);
  }

  function animateIn(node) {
    const chars = getChars(node);

    chars.forEach((char, i) => {
      const delay = i * staggerStep;
      char.style.transitionDelay = `${delay}s`;
    });

    requestAnimationFrame(() => {
      chars.forEach((char) => {
        char.classList.add("loader-enter-active");
      });
    });

    const total = enterDur + (Math.max(chars.length - 1, 0) * staggerStep);
    return wait(total);
  }

  function animateOut(node) {
    const chars = getChars(node);

    chars.forEach((char, i) => {
      const delay = i * staggerStep;
      char.classList.remove("loader-enter-active");
      char.classList.remove("loader-enter");
      char.classList.add("loader-leave");
      char.style.transitionDelay = `${delay}s`;
    });

    requestAnimationFrame(() => {
      chars.forEach((char) => {
        char.classList.add("loader-leave-active");
      });
    });

    const total = leaveDur + (Math.max(chars.length - 1, 0) * staggerStep);
    return wait(total);
  }

  function wait(seconds) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, seconds * 1000);
    });
  }

  async function swapNumber(nextValue) {
    const nextNode = makeNumberNode(nextValue);
    numberSlot.appendChild(nextNode);

    await animateIn(nextNode);

    if (currentNode) {
      await animateOut(currentNode);
      currentNode.remove();
    }

    currentNode = nextNode;
  }

  async function runLoaderSequence() {
    loaderWrap.classList.add("is-visible");
    loaderMeta.classList.add("loader-fade-meta");

    measureTravel();
    setCounterVertical(0);

    window.addEventListener("resize", handleResize, { passive: true });

    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];
      const isFirst = i === 0;

      setCounterVertical(step.progress);

      if (isFirst) {
        const firstNode = makeNumberNode(step.value);
        numberSlot.appendChild(firstNode);
        currentNode = firstNode;
        await animateIn(firstNode);
      } else {
        await swapNumber(step.value);
      }

      await wait(step.hold);
    }

    // Trigger homepage reveal exactly when loader begins fading
    window.dispatchEvent(new CustomEvent("loader:reveal-start"));

    loaderMeta.classList.add("loader-fade-meta-out");
    counterPos.style.transition = "opacity 0.45s ease, transform 0.45s ease";
    counterPos.style.opacity = "0";

    loaderWrap.classList.remove("is-visible");

    await wait(0.5);

    loaderWrap.classList.add("loader-hidden");
    loaderWrap.style.display = "none";

    window.dispatchEvent(new CustomEvent("loader:done"));
    window.removeEventListener("resize", handleResize);
  }

  function handleResize() {
    measureTravel();

    // keep position aligned to current visible number if resizing mid-loader
    if (!currentNode) return;

    const text = currentNode.textContent || "0";
    let progress = 0;
    if (text === "24") progress = 0.24;
    if (text === "72") progress = 0.72;
    if (text === "100") progress = 1;
    setCounterVertical(progress);
  }

  // Run immediately (or call runLoaderSequence() manually in your app flow)
  runLoaderSequence();
})();
import { addCleanup, on, observe } from "../core/cleanup.js";

export function initVideoAuto(scope = document) {
  function isHlsUrl(url) {
    return typeof url === "string" && /\.m3u8(\?|#|$)/i.test(url);
  }

  function attachSource(video) {
    if (video._sourceAttached) return;

    const src = video.getAttribute("data-src");
    if (!src) return;

    if (!isHlsUrl(src)) {
      video.src = src;
      video._sourceAttached = true;
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video._sourceAttached = true;
      return;
    }

    if (window.Hls && window.Hls.isSupported && window.Hls.isSupported()) {
      const hls = new window.Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      video._hls = hls;
      video._sourceAttached = true;
    }
  }

  function safePlay(video) {
    if (!video._sourceAttached) attachSource(video);
    video.muted = true;
    video.playsInline = true;
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
  }

  function safePause(video) {
    try { video.pause(); } catch (_) {}
  }

  function evaluate(video) {
    const needViewport = !!video._modeViewport;
    const needActive   = !!video._modeActive;
    const needHover    = !!video._modeHover;
    const needHero     = !!video._modeHero;

    const okViewport = !needViewport || !!video._inview;
    const okActive   = !needActive   || !!video._active;
    const okHover    = !needHover    || !!video._hovered;
    const okHero     = !needHero     || !!video._hero;

    if (okViewport && okActive && okHover && okHero) safePlay(video);
    else safePause(video);
  }

  function initHero(video) {
    video._hero = true;
    attachSource(video);
    evaluate(video);
  }

  function initHover(video) {
    video._hovered = false;
    const trigger = video.closest('[data-trigger~="hover"], [data-video-hover]');
    if (!trigger) return;

    const STOP_DELAY = 750;

    function clearStop() {
      if (video._hoverStopTimer) {
        clearTimeout(video._hoverStopTimer);
        video._hoverStopTimer = null;
      }
    }

    function scheduleStop() {
      clearStop();
      video._hoverStopTimer = setTimeout(() => {
        video._hovered = false;
        safePause(video);
        evaluate(video);
        video._hoverStopTimer = null;
      }, STOP_DELAY);
    }

    function onEnter() {
      clearStop();
      video._hovered = true;
      attachSource(video);
      evaluate(video);
    }

    on(trigger, "pointerenter", onEnter, { passive: true });
    on(trigger, "pointerleave", scheduleStop, { passive: true });
  }

  function initActive(video) {
    const outer = video.closest(".scroll-1_target_item");
    if (!outer) return;

    function update() {
      video._active = outer.classList.contains("is-active");
      if (video._active) attachSource(video);
      evaluate(video);
    }

    update();
    const mo = new MutationObserver(update);
    mo.observe(outer, { attributes: true, attributeFilter: ["class"] });
    addCleanup(() => { try { mo.disconnect(); } catch (_) {} });
  }

  function initViewport(video) {
    video._inview = false;

    observe(video, { threshold: 0 }, (ent) => {
      video._inview = !!ent.isIntersecting;
      if (video._inview) attachSource(video);
      evaluate(video);
    });
  }

  function initVideo(video) {
    if (video._initialized) return;
    video._initialized = true;

    if (!video.hasAttribute("muted")) video.setAttribute("muted", "");
    if (!video.hasAttribute("playsinline")) video.setAttribute("playsinline", "");

    const modes = (video.getAttribute("data-video-mode") || "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const has = (m) => modes.indexOf(m) !== -1;

    video._modeViewport = has("viewport") || has("inview");
    video._modeActive   = has("active");
    video._modeHover    = has("hover");
    video._modeHero     = has("hero");

    if (video._modeViewport) initViewport(video);
    if (video._modeActive) initActive(video);
    if (video._modeHover) initHover(video);
    if (video._modeHero) initHero(video);

    if (!modes.length) attachSource(video);

    addCleanup(() => {
      try { video.pause(); } catch (_) {}
      if (video._hls) {
        try { video._hls.destroy(); } catch (_) {}
        video._hls = null;
      }
    });
  }

  scope.querySelectorAll("video[data-src]").forEach(initVideo);
}

// src/core/nav.js

/**
 * Mobile nav: close on link click + track origin for Barba transitions.
 *
 * When a .nav__panel-link triggers navigation, we:
 *  1. Snap the menu shut (no animation)
 *  2. Flag the navigation so Barba can skip the page transition
 */

let _initialized = false;
let _fromPanel = false;

/** Was the current navigation triggered from a mobile panel link? */
export function isFromPanel() {
  return _fromPanel;
}

/** Reset the flag (call after Barba transition completes) */
export function clearFromPanel() {
  _fromPanel = false;
}

/** Instant-close the mobile menu */
export function closeNav() {
  var checkbox = document.getElementById("nav-toggle");
  if (!checkbox || !checkbox.checked) return;

  var panel = document.getElementById("nav-mobile-panel");
  if (panel) panel.style.transition = "none";

  checkbox.checked = false;

  requestAnimationFrame(function () {
    if (panel) panel.style.transition = "";
  });
}

export function initNav() {
  if (_initialized) return;
  _initialized = true;

  var links = document.querySelectorAll(".nav__panel-link");
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener("click", function () {
      _fromPanel = true;
      closeNav();
    });
  }
}
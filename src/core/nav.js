// src/core/nav.js

/**
 * Mobile nav: close on link click + track origin for Barba transitions.
 *
 * When a .nav__panel-link triggers navigation, we:
 *  1. Let the menu animate closed naturally (CSS transition plays)
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

/** Close the mobile menu (lets CSS transition play) */
export function closeNav() {
  var checkbox = document.getElementById("nav-toggle");
  if (checkbox) checkbox.checked = false;
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
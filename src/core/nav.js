// src/core/nav.js

/**
 * Close the mobile nav when any panel link is clicked.
 * Needed because Barba prevents full page reloads,
 * so the checkbox state persists across navigations.
 *
 * Called once from app.js — outside initContainer because
 * the nav is persistent across Barba transitions.
 */

let _initialized = false;

export function initNav() {
  if (_initialized) return;
  _initialized = true;

  var checkbox = document.getElementById("nav-toggle");
  if (!checkbox) return;

  function closeMenu() {
    checkbox.checked = false;
  }

  var links = document.querySelectorAll(".nav__panel-link");
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener("click", closeMenu);
  }
}
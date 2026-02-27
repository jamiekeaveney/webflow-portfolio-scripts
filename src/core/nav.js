// src/core/nav.js

let _initialized = false;
let _fromPanel = false;

export function isFromPanel() {
  return _fromPanel;
}

export function clearFromPanel() {
  _fromPanel = false;
}

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
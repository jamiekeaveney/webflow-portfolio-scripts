# Webflow Portfolio (Barba + GSAP + Lenis) – Pro Bundle

This repo is designed to replace a giant inline Webflow footer script with a clean, versioned bundle.

## What you load in Webflow
After you build, you'll have:

- `dist/app.min.js` (production)

Add this to **Webflow → Project settings → Custom Code → Footer** (below your libraries):

```html
<script src="https://cdn.jsdelivr.net/gh/YOUR_USER/YOUR_REPO@1.0.0/dist/app.min.js"></script>
```

## Install + build
From the repo folder:

```bash
npm install
npm run build
```

Commit + push `dist/app.min.js`.

## Recommended library order in Webflow
(Examples – use your preferred CDNs.)

1) GSAP + plugins (ScrollTrigger, SplitText if you use it)
2) Lenis
3) Barba
4) Your bundle `app.min.js`

## Namespaces
Your Webflow pages should set Barba namespaces:

```html
<main data-barba="container" data-barba-namespace="home">...</main>
```

Namespaces supported here:
- home
- about
- approach
- work

Page hooks live in `src/pages/*.js`.

## Adding new page-specific code
Example in `src/pages/work.js`:

```js
import { on } from "../core/cleanup.js";

export function initWork(container, ctx) {
  const btn = container.querySelector("[data-work-button]");
  if (!btn) return;
  on(btn, "click", () => console.log("Work click"));
}

export function destroyWork() {}
```

Any listeners/observers created via the helpers automatically clean up on Barba leave.

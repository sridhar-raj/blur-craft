# Recipe 1c: Extended-backdrop sticky bar

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

A frosted header that also samples content just *below* itself, so colour glows into the glass as content
approaches instead of popping in when it touches the edge (Josh Comeau). `assets/surfaces.css` ships this
ready-made as `.gs-bar` (with device tiers and glass-on-scroll); the code below is the same pattern.

```css
.bc-bar { position: sticky; top: 0; z-index: 10; isolation: isolate; }
.bc-bar__backdrop {
  position: absolute;
  inset: 0;
  height: 200%;                                   /* sample twice the bar's height */
  backdrop-filter: blur(20px) saturate(180%);       /* Apple.com's nav values; literal (Sonoma) */
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  background: linear-gradient(to bottom, rgb(14 14 20 / 0.8) 0 50%, transparent 50%);   /* 80% fill, as Apple */
  -webkit-mask-image: linear-gradient(to bottom, #000 0 50%, transparent 50% 100%);
  mask-image: linear-gradient(to bottom, #000 0 50%, transparent 50% 100%);
  pointer-events: none;                           /* the masked half would otherwise block clicks */
  z-index: -1;
}
.bc-bar__edge {                                    /* a 1px lit edge where the glass ends (no second blur) */
  position: absolute;
  inset: auto 0 0 0;
  height: 1px;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.14) 20%, rgb(255 255 255 / 0.14) 80%, transparent);
}
/* Comeau's thicker "glassy edge" is a second live blur under the bar (a 4px strip with
   blur(12px) brightness(120%)): richer, but it doubles the blurred surfaces per bar. */
```

```html
<header class="bc-bar"><div class="bc-bar__backdrop"></div><div class="bc-bar__edge"></div>…links…</header>
```

---

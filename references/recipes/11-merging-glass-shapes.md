# Recipe 11: Merging glass shapes (Liquid Glass merge)

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

Apple's glass shapes merge with a liquid neck when they come close (`GlassEffectContainer(spacing:)`). On
the web: **one** full-screen glass layer, cut by a mask that is a goo-filtered SVG. The shapes merge in the
mask; the blur is a single surface. Tested in Chromium: two pills 8px apart join with a neck, 20px apart
stay separate.

```css
.bc-goo-glass {
  position: fixed; inset: 0; pointer-events: none;
  backdrop-filter: blur(18px) saturate(170%) brightness(0.96);   /* literal (Sonoma) */
  -webkit-backdrop-filter: blur(18px) saturate(170%) brightness(0.96);
  background: rgb(10 10 18 / 0.25);
  -webkit-mask: var(--goo-mask) 0 0 / 100% 100% no-repeat;
  mask: var(--goo-mask) 0 0 / 100% 100% no-repeat;
}
```

```js
// Rebuild the mask when the shapes change (not every pointer move). Shapes in viewport pixels.
function setGooMask(el, shapes, spread = 10) {
  const w = innerWidth, h = innerHeight;
  const body = shapes.map((s) => s.r
    ? `<circle cx="${s.x}" cy="${s.y}" r="${s.r}"/>`
    : `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.h / 2}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><filter id="g" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${spread}"/><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -7"/></filter></defs><g filter="url(#g)">${body}</g></svg>`;
  el.style.setProperty("--goo-mask", `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
}
```

- `spread` ≈ half the distance at which shapes should start merging (Apple's samples: spacing 40 → 20).
  The matrix `18 -7` is Lucas Bebber's goo; `19 -9` is firmer.
- Use a mask *image*. An inline `mask: url(#svgMask)` with a filter inside rendered no glass at all in the
  same test, and a `filter: url(#goo)` on a *parent* of glass blobs makes that parent a backdrop root, so
  the page behind disappears.
- Put the content (icons, labels) in normal elements above, positioned over the shapes.

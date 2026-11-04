# Recipe 12: Tinting glass with colour

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

- Structural glass carries almost no chroma: keep tints at OKLCH chroma ~0.03–0.05. Material 3 moved to
  near-neutral tone-based surfaces for the same reason. Save real colour for the one primary action
  (Apple: tint only primary elements; colour belongs in the content layer).
- Derive tints from the brand colour with relative colour syntax rather than mixing with `transparent`:
  `background: oklch(from var(--accent) l c h / 0.12);`
- When mixing, use `oklab` (Chrome's default, no hue drift): `color-mix(in oklab, var(--accent) 12%, var(--glass-base))`.
  Hue keywords only work in cylindrical spaces (`oklch`), and mixing two vivid hues in `oklch` can pass
  through a third.
- Text colour on a *known* tint: `contrast-color(var(--tint))` (Chrome 147, Firefox 146, Safari 26), or
  Lea Verou's threshold `oklch(from var(--tint) clamp(0, (0.623 - l) * infinity, 1) 0 h)` (approximation;
  0.623 is WCAG-safe). Neither can see the pixels *behind* glass: for that, use adaptive-tone.js.

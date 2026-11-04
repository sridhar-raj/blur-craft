# Recipe 10: Grain

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

Smooth dark gradients and big blurs band into visible steps, especially after video compression. A
faint noise layer hides the banding and makes the light feel photographic.

```css
.bc-grain::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.06;                 /* 0.04–0.08; higher reads as texture, not film */
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
```

- Static grain only. Animated grain over a whole frame doubles the video size and distracts.
- Put grain on a sibling layer or a pseudo-element, not as a `mix-blend-mode` (or `filter`) on a
  *wrapper* of the glass: that wrapper would become a backdrop root and the glass inside would go flat.
  A blended `::after` on its own is fine; it has no glass inside it.

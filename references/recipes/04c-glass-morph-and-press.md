# Recipe 4c: Glass morph and press

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

Cursor.com's glass (live CSS, Nov 2026) morphs one glass shape into another with a Framer Motion
`layoutId` and answers a press with an inner glow, not a scale:

```tsx
<motion.div layoutId="glass-pill" className="glass glass--thin"
  transition={{ layout: { duration: 0.34, ease: [0.32, 0.72, 0, 1] } }} />
```

```css
/* A pseudo-element carries the glow, so the button's own drop shadows aren't replaced mid-press. */
.bc-glass-button::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.52), inset 0 0 12px rgb(255 255 255 / 0.24); }
@keyframes bc-press { 50% { opacity: 1; } }
.bc-glass-button:active::after { animation: bc-press 0.22s ease-out; }
@media (prefers-reduced-motion: reduce) { .bc-glass-button:active::after { animation: none; opacity: 0.6; } }
@media (hover: hover) { .bc-glass-button:hover { --glass-fill-top: rgb(255 255 255 / 0.18); } }
```

- Morph between shapes that are near each other (`layoutId`); for far-apart ones, fade the glass in and
  out instead (Apple's `.materialize` vs `.matchedGeometry`).
- Animate the glass element itself: a fading *parent* turns into a backdrop root and blanks the glass.
- Cursor's measured materials: light `blur(14px) saturate(1.45)` with a 42% → 20% → 10% white gradient and
  a `#ffffff6b` border; dark `blur(18px) saturate(1.2)` with 11% → 7% → 3.5% white. Dark glass carries a
  quarter of the white and less saturation.

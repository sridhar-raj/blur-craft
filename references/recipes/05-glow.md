# Recipe 5: Glow

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

Light has no edge. Draw it with a gradient whenever the shape is round or elliptical, and use a real
blur only for an organic shape.

```css
/* First choice: a gradient. Free to render, never clips. */
.bc-glow {
  position: absolute;
  inset: -20%;
  pointer-events: none;
  background:
    radial-gradient(40% 35% at 50% 55%, rgb(214 255 61 / 0.35), transparent 70%),
    radial-gradient(35% 40% at 30% 40%, rgb(123 61 245 / 0.35), transparent 70%);
}

/* Organic shape: a blurred element. Pad it so the blur isn't cut by an overflow:hidden parent. */
.bc-glow-blob {
  position: absolute;
  width: 520px; aspect-ratio: 1;
  border-radius: 42% 58% 61% 39% / 45% 39% 61% 55%;
  background: conic-gradient(from 90deg, #d6ff3d, #7b3df5, #ff4fa3, #d6ff3d);
  filter: blur(70px);
  opacity: 0.55;
  will-change: transform;          /* animate transform (rotate/scale), never the blur */
}
```

```tsx
<motion.div
  className="bc-glow-blob"
  animate={{ rotate: [0, 18, 0], scale: [1, 1.08, 1] }}
  transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
/>
```

- Take glow colours from the subject (the art, the product, the brand) and never from a stock
  purple-to-blue pair.
- Add grain (recipe 10) over large dark glows, or they band into visible rings on 8-bit screens and in
  H.264 video.

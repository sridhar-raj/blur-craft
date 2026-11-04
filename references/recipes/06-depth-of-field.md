# Recipe 6: Depth of field

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

Three planes: a far plane softly blurred, a sharp subject plane, and an optional near plane heavily
blurred and partly out of frame. Optional rack focus moves the sharp plane on hover.

```tsx
import { motion } from "framer-motion";

const planes = { far: { blur: 6 }, mid: { blur: 0 }, near: { blur: 10 } };   // scale/opacity live in CSS

export function DepthStack({ focus = "mid" as "far" | "mid" }) {
  // Rack focus: when `focus` is "far", the far plane sharpens and the subject softens.
  const far = focus === "far" ? 0 : planes.far.blur;
  const mid = focus === "far" ? 4 : 0;
  const ease = { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] as const };
  return (
    <div className="bc-depth">
      <motion.div className="bc-plane bc-far" animate={{ filter: `blur(${far}px)` }} transition={ease} />
      <motion.div className="bc-plane bc-mid" animate={{ filter: `blur(${mid}px)` }} transition={ease} />
      <div className="bc-plane bc-near" style={{ filter: `blur(${planes.near.blur}px)` }} />
    </div>
  );
}
```

- This is the one place where animating `blur()` is right: it's the focus pull itself. Keep each plane
  small (a card, a device, a figure, never a full-screen layer) and the move short (≤ 0.5s).
- The near plane sells it: one out-of-focus shape (a leaf, a second device, a card corner) crossing a
  corner of the frame.
- Pair with pointer parallax (far moves least, near moves most) for real depth.

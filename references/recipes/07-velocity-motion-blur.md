# Recipe 7: Velocity motion blur

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

Something that moves fast (a card flung across, a carousel, a number reel) smears along its direction
of travel, then sharpens when it stops. CSS `blur()` is round, so use an SVG filter for a directional
smear.

```tsx
import { useId, useRef, type ReactNode } from "react";
import { motion, useMotionValue, useVelocity, useTransform, useMotionValueEvent, useReducedMotion } from "framer-motion";

export function MotionBlurX({ children }: { children: ReactNode }) {
  const id = useId().replace(/:/g, "");
  const x = useMotionValue(0);
  const v = useVelocity(x);
  const amount = useTransform(v, [-3000, 0, 3000], [16, 0, 16], { clamp: true });
  const blurRef = useRef<SVGFEGaussianBlurElement>(null);
  const reduce = useReducedMotion();

  useMotionValueEvent(amount, "change", (a) => {
    blurRef.current?.setAttribute("stdDeviation", `${reduce ? 0 : a.toFixed(1)} 0`);
  });

  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <filter id={`mb-${id}`} x="-20%" y="0" width="140%" height="100%">
          <feGaussianBlur ref={blurRef} in="SourceGraphic" stdDeviation="0 0" />
        </filter>
      </svg>
      <motion.div drag="x" style={{ x, filter: `url(#mb-${id})` }} dragConstraints={{ left: -300, right: 300 }}>
        {children}
      </motion.div>
    </>
  );
}
```

- Swap `drag` for whatever drives `x` (an `animate` call, a scroll-linked transform). The velocity hook
  reads any motion value.
- The filter region (`x="-20%" width="140%"`) has to be wider than the element, or the smear is cut off.
- Keep the element small: SVG filters are rasterised on the CPU in Safari.

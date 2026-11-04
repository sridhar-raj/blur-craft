# Recipe 2: Progressive blur

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

Content softens gradually toward an edge, as under a sticky header or at the foot of a scroll area,
instead of being cut by a hard line. It's built from stacked layers, each with a stronger blur and a
mask that starts later.

```tsx
type Side = "top" | "bottom" | "left" | "right";

export function ProgressiveBlur({
  side = "bottom",
  size = "28%",      // how far in from the edge the ramp reaches
  max = 24,          // blur at the very edge, px
  layers = 6,
  className,
}: { side?: Side; size?: string; max?: number; layers?: number; className?: string }) {
  const toEdge = { top: "to top", bottom: "to bottom", left: "to left", right: "to right" }[side];
  const pos =
    side === "top" ? { top: 0, left: 0, right: 0, height: size }
    : side === "bottom" ? { bottom: 0, left: 0, right: 0, height: size }
    : side === "left" ? { left: 0, top: 0, bottom: 0, width: size }
    : { right: 0, top: 0, bottom: 0, width: size };

  return (
    <div aria-hidden className={className} style={{ position: "absolute", pointerEvents: "none", zIndex: 2, ...pos }}>
      {Array.from({ length: layers }, (_, i) => {
        const blur = max / 2 ** (layers - 1 - i);            // e.g. 0.75 → 24px, doubling
        const from = (i / layers) * 100;
        const to = ((i + 1) / layers) * 100;
        const mask = `linear-gradient(${toEdge}, transparent ${from}%, #000 ${to}%)`;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              WebkitMaskImage: mask,
              maskImage: mask,
            }}
          />
        );
      })}
    </div>
  );
}
```

- Put it inside the scrolling or clipped container, above the content it fades.
- Pair it with a tint gradient (`linear-gradient(to bottom, transparent, var(--bg) 90%)`) when text
  needs to fully disappear at the edge. Blur alone leaves shapes visible.
- Six layers is the sweet spot. More layers cost more and look the same. Fewer than four show steps.
- Over a live WebGL component this is a full-width animated blur: count it as the screen's hero blur.

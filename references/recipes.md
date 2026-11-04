# Blur recipes

Code for each effect in SKILL.md. Class names use a `bc-` placeholder prefix: rename them to the
section's own prefix. React snippets assume `"use client"` and `framer-motion` (12+). Numbers are starting points; tune them by eye on a screenshot.

**Plain HTML (no React):** every Framer Motion recipe maps onto the Web Animations API. For example, the
blur reveal becomes
`el.animate([{ opacity: 0, filter: "blur(8px)", transform: "translateY(10px)" }, { opacity: 1, filter: "blur(0px)", transform: "none" }], { duration: 600, easing: "cubic-bezier(.2,.8,.2,1)", delay: i * 45 }).finished.then(() => el.style.filter = "none")`.
The crossfade is the same with 2px and 200ms. Keep `filter: none` at the end, as the React versions do.

0. Light behind the glass (do this first)
1. Glass surface (assets/glass.css, assets/Glass.tsx)
1b. Liquid Glass refraction (assets/liquid-glass.ts)
1c. Extended-backdrop sticky bar
2. Progressive blur
3. Focus veil
4. Blur reveal
4b. Blur-bridged crossfade
5. Glow
6. Depth of field
7. Velocity motion blur
8. Art backdrop
9. Locked content
10. Grain

---

## 0. Light behind the glass

Glass is only as good as what's behind it. Compose a light source that the glass half-covers, so the
frosting shows a gradient of colour across its width and the rim catches it.

```tsx
<div className="bc-stage">
  {/* the light: the scene's own colours, placed where the glass's leading edge will sit */}
  <motion.div
    className="bc-light"
    aria-hidden
    animate={{ x: [0, 24, 0], y: [0, -12, 0], scale: [1, 1.05, 1] }}
    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
  />
  <Glass thickness="regular" light="255 196 150" className="bc-player">…</Glass>
</div>
```

```css
.bc-stage { position: relative; display: grid; place-items: center; }
.bc-light {
  position: absolute;
  width: 46%; aspect-ratio: 1;
  left: 50%; top: 50%; translate: -15% -55%;          /* off-centre: half under the glass, half out */
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, #ffd2a1, #ff7a6b 40%, #7b4dff 72%, transparent 74%);
  filter: blur(6px);                                   /* soft edge; the glass does the real frosting */
}
```

- The light is the scene's subject in disguise: the sun of a landscape, the album art's colours, a live
  OriginKit component (Liquid Marble Flow, Silk Current, Cobalt Sprite), the product's accent.
- One dominant light plus one small counter-colour (a teal under a warm sun) gives the glass a gradient
  instead of a tint.
- Over a live WebGL component the component *is* the light; just place the glass over its brightest part.

## 1. Glass surface

Use the material in `assets/glass.css`. It's the five-layer stack: backdrop, gradient fill, gradient rim,
specular, depth. Don't hand-write a single-tint card.

```tsx
import { Glass } from "./Glass";          // copied from assets/Glass.tsx; import glass.css once

<Glass thickness="regular" light="255 196 150">
  <p className="glass-tertiary">Now playing</p>
  <h3 className="glass-label">Evening wind-down</h3>
  <p className="glass-secondary">12 min · Mara Lindqvist</p>
</Glass>
```

Plain CSS: `<div class="glass glass--regular" style="--glass-light: 255 196 150">`.

Tuning:
- Thickness by content: `clear` (media controls, little text), `thin`, `regular` (default), `thick`
  (sheets, menus, lots of text).
- `--glass-light` is the colour the rim and sheen glow with. Take it from the light behind the glass.
- Text uses `.glass-label` / `.glass-secondary` / `.glass-tertiary` (translucent white, the web version of
  Apple's vibrancy). Mid-grey text on glass is what makes it look dirty.
- Radius scales with size: 14–18px for chips and toasts, 24–32px for panels, a full pill for docks and
  players.
- Animate the glass element's own opacity/transform. A fading parent makes it go flat until the fade ends
  (backdrop root, see quirks.md).

## 1b. Liquid Glass refraction

The rim bends the scene behind it like a lens (Apple's Liquid Glass). Chromium applies an SVG
displacement map through `backdrop-filter`; every other browser keeps the frosted material.

```tsx
<Glass thickness="clear" liquid={{ bezel: 26, strength: 40, blur: 2 }} className="bc-dock">   {/* clear dock */}…</Glass>
```

Or without React: `mountLiquidGlass(el, { bezel: 26, strength: 40, blur: 2 })` from
`assets/liquid-glass.ts` (rerun it on resize).

- Refraction only shows over detail: lines, type, photos, a grid, a live component. Over a smooth gradient
  it's invisible, so use plain glass there.
- Liquid glass *replaces* the material's backdrop blur with its own filter, so `blur` is the whole
  frosting: 0–3 for clear liquid glass (the bending is the point, little text), 12–20 for frosted liquid
  glass with text on it.
- Refraction shows where the rim crosses detail. Place the glass so its edge overlaps a horizon, lines,
  type or a component, not only smooth sky.
- `strength` 30–50. Above ~60 the content tears at the rim.
- Use it on one hero element. The map is rebuilt on every resize.

## 1c. Extended-backdrop sticky bar

A frosted header that also samples content just *below* itself, so colour glows into the glass as content
approaches instead of popping in when it touches the edge (Josh Comeau).

```css
.bc-bar { position: sticky; top: 0; z-index: 10; isolation: isolate; }
.bc-bar__backdrop {
  position: absolute;
  inset: 0;
  height: 200%;                                   /* sample twice the bar's height */
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  backdrop-filter: blur(16px) saturate(180%);
  background: linear-gradient(to bottom, var(--page-bg) 0%, transparent 50%);  /* stops top-edge flicker */
  -webkit-mask-image: linear-gradient(to bottom, #000 0 50%, transparent 50% 100%);
  mask-image: linear-gradient(to bottom, #000 0 50%, transparent 50% 100%);
  pointer-events: none;                           /* the masked half would otherwise block clicks */
  z-index: -1;
}
.bc-bar__edge {                                    /* glassy bottom edge: a thin brighter strip */
  position: absolute;
  inset: 0;
  transform: translateY(100%);
  height: 100%;
  -webkit-backdrop-filter: blur(12px) brightness(120%) saturate(140%);
  backdrop-filter: blur(12px) brightness(120%) saturate(140%);
  -webkit-mask-image: linear-gradient(to bottom, #000 0 4px, transparent 4px);
  mask-image: linear-gradient(to bottom, #000 0 4px, transparent 4px);
  pointer-events: none;
}
```

```html
<header class="bc-bar"><div class="bc-bar__backdrop"></div><div class="bc-bar__edge"></div>…links…</header>
```

---
## 2. Progressive blur

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
              WebkitBackdropFilter: `blur(${blur}px)`,
              backdropFilter: `blur(${blur}px)`,
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

## 3. Focus veil

When a dialog opens, or one card is selected, everything else steps back. Keep the radius fixed and
animate the veil's opacity, which is far cheaper than animating `filter` on the whole page.

```tsx
import { AnimatePresence, motion } from "framer-motion";

export function FocusVeil({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="veil"
          className="bc-veil"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
        />
      )}
    </AnimatePresence>
  );
}
```

```css
.bc-veil {
  position: absolute;      /* or fixed for a full page */
  inset: 0;
  z-index: 20;             /* the dialog sits above this */
  background: rgb(8 8 12 / 0.35);
  -webkit-backdrop-filter: blur(6px) saturate(0.9);
  backdrop-filter: blur(6px) saturate(0.9);
}
```

- 4–8px. Enough that the background reads as "not now", not so much that the user loses their place.
- For a selected card inside a grid, scale the *other* cards to 0.98 and fade them to 0.6 alongside the
  veil, so the focus reads even where the blur is subtle.
- Reduced transparency: drop the backdrop blur and raise the veil alpha to 0.6.

## 4. Blur reveal

An element (a headline, a card, a number) resolves into focus as it arrives. Used once per screen, it's
an orchestrated moment; used on everything, it's a tell.

```tsx
import { motion, useReducedMotion, type Variants } from "framer-motion";

const word: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(8px)" },
  shown: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] },
    transitionEnd: { filter: "none" },     // clear it: a leftover blur(0px) keeps a filter layer alive
  },
};

export function BlurRevealHeadline({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <motion.h1
      className={className}
      initial="hidden"
      animate="shown"
      transition={{ staggerChildren: reduce ? 0 : 0.045 }}
      aria-label={text}
    >
      {words.map((w, i) => (
        <motion.span
          key={i}
          aria-hidden
          style={{ display: "inline-block", whiteSpace: "pre" }}
          variants={reduce ? { hidden: { opacity: 0 }, shown: { opacity: 1 } } : word}
        >
          {w}{i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </motion.h1>
  );
}
```

- Cap at 8px and 0.6s. Bigger blurs on large type look like a loading glitch.
- Words, not letters, for headlines. Letters only for a short word or a number.
- For a value that changes (a price, a counter), key the element on the value inside
  `AnimatePresence mode="popLayout"`, and blur the old value out (4px) as the new one blurs in.

## 4b. Blur-bridged crossfade

When one state swaps for another (a tab's content, a price, a play/pause icon, a label), a short 2px blur
during the swap makes the two read as one morph instead of two objects trading places (Emil Kowalski).

```tsx
import { AnimatePresence, motion } from "framer-motion";

<AnimatePresence mode="popLayout" initial={false}>
  <motion.span
    key={value}
    initial={{ opacity: 0, filter: "blur(2px)", scale: 0.97 }}
    animate={{ opacity: 1, filter: "blur(0px)", scale: 1, transitionEnd: { filter: "none" } }}
    exit={{ opacity: 0, filter: "blur(2px)", scale: 0.97 }}
    transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
  >
    {value}
  </motion.span>
</AnimatePresence>
```

- 2px is enough. More reads as a loading glitch. Duration matches the fade (150–250ms).
- Works best on icons and short labels. For whole panels, scale 0.97 plus 2px blur.

## 5. Glow

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

## 6. Depth of field

Three planes: a far plane softly blurred, a sharp subject plane, and an optional near plane heavily
blurred and partly out of frame. Optional rack focus moves the sharp plane on hover.

```tsx
import { motion } from "framer-motion";

const planes = {
  far:  { blur: 6, scale: 1.04, opacity: 0.8 },
  mid:  { blur: 0, scale: 1,    opacity: 1 },
  near: { blur: 10, scale: 1.12, opacity: 0.9 },
};

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

## 7. Velocity motion blur

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

## 8. Art backdrop

A heavily blurred copy of the product's own art (a poster, an album cover, a screenshot) washes the page
around it, the way a music player tints itself from the cover. It's static, so it's cheap even at full
screen.

```tsx
<div className="bc-ambient" aria-hidden>
  <img src={poster.src} alt="" />
</div>
```

```css
.bc-ambient { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.bc-ambient img {
  position: absolute;
  inset: -15%;                              /* oversize so the blurred edge falls outside */
  width: 130%; height: 130%;
  object-fit: cover;
  filter: blur(60px) saturate(1.6) brightness(0.7);
  transform: translateZ(0);                 /* own layer: blurred once, not every frame */
}
```

- Crossfade between two of these when the art changes (Framer Motion `AnimatePresence`, opacity only),
  rather than re-blurring one image.
- For live WebGL art, take a still (screenshot the component once and save it in `assets/`). Blurring the
  live canvas every frame is the most expensive blur there is.

## 9. Locked content

Shows that something is there (a report, a code, a premium template) without letting it be read.

```tsx
<div className="bc-locked" aria-hidden inert>
  <PreviewContent />
</div>
<div className="bc-lock-cta">
  <p>Upgrade to see the full report</p>
  <button>Unlock report</button>
</div>
```

```css
.bc-locked {
  filter: blur(8px);
  user-select: none;
  pointer-events: none;
  mask-image: linear-gradient(#000 40%, transparent);   /* fade away toward the call to action */
  -webkit-mask-image: linear-gradient(#000 40%, transparent);
}
```

- Blur is not security. Render placeholder content in the locked area, never the real secret: anyone can
  remove the filter in devtools.
- `inert` and `aria-hidden` keep keyboard and screen-reader users out of content they can't see.

## 10. Grain

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
- `mix-blend-mode` makes the layer a backdrop root, so don't put glass inside the grained element. Put
  the grain on a sibling above it.

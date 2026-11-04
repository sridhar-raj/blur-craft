# Blur recipes

Code for each effect in SKILL.md. Class names use a `bc-` placeholder prefix: rename them to the
section's own prefix. React snippets assume `"use client"` and `framer-motion` (12+). Numbers are starting points; tune them by eye on a screenshot.

**Plain HTML (no React):** every Framer Motion recipe maps onto the Web Animations API. For example, the
blur reveal becomes
`el.animate([{ opacity: 0, filter: "blur(8px)", transform: "translateY(10px)" }, { opacity: 1, filter: "blur(0px)", transform: "none" }], { duration: 600, easing: "cubic-bezier(.2,.8,.2,1)", delay: i * 45, fill: "backwards" })`.
`fill: "backwards"` holds the hidden first frame during the delay (no flash), and when the animation ends
the element returns to its stylesheet state, where `filter` is already `none`. The crossfade is the same
with 2px and 200ms.

0. Light behind the glass (do this first)
1. Glass surface (assets/glass.css, assets/Glass.tsx)
1b. Liquid Glass refraction (assets/liquid-glass.ts)
1c. Extended-backdrop sticky bar
2. Progressive blur
3. Focus veil
4. Blur reveal
4b. Blur-bridged crossfade
4c. Glass morph and press (Cursor's production values)
5. Glow
6. Depth of field
7. Velocity motion blur
8. Art backdrop
8b. Ambient glow from video
9. Locked content
10. Grain
11. Merging glass shapes (Liquid Glass merge)
12. Tinting glass with colour

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
<Glass thickness="clear" liquid={{ bezel: 26, strength: 40, blur: 2, aberration: 0.8 }} className="bc-dock">   {/* clear dock */}…</Glass>
```

Or without React: `mountLiquidGlass(el, { bezel: 26, strength: 40, blur: 2 })` from
`assets/liquid-glass.ts` (rerun it on resize).

- Refraction only shows over detail: lines, type, photos, a grid, a live component. Over a smooth gradient
  it's invisible, so use plain glass there.
- Liquid glass *replaces* the material's backdrop blur with its own filter, so `blur` is the whole
  frosting, applied inside the SVG filter before the bend: 0–6 for clear Liquid Glass (the bend is
  visible; a word or an icon on it), 12–20 for frosted (frosts edge to edge; the bend softens into a
  colour shift at the rim).
- Keep text a bezel-width inside the edge, or use a narrower `bezel` (12–16) on surfaces with text.
- Refraction shows where the rim crosses detail. Place the glass so its edge overlaps a horizon, lines,
  type or a component, not only smooth sky.
- `strength` 30–50. Above ~60 the content tears at the rim.
- `aberration` 0.6–1 adds a prism fringe at the rim. It's off by default; use it on the one hero element.
- `clamp` (default on) appends `contrast(0.8) brightness(0.92)`, so a white stripe behind the glass can't
  blow out the text.
- Use it on one hero element. The map is rebuilt on every resize.

## 1d. Liquid Glass in every browser (WebGL, over a known backdrop)

When the backdrop is something the page draws (a hero canvas, a wallpaper image, a video), a WebGL lens
refracts it in Chrome, Safari and Firefox alike:

```js
import { mountWebGLGlass } from "./liquid-glass-webgl.js";
const stop = mountWebGLGlass(document.querySelector(".mic"), heroCanvas, { blur: 3, bezel: 18, strength: 30, aberration: 0.8 });
// stop.refresh() after the source redraws; { live: true } for video or an animated canvas
```

- It draws behind the element's content and under its rim and sheen, applies the element's `--glass-dim`
  tint and 2.5% grain, and turns the element's CSS blur off while mounted.
- An `<img>` with `object-fit: cover` doesn't map pixel-for-pixel; draw it into a canvas with the cover
  crop first (browser-check.html does) and pass the canvas.
- Only the source is refracted, not other page elements floating over it. Off on lite/flat tiers, reduced
  transparency and forced colours.

## 1c. Extended-backdrop sticky bar

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
  background: rgb(8 8 12 / 0.32);   /* Material 3's scrim; surfaces.css .gs-veil */
  backdrop-filter: blur(6px) saturate(0.9);
  -webkit-backdrop-filter: blur(6px) saturate(0.9);
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

## 4c. Glass morph and press

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
in its colours, the way a music player tints itself from the cover.

**Bake the blur, don't filter it live.** A `filter: blur(60px)` image looks static, but under a fixed or
sticky `backdrop-filter` (a dock, a top bar) Chromium re-rasterises it every frame: a test page fell
from 60 to 22fps. Draw the art once into a tiny canvas and let the browser scale it up. Upscaling a
96px image is a blur that costs nothing per frame and looks the same.

```ts
/** Returns a data URL of `src` shrunk to `size` px wide: scaled up with CSS, it reads as a heavy blur. */
export async function bakeAmbient(src: string, size = 96): Promise<string> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = size;
  c.height = Math.round((size * img.naturalHeight) / img.naturalWidth);
  const ctx = c.getContext("2d")!;
  ctx.filter = "blur(2px) saturate(160%)";          // pre-softening; Safari still has canvas ctx.filter behind a flag, so
                                                    // there it's skipped and the upscaling alone does the blur (still fine)
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8);
}
```

```css
.bc-ambient { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.bc-ambient img {
  position: absolute;
  inset: -10%;
  width: 120%; height: 120%;
  object-fit: cover;
  image-rendering: auto;                     /* smooth upscaling is the blur */
  filter: brightness(0.7);                   /* cheap; no blur here */
}
```

- Crossfade between two baked images when the art changes (opacity only).
- For live WebGL art, take a still once (`canvas.toDataURL()`) and bake that.
- Only fall back to `filter: blur()` on the image when nothing fixed or sticky with a backdrop-filter sits
  over it.

## 8b. Ambient glow from video

A full blur over a playing video is the most expensive glass there is (and blocks the hardware video
overlay). YouTube's ambient mode samples instead: draw the frame into a tiny canvas and let CSS scale it up.

```html
<div class="bc-video"><canvas class="bc-video__glow" width="10" height="6" aria-hidden="true"></canvas><video src="…" playsinline></video></div>
```

```css
.bc-video { position: relative; isolation: isolate; }   /* keeps the glow's z-index: -1 inside this box */
.bc-video__glow { position: absolute; inset: -12%; width: 124%; height: 124%; opacity: 0.45; filter: blur(24px); z-index: -1; }
@media (prefers-reduced-motion: reduce) { .bc-video__glow { display: none; } }
```

```js
const ctx = glow.getContext("2d");
const draw = () => ctx.drawImage(video, 0, 0, 10, 6);
video.addEventListener("loadeddata", draw); video.addEventListener("seeked", draw);
let n = 0, handle = 0;
const onFrame = () => { if (++n % 4 === 0) draw(); handle = video.requestVideoFrameCallback(onFrame); };  // every 4th frame
video.addEventListener("play", () => { video.cancelVideoFrameCallback(handle); handle = video.requestVideoFrameCallback(onFrame); });
video.addEventListener("pause", () => video.cancelVideoFrameCallback(handle));   // one chain, never stacked
```

- `requestVideoFrameCallback`: Chrome 83, Safari 15.4, Firefox 132. Sampling is cheap (a 10×6 draw);
  the CSS `blur(24px)` still runs over the glow's displayed box, but it's a static layer that only
  repaints when a new frame is drawn, which is far cheaper than a live backdrop blur over the video.
- Controls over the video need a rim and highlight, not just a tint (Cursor's player: 50% black + 20px).

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
- Put grain on a sibling layer or a pseudo-element, not as a `mix-blend-mode` (or `filter`) on a
  *wrapper* of the glass: that wrapper would become a backdrop root and the glass inside would go flat.
  A blended `::after` on its own is fine; it has no glass inside it.


## 11. Merging glass shapes (Liquid Glass merge)

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

## 12a. When to use WebGL glass instead

CSS glass covers flat UI surfaces. Use WebGL only when the glass is a 3D object (a lens, a bottle, a
logo) or the backdrop is already a WebGL scene; every transmissive mesh renders the scene a second time per
frame. With react-three-fiber, drei's `MeshTransmissionMaterial` is the usual choice. Its defaults are
transmission 1, thickness 0, roughness 0, chromaticAberration 0.03, samples 6, full-screen resolution;
a frosted starting point is:

```tsx
<MeshTransmissionMaterial resolution={256} samples={6} thickness={0.5} roughness={0.2} chromaticAberration={0.03} anisotropicBlur={0.1} backside={false} />
```

- Lower `resolution` is the main speed lever; with roughness, 32–128 still looks right. `backside` costs
  another pass. In plain three.js, `MeshPhysicalMaterial` with `transmission: 1, thickness: 0.5,
  roughness: 0.2, ior: 1.5` is the equivalent.
- Docs: https://drei.docs.pmnd.rs/shaders/mesh-transmission-material

## 12. Tinting glass with colour

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

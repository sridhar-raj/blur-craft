# Recipe 8: Art backdrop

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

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

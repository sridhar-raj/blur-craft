# Recipe 1d: Liquid Glass in every browser (WebGL, over a known backdrop)

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

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

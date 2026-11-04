# Recipe 8b: Ambient glow from video

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

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

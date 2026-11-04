# Blur quirks and performance traps

**Contents:** The backdrop root (the most common "my glass disappeared") · Safari · Chrome and Firefox · Liquid Glass shows sharp patches · Checking Safari: Playwright's WebKit can't show backdrop-filter · Never build backdrop-filter from var() · Screenshots at deviceScaleFactor 2 · Component rules vs the tinted level · Hover glass on many items · Safari: toolbar tint and the extra layer · Framework fades and view transitions flatten glass · Tint tokens with light-dark() · Capturing glass as an image or PDF · Windows High Contrast (forced colors) · backdrop-filter makes a containing block · iOS 26 Safari's floating toolbar · Glass over video · Testing tools that can't see glass · Clipped glows · Banding · WebGL and canvas · Performance numbers to work from · Video capture · Support at a glance (MDN browser-compat data, November 2026)

Read this when a blur looks wrong (missing, clipped, banded, flickering) or the frame rate drops.

## The backdrop root (the most common "my glass disappeared")

`backdrop-filter` blurs only what is painted behind the element **inside its backdrop root**: the
nearest ancestor that has any of these:

- `filter` (anything except `none`)
- `opacity` below 1
- `mask`, `mask-image`, `clip-path`
- `mix-blend-mode` other than `normal`
- `backdrop-filter` (so glass inside glass sees only its glass parent)
- `will-change` naming one of the above

What this means in practice:

- **A Framer Motion parent fading in** (`initial={{ opacity: 0 }}`) makes the parent the backdrop root
  until the fade ends. The glass inside shows only its own tint for the duration, then pops into
  frosting. Fix: animate opacity on the glass element itself, or on a sibling wrapper, never on an
  ancestor.
- **A blurred reveal on a container** (`filter: blur(8px)` → 0) does the same, and keeps doing it if
  `filter: blur(0px)` is left behind. Use `transitionEnd: { filter: "none" }`.
- **Grain or a blend-mode layer** wrapping the glass: move it to a sibling above.
- **Glass in glass:** the inner panel blurs only the outer panel's tint, so it looks flat. Make the inner
  surface opaque or a plain tint.

## Safari

- Safari before 18 needs `-webkit-backdrop-filter`. Always write both, unprefixed first and `-webkit-` last
  (see the Sonoma section). In React inline
  styles that's `WebkitBackdropFilter` and `backdropFilter`.
- Masks on backdrop layers need `-webkit-mask-image` too (`WebkitMaskImage` in React).
- `backdrop-filter` plus `border-radius` plus `overflow: hidden` can leak square corners during a
  transform animation in older Safari. Adding `isolation: isolate` or `transform: translateZ(0)` to the
  glass usually fixes it.
- SVG filters (motion blur recipe) run on the CPU. Keep them small and short.
- Blur can disappear: browsers without support, the flat device tier, capture tools, a broken filter. The
  design must still read with the tint alone (the tint-only state of glass-contrast.mjs). iOS Low Power
  Mode is not one of these: its only documented web effect is the 30fps animation cap.

## Chrome and Firefox

- Extended backdrops (recipe 1c): keep the mask-image technique in every engine. A claimed Chrome 142
  fix that lets `overflow: hidden` clip after the blur couldn't be verified in any release note.
- Firefox: `backdrop-filter` on a `position: sticky` element stops working when an ancestor has both
  `overflow` and `border-radius` (fixed in Nightly, September 2026). A brief flash of a sharper shape
  on scroll is fixed by `overscroll-behavior: none`.

- Firefox supports `backdrop-filter` from version 103. Older builds go to the `@supports` fallback.
- Chrome samples the backdrop with edge-mirroring, so glass touching the viewport edge can show a faint
  bright rim. Inset the glass a few pixels or give it a 1px border in the tint colour.
- `prefers-reduced-transparency` works in Chromium 118+, not yet in Safari or Firefox. It's still worth
  writing, because the opaque fallback costs nothing.

## Liquid Glass shows sharp patches

If the **rim** of a Liquid Glass element shows the content behind it sharp, the blur is in the CSS chain
(`url() blur()`). Chromium doesn't blur the displaced bezel. The asset now blurs inside the SVG filter,
before the bend, which frosts edge to edge.

If some *other* part shows the content sharp, the displacement map is smaller than the element. Parts outside the filter region get no filter at all. Causes: mounted before fonts
loaded or before layout settled, or sized with `getBoundingClientRect()` under a scale transform. Remount
on ResizeObserver and `document.fonts.ready`, and size from `offsetWidth`/`offsetHeight` (`watchLiquidGlass` and `Glass.tsx` do
both). 

## Checking Safari: Playwright's WebKit can't show backdrop-filter

Playwright's WebKit build (headless *and* headed; Playwright 1.64's WebKit build, which reports version 27.2) never paints `backdrop-filter`
in screenshots, even a bare `blur(10px)`; `filter: blur()` paints fine. A screenshot from it shows every
glass surface as see-through and looks like a broken material. It isn't. Use it only to confirm the CSS
parses (read `getComputedStyle(el).backdropFilter` and the `::before` mask; glass.css parses identically in
WebKit and Chromium), and check the look in real Safari. Without one, follow SKILL.md §5.5: audit the literals, read
`webkitBackdropFilter` here, pass the tint-only state, and name exactly what is still unseen. In WebKit `matchMedia("(prefers-reduced-transparency:
no-preference)")` is false because the query is unsupported, which matches the research: only
`prefers-contrast` reaches Safari users.

## Never build backdrop-filter from var()

Safari **on macOS Sonoma** renders no blur when `backdrop-filter` is composed from custom properties
(`blur(var(--r))`, or `var()` holding the whole filter). It follows the OS, not the WebKit version: the bug
report shows it in Safari 18.6, 26.1 and Safari Technology Preview on Sonoma, and not on macOS 15 or 26.
That's why it passes in Playwright's WebKit (27.2) and in Safari on a newer Mac: an earlier version of this
skill tested only there and wrongly concluded it was fine. WebKit bug 297620 (open, P2). Tailwind v4 compiles every
`backdrop-blur-*` this way, so Tailwind glass loses its blur on those Macs too.

The bug's own test file (attachment 476457) has a third case: a **literal, unprefixed**
`backdrop-filter: blur(25px)` with no prefix, which the reporter says "does not work at all" on Sonoma
with Safari 18.6. So on Sonoma the prefixed property is the one that works. Order the pair **unprefixed
first, `-webkit-` last**: Chrome and Firefox ignore `-webkit-backdrop-filter`, and Safari then applies the
prefixed declaration. `assets/browser-check.html` shows every case side by side (literal, prefixed, both orders, var(),
Tailwind's shape, masked, the material, a backdrop root): open it on a Sonoma Mac to see which blur.
Treat this order as precautionary: if WebKit treats the two names as one aliased property it changes
nothing, and it couldn't be confirmed on a real Sonoma machine for this skill. (React inline styles
collapse both into one property anyway.) Build tools (Autoprefixer, Lightning CSS) usually emit the prefix *first*: check
the shipped CSS if Sonoma users matter.

`glass.css` therefore writes a literal filter per thickness × tone, unprefixed then prefixed, and switches
variants by class. Set
fills, dims and colours with variables freely; only the filter must be literal. `blur-audit.mjs` warns on
`var()` inside `backdrop-filter`. (Related, and different: WebKit 289149 looked identical but was an
ancestor with `will-change: opacity` making a backdrop root.)

## Screenshots at deviceScaleFactor 2

Headless Chromium at `deviceScaleFactor: 2` can leave the lower part of a large backdrop-filtered element
unblurred in the screenshot, even on a bare test page. Capture frost probes at scale factor 1 and enlarge
the crop instead.

## Component rules vs the tinted level

The tinted level adds its own layer (`--glass-tint-layer`) on top of a surface's `--glass-dim` instead of
replacing it, so a component that sets a darker dim keeps it and gets the tint on top. Its rules use a
doubled class (`.glass.glass`) so a component's own `--glass-tint-layer` can't switch the tint off by
accident. Keep the doubled class when renaming the prefix.

## Hover glass on many items

A `backdrop-filter` on a hidden hover button inside every card (43 album covers, say) is 43 invisible
elements each paying for a blur. Put the `backdrop-filter` in the `:hover`/`:focus-visible` rule only,
not on the resting state.

## Safari: toolbar tint and the extra layer

- Safari 26 samples a fixed or sticky element at the top edge to tint its own toolbar (WebKit 301756).
  A fully transparent glass nav gives it nothing sensible to sample: give the bar a real fill colour.
- A backdrop-filter makes WebKit add a full-screen compositing layer unless the document element has an
  opaque background (WebKit 271340, fixed in 2024 for opaque documents: so it's the opaque `html` that
  avoids the layer). Set `html { background: <colour> }` on pages with glass; it costs nothing.

## Framework fades and view transitions flatten glass

Measured in Chrome 156: an ancestor with `opacity < 1` (even 0.99) or any `filter` (even `blur(0)`) turns
the glass inside it flat; an ancestor with only a `transform` keeps the blur. So Vue `<Transition>`,
Svelte `transition:fade` and Framer Motion `AnimatePresence` on a *wrapper* blank the glass for the whole
fade, then it pops in. Fade or scale the glass element itself, or animate only `transform` on wrappers.

A standing `view-transition-name` on an ancestor also kills child backdrop blur in Chromium (not in the
spec's list, but measured, and seen in production). Give elements their view-transition names only for
the swap and clear them on `transition.finished`.

## Tint tokens with light-dark()

Keep glass tint tokens that use `light-dark()` as **unregistered** custom properties. A token registered
with `@property { syntax: '<color>' }` resolves once at the root's `color-scheme` and stays frozen there,
so a section switched to `color-scheme: dark` keeps the light tint (measured in Chrome 156; WebKit 282057,
Mozilla 1924562, CSSWG #13836).

## Capturing glass as an image or PDF

| Tool | What happens to backdrop-filter | Do this |
|---|---|---|
| html2canvas | ignored (filters unsupported) | `data-glass-capture` on `<html>` while capturing |
| html-to-image, dom-to-image, modern-screenshot | renders only if the backdrop is inside the captured node and the glass fill isn't fully transparent | capture the common ancestor, or use capture mode |
| Satori / @vercel/og | renders an opaque black slab, not a blur | build OG cards from a pre-blurred image (`filter: blur()` on a copy) plus the tint |
| Chromium `page.pdf()` / print | blur dropped, tint kept | the `@media print` rule in glass.css |
| Firefox Screenshots | ignored (bug 1657997) | capture mode |
| Playwright/Puppeteer screenshots | works headed; headless can differ, and transforms can catch half-drawn tiles | one mode, consistent container, or capture mode |

## Windows High Contrast (forced colors)

Chromium keeps `backdrop-filter` and the translucent fill under `forced-colors: active` but strips shadows
and gradient images (the rim, sheen and lift). glass.css switches glass to `Canvas`/`CanvasText` with a
system-coloured edge there (via a transparent outline that forced colours make visible). Never put
`forced-color-adjust: none` on glass.

## backdrop-filter makes a containing block

Like `transform` and `filter`, `backdrop-filter` makes the element the containing block for
`position: fixed` descendants (MDN). A fixed menu, toast or dialog nested inside a glass nav positions
against the nav, not the viewport. Portal overlays out of glass containers.

## iOS 26 Safari's floating toolbar

- A full-bleed scrim reaches under Safari's floating toolbar only when it's semi-transparent (not solid,
  not a gradient) and empty, with the dialog as a sibling. A native `<dialog>::backdrop` stops at the
  safe area. A bottom sheet fills the toolbar area only at `bottom: 0`.
- `env(safe-area-inset-bottom)` doesn't include Safari's own UI; `dvh`/`svh`/`lvh` behave like `vh` there.
  `window.innerHeight` does track the toolbar. (Empirical, from a published spike; Safari 26.1 fixed one
  bottom-gap bug.)
- iOS Low Power Mode throttles `requestAnimationFrame` to 30fps on purpose (WebKit 215745). That's its only
  documented effect on web pages (it doesn't remove blur), and the signal `glass-tier.js` uses to go flat.
- Pages can't read Apple's transparency settings: Safari has no `prefers-reduced-transparency`, even with
  iOS 27's Liquid Glass slider. Use `prefers-contrast: more` and offer a site setting
  (`data-glass="tinted"`).
- `-apple-visual-effect: -apple-system-glass-material` is a private property for WKWebView apps with a
  private preference. It does nothing on the web; ignore articles that recommend it.
- `@supports (backdrop-filter: url(#x))` returns true in Safari, which then paints nothing. Detect the
  engine for SVG backdrop filters (liquid-glass.js does).

## Glass over video

- Safari never hands `<video>` pixels to SVG filters, so SVG refraction over video fails there (use
  WebGL if it must refract).
- Glass over a playing video can stop the browser using a hardware video overlay, which costs power.
  Prefer a small ambient canvas (recipes/08b-ambient-glow-from-video.md) to a live backdrop blur over the video.
- Drop glass in fullscreen (`document.fullscreenElement`, iOS `webkitbeginfullscreen`) and stop canvas
  loops on `visibilitychange`.

## Testing tools that can't see glass

- axe-core doesn't model `backdrop-filter`. Text on glass over an image comes back "incomplete"
  (`bgImage`/`bgOverlap`), and glass over a flat colour is scored as if it weren't blurred. That's why
  `glass-contrast.mjs` exists. Treat axe's incomplete results on glass as manual checks.
- Chrome DevTools (Rendering tab) and Polypane 16 emulate `prefers-reduced-transparency`.
- Visual regression: the grain is deterministic (`feTurbulence`), but the pointer sheen, the rim swing and
  any animated light change between runs. Freeze them with Playwright's `stylePath`
  (`.glass { --glass-noise: none } .glass::after { display: none }`, set on `.glass`, not `:root`) and use `maxDiffPixelRatio` around 0.01 for glass regions
  rather than loosening `threshold` globally. Keep baselines per OS and GPU.

## Clipped glows

`filter: blur(R)` spreads about 2–3×R beyond the element's box. A parent with `overflow: hidden` cuts
that off and leaves a hard straight edge in the light. Fixes, in order of preference:

1. Use a `radial-gradient` instead (recipe 5).
2. Oversize the blurred element with a negative inset so the cut falls outside the visible frame.
3. Move the glow outside the clipping parent.

## Banding

Big dark blurs and gradients step into rings on 8-bit screens, and much worse after H.264 compression
(which matters here: the user records these sections as videos). Add the grain layer (recipe 10). Avoid
very low-contrast, very large gradients like `#0a0a0a` → `#111` over 1000px: give them more range or add
grain.

## WebGL and canvas

- Glass over a live OriginKit WebGL component re-blurs on every frame the component renders. One such
  panel under about a third of the frame is fine; more drops frames.
- Never put `filter: blur()` on a WebGL canvas itself: it re-rasterises the whole canvas each frame.
  Lower the component's own sharpness or detail props, or blur a still copy.
- An opaque canvas (solid `background` prop) under glass is fine. Screen-blended canvases
  (`mix-blend-mode: screen`) are backdrop roots for anything inside them, so keep glass as a sibling.

## Performance numbers to work from

On a recent MacBook in Chrome at 1600×900:

| Blur | Rough cost |
|---|---|
| Static `filter: blur(60px)` on a still image, nothing glassy above it | Paid once; free afterwards |
| The same image under a fixed or sticky `backdrop-filter` (dock, bar) | Re-rasterised every frame: 60 → 22fps measured. Bake it (recipe 8) |
| Glass 18px, 400×300, over a static background | Negligible |
| Glass 18px, 400×300, over a live WebGL canvas | Small, every frame |
| Glass 18px, full width, over a live WebGL canvas | Noticeable; the hero blur budget |
| Animating `filter: blur()` 0→8px on a headline for 0.6s | Fine |
| Animating `filter: blur()` on a full-screen layer | Drops frames; use a veil and opacity instead |
| `filter: blur(80px)` on a 1000px element that also animates its blur | Drops frames |

Measure rather than guess: `scripts/blur-audit.mjs --url` reports frame rate while the pointer moves.

## Video capture

- Headless Chromium (Playwright capture) renders backdrop blur correctly. If a captured frame shows the
  glass unfrosted, the capture probably landed mid-fade on a parent (see backdrop root).
- Blur reveals can fall inside the trimmed page-load part of a capture. Use `--settle` or start the reveal
  on a delay long enough to be recorded.

## Support at a glance (MDN browser-compat data, November 2026)

| Feature the skill uses | Chrome | Firefox | Safari |
|---|---|---|---|
| `backdrop-filter` | 76 | 103 | 18 (`-webkit-` from 9) |
| `mask-image`, `mask-composite` (the rim) | 120 (`-webkit-` before) | 53 | 15.4 |
| `@property` (the rim angle) | 85 | 128 | 16.4 |
| `animation-timeline: scroll()` (glass on scroll) | 115 | 159 | 26 |
| `prefers-contrast` (tinted level) | 96 | 101 | 14.1 |
| `prefers-reduced-transparency` | 118 | flag only | none |
| `inert` (dialog) | 102 | 112 | 15.5 |
| `requestVideoFrameCallback` (video glow) | 83 | 132 | 15.4 |
| `requestIdleCallback` (tier probe timing) | 47 | 55 | none: use `setTimeout` |
| canvas `ctx.filter` (baked art backdrop) | 52 | 49 | flag only: skipped, upscaling still blurs |
| `PressureObserver` (tier downgrades) | 125 | none | none |
| SVG filter in `backdrop-filter` (liquid-glass.ts) | yes | ignored | paints nothing (245510) |
| WebGL lens over a canvas/img/video (liquid-glass-webgl.js) | yes | yes | yes (verified rendering in WebKit) |

Firefox: bug 1782876 (backdrop-filter not rendering when a *parent* has transform, opacity, clip-path or a
mask) closed as WORKSFORME on 2026-07-30. The backdrop-root rule below still applies in every browser.
Firefox couldn't be launched in this skill's test environment, so it's covered by compatibility data, not
screenshots: test in current Firefox rather than assuming either way.

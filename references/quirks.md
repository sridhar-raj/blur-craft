# Blur quirks and performance traps

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

- Safari before 18 needs `-webkit-backdrop-filter`. Always write both, prefixed first. In React inline
  styles that's `WebkitBackdropFilter` and `backdropFilter`.
- Masks on backdrop layers need `-webkit-mask-image` too (`WebkitMaskImage` in React).
- `backdrop-filter` plus `border-radius` plus `overflow: hidden` can leak square corners during a
  transform animation in older Safari. Adding `isolation: isolate` or `transform: translateZ(0)` to the
  glass usually fixes it.
- SVG filters (motion blur recipe) run on the CPU. Keep them small and short.
- iOS Low Power Mode drops backdrop blur frames. The design must still read with the tint alone.

## Chrome and Firefox

- Extended backdrops (recipe 1c): from Chrome 142, `overflow: hidden` on the bar trims the oversized
  backdrop child after it has been blurred, so it can replace the mask. Older Chromium trims first,
  leaving nothing to sample, so keep the mask for them.
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
on ResizeObserver and `document.fonts.ready`, and size from `offsetWidth`/`offsetHeight` (the asset does
both). 

## Checking Safari: Playwright's WebKit can't show backdrop-filter

Playwright's WebKit build (headless *and* headed, tested on WebKit 27.2) never paints `backdrop-filter`
in screenshots, even a bare `blur(10px)`; `filter: blur()` paints fine. A screenshot from it shows every
glass surface as see-through and looks like a broken material. It isn't. Use it only to confirm the CSS
parses (read `getComputedStyle(el).backdropFilter` and the `::before` mask; glass.css parses identically in
WebKit and Chromium), and check the look in real Safari. In WebKit `matchMedia("(prefers-reduced-transparency:
no-preference)")` is false because the query is unsupported, which matches the research: only
`prefers-contrast` reaches Safari users.

## Screenshots at deviceScaleFactor 2

Headless Chromium at `deviceScaleFactor: 2` can leave the lower part of a large backdrop-filtered element
unblurred in the screenshot, even on a bare test page. Capture frost probes at scale factor 1 and enlarge
the crop instead.

## Component rules vs the tinted level

A component rule that sets `--glass-dim` (same specificity as `.glass`, but later) would override the
tinted level inside `@media (prefers-contrast: more)`. The asset's tinted rules use a doubled class
(`.glass.glass`) so they still win. Keep that when renaming the prefix.

## Hover glass on many items

A `backdrop-filter` on a hidden hover button inside every card (43 album covers, say) is 43 invisible
elements each paying for a blur. Put the `backdrop-filter` in the `:hover`/`:focus-visible` rule only,
not on the resting state.

## Safari: toolbar tint and the extra layer

- Safari 26 samples a fixed or sticky element at the top edge to tint its own toolbar (WebKit 301756).
  A fully transparent glass nav gives it nothing sensible to sample: give the bar a real fill colour.
- A backdrop-filter makes WebKit add a full-screen compositing layer unless the document element has an
  opaque background (WebKit 271340). Set `html { background: <colour> }` on pages with glass.

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

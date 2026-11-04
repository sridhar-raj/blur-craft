---
name: blur-craft
description: >-
  Blur and glass in UI, done well and proven readable: a measured frosted-glass material (thickness
  levels, lit rim, tinted level), ready-made glass surfaces (sticky nav, dock, sidebar, menu, dialog over a
  blurred veil, toast, sheet), Liquid Glass refraction, progressive blur and blur reveals, for CSS, React,
  Vue, Svelte, Tailwind and native toolkits, with contrast and frost checkers. Use it when a design has or
  asks for glass, glassmorphism, frosted or translucent surfaces, backdrop-filter or backdrop-blur, a
  blurred scrim behind a dialog, a bar or panel floating over images, video or scrolling content, or
  Apple-style (macOS/iOS/visionOS) materials; and when fixing translucent UI that's hard to read or a blur
  that doesn't render (Safari, Tailwind's backdrop-blur). A request to make UI "premium" or give it "more
  depth" is not by itself a reason to add glass: use this only once glass is in the design or asked for.
---

# Blur craft

Most glass on the web looks cheap for three reasons: nothing interesting sits behind it, the material is
one flat tint with one blur, and the text on it is a muddy grey that nobody measured. Glass that looks
expensive (Apple's materials, visionOS, the best product sites) gets three things right, in this order:

1. **The light behind the glass is designed.** Glass shows off what's behind it, so put a light there.
2. **The glass is a material, not a tint.** Saturated blur, a gradient fill, a lit rim, a specular sheen,
   depth, grain. That's `assets/glass.css`.
3. **The text is measured.** Translucent glass changes contrast with every pixel behind it, so contrast is
   checked at the worst point, by script, in three states (`scripts/glass-contrast.mjs`).

## Quick path

| I'm building… | Use | Notes |
|---|---|---|
| A sticky nav bar | `.gs-bar` (surfaces.css) | Extended backdrop; add `gs-bar--on-scroll` to turn glassy only after scrolling |
| A player, dock or pill over art | `.gs-dock.glass.glass--clear` + `liquid-glass.js` | Clear Liquid Glass, one per screen; adaptive tone if the art changes a lot |
| A floating card or panel with text | `.glass.glass--regular` | `thick` over a detailed photo |
| A menu, popover or command bar | `.gs-menu.glass` | 4px over ~86% (a bigger blur under that fill only costs frames), 0.5px top highlight |
| A dialog | `.gs-veil` + `.gs-dialog.glass.glass--thick` | `glass--solid` when it confirms money, deletes or signs; `gs-veil--flat` + `.gs-modal-open` when glass chrome sits underneath |
| A toast or a bottom sheet | `.gs-toast.glass.glass--regular` / `.gs-sheet.glass.glass--thick` | The `gs-` classes are layout only; the material comes from `.glass` |
| Content fading under a bar | Progressive blur (recipe 2) | One scroll-edge effect per view |
| A headline arriving, or a value changing | Blur reveal (4) / 2px crossfade (4b) | Once per screen |
| A page washed in the art's colours | Art backdrop, baked (recipe 8) | Never a live blur under fixed glass |
| A Tailwind v4 project | `glass.css` + `glass.tailwind.css` (`glass-blur-24`, …) | Tailwind's own `backdrop-blur-*` breaks on Sonoma Safari |
| A native app (SwiftUI, Flutter, React Native, Compose) | `references/native.md` | Same method, each toolkit's material |
| Chrome for a photo, video or design editor | `.glass.glass--thick.glass--neutral` | Neutral: no saturation boost, the glass mustn't recolour the work |

Then: compose the light (§1), set the material (§2), check (§5). `assets/demo.html` shows every surface
live with controls; open it to see what each class does before choosing.

## 1. Compose the light first

Decide what will be directly behind each glass surface, and make it the most luminous thing there.

- **Place a light under the glass:** a glow, the sun in the art, the product's colours, a live WebGL
  component. Blurred flat colour is the same flat colour; glass over a void is a grey box.
- **Let the light cross the edge.** The best glass sits half over the light and half over darkness, so
  colour shifts across its width.
- **Aim the rim at the light.** Set `--glass-light` to the light's colour (`255 200 160` for a sunset) and
  `--glass-rim-angle` to its direction. The rim's bright end faces the light:

  | Light from | top-left | top | top-right | right | bottom-right | bottom | bottom-left | left |
  |---|---|---|---|---|---|---|---|---|
  | angle | 135deg | 180deg | 225deg | 270deg | 315deg | 0deg | 45deg | 90deg |

  A light *under* the glass takes the angle of its nearest edge plus ~15deg toward the centre. The angle is
  a registered `@property`, so it can follow the pointer or the scroll smoothly (Apple's highlights travel
  around the material as the light moves).
- **Size glass like the hero it is.** It reads as a material when it's big enough to show the scene change
  under it. Apple makes larger glass behave as *thicker* glass: deeper shadow, softer scatter.

## 2. Set the material

Use `assets/glass.css` (rename the `glass` prefix when copying) and `assets/surfaces.css` for the
ready-made surfaces, or the components: `Glass.tsx` (React), `Glass.vue` (Vue 3), `Glass.svelte` (Svelte 5). Don't hand-write a one-line `backdrop-filter` card.

**Write `backdrop-filter` with literal values, never `var()`, unprefixed first and `-webkit-` last.**
On macOS Sonoma, Safari renders no blur when the filter is built from custom properties (WebKit 297620,
open), and Tailwind v4's `backdrop-blur-*` is built exactly that way. The bug follows the OS, not the Safari
version: it reproduces in Safari 18, 26.1 and Safari Technology Preview on Sonoma, and not in the same
versions on macOS 15 or 26. Sonoma Macs stay on it for years, so write for it. The same bug report shows the
unprefixed property failing there even with a literal value, so the prefixed declaration goes last, where
Safari applies it (Chrome and Firefox ignore it). `glass.css` has a literal filter per thickness × tone and
switches by class; variables are fine for fills, dims and colours.

**Thickness.** Pick by how much text the glass carries. Values were calibrated with the contrast checker
over a bright light in `demo.html`:

| Class | Blur, dim | Passes 4.5:1 over a bright light? | Use for |
|---|---|---|---|
| `glass--clear` | 16px, 22% | No: bold or large text and icons only | Docks, play buttons, pills over media (Apple: clear needs bold, bright content and a dimming layer) |
| `glass--thin` | 24px, 30% | Not over the brightest light | Controls, chips, small cards over moderate backdrops |
| `glass--regular` | 32px, 48% | Yes on the calibration page; a bright sunset behind a player needed `thick` at 0.62 | Players, panels, toasts: the default. The blur-off (tint-only) state is usually the one that fails first |
| `glass--thick` | 44px, 56% | Yes | Menus, sheets, dialogs, anything text-heavy |
| `glass--solid` | 4px, 92% | Yes | Payments, deletes, signatures (above ~85% fill a big blur can't be seen, so it's 4px) |

Add `glass--light` for light glass with ink text, and `glass--neutral` in colour-critical apps (photo, video
and design editors): no saturation boost or tone shift, because the glass mustn't change how the work looks. Over a detailed photo, start from `thick` with
`--glass-dim: rgb(10 10 18 / 0.65–0.75)` (it's a colour, not a number): vivid glass and readable text pull against each other there, so spend the
vividness on the rim, the sheen and the light spilling around the glass.

**Two levels, like iOS 26.1:** a tinted level (more opacity, never less) turns on for `prefers-contrast:
more` (the setting Safari users can reach; Safari has no `prefers-reduced-transparency`), with
`glass--tinted`, or site-wide with `<html data-glass="tinted">`. glass.css also handles Windows High
Contrast (solid `Canvas` surface), print (plain bordered box), capture mode for screenshot tools, and RTL.

**Glass belongs to the control layer** (nav, toolbars, docks, menus, sheets, dialogs) floating over
content, never the content itself, and never glass on glass (Apple, WWDC25). Tint only the primary action.
Match the brief's register: immersive briefs take strong light and clear glass on the hero control; trusted
ones (finance, health) take thick or solid glass and barely any light.

`references/material.md` has the rest: what every layer does and why, the presets read from Apple.com,
Linear, Raycast, Radix, Material and Fluent, Apple's full WWDC25 rule list, and the register table.

## 3. Signature effects

Code in `references/recipes.md`:

- **Liquid Glass refraction:** the rim bends what's behind it like a lens, with optional chromatic
  aberration (0.6–1). Two versions: `liquid-glass.ts`/`.js` refracts *any* page content but only in
  Chromium (Safari paints nothing for SVG backdrop filters, WebKit 245510); `liquid-glass-webgl.js`
  refracts a backdrop the page draws itself (a `<canvas>`, `<img>` or `<video>`, such as a hero wallpaper)
  in **every** browser, verified rendering in Chromium and WebKit. Elsewhere the frosted material must
  look finished on its own. Refraction and frosting trade
  off: the bend shows through clear glass (`blur` 0–6); frosted (12–20) frosts edge to edge and the bend
  becomes a soft colour shift. Clear for a word or an icon, frosted for sentences, text a bezel-width
  inside the edge. Never on a dialog over a veil: there's nothing sharp left to bend.
- **Extended backdrop** for sticky bars: colour arrives in the glass before content scrolls under it.
  `gs-bar--on-scroll` makes the bar glassy only after scrolling, in pure CSS (scroll-driven animations).
- **Progressive blur:** content dissolves under a bar instead of being cut. Stacked masked layers are the
  only way until CSS gets `linear-blur()` (proposed, csswg #13285).
- **Blur-bridged crossfade:** 2px blur during a state swap (Emil Kowalski).
- **Blur reveal:** from `blur(8px)`, once, as the arrival moment.
- **Focus veil:** the page behind a dialog steps back 4–8px.
- **Glass morph and press:** a `layoutId` morph between nearby glass shapes (Cursor: 0.34s,
  `[0.32, 0.72, 0, 1]`) and an inner-glow pulse on press, not a scale.
- **Merging glass shapes:** one glass layer cut by a goo-filtered SVG mask, so nearby shapes join with a
  liquid neck like Apple's glass containers (recipe 11, tested in Chromium).
- **Ambient glow from video:** a 10×6 canvas sample of the playing video, scaled up (recipe 8b).
- **Tinting:** chroma ~0.03–0.05 for structural glass, relative-colour alpha for tints (recipe 12).
- **Depth of field**, **velocity motion blur**, **art backdrop** (baked), **locked content**, **grain**.

## 4. Keep it fast

Design the look first, then hold these:

- Animate opacity and transform, not the blur radius. Apple.com's menu curtain keeps a fixed 20px blur
  over a 40% tint and fades its opacity in over 320ms; the blur itself never animates.
- Never blur two stacked surfaces at once (Apple's nav drops its own blur while a flyout is open). When a
  dialog opens over glass chrome, add `.gs-modal-open` to `<html>` (the chrome stops blurring and goes
  near-opaque) and use `gs-veil--flat`, or bake the veil from an image or canvas backdrop. Measured on a
  photo-editor test: a live full-screen veil blur over five glass panels ran at 31fps; without it, 60.
- A fixed or sticky blur re-runs every scroll frame. One large one per screen; bake big blurred images
  beneath it (measured: 60 → 22fps with a live blur, back to 60 baked).
- Phones: seven 18px panels cost ~3.5ms per frame on a Mali-G57 (75–80% of frames on time vs 99% without).
  With more than a few panels, drop `backdrop-filter` at your layout's phone breakpoint and keep the
  translucent fill (or let glass-tier.js decide per device).
- **Budget blurred area, not radius or count.** Measured for this skill (Chromium, software rendering at 2×,
  moving backdrop, vsync on): radius 4 → 64px and 1 → 9 surfaces at the same total area made no difference;
  blurring 90% of the screen dropped to 51fps (p95 33ms). That matches Skia downsampling large blurs. The
  numbers are relative (a fast Mac rendering in software), the ranking is what transfers.
- Give `html` an opaque background colour: Safari then skips an extra full-screen compositing layer for
  pages with glass (WebKit 271340: the fix skips the layer only for opaque documents).
- Don't blur under an opaque fill. Framer and Dia ship `backdrop-filter` on solid backgrounds, paying
  for a blur nobody can see. Above ~85% fill, use ≤ 4px or none.
- Tier glass by device: `assets/glass-tier.js` sets `data-glass-tier` to full, lite (one 8px blur) or
  flat (no blur, more tint) from device memory, Save-Data, a frame-rate probe (iOS Low Power Mode caps
  web animation at 30fps on purpose; that's its only documented effect on web pages) and Compute
  Pressure, the way Android and Fluent drop blur on weak or power-saving devices.
- Over video, don't blur the playing video: sample it into a tiny canvas (recipe 8b), and drop glass in
  fullscreen. Safari never passes video pixels to SVG filters.
- Backdrop root: a parent with `opacity < 1`, `filter`, a mask, `clip-path`, `mix-blend-mode`,
  `backdrop-filter` or `will-change` on any of those flattens glass inside it. That includes a Framer Motion
  parent fade and a goo `filter` on a parent of glass blobs. Fade the glass itself; clear reveal filters
  (`filter: none`) when they finish.
- `backdrop-filter` makes an element the containing block for `position: fixed` children: portal menus,
  toasts and dialogs out of glass containers.
- A standing `view-transition-name` on an ancestor flattens glass in Chromium; set names only during the
  transition. Framework fade transitions on a wrapper do the same: fade the glass itself.
- Taking screenshots, OG images or PDFs of glass: html2canvas, Satori and print drop or break the blur. Set
  `data-glass-capture` on `<html>` while capturing (glass.css turns glass opaque), and see quirks.md.

## 5. Check it (required)

Run all of these before calling glass done:

1. **Frost check:** `node <skill>/scripts/frost-check.mjs <url or file.html>` measures, for every glass
   surface, how much detail the blur removes (blur on vs off). NO BLUR means a backdrop root, a broken
   prefix or `var()`, or a stale Liquid Glass map; FLAT means there's nothing behind it to measure. To check
   by eye instead, put bold red text behind the glass, capture at `deviceScaleFactor: 1` and enlarge.
2. **Contrast, measured, on the worst backdrop:** `node <skill>/scripts/glass-contrast.mjs <url or file.html>`.
   Point it at the brightest realistic state, not the pretty default: the lightest photo, a daylight frame,
   an image pushed +2 EV, the white page section that scrolls under the bar (add URL parameters or a
   test state so the script can load it). On one editor the default photo passed at 8.7:1 and a bright
   frame failed at 4.4:1. Check phone width too (`--width 390 --height 844`). It hides the text,
   finds the brightest and darkest pixel under each line, and checks 4.5:1 (3:1 large) in three states:
   normal, tint-only (blur off, as a browser without support, the flat tier or a dropped filter shows it) and `prefers-contrast: more`. Fix failures
   by going a thickness up, raising the alpha in `--glass-dim` (e.g. `rgb(10 10 18 / 0.6)`), or moving text
   off the bright patch. Never put
   text-bearing glass over other text. Keep 44px targets on glass controls.
3. **Look:** does colour shift across the glass; is the rim lit on the light side; is the glass the most
   beautiful object in its frame; does the tinted level look intentional, not broken?
4. **Audit:** `node <skill>/scripts/blur-audit.mjs <folder | .css | .tsx | .html>`, and `--url` with the
   page running for blurred area and frame rate.
5. **Other browsers:** open `assets/browser-check.html` in the browser in question (real Safari, a Sonoma
   Mac, Firefox, an old iPhone): ten tiles show which blur cases work there. Playwright's WebKit never
   paints `backdrop-filter` in screenshots and runs a newer WebKit than Sonoma's Safari, so it can't show
   the look or the `var()` bug. **Without real Safari, don't stop at "please open it in Safari".** Do this
   and report the result:
   - `blur-audit.mjs` on the source: every `backdrop-filter` literal (both declarations), `-webkit-` last,
     a `@supports` fallback. That is the whole Sonoma `var()` check; it needs no Mac.
   - In Playwright's WebKit, read `getComputedStyle(el).webkitBackdropFilter` for each glass surface: it
     must be the literal filter, not `none` (catches a missing prefix, a typo, a cascade that drops it).
   - The tint-only state of `glass-contrast.mjs` passing is what a Safari that drops the blur would show.
   - Then name what is still unverified, specifically, e.g. "rendered blur and the Liquid Glass fallback
     in Safari 26 on macOS 15 and 14 not seen; computed filters and the tint-only fallback verified".
6. **Don't trust axe for glass.** axe-core ignores `backdrop-filter`: text on glass over images comes back
   "incomplete", and glass over flat colour is scored as if unblurred. `glass-contrast.mjs` is the check.
   For visual regression, freeze grain and sheen and compare glass regions at `maxDiffPixelRatio` ~0.01.

## Tells to avoid

- Glass over a flat colour or a void; one flat tint with a 10% white border; mid-grey text on glass.
- A grid of identical glass cards; glass inside glass; glass panes edge to edge (Fluent: a visible seam).
- Light blur (under ~14px) on a big text panel over busy content.
- Accent-coloured text or links on glass (the backdrop shifts the hue): put colour in a solid chip.
- Random blurred blobs unrelated to the product's colours.
- Tinting every glass element instead of only the primary action.
- A hover glow or pointer sheen on glass you can't click (cards, toasts, panels, dialogs): it promises an
  interaction that isn't there. Keep moving highlights for controls, mouse-only, and off under reduced motion.
- A blur under an opaque or ≥ 85% fill: invisible and still paid for.
- `-apple-visual-effect` for "real Liquid Glass" in Safari: it's a private property for native apps and
  does nothing on the web.

## Working with other skills

- **taste-skill** (if installed) bans glass outright. Keep its process; this skill decides when glass has
  earned its place and how to make it right.
- **React:** recipes use Framer Motion. Plain HTML maps onto the Web Animations API (recipes.md, top).
- **WebGL backgrounds** (OriginKit, shader gradients, three.js) are the best light behind glass. Mind §4.

## Files

- `assets/glass.css`: the material: layers, thickness scale, tinted level, light tone, text, fallbacks.
- `assets/surfaces.css`: sticky bar, dock, menu, veil + dialog, toast, sheet.
- `assets/demo.html`: live playground of every surface with controls (also the calibration page).
- `assets/browser-check.html`: open it in the browser to check. A split view of the Tabula hero (from the
  OriginKit posts): a typical Tailwind-style glass build vs blur-craft, then ten surfaces each written a
  different way with a per-browser table (`check-hero.html` is the hero page it embeds).
- `assets/Glass.tsx`, `Glass.vue`, `Glass.svelte`: components for React (Framer Motion), Vue 3 and Svelte 5
  (`thickness`, `tone`, `light`, `liquid`, `tinted`, `neutral`, and `sheen` for interactive glass only).
- `assets/liquid-glass.ts` / `.js`: Liquid Glass refraction of any content (Chromium).
- `assets/liquid-glass-webgl.js`: Liquid Glass in every browser, over a canvas, image or video backdrop.
- `assets/glass.tailwind.css`: Sonoma-safe Tailwind v4 utilities (`glass-blur-*`, `glass-neutral-blur-*`, `glass-none`).
- `assets/adaptive-tone.js`: light/dark flip for small glass from the luminance behind it.
- `assets/glass-tier.js`: full / lite / flat glass by device capability and power state.
- References are long; read only the one the task needs, and only its relevant section (each opens with
  its section list or headings to jump to). Most builds need none beyond this file and `assets/`.
- `references/recipes.md`: code for every effect. `references/research.md`: sources and what each
  established. `references/material.md`: every layer explained, production presets, Apple's WWDC25 rules, register.
  `references/quirks.md`: browser and performance traps.
  `references/native.md`: SwiftUI, UIKit, Flutter, React Native and Compose equivalents.
- `scripts/glass-contrast.mjs`: worst-case contrast in three states, whole page scrolled, `--click` to open
  a state. `scripts/frost-check.mjs`: does each surface actually blur (blur on vs off), `--click` too.
  `scripts/blur-audit.mjs`: static and live audit. `scripts/test-checkers.mjs`: the checkers' own tests
  (fixtures in `scripts/fixtures/`); run it after editing any checker.

---
name: blur-craft
description: >-
  Make blur and glass look premium in UI, and prove it's readable: Apple-grade frosted glass (a
  measured five-layer material with a lit rim, pointer sheen, thickness scale and an iOS 26.1-style
  tinted level), ready-made glass surfaces (sticky nav, dock, menu, dialog over a focus veil, toast,
  sheet), Liquid Glass refraction with chromatic aberration, adaptive light/dark tone, progressive blur,
  blur reveals and blur-bridged crossfades, glows, depth of field and ambient art backdrops, plus a
  worst-case contrast checker and an audit script. Use this whenever a design involves glass,
  glassmorphism, frosted or translucent panels, backdrop-filter, blur, soft glows, bokeh, depth, a
  player/dock/toolbar/sheet floating over art, photos or video, dimming behind a dialog, blur reveals,
  or a request to make something feel premium, layered, luminous or "Apple-like", and whenever reviewing
  or fixing a page that already uses blur, even if the user never says "blur".
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
| A menu, popover or command bar | `.gs-menu.glass` | 32px over ~86%, 0.5px top highlight |
| A dialog | `.gs-veil` + `.gs-dialog.glass.glass--thick` | `glass--solid` when it confirms money, deletes or signs; `gs-veil--flat` + `.gs-modal-open` when glass chrome sits underneath |
| A toast or a bottom sheet | `.gs-toast.glass.glass--regular` / `.gs-sheet.glass.glass--thick` | The `gs-` classes are layout only; the material comes from `.glass` |
| Content fading under a bar | Progressive blur (recipe 2) | One scroll-edge effect per view |
| A headline arriving, or a value changing | Blur reveal (4) / 2px crossfade (4b) | Once per screen |
| A page washed in the art's colours | Art backdrop, baked (recipe 8) | Never a live blur under fixed glass |
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
ready-made surfaces, or `assets/Glass.tsx` in React. Don't hand-write a one-line `backdrop-filter` card.

**Write `backdrop-filter` with literal values, never `var()`, unprefixed first and `-webkit-` last.**
Safari 18 and 26 on macOS Sonoma render no blur when the filter is built from custom properties (WebKit
297620, open), and Tailwind v4's `backdrop-blur-*` is built exactly that way. The same bug report shows the
unprefixed property failing there even with a literal value, so the prefixed declaration goes last, where
Safari applies it (Chrome and Firefox ignore it). `glass.css` has a literal filter per thickness × tone and
switches by class; variables are fine for fills, dims and colours.

**Thickness.** Pick by how much text the glass carries. Values were calibrated with the contrast checker
over a bright light in `demo.html`:

| Class | Blur, dim | Passes 4.5:1 over a bright light? | Use for |
|---|---|---|---|
| `glass--clear` | 16px, 22% | No: bold or large text and icons only | Docks, play buttons, pills over media (Apple: clear needs bold, bright content and a dimming layer) |
| `glass--thin` | 24px, 30% | Not over the brightest light | Controls, chips, small cards over moderate backdrops |
| `glass--regular` | 32px, 48% | Yes, all three states | Players, panels, toasts: the default |
| `glass--thick` | 44px, 56% | Yes | Menus, sheets, dialogs, anything text-heavy |
| `glass--solid` | 4px, 92% | Yes | Payments, deletes, signatures (above ~85% fill a big blur can't be seen, so it's 4px) |

Add `glass--light` for light glass with ink text, and `glass--neutral` in colour-critical apps (photo, video
and design editors): no saturation boost or tone shift, because the glass mustn't change how the work looks. Over a detailed photo, start from `thick` with
`--glass-dim: rgb(10 10 18 / 0.65–0.75)` (it's a colour, not a number): vivid glass and readable text pull against each other there, so spend the
vividness on the rim, the sheen and the light spilling around the glass.

**What's in the material** (and why):

| Layer | Value | Source |
|---|---|---|
| Backdrop | Literal per variant: clear `blur(16px) saturate(180%)`, thin `blur(24px) … contrast(.92)`, regular `blur(32px) … contrast(.85)`, thick `blur(44px) saturate(160%) … contrast(.8)`, solid `blur(4px) saturate(140%)`; dark glass adds `brightness(.96)`, light `brightness(1.08)`; neutral is blur only | Saturation keeps colour alive (Comeau, Apple.com's 180%). Contrast < 1 is the working CSS form of Fluent's luminosity layer: colour through, harsh light and dark blocked. Brightness ≤ 1 so a bright backdrop isn't lifted behind white text |
| Fill | 160° white gradient over a dim layer | A flat tint reads as plastic (NN/g: gradient fills mimic reflection) |
| Grain | 2.5% noise | Fluent acrylic ships 2% |
| Rim | 1px gradient ring (mask-composite), bright toward the light | Edge = thickness |
| Specular | inset top line + pointer sheen | Apple's specular highlights |
| Text | primary 97%, secondary 82%, tertiary 70% white, faint halo | Measured; the halo follows Harrison & Vicente (CHI '96): an outline made 75–90% transparent menus read like 50% ones |
| Radius | `--glass-inner-radius = radius − padding` | Apple's concentricity rule: inner corners neither pinched nor flared |

**Two levels, like iOS 26.1.** Apple added Clear/Tinted after the Liquid Glass legibility backlash. The
tinted level adds an opaque layer *on top of* each surface's own dim, so it only ever raises opacity (a
component that set a darker dim stays darker). It turns on for `prefers-contrast: more`, for `prefers-reduced-transparency`, with
`glass--tinted`, or site-wide with `<html data-glass="tinted">` (offer it as a setting). **Safari ignores
`prefers-reduced-transparency`**; `prefers-contrast` is the signal that reaches iPhone and Mac users.

**Calibrated presets** (production CSS and published tokens, read for this skill):

| Surface | Reference | Start from |
|---|---|---|
| Sticky nav | Apple.com `saturate(180%) blur(20px)` over 80%; Linear `blur(20px)` over `#0b0b0bcc` | `.gs-bar` |
| Menu / command bar | Linear `blur(32px)` over 90%; Raycast `blur(36px)`, 0.5px top highlight | `.gs-menu` |
| Translucent panel | Radix Themes `blur(64px)` over 70% white (the only big design system that ships a blur token) | `thick`, or a custom class with a literal `backdrop-filter: blur(64px) saturate(180%)` for very busy backdrops |
| Dialog scrim | Material 32%, Fluent Smoke 30%, Primer ~40%, Atlassian ~46%, Polaris 71% (no blur) | `.gs-veil`: 32% + 6px |
| Hover chip | Linear `blur(8px)` over `#ffffff29` | `clear`, blur on `:hover` only |

Most enterprise systems (Primer, Polaris, Carbon, Atlassian, Geist) use opaque surfaces over a scrim and
no blur at all, which says something: glass is a choice for the functional layer, not a default.

**Rules from Apple's own sessions (WWDC25 "Meet Liquid Glass", "Get to know the new design system"):**

- Glass belongs to the navigation and control layer floating over content, never the content itself.
  "Always avoid glass on glass." Elements *on* glass use fills and vibrancy, not more glass.
- Regular and clear glass "should never be mixed" on one screen.
- Only small elements flip between light and dark with the content behind them; menus, sidebars and
  panels never flip. `assets/adaptive-tone.js` does the small-element flip with hysteresis.
- Shadows deepen over text and soften over light solids; larger glass casts deeper shadows.
- Tint only primary actions. "If you want to imbue color into your app, do it in the content layer."
- Apply the material to the control, not its inner views; group bar items by function, keep text
  buttons and the primary action in their own containers.
- One scroll-edge effect per view: soft for glass controls, hard for pinned headers or bare-text
  controls, and none where nothing floats ("they're not decorative").
- At rest (first launch), avoid content intersecting the glass.

**Match the brief's register.** Immersive briefs (music, media, launches): dark ground, strong light in
the art's colours, clear glass and Liquid Glass on the hero control. Calm briefs (wellness, travel):
one warm and one cool light, regular glass. Trusted briefs (finance, health, admin): light or quiet dark,
barely any light behind, thick or solid glass on anything that confirms money or data. A light, solid
dialog over a blurred page reads as more trustworthy than dark glass.

## 3. Signature effects

Code in `references/recipes.md`:

- **Liquid Glass refraction** (`liquid-glass.ts`/`.js`): the rim bends what's behind it like a lens, with
  optional chromatic aberration (0.6–1). Chromium only (Safari's SVG backdrop filters are still in review,
  WebKit 245510), so the frosted material must look finished on its own. Refraction and frosting trade
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

- Long or looping animation goes on opacity and transform, not the blur radius. Short one-offs are fine:
  Apple.com animates its menu curtain's blur 0 → 20px over 320ms.
- Never blur two stacked surfaces at once (Apple's nav drops its own blur while a flyout is open). When a
  dialog opens over glass chrome, add `.gs-modal-open` to `<html>` (the chrome stops blurring and goes
  near-opaque) and use `gs-veil--flat`, or bake the veil from an image or canvas backdrop. Measured on a
  photo-editor test: a live full-screen veil blur over five glass panels ran at 31fps; without it, 60.
- A fixed or sticky blur re-runs every scroll frame. One large one per screen; bake big blurred images
  beneath it (measured: 60 → 22fps with a live blur, back to 60 baked).
- Phones: seven 18px panels cost ~3.5ms per frame on a Mali-G57 (75–80% of frames on time vs 99% without).
  With more than a few panels, drop `backdrop-filter` under ~600px and keep the translucent fill.
- Radius matters less than area and count: Skia downsamples past a small sigma, so 40px isn't 10× 4px.
- Give `html` an opaque background colour: Safari then skips an extra full-screen compositing layer for
  pages with glass (WebKit 271340: the fix skips the layer only for opaque documents).
- Don't blur under an opaque fill. Framer and Dia ship `backdrop-filter` on solid backgrounds, paying
  for a blur nobody can see. Above ~85% fill, use ≤ 4px or none (Arc's toasts: 85% and 3px).
- Tier glass by device: `assets/glass-tier.js` sets `data-glass-tier` to full, lite (one 8px blur) or
  flat (no blur, more tint) from device memory, Save-Data, a frame-rate probe (iOS Low Power Mode caps
  animation at 30fps on purpose) and Compute Pressure, the way Android, Fluent and Apple drop blur on
  weak or power-saving devices.
- Over video, don't blur the playing video: sample it into a tiny canvas (recipe 8b), and drop glass in
  fullscreen. Safari never passes video pixels to SVG filters.
- Backdrop root: a parent with `opacity < 1`, `filter`, a mask, `clip-path`, `mix-blend-mode`,
  `backdrop-filter` or `will-change` on any of those flattens glass inside it. That includes a Framer Motion
  parent fade and a goo `filter` on a parent of glass blobs. Fade the glass itself; clear reveal filters
  (`filter: none`) when they finish.
- `backdrop-filter` makes an element the containing block for `position: fixed` children: portal menus,
  toasts and dialogs out of glass containers.

## 5. Check it (required)

Run all of these before calling glass done:

1. **Frost probe.** Put bold red text behind every glass surface, capture at `deviceScaleFactor: 1`
   (headless Chromium at 2 fakes holes) and enlarge. Any sharp letter is a hole: a backdrop root, a stale
   Liquid Glass map, a missing prefix.
2. **Contrast, measured, on the worst backdrop:** `node <skill>/scripts/glass-contrast.mjs <url or file.html>`.
   Point it at the brightest realistic state, not the pretty default: the lightest photo, a daylight frame,
   an image pushed +2 EV, the white page section that scrolls under the bar (add URL parameters or a
   test state so the script can load it). On one editor the default photo passed at 8.7:1 and a bright
   frame failed at 4.4:1. Check phone width too (`--width 390 --height 844`). It hides the text,
   finds the brightest and darkest pixel under each line, and checks 4.5:1 (3:1 large) in three states:
   normal, tint-only (blur off, as iOS Low Power Mode shows it) and `prefers-contrast: more`. Fix failures
   by going a thickness up, raising the alpha in `--glass-dim` (e.g. `rgb(10 10 18 / 0.6)`), or moving text
   off the bright patch. Never put
   text-bearing glass over other text. Keep 44px targets on glass controls.
3. **Look:** does colour shift across the glass; is the rim lit on the light side; is the glass the most
   beautiful object in its frame; does the tinted level look intentional, not broken?
4. **Audit:** `node <skill>/scripts/blur-audit.mjs <folder | .css | .tsx | .html>`, and `--url` with the
   page running for blurred area and frame rate.
5. **Safari:** read computed styles in Playwright's WebKit, but judge the look in real Safari:
   Playwright's WebKit never paints `backdrop-filter` in screenshots, and it runs a newer WebKit than
   Sonoma's Safari, so it can't show the `var()` bug either (the audit's literal-filter check can).
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
- `assets/Glass.tsx`: React + Framer Motion wrapper (pointer sheen, `liquid`, `tinted`).
- `assets/liquid-glass.ts` / `.js`: Liquid Glass refraction with chromatic aberration.
- `assets/adaptive-tone.js`: light/dark flip for small glass from the luminance behind it.
- `assets/glass-tier.js`: full / lite / flat glass by device capability and power state.
- `references/recipes.md`: code for every effect. `references/research.md`: sources and what each
  established. `references/quirks.md`: browser and performance traps.
- `scripts/glass-contrast.mjs`: worst-case contrast in three states. `scripts/blur-audit.mjs`: static
  and live audit.

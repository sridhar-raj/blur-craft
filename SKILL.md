---
name: blur-craft
description: >-
  Make blur and glass look premium in UI: Apple-grade frosted glass (a five-layer material with a lit
  gradient rim, specular sheen that follows the pointer and a thickness scale), Liquid Glass edge
  refraction, light composed behind the glass, progressive blur under bars, focus blur behind dialogs,
  blur-in reveals and blur-bridged crossfades, glows, depth of field and ambient art backdrops. Ships a
  drop-in glass material (CSS + React/Framer Motion), a refraction helper and an audit script. Use this
  whenever a design involves glass, glassmorphism, frosted or translucent panels, backdrop-filter, blur,
  soft glows, bokeh, depth, a player/dock/toolbar/sheet floating over art or video, dimming behind a
  dialog, blur reveals, or a request to make something feel premium, layered, luminous or "Apple-like",
  and whenever reviewing or fixing a page that already uses blur, even if the user never says "blur".
---

# Blur craft

Most glass on the web looks cheap for the same three reasons: there is nothing interesting behind it,
the material is a single flat tint with one blur, and the text on it is a muddy grey. Glass that looks
expensive (Apple's materials, visionOS windows, the best product sites) gets three things right, in
this order:

1. **The light behind the glass is designed.** Glass shows off what sits behind it. Put a light source
   there on purpose (a glow, the sun in the art, the product's own colours, a live component) so colour
   shifts across the surface.
2. **The glass is a material, not a tint.** Five layers: heavy blur with high saturation, a gradient fill
   that catches light, a lit gradient rim, a specular highlight, and depth. That's
   `assets/glass.css`.
3. **Text on glass is vibrant.** Near-solid white for primary text, translucent white for secondary text,
   never a mid grey. Thicker glass under more text.

Do these three and blur stops reading as a template. The rest of this skill is when to use which blur,
and how to keep it fast.

## 1. Compose the light first

Before writing any glass, decide what will be directly behind it in the frame and make that the most
luminous thing on the page.

- **Place a light under the glass.** A warm glow, a gradient orb, the bright part of the art, a live
  OriginKit component. Without one, the glass blurs a flat colour, and a flat colour blurred is the same
  flat colour.
- **Let the light cross the edge.** The best glass sits half over the light and half over darkness, so
  the frosting shows a gradient of the scene across its width. A card that sits fully inside a uniform
  area reads as a grey box.
- **Take the light's colour and direction into the rim.** Set `--glass-light` to the scene's light
  (`"255 200 160"` for a sunset) and aim `--glass-rim-angle` at it. The rim's bright end sits on the side
  the light comes from:

  | Light comes from | top-left | top | top-right | right | bottom-right | bottom | bottom-left | left |
  |---|---|---|---|---|---|---|---|---|
  | `--glass-rim-angle` | 135deg | 180deg | 225deg | 270deg | 315deg | 0deg | 45deg | 90deg |

  A light *under* the glass (a dock over a glow) takes the angle of the edge it's nearest to, plus about
  15deg toward the centre. Raise `--glass-rim-hot` to 0.8–0.9 when the light is strong.
- **Give the glass room to be big.** Glass reads as a material when it's large enough to show the
  scene changing under it. A small chip of glass reads as a grey pill. The glass panel is usually the
  hero object of its screen; size it like one.

## 2. Build the material

Copy `assets/glass.css` into the section (rename the `glass` prefix to the section's own) and use it, or
use `assets/Glass.tsx` for the pointer sheen. Don't hand-write a one-line `backdrop-filter` card: that's
what makes glass look generic.

| Layer | What it does | Values the research supports |
|---|---|---|
| Backdrop | Frosts and enriches the scene | `blur(24–44px) saturate(160–180%) brightness(1.05)`. Saturation stops blurred colour going muddy (Comeau). More blur reads better over busy or moving backdrops (NN/g) |
| Fill | Catches light | A 160° gradient, `white / .16` → `white / .04`, over a dim layer of 10–50% black. A flat tint looks like plastic |
| Rim | Says "this is a slab of glass" | A 1px gradient ring via `mask-composite`, bright on the light side, dim on the far side |
| Specular | The glint | An inset 1px top highlight, plus a radial sheen that follows the pointer |
| Depth | Thickness and lift | A faint inner glow and a long soft drop shadow |

**Thickness** (from Apple's material scale): pick by how much the glass has to carry.

| Class | Blur, dim | Use for |
|---|---|---|
| `glass--clear` | 16px, 10% | Floating over rich media (photo, video, a live component) with little text: a play button, a dock, a pill |
| `glass--thin` | 24px, 20% | Controls and small cards; context stays visible |
| `glass--regular` | 32px, 30% | Players, panels, toasts: the default |
| `glass--thick` | 44px, 50% | Sheets, menus, dialogs: lots of text or a very bright backdrop |
| `glass--solid` | 20px, 92% | Trust-critical dialogs: payments, deletes, signatures |

Add `glass--light` to any of them for light glass over light scenes.

Apple's rule for clear glass over bright content: add a ~35% dark dimming layer. That's the dim value
above; raise it until the text passes.

**Calibrated presets by surface.** These are the values respected products actually ship (their CSS
and source, read for this skill), so start here rather than inventing numbers:

| Surface | Production reference | Start from |
|---|---|---|
| Sticky nav bar | Apple.com: `saturate(180%) blur(20px)` over 80% fill, 92%/88% fill without blur. Linear: `blur(20px)` over `#0b0b0bcc` | `thin` + `--glass-blur: 20px`, fill .8 for text-heavy bars; extended backdrop (recipe 1c) |
| Menu, popover, command bar | Linear `blur(32px)` over 90% fill; Raycast window `blur(36px)` over `#0009` with a 0.5px top highlight | `thick`, radius 12–16px |
| Floating panel or dock over art | Raycast action panel `blur(48px)`; Apple Liquid Glass (clear) | `regular` or `clear` + Liquid Glass |
| Dialog scrim (focus veil) | Material 3: scrim at 32%. Fluent Smoke: 30% black. Raycast: 60% black + `blur(2px)` | veil 30–35% + `blur(4–6px)` |
| Hover chip on an image | Linear `blur(8px)` over `#ffffff29` | `clear`, backdrop only on `:hover` |

**Two levels, like iOS 26.1.** After Liquid Glass shipped, readers struggled with text over photos
(NN/g, October 2025) and Apple added a Clear/Tinted switch: Tinted "increases opacity and adds more
contrast". `glass.css` has the same two levels. The tinted level turns on automatically for
`prefers-contrast: more` and `prefers-reduced-transparency`, and can be offered as a user setting with
`<html data-glass="tinted">`. **Safari ignores `prefers-reduced-transparency`**, so on iPhone and Mac
`prefers-contrast` is the signal that gets through.

**The brightness clamp.** Microsoft's Acrylic adds a "luminosity" layer that lets the backdrop's colour
through but blocks sharp light and dark (a white stripe, a shadow) behind text. The browser version that
works is `contrast(.7–.9)` in the backdrop filter (`--glass-contrast`, on by default for `regular` and
`thick`). A `mix-blend-mode: luminosity` child was tested and washes glass grey, so don't use it.

**Where glass belongs:** on the functional layer (navigation, toolbars, players, docks, sheets, popovers)
floating over content. Apple's HIG keeps it out of the content layer itself. Don't make every card in a
grid glass. One hero glass surface plus thinner supporting glass reads as designed. Six equal glass
cards read as a template.

**Match the register of the brief.** The brief's tone sets the theme and how loud the light is, not
this skill:

| Register | Ground | Light behind glass | Glass |
|---|---|---|---|
| Immersive (music, media, games, launches) | Dark | Strong, saturated, the art's own colours | `clear`/`regular`, Liquid Glass on the hero control |
| Calm (wellness, travel, creative tools) | Dark or light | Soft, one warm light and one cool counter-light | `regular` |
| Trusted (finance, health, legal, admin) | Light or quiet dark; follow the brand | Barely there: a faint brand tint, or none | `thick`, or `glass--solid` on anything that confirms money or data |

**Trust-critical surfaces stay nearly solid.** A dialog that sends money, deletes data or signs
something carries numbers people must read without doubt. Use `glass--solid` (92% fill with a light
blur and the rim): it still belongs to the glass family, but nothing behind it competes with the amount.
Put the focus veil behind it and keep the drama in the veil, not the dialog. A light, solid dialog over a
blurred page often reads as more trustworthy than a dark glass one.

## 3. The signature effects

Each has code in `references/recipes.md`. Reach for these when a brief calls for something more than a
panel:

- **Liquid Glass refraction** (`assets/liquid-glass.ts`): the rim bends the content behind it like a
  lens, as in Apple's Liquid Glass. It works in Chromium and falls back to frosted glass elsewhere. Use it
  on one hero control (a player, a dock, a big button), over a detailed backdrop where the bending
  shows: lines, type, a photo. Never on a dialog above a focus veil: the veil has already blurred away
  the detail the refraction would bend, so it costs a filter and shows nothing. `aberration: 0.6–1`
  adds the prism fringe at the rim (red bends least, blue most) that sells it as optics. Safari and
  Firefox don't run SVG backdrop filters (WebKit bug 245510, in review), so they get the frosted
  material, which is why the material has to look finished on its own.
- **Extended backdrop** for sticky bars (Comeau): the blur samples content *below* the bar too, so
  colour glows into the glass before content scrolls under it. That's the difference between a real
  frosted bar and a fake one.
- **Progressive blur** under bars and at scroll edges: content dissolves instead of being cut.
- **Blur-bridged crossfade** (Emil Kowalski): a `blur(2px)` during a swap makes two states read as one
  morph. Use it for tabs, number changes and icon swaps.
- **Blur reveal:** a headline or hero object resolves from `blur(8px)`, once, as the page's arrival
  moment.
- **Focus veil:** a dialog opens and the page behind it steps back 4–8px.
- **Depth of field:** near and far planes soft around a sharp subject, with rack focus on hover.
- **Ambient art backdrop:** a heavily blurred copy of the product's art washes the page in its colours.

## 4. Look at it, then fix it

Screenshot the page at the brightest moment of the backdrop and check each glass surface. First, prove
the glass frosts at all: temporarily put bold, high-contrast text (red, 30px) right behind every glass
surface and look at a 2× crop. Any letter that reads sharp is a hole in the material (a backdrop root, an
out-of-date Liquid Glass map, a missing prefix). A normal screenshot hides this; the probe takes a minute.
Then:

1. **Does colour visibly shift across the glass?** If it reads as one flat colour, move the glass over
   the edge of a light, or move the light.
2. **Is the rim lit on the light side?** Aim `--glass-rim-angle` at the light and raise `--glass-rim-hot`;
   set `--glass-light` to the scene's colour.
3. **Is it the most beautiful object in the frame?** Glass should be the hero, not a container. If the
   background outshines it, make the glass bigger or the backdrop calmer elsewhere.
4. **Is every word crisp and readable?** Measure the worst case, as WCAG's failure F83 does for text on
   images: find the brightest patch the backdrop can put behind light text (darkest for dark text),
   composite the glass over it, and check 4.5:1 for body text, 3:1 for large text. If it fails, go a
   thickness up or turn on `--glass-contrast`. Never put text-bearing glass over other text (the worst
   Liquid Glass failures were search bars over email previews). Controls on glass keep 44px targets.
5. **Does it still look right in the fallback?** Emulate reduced transparency (Playwright's context option
   doesn't cover it; use CDP: `const cdp = await page.context().newCDPSession(page); await
   cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value:
   "reduce" }] })`). The glass should become a good-looking solid panel, not a broken one. A faint radial
   in the light's colour keeps it from looking flat.

Then run the checker:
`node <this skill's folder>/scripts/blur-audit.mjs <folder, .css, .tsx or .html>`, and with the page
running, `… --url <page url>` for blurred area and frame rate.

## 5. Keep it fast (a guardrail, not the goal)

Design for the look first, then check these. They keep a section at 60fps without changing how it looks:

- Animate opacity and transform of blurred layers, not the blur radius, for anything long or looping.
  Short one-off moves are fine: Apple.com animates its menu curtain's `backdrop-filter` from `blur(0)` to
  `blur(20px)` over 320ms. Reveals (≤ 600ms) and the 2px crossfade also qualify.
- Never blur two stacked surfaces at once. Apple's nav drops its own `backdrop-filter` while a flyout is
  open and hands the blur to the flyout.
- A sticky or fixed blur re-runs on every scroll frame (it costs nothing at rest). Keep large ones to one
  per screen, and bake any big blurred image beneath it (recipe 8).
- Glass over a live WebGL component re-blurs every frame. Fine for a player or a panel. If the glass has
  to cover most of the frame, blur a still of the art instead.
- `filter: blur()` on big glows: prefer a `radial-gradient` when the shape is round.
- Backdrop root: a parent with `opacity < 1`, `filter`, a mask or `will-change` makes glass inside it go
  flat. Fade the glass itself, and clear reveal filters with `transitionEnd: { filter: "none" }`. See
  `references/quirks.md`.

## Tells to avoid

- Glass over a flat colour or a dark void: there's nothing to frost.
- One flat tint with a 1px white border at 10%: plastic, not glass.
- Mid-grey text on glass: use translucent white (vibrancy) instead.
- A grid of identical glass cards.
- Light blur (under ~14px) on a big panel with text over busy content: the detail shows through as
  noise. Go thicker. (Clear liquid glass with little text is the exception: there the bending is the point.)
- Random blurred blobs unrelated to the product's colours. Light behind glass should come from the scene.
- Glass panes edge to edge: Fluent warns they leave a visible seam. Leave a gap or merge them into one.
- Accent-coloured text or links on glass (Fluent): the backdrop shifts the hue. Use white or ink, and put
  colour in a solid chip.
- Glass inside glass. If a child needs its own blur, put the parent's blur on a `::before` layer
  (`inset: 0; z-index: -1; border-radius: inherit`), as Raycast does, so the parent isn't a backdrop root.

## Working with other skills and libraries

- **taste-skill** (if installed) bans glass outright. Keep its process and critique; this skill decides
  when glass has earned its place and how to make it look right.
- **React projects:** the recipes use Framer Motion. Plain HTML maps onto the Web Animations API (see
  the note at the top of `references/recipes.md`).
- **WebGL backgrounds** (OriginKit, shader gradients, three.js scenes) are the best light source to put
  behind glass: they move, so the frosting is alive. Mind the per-frame cost in section 5.

## Files

- `assets/glass.css`: the glass material: five layers, thickness scale, light and dark tones,
  vibrancy text, fallbacks.
- `assets/Glass.tsx`: React + Framer Motion wrapper with the pointer sheen and the optional `liquid` prop.
- `assets/liquid-glass.ts`: Liquid Glass edge refraction (an SVG displacement map applied through
  `backdrop-filter`, Chromium only, with a fallback).
- `references/recipes.md`: code for every effect in section 3.
- `references/research.md`: the sources and what each one established.
- `references/quirks.md`: browser and performance traps.
- `scripts/blur-audit.mjs`: static audit (CSS, TSX and `.html`) plus `--url` for a live check.

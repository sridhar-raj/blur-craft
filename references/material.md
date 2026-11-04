# The material, in detail

Why each value in glass.css is what it is, the production presets it was calibrated against, Apple's rules
from WWDC25 and how to match a brief's register. SKILL.md has the short version.

## What's in the material, and why

| Layer | Value | Source |
|---|---|---|
| Backdrop | Literal per variant: clear `blur(16px) saturate(180%)`, thin `blur(24px) … contrast(.92)`, regular `blur(32px) … contrast(.85)`, thick `blur(44px) saturate(160%) … contrast(.8)`, solid `blur(4px) saturate(140%)`; dark glass adds `brightness(.96)`, light `brightness(1.08)`; neutral is blur only | Saturation keeps colour alive (Comeau, Apple.com's 180%). Contrast < 1 is the working CSS form of Fluent's luminosity layer: colour through, harsh light and dark blocked. Brightness ≤ 1 so a bright backdrop isn't lifted behind white text |
| Fill | 160° white gradient over a dim layer | A flat tint reads as plastic (NN/g: gradient fills mimic reflection) |
| Grain | 2.5% noise | Fluent acrylic ships 2% |
| Rim | 1px gradient ring (mask-composite), bright toward the light | Edge = thickness |
| Specular | inset top line + a fixed sheen; the sheen follows the pointer only on interactive glass | Apple's highlights answer touching a *control*. On a static card a hover glow is a false "click me" (Vercel's guidelines: interactions change contrast, static things don't) |
| Text | primary 97%, secondary 82%, tertiary 70% white, faint halo | Measured; the halo follows Harrison & Vicente (CHI '96): an outline made 75–90% transparent menus read like 50% ones |
| Radius | `--glass-inner-radius = radius − padding` | Apple's concentricity rule: inner corners neither pinched nor flared |

## Windows High Contrast and print

 are handled by glass.css: forced colours turn glass into a solid
`Canvas` surface with a system edge, and print turns it into a plain bordered box.

## Big panels over a mixed backdrop: grade the dim, don't whiten it

When one large panel spans a bright area and a dark one (a sign-in across a horizon, with sky behind the
heading and grass behind the form), a single dim strong enough for the bright part makes the whole panel
heavy. Switching to light glass with dark ink fixes the contrast but turns the panel into a milky white sheet
that no longer reads as glass. Instead, keep dark glass with white text and grade the dim with the backdrop.
`--glass-dim` is the bottom background layer, so it accepts a gradient. Tint it with the scene's own colour,
not grey:

```css
.signin { --glass-dim: linear-gradient(180deg, rgb(26 40 20 / .74), rgb(26 40 20 / .6) 40%, rgb(26 40 20 / .5) 62%); }
```

Measured on the Esquisse sign-in in `assets/check-login.html`, the heaviest dim sits where the sky is brightest.
Inputs on it are recessed (`rgb(8 14 6 / .16)`), not lightened, because a white-washed field drops small
labels such as "Show" below 4.5:1 once the blur is off. The result is 4.97:1 in every state at four sizes, against
1.69:1 for the usual 15%-white recipe. Re-run `glass-contrast.mjs` after changing the stops: the gradient
is tied to the panel's height, and on a phone the layout moves the text.

## Two levels, like iOS 26.1

 Apple added Clear/Tinted after the Liquid Glass legibility backlash. The
tinted level adds an opaque layer *on top of* each surface's own dim, so it only ever raises opacity (a
component that set a darker dim stays darker). It turns on for `prefers-contrast: more`, for `prefers-reduced-transparency`, with
`glass--tinted`, or site-wide with `<html data-glass="tinted">` (offer it as a setting). **Safari ignores
`prefers-reduced-transparency`**; `prefers-contrast` is the signal that reaches iPhone and Mac users.

## Calibrated presets (production CSS and published tokens)

| Surface | Reference | Start from |
|---|---|---|
| Sticky nav | Apple.com `saturate(180%) blur(20px)` over 80%; Linear `blur(20px)` over `#0b0b0bcc` | `.gs-bar` |
| Menu / command bar | Linear `blur(32px)` over 90%; Raycast `blur(36px)`, 0.5px top highlight | `.gs-menu` |
| Translucent panel | Radix Themes `blur(64px)` over 70% white (the only big design system that ships a blur token) | `thick`, or a custom class with a literal `backdrop-filter: blur(64px) saturate(180%)` for very busy backdrops |
| Dialog scrim | Material 32%, Fluent Smoke 30%, Primer ~40%, Atlassian ~46%, Polaris 71% (no blur) | `.gs-veil`: 32% + 6px |
| Hover chip | Linear `blur(8px)` over `#ffffff29` | `clear`, blur on `:hover` only |

Most enterprise systems (Primer, Polaris, Carbon, Atlassian, Geist) use opaque surfaces over a scrim and
no blur at all, which says something: glass is a choice for the functional layer, not a default.

## Rules from Apple's WWDC25 sessions ("Meet Liquid Glass", "Get to know the new design system")

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

## Match the brief's register

 Immersive briefs (music, media, launches): dark ground, strong light in
the art's colours, clear glass and Liquid Glass on the hero control. Calm briefs (wellness, travel):
one warm and one cool light, regular glass. Trusted briefs (finance, health, admin): light or quiet dark,
barely any light behind, thick or solid glass on anything that confirms money or data. A light, solid
dialog over a blurred page reads as more trustworthy than dark glass.


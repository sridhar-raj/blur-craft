# Research behind this skill

What each source established, and where it shows up in the skill. Read this when a rule seems arbitrary
or when someone challenges a value.

## Apple Human Interface Guidelines: Materials (updated September 2025)
https://developer.apple.com/design/human-interface-guidelines/materials

- Materials let "color pass through from background to foreground" to set hierarchy. The point of glass
  is the colour of what's behind it.
- Two variants of Liquid Glass. **Regular** blurs and adjusts luminosity for legibility, for text-heavy
  components such as alerts, sidebars and popovers. **Clear** is highly translucent and only for
  components over visually rich backgrounds (photos, video). Over bright content, add a dark dimming
  layer of about 35%.
- Liquid Glass belongs to the functional layer (tab bars, sidebars, controls) floating over content, not
  the content layer. Use it sparingly on the most important functional elements.
- Standard materials run ultra-thin → thin → regular → thick: "thicker materials, which are more opaque,
  can provide better contrast for text"; "thinner materials … help people retain their context".
- Use vibrant colours (label, secondary, tertiary) on materials. Low-contrast labels on thin materials
  fail.

**In the skill:** the thickness scale, the dim layer, vibrancy text classes, glass on the functional
layer, one hero glass.

## Josh W. Comeau: Next-level frosted glass with backdrop-filter
https://www.joshwcomeau.com/css/backdrop-filter/

- `backdrop-filter` only samples pixels directly behind the element, which is why naive glass looks fake:
  real frosted glass picks up light from around it.
- **Extended backdrop:** a child at `height: 200%` that samples content below the bar, masked back to the
  bar's height, with `pointer-events: none`. A top gradient in the page colour stops edge flicker.
- **Glassy edge** (after Artur Bien): a thin strip under the bar with `blur(12px) brightness(120%)` reads
  as the thickness of the glass.
- Saturation counters the muddiness of blur (examples use `saturate(140%)`, and around 180% is common).
  A semi-opaque fill (about 50–60% on light glass) carries readability.
- Fallback: an `@supports` query plus a nearly opaque background.

**In the skill:** recipe 1c, `saturate(160–180%)` in the material.

## Nielsen Norman Group: Glassmorphism
https://www.nngroup.com/articles/glassmorphism/

- Glassmorphism works sparingly, for overlays over complex or colourful backgrounds.
- "More blur is generally better", especially over video, photography or animation, where the light
  blur of busy content distracts. Their examples run from 25px (edges still visible) to 100px.
- Low-opacity strokes suggest thickness. Gradient strokes and gradient fills mimic light reflecting off
  glass and add depth.
- Check contrast against the busiest parts of the backdrop. Honour reduce-transparency and
  increase-contrast settings by swapping to solid fills.

**In the skill:** heavier blur (24–44px) instead of a cap, the gradient fill and gradient rim, the
reduced-transparency fallback.

## kube.io: Liquid Glass in the browser (refraction with CSS and SVG)
https://kube.io/blog/liquid-glass-css-svg

- Refraction follows Snell's law across a curved bezel. A convex squircle profile
  `y = (1 − (1 − x)^4)^(1/4)` gives the smooth hand-off Apple's glass has.
- The displacement is baked into an image (red = x, green = y, 128 = neutral). `feImage` plus
  `feDisplacementMap` apply it, with `color-interpolation-filters="sRGB"` (linearRGB adds a phantom
  offset).
- It's applied with `backdrop-filter: url(#filter)`, which only works in Chromium. Elsewhere, fall back to
  layered blur.
- The map has to match the element's size, so it's rebuilt on resize. Animating `scale` is cheap.

**In the skill:** `assets/liquid-glass.ts` (simplified to a rounded rectangle), recipe 1b.

## Emil Kowalski: design engineering skill (emilkowalski/skills)
https://github.com/emilkowalski/skills

- When a crossfade still looks wrong after tuning easing and duration, add `filter: blur(2px)` during the
  transition: "blur bridges the visual gap by blending the two states together".
- Pair enter and exit with `scale(0.95–0.97)` and opacity. Keep blur under 20px for performance,
  especially in Safari.

**In the skill:** recipe 4b. This is the one place a small animated blur is the right tool.

## Community practice: aurora backgrounds, gradient rims, pointer light
(component libraries and tutorials: shadcn backgrounds, Framer marketplace, MengTo's skills)

- The look premium heroes share: a dark base, 2–4 blurred colour lights, glass for the text, grain on top
  against banding. Text never sits on the raw gradient.
- Gradient rims are drawn with a `::before` ring and `mask-composite: exclude`. Specular light follows the
  pointer through CSS variables.

**In the skill:** recipe 0 (light behind the glass), the rim and sheen layers of `glass.css`, recipe 10
(grain).

## What the first version of this skill got wrong (and why it lost an A/B test)

The first version capped glass at 12–24px, demanded a 45%+ flat tint, limited each screen to one small
glass surface and put performance first. Head to head on the same brief, a model with no skill produced
richer glass (28px, a sheen gradient, a large card over the sun's glow) than the skill did. The research
above contradicts every one of those caps: premium glass is heavy, saturated, gradient-lit and large, and
its legibility comes from vibrant text and thickness, not a muddy tint. Performance is a guardrail
checked after the look is right.

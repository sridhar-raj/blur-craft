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

## Microsoft Fluent Acrylic (WinUI source code)
https://github.com/microsoft/microsoft-ui-xaml/tree/main/controls/dev/Materials/Acrylic

- Constants in `AcrylicBrush.h`: blur 30, noise opacity 2%, default tint white at 80%.
- Current pipeline (`AcrylicBrush.cpp`): an opaque fallback under the backdrop, then Gaussian blur 30,
  then a **luminosity blend** with a solid colour, then a colour blend with the tint, then 2% tiled noise.
- The luminosity layer "takes the color (Hue and Saturation) values from our blurred backdrop, but gets
  the lightness (Luminosity) value from a solid color layer… to reduce contrast", added because shadows
  showed through as "a dark blur".
- Shipped dark in-app acrylic: tint `#2C2C2C`, tint opacity 0.15, luminosity opacity 0.96. Smoke (modal
  scrim) is `#4D000000` (30% black).
- Docs: acrylic goes solid with transparency off, in Battery Saver and on low-end hardware. Don't put
  panes edge to edge (seam). Don't put accent-coloured text on acrylic.
- **Tested here:** a `mix-blend-mode: luminosity` child over a `backdrop-filter` washes the glass grey in
  Chromium, so the luminosity layer can't be reproduced that way. `contrast(.7–.9)` in the backdrop
  filter gives the same "colour through, sharp light/dark blocked" result (`--glass-contrast`).

## Production CSS (read from the shipped stylesheets, November 2026)

- **Apple.com global nav:** `saturate(180%) blur(20px)` over `rgba(250,250,252,.8)` / `rgba(22,22,23,.8)`;
  92%/88% without blur support. The flyout curtain animates `backdrop-filter` from `blur(0)` to
  `blur(20px)` over 320ms. While a flyout is open the nav drops its own blur.
- **Linear:** header `blur(20px)` over `#0b0b0bcc` with `isolation: isolate`; menus `blur(32px)` over 90%
  fill, `1px #ffffff14` border, radius 14px; glass variant `blur(24px)` over `#ffffff1a`.
- **Raycast:** window `blur(36px)` over `#0009`, `inset 0 .5px #ffffff4d` top highlight; panels
  `blur(48px)`; puts blur on `::before { z-index: -1 }` so children can have their own blur.
- **Material 3:** dialog scrim at 32%. **Android window blur:** 80px "frosted glass", 20px blur-behind,
  dim 0.1 with blur and 0.4 without, avoid radii above 150px.
- Pattern: nav bars ≈ 20px blur + 180% saturation over 80% fill; dark product menus 24–48px over 60–90%
  fill; marketing overlays 2–5px over a heavy scrim.

## Liquid Glass on the web, advanced
- **Filter order (CSS Filter Effects 2 spec):** "The first filter function or reference uses the Backdrop
  Root Image as input. Each later step uses the previous output." So `url(#refract) blur()` bends the
  sharp backdrop and then softens it. https://drafts.csswg.org/filter-effects-2/
- **Chromatic aberration** (rdev/liquid-glass-react): three `feDisplacementMap` passes at slightly
  different scales, channels isolated with `feColorMatrix`, recombined with `feBlend mode="screen"`.
  https://github.com/rdev/liquid-glass-react
- **Safari:** `backdrop-filter: url()` paints nothing (WebKit bug 245510; patches in review as of
  September 2026). backdrop-filter with `mask-composite: exclude` on the same element failed in Safari
  17.6 (bug 279115), which is why the rim lives on a pseudo-element.

## Accessibility and the Liquid Glass backlash
- `prefers-reduced-transparency`: Chromium 118+, Firefox behind a flag, **not Safari** (WebKit 175497).
  `prefers-contrast` works in Chrome 96, Firefox 101 and Safari 14.1.
  https://web-platform-dx.github.io/web-features-explorer/features/prefers-reduced-transparency
- WCAG has no translucency rule. Failure F83 says to test text over images against the lightest (or
  darkest) area behind it. APCA was pulled from WCAG 3 drafts; WCAG 2 ratios stay normative.
  https://www.w3.org/WAI/WCAG22/Techniques/failures/F83
- NN/g, "Liquid Glass Is Cracked, and Usability Suffers in iOS 26" (October 2025): text over photos,
  Mail's search bar over previews, controls fading into the background, small targets.
  https://www.nngroup.com/articles/liquid-glass/
- iOS 26.1 added Clear/Tinted Liquid Glass; Tinted "increases opacity and adds more contrast".
  https://tidbits.com/2025/10/21/ios-26-1-to-add-optional-opacity-to-liquid-glass/

**In the skill:** the calibrated presets table, `--glass-contrast`, the tinted level and its media
queries, the 2.5% noise layer, `aberration`, the worst-case contrast check, and the tells about seams,
accent text and glass in glass.

## What the first version of this skill got wrong (and why it lost an A/B test)

The first version capped glass at 12–24px, demanded a 45%+ flat tint, limited each screen to one small
glass surface and put performance first. Head to head on the same brief, a model with no skill produced
richer glass (28px, a sheen gradient, a large card over the sun's glow) than the skill did. The research
above contradicts every one of those caps: premium glass is heavy, saturated, gradient-lit and large, and
its legibility comes from vibrant text and thickness, not a muddy tint. Performance is a guardrail
checked after the look is right.

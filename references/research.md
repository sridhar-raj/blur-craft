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
  filter gives the same "colour through, sharp light/dark blocked" result (the literal `contrast(.8–.92)`
  in each thickness filter).

## Production CSS (read from the shipped stylesheets, November 2026)

- **Apple.com global nav:** `saturate(180%) blur(20px)` over `rgba(250,250,252,.8)` / `rgba(22,22,23,.8)`;
  92%/88% without blur support. The flyout curtain keeps a fixed `blur(20px)` over `rgba(232,232,237,.4)`
  (dark: `rgba(0,0,0,.4)`) and transitions only its opacity, over 320ms with an 80ms delay; below 833px it
  has no blur. While a flyout is open the nav drops its own blur. (Re-read November 2026 from
  globalheader.css; an earlier note here said the blur radius animated. It doesn't.)
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
  sharp backdrop and then softens it. In practice Chromium left the displaced bezel unblurred with that
  chain, so liquid-glass.ts blurs inside the SVG filter instead (see its header and quirks.md). https://drafts.csswg.org/filter-effects-2/
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

**In the skill:** the calibrated presets table, the `contrast()` clamp in the thickness filters, the tinted level and its media
queries, the 2.5% noise layer, `aberration`, the worst-case contrast check, and the tells about seams,
accent text and glass in glass.

## Apple WWDC25 sessions (transcripts)
- "Meet Liquid Glass" (219): lensing "dynamically bends, shapes, and concentrates light"; highlights move
  with interactions and device motion; shadows grow over text and fade over light solids; "Small elements…
  flip from light to dark… Bigger elements, like menus and sidebars… do not flip"; larger glass simulates
  thicker material; regular and clear "should never be mixed", clear needs a dimming layer and bold,
  bright content; "always avoid glass on glass"; tint only primary elements; avoid content intersecting
  glass at rest. https://developer.apple.com/videos/play/wwdc2025/219/
- "Get to know the new design system" (356): soft scroll edge for glass controls, hard for pinned headers,
  one per view, "not decorative"; concentric radii (inner = outer − padding); group bar items by
  function; apply the material to the control, not its inner views; typography "bolder" for legibility.
  https://developer.apple.com/videos/play/wwdc2025/356/
- SwiftUI docs: limit simultaneous glass effects; group them in containers so shapes can merge.

## Design-system tokens
- Radix Themes 3.2.1: translucent panels `blur(64px)` over `rgba(255,255,255,.7)` (light), blur on a
  `::before` so children aren't trapped; P3 alpha scales. https://unpkg.com/@radix-ui/themes@3.2.1/styles.css
- Scrims without blur: Primer `#c8d1da66`/`#21283066`, Polaris `rgba(0,0,0,.71)`, Carbon
  `rgba(0,0,0,.6)`, Atlassian `#050C1F75`. Geist publishes radii only (6/12/16px), no glass values.

## Adaptive tone, modern CSS, performance, legibility
- `contrast-color()` is Baseline 2026 but only takes a known colour; it can't sample a backdrop. Lea Verou's
  OKLCH threshold (0.623 WCAG-safe, ~0.70 APCA) works today. https://lea.verou.me/blog/2024/contrast-color/
- Scroll-driven animations: Chrome 115, Safari 26, Firefox 159. Scroll-state queries (`stuck`): Chrome 133.
- Safari 26 tints its toolbar from a fixed or sticky element at the top edge (WebKit bug 301756): give a
  glass nav a real background colour. https://bugs.webkit.org/show_bug.cgi?id=301756
- WebKit 271340: a backdrop-filter adds a full-screen compositing layer unless `html` has an opaque
  background (fixed 2024). https://bugs.webkit.org/show_bug.cgi?id=271340
- Measured on a Galaxy A15 (Mali-G57): seven `blur(18px)` panels cost ~3.5ms/frame, 75–80% of frames on
  time vs 98.9% without. https://github.com/Station-Sciences/bot-crossing/issues/74
- Skia downsamples blurs past a small sigma (`kMaxLinearBlurSigma = 4`), so cost is dominated by area and
  count rather than radius. https://skia.googlesource.com/skia/+/chrome/m118/src/gpu/BlurUtils.h
- Harrison & Vicente, CHI '96: an anti-interference outline let 75–90% transparent menus perform like 50%
  ones; interference is worst when background and text are close in shade.
- Progressive blur in CSS: `linear-blur()` proposed (csswg #13285, open). Stacked masked layers remain the
  technique. https://github.com/w3c/csswg-drafts/issues/13285

**In the skill:** the WWDC25 rules list, adaptive-tone.js, the scrim column of the presets, the
`gs-bar--on-scroll` option, the Safari toolbar note, the `html` background rule, the phone budget, the
text halo, concentric radii, and the registered rim angle.

## Calibration (this skill's own measurements)
Thickness dims, text alphas and backdrop brightness in glass.css were set by running
`scripts/glass-contrast.mjs` on `assets/demo.html` (a bright warm light under every surface) across all
thicknesses, both tones and three states. Regular and thick pass 4.5:1 everywhere; thin and clear don't
over the brightest light, which matches Apple's guidance that clear glass is for bold content only. Run
over the four A/B example pages, the checker also failed small secondary text that agents had judged
readable by eye, which is why it's now a required step.

## Round 3: corrections, interaction, mobile, video, testing, award sites

**Corrections to earlier rounds**
- `var()` inside `backdrop-filter` **fails in Safari on macOS Sonoma** (WebKit 297620, open). The report's
  matrix: broken in Safari 18.6, 26.1 and Technology Preview on macOS 14; fine in 18.6 on macOS 15 and 26 on
  macOS 26. So it follows the OS, not the WebKit version. An earlier note here said it worked, based only on
  a newer WebKit. Fixed: literal filters everywhere. https://bugs.webkit.org/show_bug.cgi?id=297620 (related:
  289800, "-webkit-backdrop-filter ignores css variables")
- iOS Low Power Mode: the only documented effect on web pages is the 30fps cap on animation and rAF (WebKit
  215745, closed as intended). Nothing documents it removing `backdrop-filter`; an earlier round said it
  did. Reduce Transparency is the setting that removes blur, in system UI, and pages can't read it in Safari.
- Arc "85% black, 3px blur": no source could be found for these values on any Arc surface; removed.
- Firefox 1782876 (backdrop-filter under a parent with transform/opacity/clip-path/mask) closed as
  WORKSFORME on 2026-07-30.
- The "Chrome 142 lets overflow:hidden clip extended backdrops" claim couldn't be found in any release note
  or CL: removed. Firefox did fix backdrop-filter ignoring a parent's `overflow: hidden` in 139.
- Firefox 159 (2026-10-27) ships scroll-driven animations; `contrast-color()` is Chrome 147, Firefox 146,
  Safari 26; `mix-blend-mode: plus-lighter` is Chrome 100, Firefox 99, Safari 9.1 (BCD).
- `prefers-reduced-transparency` is still absent in Safari, even with iOS 27's Liquid Glass slider (Apple
  retreated toward more diffusion and user control; the web can't read the setting).

**Interaction and merging**
- Apple's API: `Glass.interactive()`, `GlassEffectContainer(spacing:)` (shapes merge within the spacing;
  samples use 40), `glassEffectUnion`, `.matchedGeometry` vs `.materialize` transitions. No published
  durations or scales. https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views
- Cursor.com (live bundle): `layoutId` morph at 0.34s `[0.32, 0.72, 0, 1]`, press = inset glow pulse;
  light `blur(14px) saturate(1.45)` 42→20→10% white, dark `blur(18px) saturate(1.2)` 11→7→3.5% white.
- Goo filter: Lucas Bebber, CSS-Tricks (`18 -7` alpha matrix). Tested for this skill as a mask *image* on
  one glass layer: shapes 8px apart merge; an inline `mask: url(#id)` rendered nothing.
- Aave, "Building Glass for the Web": regenerate displacement maps only on shape change, compute one
  quadrant and mirror, a fresh filter id per update for Safari's cache, WebGL for glass over video.
  https://aave.com/design/building-glass-for-the-web

**Mobile, tiers, video**
- `backdrop-filter` creates a containing block for fixed descendants (MDN).
- iOS Low Power Mode throttles rAF to 30fps by design (WebKit 215745), its only documented web effect; `deviceMemory` and `saveData` are
  Chromium-only; Compute Pressure is Chrome 125+. https://developer.chrome.com/docs/web-platform/compute-pressure
- iOS 26 floating toolbar behaviour (scrims, sheets, safe-area): empirical spike,
  https://stevenocchipinti.github.io/liquid-glass-spike
- YouTube-style ambient glow: 10×6 canvas, `requestVideoFrameCallback`.
  https://www.smashingmagazine.com/2023/07/recreating-youtube-ambient-mode-glow-effect/

**Testing**
- axe-core has no model of `backdrop-filter`; glass over images returns incomplete (`bgImage`,
  `bgOverlap`). https://github.com/dequelabs/axe-core
- Playwright snapshots: `stylePath` to freeze noise, `maxDiffPixelRatio` per region, per-OS baselines.

**Award-level and production sites (live CSS, Nov 2026)**
- Fluid Glass (Awwwards SOTD, March 2026): one blur (`2rem`) everywhere, two tints, glass only on cursor
  and pill buttons over architecture photography.
- Secret Level: `filter: url(#glass-distortion)` + `backdrop-filter: blur(8px) brightness(1.2)
  saturate(1.2)`; turbulence + specular lighting + three displacement passes for aberration.
- Failures: Framer cards and Dia's nav blur under opaque backgrounds; Tailwind v4 glass breaking on
  Sonoma; many award sites do "glass" in WebGL, not CSS, and keep CSS glass for chrome.

**In the skill:** literal filters, the var() and wasted-blur lints, glass-tier.js, recipes 4c, 8b, 11 and
12, the containing-block and iOS toolbar quirks, the testing notes, and solid glass at 4px.

## Trigger test (does the skill load when it should?)

Ten real prompts through `claude -p`, checking for an actual Skill call (or a read of SKILL.md): six that
should load it (a "flat and cheap" settings sidebar, a backdrop-filter review, a blurred-dialog plan, a
Tailwind blur missing in Safari, a Liquid Glass video dock, unreadable translucent toasts) and four
near-misses that shouldn't (a Pillow image blur, a text-shadow, a z-index bug, a Blender glass bottle).
First run: 9/10, missing the sidebar prompt, which never says "glass" or "blur". After naming
sidebars/panels and macOS/iOS/visionOS-style requests in the description: the sidebar prompt loaded the
skill 3/3 times and all four near-misses still stayed away.

## Own measurement: what blur actually costs

Chromium with `--disable-gpu` (software compositing, so blur cost becomes dropped frames), vsync on,
1600×900 at 2×, a rotating striped backdrop that forces a re-blur every frame, 240 frames per run, two runs:
no blur 60fps; one surface at 30% area: 60fps at every radius from 4 to 64px; 30% total area split into
1, 4 or 9 surfaces: 60fps; one surface at 60% area: 59fps; at 90%: 51fps, p95 33.4ms. Area is the cost
driver; radius and count barely register. (An earlier attempt with the frame cap removed measured nothing
and was discarded.)

## Round 4: forced colors, capture, Tailwind, theming, native, a same-design A/B

- CSS Color Adjust 1: forced colours force background-color (alpha kept), strip box-shadow, text-shadow and
  non-url background images; the spec doesn't mention backdrop-filter, and Chromium keeps it (measured).
  https://www.w3.org/TR/css-color-adjust-1/ · Edge guidance:
  https://blogs.windows.com/msedgedev/2020/09/17/styling-for-windows-high-contrast-with-new-standards-for-forced-colors/
- Capture tools: html2canvas lists filters as unsupported (https://html2canvas.hertzen.com/features);
  html-to-image #447; Satori renders backdrop blur as a black slab with resvg (measured); Chromium PDF drops
  the blur (measured); Firefox Screenshots bug 1657997.
- Tailwind 4.3.3 (compiled for this skill): `backdrop-blur-*`, arbitrary values included, emit a var()
  chain; `@utility` with `--value(integer)` emits literals. Sonoma breakage reported in Tailwind discussion
  #16019. https://github.com/tailwindlabs/tailwindcss/discussions/16019
- `light-dark()` tokens registered as `<color>` freeze at the root scheme (Chrome 156 measured; WebKit
  282057, Mozilla 1924562, CSSWG #13836).
- A standing `view-transition-name` on an ancestor flattens child glass in Chrome 156 (measured; seen in
  production, evesynapse PR #331).
- Native: SwiftUI `glassEffect`/`GlassEffectContainer` (iOS 26), Flutter `BackdropGroup` +
  `BackdropFilter.grouped` (3.29), Expo `BlurView` (`blurMethod`, `BlurTargetView` on Android), Haze for
  Compose (2.x: `hazeBlur`/`hazeGlass`; 1.2–1.7: `hazeSource`/`hazeEffect`). See native.md.
- drei `MeshTransmissionMaterial` defaults, for the WebGL threshold (recipe 12a).

**Same-design A/B (examples/same).** One fixed page; only the glass stylesheet changed. Without a skill:
looked close to blur-craft's but failed one line with the blur off (3.66:1) and wrote the prefix first. A
generic public glassmorphism skill (flat 15% white, white text): 7 lines failing in every state (1.35:1).
With blur-craft: 5.69 / 4.54 / 7.32, all passing. All three blurred. The lesson recorded: on a fixed design,
a capable model gets most of the *look* alone; the skill's value is legibility that survives the blur
turning off, Safari safety and fallbacks, which no screenshot shows.

## Photo-editor test (v4 → v5)
A fresh build of a photo editor with v4 passed every check, and the no-skill baseline failed six lines
in the blur-off state (lowest 3.35:1) despite its author estimating ~6:1. The v4 build exposed: a tinted
level that could *lower* a component's dim (now an additive layer), a checker that checked nothing when
phones drop the blur (now finds glass by class and warns on zero lines), a slow live veil over glass
chrome (now `gs-veil--flat` + `.gs-modal-open`), no neutral glass for colour-critical apps
(`glass--neutral`), and a white top fill strong enough to fail on bright photos (0.16 → 0.12).

## What the first version of this skill got wrong (and why it lost an A/B test)

The first version capped glass at 12–24px, demanded a 45%+ flat tint, limited each screen to one small
glass surface and put performance first. Head to head on the same brief, a model with no skill produced
richer glass (28px, a sheen gradient, a large card over the sun's glow) than the skill did. The research
above contradicts every one of those caps: premium glass is heavy, saturated, gradient-lit and large, and
its legibility comes from vibrant text and thickness, not a muddy tint. Performance is a guardrail
checked after the look is right.

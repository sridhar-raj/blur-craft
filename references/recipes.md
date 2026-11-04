# Blur recipes

Code for each effect in SKILL.md. Class names use a `bc-` placeholder prefix: rename them to the
section's own prefix. React snippets assume `"use client"` and `framer-motion` (12+). Numbers are starting points; tune them by eye on a screenshot.

**Plain HTML (no React):** every Framer Motion recipe maps onto the Web Animations API. For example, the
blur reveal becomes
`el.animate([{ opacity: 0, filter: "blur(8px)", transform: "translateY(10px)" }, { opacity: 1, filter: "blur(0px)", transform: "none" }], { duration: 600, easing: "cubic-bezier(.2,.8,.2,1)", delay: i * 45, fill: "backwards" })`.
`fill: "backwards"` holds the hidden first frame during the delay (no flash), and when the animation ends
the element returns to its stylesheet state, where `filter` is already `none`. The crossfade is the same
with 2px and 200ms.

0. Light behind the glass (do this first)
1. Glass surface (assets/glass.css, assets/Glass.tsx)
1b. Liquid Glass refraction (assets/liquid-glass.ts)
1c. Extended-backdrop sticky bar
2. Progressive blur
3. Focus veil
4. Blur reveal
4b. Blur-bridged crossfade
4c. Glass morph and press (Cursor's production values)
5. Glow
6. Depth of field
7. Velocity motion blur
8. Art backdrop
8b. Ambient glow from video
9. Locked content
10. Grain
11. Merging glass shapes (Liquid Glass merge)
12. Tinting glass with colour

---

**Read only the recipe you need.** Each effect is its own file in `recipes/` (a typical build needs one to
three). The numbers are the IDs used across the skill ("recipe 8b").

| # | Effect | File |
|---|---|---|
| 0 | Light behind the glass | `recipes/00-light-behind-the-glass.md` |
| 1 | Glass surface | `recipes/01-glass-surface.md` |
| 1b | Liquid Glass refraction | `recipes/01b-liquid-glass-refraction.md` |
| 1d | Liquid Glass in every browser (WebGL, over a known backdrop) | `recipes/01d-liquid-glass-in-every-browser.md` |
| 1c | Extended-backdrop sticky bar | `recipes/01c-extended-backdrop-sticky-bar.md` |
| 2 | Progressive blur | `recipes/02-progressive-blur.md` |
| 3 | Focus veil | `recipes/03-focus-veil.md` |
| 4 | Blur reveal | `recipes/04-blur-reveal.md` |
| 4b | Blur-bridged crossfade | `recipes/04b-blur-bridged-crossfade.md` |
| 4c | Glass morph and press | `recipes/04c-glass-morph-and-press.md` |
| 5 | Glow | `recipes/05-glow.md` |
| 6 | Depth of field | `recipes/06-depth-of-field.md` |
| 7 | Velocity motion blur | `recipes/07-velocity-motion-blur.md` |
| 8 | Art backdrop | `recipes/08-art-backdrop.md` |
| 8b | Ambient glow from video | `recipes/08b-ambient-glow-from-video.md` |
| 9 | Locked content | `recipes/09-locked-content.md` |
| 10 | Grain | `recipes/10-grain.md` |
| 11 | Merging glass shapes (Liquid Glass merge) | `recipes/11-merging-glass-shapes.md` |
| 12a | When to use WebGL glass instead | `recipes/12a-when-to-use-webgl-glass-instead.md` |
| 12 | Tinting glass with colour | `recipes/12-tinting-glass-with-colour.md` |

# blur-craft

An agent skill (for Claude Code, Cursor and other agents that read `SKILL.md`) that makes blur and
glass in UI look premium instead of generic.

Most glass on the web looks cheap for three reasons: nothing interesting sits behind it, the material is
one flat tint with one blur, and the text on it is a muddy grey. This skill teaches the agent the three
things Apple-grade glass gets right, gives it a drop-in material to build with, and checks the result.

![Same brief, without the skill (top) and with it (bottom)](examples/stillwater-without-vs-with.png)

*Same brief, same model. Top: without the skill. Bottom: with it. The glass picks up the sunset behind
it, the rim glows on the sun's side, and the horizon bends through the card's lower edge.*

## Install

```bash
npx skills add sridhar-raj/blur-craft
```

Or copy this folder into `.claude/skills/blur-craft/` (Claude Code) or your agent's skills directory.

The skill triggers on its own whenever a design involves glass, frosted panels, `backdrop-filter`,
glows, depth, blur reveals, or a request to make something feel premium or "Apple-like".

## What's inside

| Path | What it is |
|---|---|
| `SKILL.md` | The method: compose the light behind the glass, build the material, choose thickness and register, five look-checks |
| `assets/glass.css` | The glass material: five layers (saturated blur, gradient fill, lit gradient rim, specular sheen, depth), a thickness scale (`clear`, `thin`, `regular`, `thick`, `solid`), light and dark tones, vibrancy text, fallbacks |
| `assets/Glass.tsx` | React + Framer Motion wrapper with a sheen that follows the pointer and an optional `liquid` prop |
| `assets/liquid-glass.ts` | Liquid Glass edge refraction: an SVG displacement map applied through `backdrop-filter` (Chromium), with a frosted fallback elsewhere |
| `references/recipes.md` | Code for light-behind-glass, extended-backdrop sticky bars, progressive blur, focus veils, blur reveals, blur-bridged crossfades, glows, depth of field, motion blur, ambient art backdrops, locked content, grain |
| `references/research.md` | The sources behind every number, and what an earlier version got wrong |
| `references/quirks.md` | Browser traps: the backdrop root, Safari prefixes, clipped glows, banding, WebGL, video capture |
| `scripts/blur-audit.mjs` | Audit for CSS, TSX and HTML files, plus `--url` for a live check of blurred area and frame rate (uses Playwright if the project has it) |

![Old single-tint recipe vs the glass material](examples/material-old-vs-new.png)

![Liquid Glass refraction: the rim bends the grid like a lens](examples/liquid-glass-refraction.png)

## How it was built

An earlier version of this skill lost a blind A/B test to a model with no skill at all: it capped blur,
used a flat tint and put performance first, so its glass came out flatter. It was rewritten from
research and re-tested until the skill version won:

- [Apple Human Interface Guidelines: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Josh W. Comeau: Next-level frosted glass with backdrop-filter](https://www.joshwcomeau.com/css/backdrop-filter/)
- [Nielsen Norman Group: Glassmorphism](https://www.nngroup.com/articles/glassmorphism/)
- [kube.io: Liquid Glass in the browser](https://kube.io/blog/liquid-glass-css-svg)
- [Emil Kowalski: design engineering skills](https://github.com/emilkowalski/skills)

The two Stillwater pages in `examples/` are the actual A/B outputs. Open them in Chrome to see the
motion and the refraction.

## Quick start without an agent

```html
<link rel="stylesheet" href="assets/glass.css">

<div class="glass glass--regular" style="--glass-light: 255 200 160; --glass-rim-angle: 40deg">
  <p class="glass-tertiary">Now playing</p>
  <h3 class="glass-label">Evening wind-down</h3>
  <p class="glass-secondary">12 min · Guided</p>
</div>
```

Put a light source (a glow, an image, a WebGL background) half under the glass. That matters more than
any value in the CSS.

## License

MIT

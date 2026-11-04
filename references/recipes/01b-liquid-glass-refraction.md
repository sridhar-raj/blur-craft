# Recipe 1b: Liquid Glass refraction

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

The rim bends the scene behind it like a lens (Apple's Liquid Glass). Chromium applies an SVG
displacement map through `backdrop-filter`; every other browser keeps the frosted material.

```tsx
<Glass thickness="clear" liquid={{ bezel: 26, strength: 40, blur: 2, aberration: 0.8 }} className="bc-dock">   {/* clear dock */}…</Glass>
```

Or without React: `mountLiquidGlass(el, { bezel: 26, strength: 40, blur: 2 })` from
`assets/liquid-glass.ts` (rerun it on resize).

- Refraction only shows over detail: lines, type, photos, a grid, a live component. Over a smooth gradient
  it's invisible, so use plain glass there.
- Liquid glass *replaces* the material's backdrop blur with its own filter, so `blur` is the whole
  frosting, applied inside the SVG filter before the bend: 0–6 for clear Liquid Glass (the bend is
  visible; a word or an icon on it), 12–20 for frosted (frosts edge to edge; the bend softens into a
  colour shift at the rim).
- Keep text a bezel-width inside the edge, or use a narrower `bezel` (12–16) on surfaces with text.
- Refraction shows where the rim crosses detail. Place the glass so its edge overlaps a horizon, lines,
  type or a component, not only smooth sky.
- `strength` 30–50. Above ~60 the content tears at the rim.
- `aberration` 0.6–1 adds a prism fringe at the rim. It's off by default; use it on the one hero element.
- `clamp` (default on) appends `contrast(0.8) brightness(0.92)`, so a white stripe behind the glass can't
  blow out the text.
- Use it on one hero element. The map is rebuilt on every resize.

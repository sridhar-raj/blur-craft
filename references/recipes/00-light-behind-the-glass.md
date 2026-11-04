# Recipe 0: Light behind the glass

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

Glass is only as good as what's behind it. Compose a light source that the glass half-covers, so the
frosting shows a gradient of colour across its width and the rim catches it.

```tsx
<div className="bc-stage">
  {/* the light: the scene's own colours, placed where the glass's leading edge will sit */}
  <motion.div
    className="bc-light"
    aria-hidden
    animate={{ x: [0, 24, 0], y: [0, -12, 0], scale: [1, 1.05, 1] }}
    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
  />
  <Glass thickness="regular" light="255 196 150" className="bc-player">…</Glass>
</div>
```

```css
.bc-stage { position: relative; display: grid; place-items: center; }
.bc-light {
  position: absolute;
  width: 46%; aspect-ratio: 1;
  left: 50%; top: 50%; translate: -15% -55%;          /* off-centre: half under the glass, half out */
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, #ffd2a1, #ff7a6b 40%, #7b4dff 72%, transparent 74%);
  filter: blur(6px);                                   /* soft edge; the glass does the real frosting */
}
```

- The light is the scene's subject in disguise: the sun of a landscape, the album art's colours, a live
  OriginKit component (Liquid Marble Flow, Silk Current, Cobalt Sprite), the product's accent.
- One dominant light plus one small counter-colour (a teal under a warm sun) gives the glass a gradient
  instead of a tint.
- Over a live WebGL component the component *is* the light; just place the glass over its brightest part.

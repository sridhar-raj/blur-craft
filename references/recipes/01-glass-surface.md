# Recipe 1: Glass surface

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

Use the material in `assets/glass.css`. It's the five-layer stack: backdrop, gradient fill, gradient rim,
specular, depth. Don't hand-write a single-tint card.

```tsx
import { Glass } from "./Glass";          // copied from assets/Glass.tsx; import glass.css once

<Glass thickness="regular" light="255 196 150">
  <p className="glass-tertiary">Now playing</p>
  <h3 className="glass-label">Evening wind-down</h3>
  <p className="glass-secondary">12 min · Mara Lindqvist</p>
</Glass>
```

Plain CSS: `<div class="glass glass--regular" style="--glass-light: 255 196 150">`.

Tuning:
- Thickness by content: `clear` (media controls, little text), `thin`, `regular` (default), `thick`
  (sheets, menus, lots of text).
- `--glass-light` is the colour the rim and sheen glow with. Take it from the light behind the glass.
- Text uses `.glass-label` / `.glass-secondary` / `.glass-tertiary` (translucent white, the web version of
  Apple's vibrancy). Mid-grey text on glass is what makes it look dirty.
- Radius scales with size: 14–18px for chips and toasts, 24–32px for panels, a full pill for docks and
  players.
- Animate the glass element's own opacity/transform. A fading parent makes it go flat until the fade ends
  (backdrop root, see quirks.md).

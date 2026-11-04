# Recipe 3: Focus veil

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

When a dialog opens, or one card is selected, everything else steps back. Keep the radius fixed and
animate the veil's opacity, which is far cheaper than animating `filter` on the whole page.

```tsx
import { AnimatePresence, motion } from "framer-motion";

export function FocusVeil({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="veil"
          className="bc-veil"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
        />
      )}
    </AnimatePresence>
  );
}
```

```css
.bc-veil {
  position: absolute;      /* or fixed for a full page */
  inset: 0;
  z-index: 20;             /* the dialog sits above this */
  background: rgb(8 8 12 / 0.32);   /* Material 3's scrim; surfaces.css .gs-veil */
  backdrop-filter: blur(6px) saturate(0.9);
  -webkit-backdrop-filter: blur(6px) saturate(0.9);
}
```

- 4–8px. Enough that the background reads as "not now", not so much that the user loses their place.
- For a selected card inside a grid, scale the *other* cards to 0.98 and fade them to 0.6 alongside the
  veil, so the focus reads even where the blur is subtle.
- Reduced transparency: drop the backdrop blur and raise the veil alpha to 0.6.

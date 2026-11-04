# Recipe 4b: Blur-bridged crossfade

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

When one state swaps for another (a tab's content, a price, a play/pause icon, a label), a short 2px blur
during the swap makes the two read as one morph instead of two objects trading places (Emil Kowalski).

```tsx
import { AnimatePresence, motion } from "framer-motion";

<AnimatePresence mode="popLayout" initial={false}>
  <motion.span
    key={value}
    initial={{ opacity: 0, filter: "blur(2px)", scale: 0.97 }}
    animate={{ opacity: 1, filter: "blur(0px)", scale: 1, transitionEnd: { filter: "none" } }}
    exit={{ opacity: 0, filter: "blur(2px)", scale: 0.97 }}
    transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
  >
    {value}
  </motion.span>
</AnimatePresence>
```

- 2px is enough. More reads as a loading glitch. Duration matches the fade (150–250ms).
- Works best on icons and short labels. For whole panels, scale 0.97 plus 2px blur.

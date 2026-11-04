# Recipe 4: Blur reveal

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

An element (a headline, a card, a number) resolves into focus as it arrives. Used once per screen, it's
an orchestrated moment; used on everything, it's a tell.

```tsx
import { motion, useReducedMotion, type Variants } from "framer-motion";

const word: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(8px)" },
  shown: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] },
    transitionEnd: { filter: "none" },     // clear it: a leftover blur(0px) keeps a filter layer alive
  },
};

export function BlurRevealHeadline({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <motion.h1
      className={className}
      initial="hidden"
      animate="shown"
      transition={{ staggerChildren: reduce ? 0 : 0.045 }}
      aria-label={text}
    >
      {words.map((w, i) => (
        <motion.span
          key={i}
          aria-hidden
          style={{ display: "inline-block", whiteSpace: "pre" }}
          variants={reduce ? { hidden: { opacity: 0 }, shown: { opacity: 1 } } : word}
        >
          {w}{i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </motion.h1>
  );
}
```

- Cap at 8px and 0.6s. Bigger blurs on large type look like a loading glitch.
- Words, not letters, for headlines. Letters only for a short word or a number.
- For a value that changes (a price, a counter), key the element on the value inside
  `AnimatePresence mode="popLayout"`, and blur the old value out (4px) as the new one blurs in.

# Recipe 9: Locked content

Part of blur-craft's recipes; conventions (the `bc-` prefix, Framer Motion vs plain HTML) are in `../recipes.md`.

Shows that something is there (a report, a code, a premium template) without letting it be read.

```tsx
<div className="bc-locked" aria-hidden inert>
  <PreviewContent />
</div>
<div className="bc-lock-cta">
  <p>Upgrade to see the full report</p>
  <button>Unlock report</button>
</div>
```

```css
.bc-locked {
  filter: blur(8px);
  user-select: none;
  pointer-events: none;
  mask-image: linear-gradient(#000 40%, transparent);   /* fade away toward the call to action */
  -webkit-mask-image: linear-gradient(#000 40%, transparent);
}
```

- Blur is not security. Render placeholder content in the locked area, never the real secret: anyone can
  remove the filter in devtools.
- `inert` and `aria-hidden` keep keyboard and screen-reader users out of content they can't see.

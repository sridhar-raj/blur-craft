<!--
  Glass surface for Svelte 5 (runes). Pairs with glass.css (import it once). Same API as Glass.tsx:
    <Glass thickness="regular" light="255 214 190" liquid={{ blur: 14 }}>…</Glass>
  `sheen` makes the highlight follow the mouse: only for glass you can act on (a dock, a glass button);
  off by default, ignored for touch and under reduced motion.
  Put transition:fade on THIS component's element, never on a wrapper: a fading parent flattens the glass.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { watchLiquidGlass, type LiquidOptions } from "./liquid-glass";

  let {
    thickness = "regular",
    tone = "dark",
    light,
    liquid = false,
    tinted = false,
    neutral = false,
    sheen = false,
    as = "div",
    children,
  }: {
    thickness?: "clear" | "thin" | "regular" | "thick" | "solid";
    tone?: "dark" | "light";
    light?: string;
    liquid?: boolean | LiquidOptions;
    tinted?: boolean;
    neutral?: boolean;
    sheen?: boolean;
    as?: string;
    children?: Snippet;
  } = $props();

  let el = $state<HTMLElement | null>(null);
  const liquidKey = $derived(liquid ? JSON.stringify(liquid === true ? {} : liquid) : "");

  // Liquid Glass: mount, follow size changes, and clean up the SVG and inline filter.
  $effect(() => {
    if (!el || !liquidKey) return;
    return watchLiquidGlass(el, JSON.parse(liquidKey) as LiquidOptions);
  });

  function onmove(e: PointerEvent) {
    if (!sheen || e.pointerType !== "mouse" || !el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  }
  function onleave() { el?.style.removeProperty("--mx"); el?.style.removeProperty("--my"); }
</script>

<svelte:element
  this={as}
  bind:this={el}
  class={["glass", `glass--${thickness}`, tone === "light" && "glass--light", tinted && "glass--tinted", neutral && "glass--neutral"].filter(Boolean).join(" ")}
  style={light ? `--glass-light: ${light}` : undefined}
  onpointermove={onmove}
  onpointerleave={onleave}
  role="presentation"
>
  {@render children?.()}
</svelte:element>

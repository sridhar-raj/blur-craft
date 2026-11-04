<!--
  Glass surface for Vue 3 (<script setup>). Pairs with glass.css (import it once). Same API as Glass.tsx:
    <Glass thickness="regular" light="255 214 190" :liquid="{ blur: 14 }">…</Glass>
  `sheen` makes the highlight follow the mouse: only for glass you can act on (a dock, a glass button);
  off by default, ignored for touch and under reduced motion.
  Fade or scale THIS element in <Transition>, never a wrapper around it: a fading parent flattens the glass.
-->
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from "vue";
import { watchLiquidGlass, type LiquidOptions } from "./liquid-glass";

const props = withDefaults(defineProps<{
  thickness?: "clear" | "thin" | "regular" | "thick" | "solid";
  tone?: "dark" | "light";
  light?: string;                       // "r g b" of the light behind the glass
  liquid?: boolean | LiquidOptions;     // Chromium edge refraction
  tinted?: boolean;                     // iOS 26.1-style "Tinted" level
  neutral?: boolean;                    // colour-critical apps: no saturation boost
  sheen?: boolean;                      // interactive glass only
  as?: string;
}>(), { thickness: "regular", tone: "dark", liquid: false, tinted: false, neutral: false, sheen: false, as: "div" });

const el = ref<HTMLElement | null>(null);
const classes = computed(() => [
  "glass", `glass--${props.thickness}`,
  props.tone === "light" && "glass--light",
  props.tinted && "glass--tinted",
  props.neutral && "glass--neutral",
]);
const style = computed(() => (props.light ? { "--glass-light": props.light } : {}));

let stop: (() => void) | null = null;
function mountLiquid() {
  stop?.(); stop = null;
  if (el.value && props.liquid) stop = watchLiquidGlass(el.value, props.liquid === true ? {} : props.liquid);
}
onMounted(mountLiquid);
watch(() => JSON.stringify(props.liquid), mountLiquid);
onBeforeUnmount(() => stop?.());

const reduce = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
function onMove(e: PointerEvent) {
  if (!props.sheen || e.pointerType !== "mouse" || reduce?.matches || !el.value) return;
  const r = el.value.getBoundingClientRect();
  el.value.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
  el.value.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
}
function onLeave() { el.value?.style.removeProperty("--mx"); el.value?.style.removeProperty("--my"); }
</script>

<template>
  <component :is="as" ref="el" :class="classes" :style="style" @pointermove="onMove" @pointerleave="onLeave">
    <slot />
  </component>
</template>

"use client";
// Glass surface for React + Framer Motion. Pairs with glass.css (import it once in the section's CSS or
// copy its rules under the section's prefix). On interactive glass, `sheen` makes the highlight follow the
// pointer on a spring (off by default: on static glass a hover glow falsely signals "clickable"); `liquid` adds
// edge refraction in Chromium (liquid-glass.ts) and quietly falls back to frosted glass elsewhere.
//
//   <Glass thickness="regular" light="255 214 190" liquid className="tk-player">…</Glass>

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { watchLiquidGlass, type LiquidOptions } from "./liquid-glass";

type Props = {
  children: ReactNode;
  thickness?: "clear" | "thin" | "regular" | "thick";
  tone?: "dark" | "light";
  /** r g b of the light behind the glass, e.g. "255 180 120" for a warm sun. Tints the rim and sheen. */
  light?: string;
  /** Edge refraction (Chromium). true for defaults, or options. */
  liquid?: boolean | LiquidOptions;
  /** The more opaque, higher-contrast level (iOS 26.1 "Tinted"). Also automatic on prefers-contrast: more. */
  tinted?: boolean;
  /** Highlight follows the pointer. Only for glass you can act on (a dock, a glass button). Off by default;
   *  ignored for touch and under reduced motion. */
  sheen?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function Glass({
  children, thickness = "regular", tone = "dark", light, liquid = false, tinted = false, sheen = false, className = "", style,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const mx = useSpring(useMotionValue(30), { stiffness: 120, damping: 20 });
  const my = useSpring(useMotionValue(0), { stiffness: 120, damping: 20 });
  const mxPct = useMotionTemplate`${mx}%`;
  const myPct = useMotionTemplate`${my}%`;

  // Liquid Glass: mount, keep in step with size, and clean up the SVG and inline filter on unmount.
  const liquidKey = liquid ? JSON.stringify(liquid === true ? {} : liquid) : "";
  useEffect(() => {
    const el = ref.current;
    if (!el || !liquidKey) return;
    return watchLiquidGlass(el, JSON.parse(liquidKey) as LiquidOptions);
  }, [liquidKey]);

  return (
    <motion.div
      ref={ref}
      className={`glass glass--${thickness}${tone === "light" ? " glass--light" : ""}${tinted ? " glass--tinted" : ""} ${className}`}
      style={{
        ...style,
        ...(light ? ({ "--glass-light": light } as CSSProperties) : null),
        ["--mx" as string]: mxPct,
        ["--my" as string]: myPct,
      }}
      onPointerMove={(e) => {
        if (!sheen || reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width) * 100);
        my.set(((e.clientY - r.top) / r.height) * 100);
      }}
      onPointerLeave={() => { mx.set(30); my.set(0); }}
    >
      {children}
    </motion.div>
  );
}

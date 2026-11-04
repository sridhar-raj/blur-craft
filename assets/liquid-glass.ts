// Liquid glass refraction for a rounded rectangle (Chromium only; everywhere else it falls back to the
// plain glass material). Technique from kube.io/blog/liquid-glass-css-svg: a displacement map whose
// red/green channels push backdrop pixels inward near the rim, as a convex squircle bezel bends light.
//
//   const id = mountLiquidGlass(el, { bezel: 22, strength: 38, blur: 6 });
//   // el gets backdrop-filter: url(#id) blur(...) saturate(...) in Chromium; call again after a resize.
//
// Keep it to one element per screen (a player, a dock, a hero button): the map is rebuilt on every
// size change, and SVG backdrop filters are heavier than plain blur.
//
// Mount after layout settles and again when it changes: a ResizeObserver plus document.fonts.ready.
// If part of the glass shows the content behind it sharp, the map is out of date with the element's size.
// Keep the order url() then blur(): blur first frosts the backdrop before it's bent, which hides the
// refraction.

export type LiquidOptions = {
  bezel?: number;      // width of the curved rim in px (16-28 reads as glass)
  strength?: number;   // max displacement in px (20-50; above 60 the content tears)
  blur?: number;       // frosting on top of the refraction. It REPLACES the material's blur: 0-3 = clear
                       // liquid glass, 12-20 = frosted (lower reads as noise over busy content)
  saturate?: number;   // percent
  aberration?: number; // 0-2: colour fringing at the rim (red bends least, blue most), as real lenses do.
                       // 0 = off (default). 0.6-1 reads as optical; above 1.5 looks like a glitch effect.
  clamp?: boolean;     // limit the backdrop's brightness range (Fluent's luminosity layer, tested CSS version):
                       // highlights and shadows behind text can't break legibility. Default true.
  radius?: number;     // corner radius in px; defaults to the element's computed radius
};

export function supportsLiquidGlass(): boolean {
  if (typeof navigator === "undefined") return false;
  // backdrop-filter: url() only works in Chromium.
  const isChromium = /Chrome\/|Chromium\/|Edg\//.test(navigator.userAgent) && !/Firefox\//.test(navigator.userAgent);
  return isChromium && CSS.supports("backdrop-filter", "blur(1px)");
}

/** Convex squircle bezel profile: 0 at the outer edge, 1 where the flat top begins (smooth hand-off). */
const surface = (x: number) => Math.pow(1 - Math.pow(1 - x, 4), 1 / 4);

function displacementMap(w: number, h: number, r: number, bezel: number): string {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Signed distance to the rounded-rect edge (positive inside), and the outward normal.
      const qx = Math.max(Math.abs(x + 0.5 - w / 2) - (w / 2 - r), 0);
      const qy = Math.max(Math.abs(y + 0.5 - h / 2) - (h / 2 - r), 0);
      const inCorner = qx > 0 && qy > 0;
      let d: number, nx: number, ny: number;
      if (inCorner) {
        const len = Math.hypot(qx, qy);
        d = r - len;
        nx = (qx / len) * Math.sign(x + 0.5 - w / 2);
        ny = (qy / len) * Math.sign(y + 0.5 - h / 2);
      } else {
        const dx = w / 2 - Math.abs(x + 0.5 - w / 2);
        const dy = h / 2 - Math.abs(y + 0.5 - h / 2);
        if (dx < dy) { d = dx; nx = Math.sign(x + 0.5 - w / 2); ny = 0; }
        else { d = dy; nx = 0; ny = Math.sign(y + 0.5 - h / 2); }
      }
      // Inside the bezel, the slope of the surface decides how far light bends (inward, toward the centre).
      let m = 0;
      if (d >= 0 && d < bezel) {
        const t = d / bezel;
        const slope = (surface(Math.min(1, t + 0.01)) - surface(Math.max(0, t - 0.01))) / 0.02;
        m = Math.min(1, slope / 4);
      }
      const i = (y * w + x) * 4;
      img.data[i] = 128 - nx * m * 127;     // R: x displacement (sample from further in)
      img.data[i + 1] = 128 - ny * m * 127; // G: y displacement
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

let counter = 0;

export function mountLiquidGlass(el: HTMLElement, opts: LiquidOptions = {}): string | null {
  if (!supportsLiquidGlass()) return null;
  if (matchMedia("(prefers-reduced-transparency: reduce)").matches) return null;
  const { bezel = 22, strength = 38, blur = 14, saturate = 170, aberration = 0, clamp = true } = opts;
  // Layout size, not getBoundingClientRect(): a scale transform on the element or an ancestor would shrink
  // the map, and any part of the element outside the filter region renders with no filter at all
  // (it shows the content behind it sharp).
  const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
  const r = opts.radius ?? (parseFloat(getComputedStyle(el).borderTopLeftRadius) || 24);
  if (!w || !h) return null;

  const id = el.dataset.liquidId || `liquid-glass-${++counter}`;
  el.dataset.liquidId = id;
  document.getElementById(`${id}-svg`)?.remove();

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.id = `${id}-svg`;
  svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
  svg.setAttribute("aria-hidden", "true");
  svg.style.position = "absolute";
  svg.innerHTML = `
    <filter id="${id}" x="0" y="0" width="${w}" height="${h}" filterUnits="userSpaceOnUse"
            color-interpolation-filters="sRGB">
      <feImage href="${displacementMap(w, h, Math.min(r, w / 2, h / 2), bezel)}" x="0" y="0"
               width="${w}" height="${h}" result="map" preserveAspectRatio="none"/>
      ${aberration > 0 ? (() => {
        // Chromatic aberration (after rdev/liquid-glass-react): displace each channel by a slightly
        // different amount and recombine. The map is neutral away from the rim, so fringes appear only there.
        const ch = (name: string, k: number, m: string) => `
      <feDisplacementMap in="SourceGraphic" in2="map" scale="${strength * (1 + k * aberration)}"
                         xChannelSelector="R" yChannelSelector="G" result="d${name}"/>
      <feColorMatrix in="d${name}" type="matrix" values="${m}" result="${name}"/>`;
        return ch("r", 0, "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0")
          + ch("g", 0.08, "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0")
          + ch("b", 0.16, "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0") + `
      <feBlend in="r" in2="g" mode="screen" result="rg"/>
      <feBlend in="rg" in2="b" mode="screen"/>`;
      })() : `
      <feDisplacementMap in="SourceGraphic" in2="map" scale="${strength}"
                         xChannelSelector="R" yChannelSelector="G"/>`}
    </filter>`;
  document.body.appendChild(svg);

  // Spec order: each function takes the previous one's output, so url() refracts the sharp backdrop first.
  const value = `url(#${id}) blur(${blur}px) saturate(${saturate}%)${clamp ? " contrast(0.8) brightness(0.92)" : ""}`;
  el.style.setProperty("backdrop-filter", value);
  el.style.setProperty("-webkit-backdrop-filter", value);
  return id;
}

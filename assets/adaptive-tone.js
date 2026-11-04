// Adaptive tone for SMALL glass elements (pills, buttons, tab bars, docks): switch between dark and light
// glass from the luminance of what's behind it, as Apple's Liquid Glass does (WWDC25 session 219):
// "Small elements, symbols, and glyphs flip from light to dark… Bigger elements, like menus and sidebars,
// also adapt… but do not flip." So never use this on panels, sheets or dialogs.
//
//   import { watchTone } from "./adaptive-tone.js";
//   const stop = watchTone(dockEl, heroImgOrCanvasOrVideo);   // toggles .glass--light on dockEl
//
// The source is the element painting the backdrop (an <img>, <video> or <canvas>, same-origin or CORS-
// enabled). CSS can't read pixels behind an element, so this samples the source directly. A hysteresis
// band keeps it from flickering while content scrolls. When the tint is a known colour instead (a
// tinted glass), use CSS contrast-color() (Baseline 2026) or Lea Verou's OKLCH threshold instead of this.

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };

export function sampleLuminance(el, source, size = 16) {
  const r = el.getBoundingClientRect(), s = source.getBoundingClientRect();
  const nw = source.naturalWidth || source.videoWidth || source.width;
  const nh = source.naturalHeight || source.videoHeight || source.height;
  if (!nw || !nh || !s.width || !s.height) return null;
  // Map the element's box into the source's pixel space (assumes the source fills its box, as
  // object-fit: fill or a canvas sized to its box; for object-fit: cover, pass a canvas instead).
  const sx = ((r.left - s.left) / s.width) * nw, sy = ((r.top - s.top) / s.height) * nh;
  const sw = (r.width / s.width) * nw, sh = (r.height / s.height) * nh;
  const c = sampleLuminance.canvas ||= document.createElement("canvas");
  if (c.width !== size) { c.width = size; c.height = size; }   // a later call with another size must not read out of bounds
  const ctx = c.getContext("2d", { willReadFrequently: true });
  try { ctx.drawImage(source, sx, sy, sw, sh, 0, 0, size, size); } catch { return null; }
  let d;
  try { d = ctx.getImageData(0, 0, size, size).data; } catch { return null; }   // cross-origin source: tainted
  let y = 0;
  for (let i = 0; i < d.length; i += 4) y += 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
  return y / (d.length / 4);
}

export function watchTone(el, source, { light = 0.22, dark = 0.14, every = 120, lightClass = "glass--light" } = {}) {
  // Over a bright backdrop (Y > light) the glass turns light with dark text; below `dark` it turns dark.
  // Between the two it keeps its current tone, which is what stops the flicker.
  let tone = el.classList.contains(lightClass) ? "light" : "dark", last = 0, raf = 0, alive = true;
  const tick = (t) => {
    if (!alive) return;
    if (t - last >= every) {
      last = t;
      const y = sampleLuminance(el, source);
      if (y != null) {
        if (tone === "dark" && y > light) tone = "light";
        else if (tone === "light" && y < dark) tone = "dark";
        el.classList.toggle(lightClass, tone === "light");
        el.dataset.tone = tone;
      }
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => { alive = false; cancelAnimationFrame(raf); };
}

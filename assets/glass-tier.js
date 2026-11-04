// Device tiers for glass: sets <html data-glass-tier="full | lite | flat">, which glass.css reads.
//   full  the material as designed
//   lite  a single 8px blur, no extras
//   flat  no blur; the tint carries legibility (what Android, Fluent and Apple do on weak or saving devices)
//
//   import { applyGlassTier } from "./glass-tier.js";
//   applyGlassTier();            // after the page (and its glass) is visible
//
// Signals, with their real support (research.md, round 3):
//   navigator.deviceMemory ≤ 2      Chromium only
//   navigator.connection.saveData   Chromium only
//   a 60-frame rAF probe            everywhere. iOS Low Power Mode throttles rAF to 30fps on purpose
//                                   (WebKit 215745), so < 34fps reads as "saving power" -> flat
//   hardwareConcurrency ≤ 4         everywhere (weak signal)
//   Compute Pressure 'serious' or 'critical'   Chrome 125+: steps down one tier while it lasts
// prefers-reduced-motion is NOT a performance signal (no data links it to weak hardware).
// Probe after glass is on screen: blur cost is GPU work, so an empty page measures nothing useful.

export async function measureFps(frames = 60) {
  return new Promise((resolve) => {
    let n = 0, t0;
    const step = (t) => { t0 ??= t; if (++n < frames) requestAnimationFrame(step); else resolve(((frames - 1) * 1000) / (t - t0)); };
    requestAnimationFrame(step);
  });
}

export async function glassTier() {
  const lowMem = (navigator.deviceMemory ?? 8) <= 2;
  const saveData = navigator.connection?.saveData === true;
  const cores = navigator.hardwareConcurrency ?? 8;
  const fps = await measureFps();
  if (saveData || lowMem || fps < 34) return "flat";
  if (cores <= 4 || fps < 50) return "lite";
  return "full";
}

const order = ["full", "lite", "flat"];

// A tier the user picked (a site setting) or a developer forced wins: set data-glass-tier-lock on <html>
// and this script never overrides it.
export async function applyGlassTier({ root = document.documentElement, watchPressure = true } = {}) {
  const base = await glassTier();
  const locked = () => "glassTierLock" in root.dataset;
  if (!locked()) root.dataset.glassTier = base;
  if (watchPressure && "PressureObserver" in globalThis) {
    try {
      const obs = new PressureObserver((records) => {
        if (locked()) return;
        const state = records.at(-1)?.state;
        const down = state === "serious" || state === "critical";
        const i = order.indexOf(base);
        root.dataset.glassTier = down ? order[Math.min(i + 1, 2)] : base;
      });
      await obs.observe("cpu", { sampleInterval: 2000 });
    } catch { /* not permitted here: keep the measured tier */ }
  }
  return base;
}

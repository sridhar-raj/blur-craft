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

// Resolves null when it can't measure fairly: a hidden tab (rAF paused) or a probe that never finishes.
export async function measureFps(frames = 60, timeoutMs = 3000) {
  if (document.hidden) return null;
  return new Promise((resolve) => {
    let n = 0, t0, done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    setTimeout(() => finish(null), timeoutMs);
    const step = (t) => {
      if (done) return;
      if (document.hidden) return finish(null);          // tab went to the background mid-probe
      t0 ??= t;
      if (++n < frames) requestAnimationFrame(step); else finish(((frames - 1) * 1000) / (t - t0));
    };
    requestAnimationFrame(step);
  });
}

export async function glassTier() {
  const lowMem = (navigator.deviceMemory ?? 8) <= 2;
  const saveData = navigator.connection?.saveData === true;
  const cores = navigator.hardwareConcurrency ?? 8;
  const fps = await measureFps();                       // null = couldn't measure: decide on the other signals
  if (saveData || lowMem || (fps != null && fps < 34)) return "flat";
  if (cores <= 4 || (fps != null && fps < 50)) return "lite";
  return "full";
}

const order = ["full", "lite", "flat"];

// A tier the user picked (a site setting) or a developer forced wins: set data-glass-tier-lock on <html>
// and this script never overrides it. Call it after the page settles (requestIdleCallback): start-up work
// would read as a slow device. Returns { tier, stop } — stop() disconnects the pressure observer.
export async function applyGlassTier({ root = document.documentElement, watchPressure = true } = {}) {
  const base = await glassTier();
  const locked = () => "glassTierLock" in root.dataset;
  if (!locked()) root.dataset.glassTier = base;
  let obs = null;
  if (watchPressure && "PressureObserver" in globalThis) {
    try {
      obs = new PressureObserver((records) => {
        if (locked()) return;
        const state = records.at(-1)?.state;
        const down = state === "serious" || state === "critical";
        const i = order.indexOf(base);
        root.dataset.glassTier = down ? order[Math.min(i + 1, 2)] : base;
      });
      await obs.observe("cpu", { sampleInterval: 2000 });
    } catch { obs = null; /* not permitted here: keep the measured tier */ }
  }
  return { tier: base, stop: () => obs?.disconnect() };
}

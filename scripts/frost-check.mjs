#!/usr/bin/env node
// Frost check: does every glass surface actually blur what's behind it?
//
//   node <skill folder>/scripts/frost-check.mjs <url | file.html> [--width 1600 --height 900]
//
// For each visible glass surface (an element with a backdrop-filter, or a class containing "glass"), it
// hides the surface's own content, screenshots the surface with its blur ON, then with backdrop-filter OFF
// (same fill), and compares the fine detail (high-frequency energy) under it:
//   FROSTS       blur removes most of the detail                      (ratio on/off < 0.5)
//   WEAK         blur removes some detail: blur too light, or patches (0.5 - 0.8)
//   NO BLUR      the blur does nothing: a backdrop root above it, a broken prefix or var() (Sonoma), a
//                stale Liquid Glass map, or no backdrop-filter at all                  (>= 0.8)
//   FLAT         there's almost no detail behind it: nothing to frost (a skill "tell"; also unmeasurable)
// Automates the skill's manual "red text behind the glass" probe. Chromium only (Playwright's WebKit never
// paints backdrop-filter). Exit code 1 when any surface is NO BLUR.

import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const VALUE_FLAGS = new Set(["--width", "--height"]);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
let target = args.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(args[i - 1]));
if (!target) { console.error("usage: frost-check.mjs <url | file.html> [--width 1600 --height 900]"); process.exit(2); }
if (!/^https?:|^file:/.test(target) && existsSync(target)) target = pathToFileURL(resolve(target)).href;
const width = Number(opt("--width", 1600)), height = Number(opt("--height", 900));

let chromium;
try { ({ chromium } = createRequire(join(process.cwd(), "package.json"))("playwright")); }
catch { console.error("Playwright isn't installed in this project. Run: pnpm add -D playwright"); process.exit(2); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
await page.goto(target, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.addStyleTag({ content: "*,*::before,*::after{animation-play-state:paused!important;transition:none!important}" });

// Tag the surfaces. Nested glass is measured as its own surface; content inside each is hidden.
const surfaces = await page.evaluate(() => {
  const out = [];
  let i = 0;
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (cs.display === "none" || cs.visibility === "hidden" || r.width < 24 || r.height < 24 || el.closest("[hidden]")) continue;
    if (r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) continue;
    const bf = cs.backdropFilter && cs.backdropFilter !== "none" ? cs.backdropFilter : (cs.webkitBackdropFilter || "none");
    const classed = typeof el.className === "string" && /(^|\s)[\w-]*glass(\s|$|--)/.test(el.className);
    const masked = cs.maskImage && cs.maskImage !== "none";          // helper layers (progressive blur bands)
    if ((bf === "none" && !classed) || masked) continue;
    el.dataset.fcId = String(i);
    const name = el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "");
    // Inset the sample by 12% so rims, radii and shadows don't count as detail.
    const ix = r.width * 0.12, iy = r.height * 0.12;
    out.push({ id: i++, name, filter: bf, x: Math.max(0, r.left + ix), y: Math.max(0, r.top + iy),
      w: Math.min(innerWidth, r.right - ix) - Math.max(0, r.left + ix), h: Math.min(innerHeight, r.bottom - iy) - Math.max(0, r.top + iy) });
  }
  return out;
});

if (!surfaces.length) {
  console.log("WARNING: no visible glass surfaces found; nothing was checked.");
  await browser.close(); process.exit(1);
}

// Hide every surface's own content (text, icons, children) so only the frosted backdrop is measured.
// Also switch off the surface's background images (grain, gradient fills, whatever the prefix is called):
// grain is fine detail that stays with the blur on or off and would drown the measurement. The fill colour
// stays, so the comparison is blur vs no blur under the same tint.
await page.addStyleTag({ content: "[data-fc-id] > *{visibility:hidden!important}[data-fc-id]{color:transparent!important;background-image:none!important}[data-fc-id]::before,[data-fc-id]::after{opacity:0!important}" });
await page.waitForTimeout(100);

const energy = async (s) => {
  const png = (await page.screenshot({ clip: { x: s.x, y: s.y, width: Math.max(4, s.w), height: Math.max(4, s.h) } })).toString("base64");
  return page.evaluate(async (png) => {
    const img = new Image(); img.src = "data:image/png;base64," + png; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d", { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
    const { data: d, width: w, height: h } = ctx.getImageData(0, 0, img.width, img.height);
    const lum = (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    // Mean absolute Laplacian: high when there are sharp edges, near zero when blurred or flat.
    let sum = 0, n = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      sum += Math.abs(4 * lum(i) - lum(i - 4) - lum(i + 4) - lum(i - w * 4) - lum(i + w * 4)); n++;
    }
    return n ? sum / n : 0;
  }, png);
};

const results = [];
for (const s of surfaces) {
  // The raw backdrop (surface hidden) decides FLAT: a dark tint shrinks detail both with and without blur,
  // so flatness can't be judged from the tinted measurements.
  await page.evaluate((id) => { document.querySelector(`[data-fc-id="${id}"]`).style.setProperty("visibility", "hidden", "important"); }, s.id);
  await page.waitForTimeout(30);
  const raw = await energy(s);
  await page.evaluate((id) => { document.querySelector(`[data-fc-id="${id}"]`).style.removeProperty("visibility"); }, s.id);
  const on = await energy(s);
  await page.evaluate((id) => {
    const el = document.querySelector(`[data-fc-id="${id}"]`);
    el.dataset.fcPrev = el.getAttribute("style") || "";
    el.style.setProperty("backdrop-filter", "none", "important");
    el.style.setProperty("-webkit-backdrop-filter", "none", "important");
  }, s.id);
  await page.waitForTimeout(50);
  const off = await energy(s);
  await page.evaluate((id) => {
    const el = document.querySelector(`[data-fc-id="${id}"]`);
    el.setAttribute("style", el.dataset.fcPrev);
  }, s.id);
  const ratio = off > 0 ? on / off : 1;
  const verdict = raw < 2 || off < 0.6 ? "FLAT" : ratio < 0.5 ? "FROSTS" : ratio < 0.8 ? "WEAK" : "NO BLUR";
  results.push({ ...s, raw, on, off, ratio, verdict });
}
await browser.close();

const order = { "NO BLUR": 0, WEAK: 1, FLAT: 2, FROSTS: 3 };
results.sort((a, b) => order[a.verdict] - order[b.verdict]);
for (const r of results) {
  const note = {
    "NO BLUR": "the blur isn't reaching the backdrop: check for a backdrop root above it (opacity, filter, mask, will-change on an ancestor), the prefix/var() rules, or a stale Liquid Glass map",
    WEAK: "only part of the detail is gone: blur too light for this backdrop, or part of the surface is unfrosted",
    FLAT: "almost no detail behind it, so the blur can't be measured. Fine for chrome over a calm area; for the hero glass, it means nothing shows through (move it over the light or the art)",
    FROSTS: "",
  }[r.verdict];
  console.log(`${r.verdict.padEnd(7)}  ${r.name.slice(0, 48).padEnd(48)} backdrop ${r.raw.toFixed(1)}, under glass ${r.off.toFixed(1)} → ${r.on.toFixed(1)} (${Math.round((1 - Math.min(1, r.ratio)) * 100)}% removed)${note ? "  " + note : ""}`);
}
const bad = results.filter((r) => r.verdict === "NO BLUR").length;
console.log(`\n${results.length} surface(s): ${results.filter((r) => r.verdict === "FROSTS").length} frost, ${results.filter((r) => r.verdict === "WEAK").length} weak, ${results.filter((r) => r.verdict === "FLAT").length} flat, ${bad} not blurring`);
process.exitCode = bad ? 1 : 0;

#!/usr/bin/env node
// Worst-case contrast for text on glass (WCAG failure F83 method, applied to translucent surfaces).
//
//   node <skill folder>/scripts/glass-contrast.mjs <url | file.html> [--width 1600 --height 900] [--all-text]
//
// For every line of text inside an element with a backdrop-filter (or every line on the page with
// --all-text), it hides the text, screenshots what is really behind it, finds the brightest and darkest
// pixel under that line's own box, composites the text colour over both, and reports the worse ratio.
// It runs three states, because glass has to pass in all of them:
//   normal       the page as designed
//   tint-only    backdrop-filter off: what iOS Low Power Mode and blur-less browsers show
//   contrast     prefers-contrast: more (the tinted level; the setting Safari users can actually reach)
// Thresholds: 4.5:1 for body text, 3:1 for large text (>= 24px, or >= 18.66px bold).
// Needs Playwright (Chromium) in the current project. Exit code 1 if any line fails in any state.

import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
let target = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1]?.startsWith("--") !== true);
if (!target) { console.error("usage: glass-contrast.mjs <url | file.html> [--width 1600 --height 900] [--all-text]"); process.exit(2); }
if (!/^https?:|^file:/.test(target) && existsSync(target)) target = pathToFileURL(resolve(target)).href;
const width = Number(opt("--width", 1600)), height = Number(opt("--height", 900));
const allText = args.includes("--all-text");

let chromium;
try { ({ chromium } = createRequire(join(process.cwd(), "package.json"))("playwright")); }
catch { console.error("Playwright isn't installed in this project. Run: pnpm add -D playwright"); process.exit(2); }

const HIDE_TEXT = `*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}`;
const NO_BLUR = `*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}`;

const browser = await chromium.launch();
let failed = 0;

for (const state of ["normal", "tint-only", "contrast"]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  if (state === "contrast") await page.emulateMedia({ contrast: "more" });
  await page.goto(target, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  // Freeze motion so the "behind" screenshot matches the moment we measured.
  await page.addStyleTag({ content: "*,*::before,*::after{animation-play-state:paused!important;transition:none!important}" });
  await page.waitForTimeout(200);

  // 1. Collect line boxes and text colours.
  const lines = await page.evaluate((allText) => {
    const surfaces = [...document.querySelectorAll("body *")].filter((el) => {
      const cs = getComputedStyle(el);
      return (cs.backdropFilter && cs.backdropFilter !== "none") || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== "none");
    });
    const roots = allText ? [document.body] : surfaces;
    const out = [];
    const seen = new Set();
    for (const root of roots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (seen.has(n) || !n.textContent.trim()) continue;
        seen.add(n);
        const el = n.parentElement, cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
        if (el.closest("svg")) continue;                 // words painted inside artwork aren't interface text
        const range = document.createRange(); range.selectNodeContents(n);
        const size = parseFloat(cs.fontSize), weight = Number(cs.fontWeight) || 400;
        const large = size >= 24 || (size >= 18.66 && weight >= 700);
        for (const r of range.getClientRects()) {
          if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
          // Skip lines covered by another layer (a dialog's focus veil, a sheet): they're meant to recede.
          const hit = document.elementFromPoint(Math.min(innerWidth - 1, r.left + r.width / 2), Math.min(innerHeight - 1, r.top + r.height / 2));
          if (hit && !el.contains(hit) && !hit.contains(el)) continue;
          out.push({ text: n.textContent.trim().slice(0, 40), color: cs.color, large,
            x: Math.max(0, Math.floor(r.left)), y: Math.max(0, Math.floor(r.top)),
            w: Math.ceil(Math.min(r.right, innerWidth) - Math.max(0, r.left)), h: Math.ceil(Math.min(r.bottom, innerHeight) - Math.max(0, r.top)) });
        }
      }
    }
    return { lines: out, surfaces: surfaces.length };
  }, allText);

  // 2. (tint-only: switch the blur off only now, after the glass was found), hide text, screenshot
  //    what's behind, and sample it in the page.
  if (state === "tint-only") await page.addStyleTag({ content: NO_BLUR });
  await page.addStyleTag({ content: HIDE_TEXT });
  await page.waitForTimeout(100);
  const png = (await page.screenshot()).toString("base64");
  const results = await page.evaluate(async ({ png, lines }) => {
    const img = new Image(); img.src = "data:image/png;base64," + png; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d", { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const parse = (s) => { const m = s.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 }; };
    return lines.map((ln) => {
      const d = ctx.getImageData(ln.x, ln.y, Math.max(1, ln.w), Math.max(1, ln.h)).data;
      let hi = [0, 0, 0], lo = [255, 255, 255], hiL = -1, loL = 2;
      for (let i = 0; i < d.length; i += 4) {
        const l = L(d[i], d[i + 1], d[i + 2]);
        if (l > hiL) { hiL = l; hi = [d[i], d[i + 1], d[i + 2]]; }
        if (l < loL) { loL = l; lo = [d[i], d[i + 1], d[i + 2]]; }
      }
      const t = parse(ln.color);
      const over = (bg) => { const [r, g, b] = bg.map((v, k) => t.a * [t.r, t.g, t.b][k] + (1 - t.a) * v); return L(r, g, b); };
      const worst = Math.min(ratio(over(hi), L(...hi)), ratio(over(lo), L(...lo)));
      return { ...ln, worst: Math.round(worst * 100) / 100, need: ln.large ? 3 : 4.5 };
    });
  }, { png, lines: lines.lines });

  const bad = results.filter((r) => r.worst < r.need);
  failed += bad.length;
  const min = results.length ? Math.min(...results.map((r) => r.worst)) : null;
  console.log(`\n== ${state}: ${lines.surfaces} glass surface(s), ${results.length} line(s), lowest ${min ?? "-"}:1, ${bad.length} below threshold`);
  for (const r of results.sort((a, b) => a.worst - b.worst).slice(0, bad.length ? bad.length + 3 : 5))
    console.log(`${r.worst < r.need ? "FAIL" : "ok  "}  ${String(r.worst).padStart(5)}:1 (needs ${r.need})  "${r.text}"  at ${r.x},${r.y}`);
  await page.close();
}

await browser.close();
console.log(failed ? `\n${failed} line(s) fail. Raise --glass-dim, go a thickness up, or move the text off the bright patch.` : "\nAll text on glass passes in every state.");
process.exitCode = failed ? 1 : 0;

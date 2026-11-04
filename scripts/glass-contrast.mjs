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
const VALUE_FLAGS = new Set(["--width", "--height"]);
let target = args.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(args[i - 1]));
if (!target) { console.error("usage: glass-contrast.mjs <url | file.html> [--width 1600 --height 900] [--all-text]"); process.exit(2); }
if (!/^https?:|^file:/.test(target) && existsSync(target)) target = pathToFileURL(resolve(target)).href;
const width = Number(opt("--width", 1600)), height = Number(opt("--height", 900));
const allText = args.includes("--all-text");

let chromium;
try { ({ chromium } = createRequire(join(process.cwd(), "package.json"))("playwright")); }
catch { console.error("Playwright isn't installed in this project. Run: pnpm add -D playwright"); process.exit(2); }

// Only the measured lines are hidden: any other text (e.g. content scrolling behind the glass) is part of
// the real backdrop and must stay in the screenshot.
const HIDE_TEXT = `[data-gc-measure]{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}`;
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
    // Glass = anything with a backdrop-filter, OR anything with a glass class (phones often drop the blur
    // but keep the translucent fill, and that text still needs checking). Hidden surfaces don't count.
    const surfaces = [...document.querySelectorAll("body *")].filter((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (cs.display === "none" || cs.visibility === "hidden" || !r.width || !r.height || el.closest("[hidden]")) return false;
      const blurred = (cs.backdropFilter && cs.backdropFilter !== "none") || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== "none");
      const classed = typeof el.className === "string" && /(^|\s)[\w-]*glass(\s|$|--)/.test(el.className);
      return blurred || classed;
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
        // Effective alpha includes every ancestor's opacity (a 60%-opacity parent fades its text too).
        let alpha = 1;
        for (let a = el; a; a = a.parentElement) alpha *= Number(getComputedStyle(a).opacity);
        const range = document.createRange(); range.selectNodeContents(n);
        const size = parseFloat(cs.fontSize), weight = Number(cs.fontWeight) || 400;
        const large = size >= 24 || (size >= 18.66 && weight >= 700);
        for (const r of range.getClientRects()) {
          if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
          // Skip lines covered by another layer (a dialog's focus veil, a sheet): they're meant to recede.
          const hit = document.elementFromPoint(Math.min(innerWidth - 1, r.left + r.width / 2), Math.min(innerHeight - 1, r.top + r.height / 2));
          if (hit && !el.contains(hit) && !hit.contains(el)) continue;
          el.dataset.gcMeasure = "";
          out.push({ text: n.textContent.trim().slice(0, 40), color: cs.color, alpha, large,
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
      const t = parse(ln.color);
      const a = t.a * ln.alpha;
      // Per pixel: composite the text over that pixel and keep the lowest ratio. The worst pixel isn't
      // always the brightest or darkest one (mid-tone text loses most against mid-tones).
      let worst = Infinity;
      for (let i = 0; i < d.length; i += 4) {
        const bg = [d[i], d[i + 1], d[i + 2]];
        const fg = [t.r, t.g, t.b].map((v, k) => a * v + (1 - a) * bg[k]);
        const r = ratio(L(...fg), L(...bg));
        if (r < worst) worst = r;
      }
      return { ...ln, worst: Math.round(worst * 100) / 100, need: ln.large ? 3 : 4.5 };
    });
  }, { png, lines: lines.lines });

  const bad = results.filter((r) => r.worst < r.need);
  failed += bad.length;
  const min = results.length ? Math.min(...results.map((r) => r.worst)) : null;
  if (!results.length) { failed += 1; console.log(`\n== ${state}: WARNING: checked 0 lines. No visible glass text found; nothing was verified. Use --all-text, or check the page/width.`); await page.close(); continue; }
  console.log(`\n== ${state}: ${lines.surfaces} glass surface(s), ${results.length} line(s), lowest ${min ?? "-"}:1, ${bad.length} below threshold`);
  for (const r of results.sort((a, b) => a.worst - b.worst).slice(0, bad.length ? bad.length + 3 : 5))
    console.log(`${r.worst < r.need ? "FAIL" : "ok  "}  ${String(r.worst).padStart(5)}:1 (needs ${r.need})  "${r.text}"  at ${r.x},${r.y}`);
  await page.close();
}

await browser.close();
console.log(failed ? `\n${failed} problem(s): failing lines, or a state where nothing could be checked. Raise the alpha in --glass-dim, go a thickness up, or move the text off the bright patch.` : "\nAll text on glass passes in every state.");
process.exitCode = failed ? 1 : 0;

#!/usr/bin/env node
// Worst-case contrast for text on glass (WCAG failure F83 method, applied to translucent surfaces).
//
//   node <skill folder>/scripts/glass-contrast.mjs <url | file.html> [--width 1600 --height 900] [--all-text]
//        [--click "<selector>"]...   click these first, in order (open a dialog, a menu, a settings panel)
//
// For every line of text inside a glass surface (or every line on the page with --all-text), it hides the
// text, screenshots what is really behind it, composites the text colour over every pixel under that line's
// box, and reports the worst ratio. It scrolls through the whole page, re-measures text on pinned glass
// (fixed or sticky: a nav, a dock) at every scroll stop, because that's when a white section slides under
// it, and prints how many lines it could NOT measure (covered, off to the side), so a pass means something.
// Glass = an element with a backdrop-filter (on itself or a ::before/::after), a class containing "glass",
// or the parent of a text-less blur layer (an extended nav backdrop like .gs-bar__backdrop).
// It runs three states, because glass has to pass in all of them:
//   normal       the page as designed
//   tint-only    backdrop-filter off: blur-less browsers, the lite/flat fallbacks, a dropped blur
//   contrast     prefers-contrast: more (the tinted level; the setting Safari users can actually reach)
// Thresholds: 4.5:1 for body text, 3:1 for large text (>= 24px, or >= 18.66px bold).
// Needs Playwright (Chromium) in the current project. Exit code 1 if any line fails in any state.
// GC_DEBUG=<folder> saves each measured screenshot (text hidden) and prints the failing lines' data.

import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const VALUE_FLAGS = new Set(["--width", "--height", "--click"]);
let target = args.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(args[i - 1]));
if (!target) { console.error('usage: glass-contrast.mjs <url | file.html> [--width 1600 --height 900] [--all-text] [--click "<selector>"]...'); process.exit(2); }
if (!/^https?:|^file:/.test(target) && existsSync(target)) target = pathToFileURL(resolve(target)).href;
const width = Number(opt("--width", 1600)), height = Number(opt("--height", 900));
const allText = args.includes("--all-text");
const clicks = args.flatMap((a, i) => (a === "--click" && args[i + 1] ? [args[i + 1]] : []));

let chromium;
try { ({ chromium } = createRequire(join(process.cwd(), "package.json"))("playwright")); }
catch { console.error("Playwright isn't installed in this project. Run: pnpm add -D playwright"); process.exit(2); }

// Only the measured lines are hidden: any other text (e.g. content scrolling behind the glass) is part of
// the real backdrop and must stay in the screenshot.
const HIDE_TEXT = `[data-gc-measure]{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}`;
const NO_BLUR = `*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}`;
// Freeze time-based motion only. A CSS pause rule would also freeze scroll-driven animations (a nav that
// turns to glass on scroll) at their scroll-0 state, and every later stop would measure a bar with no glass.
const FREEZE = "*,*::before,*::after{transition:none!important}";
const pauseTimeAnimations = () => { for (const a of document.getAnimations()) if (!a.timeline || a.timeline.constructor.name === "DocumentTimeline") a.pause(); };

const browser = await chromium.launch();
let failed = 0;

for (const state of ["normal", "tint-only", "contrast"]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  if (state === "contrast") await page.emulateMedia({ contrast: "more" });
  await page.goto(target, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  for (const sel of clicks) {
    try { await page.click(sel, { timeout: 3000 }); await page.waitForTimeout(500); }
    catch { console.error(`--click "${sel}": no clickable element matched; measuring without it.`); failed += 1; }
  }
  // Freeze motion so the "behind" screenshot matches the moment we measured.
  await page.addStyleTag({ content: FREEZE });
  await page.evaluate(pauseTimeAnimations);
  await page.waitForTimeout(200);

  // 1. Find the glass once (before tint-only removes the filters) and tag it.
  const surfaceCount = await page.evaluate((allText) => {
    const hasBf = (cs) => (cs.backdropFilter && cs.backdropFilter !== "none") || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== "none");
    const roots = new Set();
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || el.closest("[hidden]")) continue;
      const pseudo = hasBf(getComputedStyle(el, "::before")) || hasBf(getComputedStyle(el, "::after"));
      const classed = typeof el.className === "string" && /(^|\s)[\w-]*glass(\s|$|--)/.test(el.className);
      if (hasBf(cs) && !el.textContent.trim() && el.parentElement && el.parentElement !== document.body) roots.add(el.parentElement);   // helper backdrop layer
      else if (hasBf(cs) || pseudo || classed) roots.add(el);
    }
    for (const r of roots) r.dataset.gcSurface = "";
    if (allText) document.body.dataset.gcSurface = "";
    return roots.size;
  }, allText);
  if (state === "tint-only") await page.addStyleTag({ content: NO_BLUR });
  await page.addStyleTag({ content: HIDE_TEXT });

  // 2. Scroll stops: the top, then a screen at a time to the bottom (pinned glass is re-measured at each).
  const { scrollH, viewH } = await page.evaluate(() => ({ scrollH: document.documentElement.scrollHeight, viewH: innerHeight }));
  const stops = [];
  for (let y = 0; y < scrollH - viewH; y += Math.round(viewH * 0.8)) stops.push(y);
  stops.push(Math.max(0, scrollH - viewH));
  const uniqStops = [...new Set(stops)].slice(0, 40);

  const results = [];
  for (const y of uniqStops) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(250);
    const lines = await page.evaluate(() => {
      window.__gcDone ??= new WeakSet();
      // Any CSS colour (oklch, display-p3, hex, named) to sRGB through a 1x1 canvas, as the browser draws it.
      const ctx = (window.__gcCtx ??= Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d", { willReadFrequently: true }));
      const rgba = (c) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = "#000"; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 }; };
      const pinned = (el) => { for (let a = el; a; a = a.parentElement) { const p = getComputedStyle(a).position; if (p === "fixed" || p === "sticky") return true; } return false; };
      const out = [];
      const seen = new Set(), toTag = new Set();   // tag after reading every colour: a tagged parent's transparent colour is inherited
      for (const root of document.querySelectorAll("[data-gc-surface]")) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (seen.has(n) || !n.textContent.trim()) continue;
          seen.add(n);
          const el = n.parentElement, cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.display === "none" || el.closest("svg, [hidden], [aria-hidden='true']")) continue;
          const isPinned = pinned(el);
          if (window.__gcDone.has(el) && !isPinned) continue;   // by element: live text (a counter) swaps its nodes
          const color = rgba(cs.color);
          // Effective alpha includes every ancestor's opacity (a 60%-opacity parent fades its text too).
          let alpha = 1;
          for (let a = el; a; a = a.parentElement) alpha *= Number(getComputedStyle(a).opacity);
          if (alpha === 0) continue;
          const range = document.createRange(); range.selectNodeContents(n);
          const size = parseFloat(cs.fontSize), weight = Number(cs.fontWeight) || 400;
          const large = size >= 24 || (size >= 18.66 && weight >= 700);
          // The element's own border and padding are not backdrop: clip line boxes to its content box (a
          // key chip's 1px border would otherwise sit inside the glyph box and read as the worst pixel).
          const eb = el.getBoundingClientRect(), px = (k) => parseFloat(cs[k]) || 0;
          const inline = cs.display === "inline";
          const cTop = inline ? -Infinity : eb.top + px("borderTopWidth") + px("paddingTop"), cBot = inline ? Infinity : eb.bottom - px("borderBottomWidth") - px("paddingBottom");
          let measured = false;
          for (const r0 of range.getClientRects()) {
            const top = Math.max(r0.top, cTop), bottom = Math.min(r0.bottom, cBot);
            const r = { left: r0.left, right: r0.right, top, bottom, width: r0.width, height: bottom - top };
            if (r.width < 2 || r.height < 2) continue;
            if (r.top < 0 || r.bottom > innerHeight || r.right < 0 || r.left > innerWidth) continue;   // a later stop gets it
            // Skip lines covered by another layer (a dialog's focus veil, a sheet): they're meant to recede.
            const hit = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), r.top + r.height / 2);
            if (hit && !el.contains(hit) && !hit.contains(el)) continue;
            toTag.add(el);
            measured = true;
            out.push({ key: n.textContent.trim().slice(0, 40) + "|" + (isPinned ? "pinned" : Math.round(r.top + scrollY)), text: n.textContent.trim().slice(0, 40),
              color, alpha, large, pinned: isPinned,
              x: Math.max(0, Math.floor(r.left)), y: Math.floor(r.top),
              w: Math.ceil(Math.min(r.right, innerWidth) - Math.max(0, r.left)), h: Math.ceil(r.bottom - r.top) });
          }
          if (measured) window.__gcDone.add(el);
        }
      }
      for (const el of toTag) el.dataset.gcMeasure = "";
      return out;
    });
    if (!lines.length) continue;
    await page.waitForTimeout(60);
    const shot = await page.screenshot();
    if (process.env.GC_DEBUG) (await import("node:fs")).writeFileSync(join(process.env.GC_DEBUG, `${state}-${y}.png`), shot);   // what was measured
    const png = shot.toString("base64");
    const res = await page.evaluate(async ({ png, lines }) => {
      const img = new Image(); img.src = "data:image/png;base64," + png; await img.decode();
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d", { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
      const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      for (const el of document.querySelectorAll("[data-gc-measure]")) delete el.dataset.gcMeasure;
      return lines.map((ln) => {
        const d = ctx.getImageData(ln.x, ln.y, Math.max(1, ln.w), Math.max(1, ln.h)).data;
        const t = ln.color, a = t.a * ln.alpha;
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
    }, { png, lines });
    for (const r of res) results.push({ ...r, y: r.y + y, at: y });
  }

  // 3. What was never measured: glass text that stayed covered or off to the side at every stop.
  const skipped = await page.evaluate(() => {
    const out = [];
    for (const root of document.querySelectorAll("[data-gc-surface]")) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!n.textContent.trim() || window.__gcDone?.has(el)) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || el.closest("svg, [hidden], [aria-hidden='true']") || !el.getClientRects().length) continue;
        const eb = el.getBoundingClientRect();
        if (eb.width < 2 || eb.height < 2) continue;   // visually hidden (screen-reader-only) text
        out.push(n.textContent.trim().slice(0, 30));
      }
    }
    return [...new Set(out)];
  });

  // Keep the worst result per line (pinned lines are measured at every stop).
  const byKey = new Map();
  for (const r of results) if (!byKey.has(r.key) || r.worst < byKey.get(r.key).worst) byKey.set(r.key, r);
  const final = [...byKey.values()];
  const bad = final.filter((r) => r.worst < r.need);
  failed += bad.length;
  if (!final.length) { failed += 1; console.log(`\n== ${state}: WARNING: checked 0 lines. No visible glass text found; nothing was verified. Use --all-text, --click, or check the page/width.`); await page.close(); continue; }
  const min = Math.min(...final.map((r) => r.worst));
  console.log(`\n== ${state}: ${surfaceCount} glass surface(s), ${final.length} line(s) over ${uniqStops.length} scroll stop(s), lowest ${min}:1, ${bad.length} below threshold, ${skipped.length} not measured`);
  for (const r of final.sort((a, b) => a.worst - b.worst).slice(0, bad.length ? bad.length + 3 : 5))
    console.log(`${r.worst < r.need ? "FAIL" : "ok  "}  ${String(r.worst).padStart(5)}:1 (needs ${r.need})  "${r.text}"  ${r.pinned ? `pinned, worst at scroll ${r.at}` : `at ${r.x},${r.y}`}`);
  if (process.env.GC_DEBUG) for (const r of bad) console.log("debug", JSON.stringify(r));
  if (skipped.length) console.log(`      not measured (covered at every stop, or outside the viewport sideways): ${skipped.slice(0, 6).map((t) => `"${t}"`).join(", ")}${skipped.length > 6 ? ", …" : ""}`);
  await page.close();
}

await browser.close();
console.log(failed ? `\n${failed} problem(s): failing lines, a missing --click target, or a state where nothing could be checked. Raise the alpha in --glass-dim, go a thickness up, or move the text off the bright patch.` : "\nAll measured text on glass passes in every state.");
process.exitCode = failed ? 1 : 0;

#!/usr/bin/env node
// Blur audit for a section (or any folder of CSS/TSX).
//
//   node <skill folder>/scripts/blur-audit.mjs <folder|file> [...more]   (.css .scss .tsx .ts .jsx .js .html)
//   node <skill folder>/scripts/blur-audit.mjs --url http://localhost:3000/some-page [--seconds 3]
//
// Static mode reads .css/.scss/.tsx/.ts/.jsx/.js files and flags blur problems that break quietly:
// Safari prefixes, missing fallbacks, too much glass, animated blur radii, reveals that never clear.
// URL mode (needs Playwright in the current project) opens the page at 1600x900, lists every blurred
// element with its radius and share of the viewport, and measures the frame rate while the pointer moves.
// Reports only; never edits files. Exit code is 1 when anything is at FAIL level.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, relative } from "node:path";

const args = process.argv.slice(2);
const urlIdx = args.indexOf("--url");
const out = [];
const add = (level, where, msg) => out.push({ level, where, msg });


// ---------------------------------------------------------------------------------------------- static

function files(p) {
  const s = statSync(p);
  if (s.isFile()) return [p];
  return readdirSync(p).flatMap((n) =>
    n === "node_modules" || n.startsWith(".") ? [] : files(join(p, n))
  ).filter((f) => [".css", ".scss", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".html"].includes(extname(f)));
}

function lineOf(src, i) { return src.slice(0, i).split("\n").length; }
function px(s) { const m = /blur\(\s*([\d.]+)px/.exec(s); return m ? Number(m[1]) : null; }

// Tailwind v4 (Lightning CSS) and Autoprefixer add -webkit-backdrop-filter to CSS files at build time.
// Inline React styles are never prefixed by any build step.
function cssPrefixedByBuild() {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    // Next 16 compiles CSS through Lightning CSS (Turbopack), which prefixes for the browserslist targets.
    return ["@tailwindcss/turbopack", "@tailwindcss/postcss", "@tailwindcss/vite", "lightningcss", "autoprefixer", "next"].find((d) => d in deps) ?? null;
  } catch { return null; }
}
const BUILD_PREFIX = cssPrefixedByBuild();

// An .html file is audited twice: its <style> blocks as CSS, its <script> blocks as JS. Everything else is
// blanked to newlines so reported line numbers still point into the .html file.
function units(f) {
  const src = readFileSync(f, "utf8");
  if (extname(f) !== ".html") return [{ f, src, isCss: /\.s?css$/.test(f) }];
  const keep = (tag) => {
    let out = "", last = 0;
    for (const m of src.matchAll(new RegExp(`(<${tag}\\b[^>]*>)([\\s\\S]*?)</${tag}>`, "gi"))) {
      const start = m.index + m[1].length;
      out += src.slice(last, start).replace(/[^\n]/g, "") + m[2];
      last = start + m[2].length;
    }
    return out + src.slice(last).replace(/[^\n]/g, "");
  };
  return [{ f, src: keep("style"), isCss: true }, { f, src: keep("script"), isCss: false }];
}

function staticAudit(target) {
  const list = files(target);
  const surfaces = new Set();
  let glass = 0, hasSupports = false, hasReducedT = false, anyBackdrop = false;

  for (const { f, src, isCss } of list.flatMap(units)) {
    const rel = relative(process.cwd(), f);
    if (/@supports[^{]*backdrop-filter/.test(src)) hasSupports = true;
    if (/prefers-reduced-transparency/.test(src)) hasReducedT = true;

    if (isCss) {
      // Classes whose base rule is masked (progressive-blur bands, extended backdrops, edge strips): their
      // variant rules (e.g. .nav.is-light .nav__edge) are helper layers too, not panels.
      const masked = new Set();
      for (const m of src.matchAll(/([^{}]*)\{([^{}]*)\}/g))
        if (/(^|[^-])mask(-image)?\s*:|-webkit-mask/.test(m[2]))
          for (const c of m[1].matchAll(/\.([\w-]+)/g)) masked.add(c[1]);
      const lastClass = (sel) => { const all = [...sel.matchAll(/\.([\w-]+)/g)]; return all.length ? all[all.length - 1][1] : null; };
      // Walk rule blocks (innermost {...} with no nested braces).
      for (const m of src.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
        const [, selector, body] = m;
        const at = `${rel}:${lineOf(src, m.index + selector.length)}`;
        const sel = selector.trim().split("\n").pop().trim();
        const unpref = /(^|[^-])backdrop-filter\s*:\s*(?!none)/.test(body);
        const pref = /-webkit-backdrop-filter\s*:/.test(body);
        if (unpref || pref) {
          anyBackdrop = true;
          // Count visible surfaces once each: skip rules nested in @supports/@media (fallbacks, variants),
          // masked helper layers (progressive-blur bands, extended backdrops) and filters set to none.
          const before = src.slice(0, m.index);
          const nested = (before.match(/\{/g) || []).length - (before.match(/\}/g) || []).length > 0;
          const helper = /mask(-image)?\s*:/.test(body);
          const off = /backdrop-filter\s*:\s*none/.test(body);
          if (!nested && !helper && !off) surfaces.add(sel.split(/[\s:>+~]/)[0]);
        }
        if (unpref && !pref)
          add(BUILD_PREFIX ? "WARN" : "FAIL", at, BUILD_PREFIX
            ? `${sel}: no -webkit-backdrop-filter in source. This project's build (${BUILD_PREFIX}) adds it, but a copy pasted into a project without it gets no blur in Safari before 18.`
            : `${sel}: backdrop-filter without -webkit-backdrop-filter. Safari before 18 shows no blur.`);
        const bd = /backdrop-filter\s*:\s*([^;]+)/.exec(body);
        const r = bd && px(bd[1]);
        if (r && r > 60) add("WARN", at, `${sel}: backdrop blur ${r}px. Past ~60px glass loses the colour shapes that make it read as glass; 24-44px is the premium range.`);
        const panel = bd && r && r >= 8 && !masked.has(lastClass(sel)) && !/(^|[^-])mask(-image)?\s*:|-webkit-mask/.test(body) && !/var\(--glass/.test(body);
        if (panel && r < 16 && !/@supports|prefers-reduced/.test(selector))
          add("INFO", at, `${sel}: light ${r}px backdrop blur. Over busy or moving content detail shows through as noise; NN/g and Apple use heavier blur (24-44px) for panels with text.`);
        if (panel && !/saturate/.test(bd[1]))
          add("INFO", at, `${sel}: glass without saturate(). Blur greys colour out; saturate(160-180%) keeps the scene vivid through the glass.`);
        if (panel && !/gradient/.test(body) && !/@supports|prefers-reduced|:hover|:focus|:active/.test(selector))
          add("INFO", at, `${sel}: single flat tint on glass. A gradient fill and a lit gradient rim (assets/glass.css) are what make it read as glass, not plastic.`);
        if (/(^|[^-])mask-image\s*:/.test(body) && !/-webkit-mask-image\s*:/.test(body) && unpref)
          add("WARN", at, `${sel}: mask-image on a backdrop layer without -webkit-mask-image (Safari).`);
        const fl = /(^|[^-])filter\s*:\s*([^;]+)/.exec(body);
        const fr = fl && px(fl[2]);
        if (fr && fr >= 40) add("INFO", at, `${sel}: filter blur ${fr}px (glow). Check no overflow:hidden parent clips it, and that a radial-gradient couldn't do it for free.`);
        if (/transition[^;]*\b(backdrop-filter|filter)\b/.test(body) && /blur/.test(body))
          add("WARN", at, `${sel}: transitions a blur radius. Keep the blur fixed and fade opacity instead.`);
      }
      for (const m of src.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
        let depth = 1, i = m.index + m[0].length;            // brace-match: one-line keyframes are fine
        while (i < src.length && depth) { if (src[i] === "{") depth++; else if (src[i] === "}") depth--; i++; }
        const block = src.slice(m.index, i);
        const radii = [...block.matchAll(/blur\(\s*([\d.]+)px/g)].map((b) => Number(b[1]));
        if (!radii.length) continue;
        const max = Math.max(...radii);
        add(max <= 8 ? "INFO" : "WARN", `${rel}:${lineOf(src, m.index)}`, max <= 8
          ? `@keyframes ${m[1]} animates blur() up to ${max}px: fine for a short reveal or crossfade if it ends at filter: none.`
          : `@keyframes ${m[1]} animates blur() up to ${max}px. Animating a large radius re-rasterises every frame; keep the blur fixed and animate opacity/transform (in React, through Framer Motion).`);
      }
    } else {
      // React inline styles and Framer Motion props.
      for (const m of src.matchAll(/(?<![\w])backdropFilter\s*:/g)) {
        anyBackdrop = true; surfaces.add(`${rel}:inline${lineOf(src, m.index)}`);
        const win = src.slice(Math.max(0, m.index - 300), m.index + 300);
        if (!/WebkitBackdropFilter/.test(win))
          add("FAIL", `${rel}:${lineOf(src, m.index)}`, "backdropFilter without WebkitBackdropFilter next to it. Safari before 18 shows no blur.");
      }
      for (const m of src.matchAll(/(?<![\w])maskImage\s*:/g)) {
        const win = src.slice(Math.max(0, m.index - 300), m.index + 300);
        if (/backdropFilter/.test(win) && !/WebkitMaskImage/.test(win))
          add("WARN", `${rel}:${lineOf(src, m.index)}`, "maskImage on a backdrop layer without WebkitMaskImage (Safari).");
      }
      const tw = src.match(/\bbackdrop-blur(-\w+)?\b/g);
      if (tw) { anyBackdrop = true; tw.forEach((t, i) => surfaces.add(`${rel}:tw${i}`)); }
      // Framer Motion blur that animates (initial/animate/variants) but is never cleared.
      // A reveal ends at blur(0px)/blur(0); a static style blur never does.
      const animated = [...src.matchAll(/filter\s*:\s*[`"']blur\(/g)];
      if (animated.length && /blur\(\s*0(px)?\s*\)/.test(src) &&!/transitionEnd\s*:\s*\{[^}]*filter\s*:\s*["']none["']|\.filter\s*=\s*["'](none)?["']|setProperty\(\s*["']filter["']\s*,\s*["']none["']|filter\s*:\s*["']none["']/.test(src))
        add("WARN", `${rel}:${lineOf(src, animated[0].index)}`, `animates filter: blur() ${animated.length}x but never clears it (transitionEnd: { filter: "none" } in Framer Motion, el.style.filter = "none" in plain JS). A leftover blur(0px) keeps a filter layer alive and makes the element a backdrop root.`);
      for (const m of src.matchAll(/initial=\{\{[^}]*opacity\s*:\s*0[^}]*\}\}/g)) {
        const after = src.slice(m.index, m.index + 1500);
        const close = after.indexOf("</motion.");
        const inner = close > 0 ? after.slice(0, close) : after;
        if (/backdrop|glass|Glass|backdrop-blur/.test(inner.slice(m[0].length)))
          add("WARN", `${rel}:${lineOf(src, m.index)}`, "a parent fades in from opacity 0 around what looks like a glass element. The glass shows no blur until the fade ends (backdrop root). Fade the glass itself.");
      }
    }
  }

  glass = surfaces.size;
  const where = relative(process.cwd(), target) || target;
  if (glass > 4) add("WARN", where, `${glass} distinct glass surfaces (${[...surfaces].slice(0, 6).join(", ")}). One hero glass plus thinner supporting glass reads as designed; more than four starts to read as a glass template.`);
  if (anyBackdrop && !hasSupports) add("INFO", where, "no @supports fallback for backdrop-filter. Without support, glass shows a see-through tint; add an opaque fallback.");
  if (anyBackdrop && !hasReducedT) add("INFO", where, "no prefers-reduced-transparency rule. Viewers who reduce transparency still get glass.");
  if (!anyBackdrop && !out.length) add("INFO", where, "no backdrop blur found.");
}

// ------------------------------------------------------------------------------------------------ live

async function live(url, seconds) {
  if (!url) { console.error("--url needs a page address"); process.exit(2); }
  let chromium;
  try { ({ chromium } = createRequire(join(process.cwd(), "package.json"))("playwright")); }
  catch { console.error("Playwright isn't installed in this project. Run: pnpm add -D playwright"); process.exit(2); }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  const found = await page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight, rows = [];
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      const bd = cs.backdropFilter || cs.webkitBackdropFilter || "none";
      const f = cs.filter || "none";
      const hasBd = bd !== "none" && /blur/.test(bd);
      const hasF = /blur/.test(f);
      if (!hasBd && !hasF) continue;
      const r = el.getBoundingClientRect();
      const w = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
      const h = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      if (!w || !h || cs.visibility === "hidden" || cs.display === "none") continue;
      const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
      rows.push({
        el: el.tagName.toLowerCase() + (cls ? "." + cls : ""),
        kind: hasBd ? "backdrop" : "filter",
        value: hasBd ? bd : f,
        share: Math.round((w * h) / (vw * vh) * 1000) / 10,
      });
    }
    return rows.sort((a, b) => b.share - a.share);
  });

  for (const r of found.filter((r) => /blur\(0(px)?\)/.test(r.value)))
    add("WARN", r.el, `still has ${r.value} after settling. Clear it with transitionEnd: { filter: "none" }: a leftover filter keeps a layer alive and blanks any glass inside (backdrop root).`);
  for (const r of found.filter((r) => !/blur\(0(px)?\)/.test(r.value)))
    add(r.kind === "backdrop" && r.share > 33 ? "WARN" : "INFO", r.el,
      `${r.kind} ${r.value} covers ${r.share}% of the viewport${r.kind === "backdrop" && r.share > 33 ? " (over a third: costly over live WebGL)" : ""}`);
  if (!found.length) add("INFO", url, "no blurred elements on screen.");
  const bdShare = found.filter((r) => r.kind === "backdrop").reduce((s, r) => s + r.share, 0);
  if (bdShare > 60) add("WARN", url, `backdrop blur covers ${Math.round(bdShare)}% of the viewport in total. Budget one hero blur per screen.`);

  // Frame rate while the pointer sweeps (cursor-reactive components re-render, glass re-blurs).
  await page.evaluate(() => {
    window.__frames = 0;
    const tick = () => { window.__frames++; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const t0 = Date.now();
  const f0 = await page.evaluate(() => window.__frames);
  for (let i = 0; Date.now() - t0 < seconds * 1000; i++) {
    const a = i / 30;
    await page.mouse.move(800 + Math.cos(a) * 600, 450 + Math.sin(a * 1.3) * 300);
    await page.waitForTimeout(16);
  }
  const fps = Math.round(((await page.evaluate(() => window.__frames)) - f0) / ((Date.now() - t0) / 1000));
  add(fps < 50 ? "WARN" : "INFO", url, `${fps} fps while the pointer moves for ${seconds}s (headless; a real browser with a GPU is usually faster).${fps < 50 ? " A blur is probably over budget." : ""}`);
  await browser.close();
}

// ---------------------------------------------------------------------------------------------- report

function report() {
  const order = { FAIL: 0, WARN: 1, INFO: 2 };
  out.sort((a, b) => order[a.level] - order[b.level]);
  for (const r of out) console.log(`${r.level.padEnd(4)}  ${r.where}  ${r.msg}`);
  const n = (l) => out.filter((r) => r.level === l).length;
  console.log(`\n${n("FAIL")} fail, ${n("WARN")} warn, ${n("INFO")} info`);
  process.exitCode = n("FAIL") ? 1 : 0;
}

// -------------------------------------------------------------------------------------------------- run

if (urlIdx >= 0) await live(args[urlIdx + 1], Number(args[args.indexOf("--seconds") + 1]) || 3);
else {
  if (!args.length) {
    console.error("usage: blur-audit.mjs <folder|file> [...] | --url <page url>");
    process.exit(2);
  }
  for (const target of args) staticAudit(target);
}
report();

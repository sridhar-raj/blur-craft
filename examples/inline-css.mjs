#!/usr/bin/env node
// Inlines the skill's stylesheets into index.html between the <!-- inline:… --> and <!-- /inline --> markers,
// so the example has no render-blocking CSS request. Run after editing assets/glass.css or surfaces.css:
//   node examples/inline-css.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const page = join(here, "index.html");
const html = readFileSync(page, "utf8");
const out = html.replace(/(<!-- inline:([^>]+?) -->)[\s\S]*?(<!-- \/inline -->)/, (_, open, files, close) => {
  const css = files.trim().split(/\s+/).map((f) => `/* ${f} */\n` + readFileSync(join(here, f), "utf8").trim()).join("\n\n");
  return `${open}\n<style>\n${css}\n</style>\n${close}`;
});
if (out === html && !/<!-- inline:/.test(html)) { console.error("No <!-- inline:… --> marker in index.html"); process.exit(1); }
writeFileSync(page, out);
console.log("Inlined into examples/index.html");

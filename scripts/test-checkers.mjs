#!/usr/bin/env node
// Tests for the checkers themselves: each fixture in scripts/fixtures/ is a page or stylesheet a checker must
// catch or pass. Run it after any edit to a checker, so a change can't quietly turn a failure into a pass.
//
//   node <skill folder>/scripts/test-checkers.mjs [--only contrast|frost|audit]
//
// Needs Playwright (Chromium) in the current project for the contrast and frost cases. Exit code 1 if any
// case doesn't behave as expected.

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f) => join(here, "fixtures", f);
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;

// [checker, fixture, extra args, expected exit code, regex the output must match, regex it must NOT match]
const CASES = [
  // blur-audit (static)
  ["audit", "audit-var-webkit.css", [], 0, /-webkit-backdrop-filter built from var\(\)/, /(^|[^-])backdrop-filter and/],
  ["audit", "audit-var-unprefixed.css", [], 0, /: backdrop-filter built from var\(\)/],
  ["audit", "audit-literal-ok.css", [], 0, /./, /built from var\(\)|FAIL/],
  ["audit", "audit-no-prefix.css", [], 1, /FAIL.*without -webkit-backdrop-filter/],
  ["audit", "audit-wasted-blur.css", [], 0, /32px backdrop blur under a 90% fill/],
  // glass-contrast
  ["contrast", "contrast-pass.html", [], 0, /All measured text on glass passes/],
  ["contrast", "contrast-fail-milky.html", [], 1, /FAIL.*White text on 15% white glass/],
  ["contrast", "contrast-oklch-grey.html", [], 1, /FAIL.*Mid-grey oklch text/],                 // first-three-numbers parsing passed this at 19:1
  ["contrast", "contrast-p3-pass.html", [], 0, /All measured text on glass passes/],             // and failed white display-p3 text
  ["contrast", "contrast-below-fold.html", [], 1, /FAIL.*Fails far below the fold/],             // was never measured
  ["contrast", "contrast-helper-nav.html", [], 1, /FAIL.*"(Home|Pricing)"/],                     // text over a separate blur layer
  ["contrast", "contrast-dialog-click.html", [], 1, /checked 0 lines/],
  ["contrast", "contrast-dialog-click.html", ["--click", "#open"], 1, /FAIL.*milky dialog/],
  ["contrast", "contrast-light-glass.html", [], 0, /All measured text on glass passes/],         // glass--light used to get white text (1.18:1)
  // frost-check
  ["frost", "frost-ok.html", [], 0, /FROSTS/],
  ["frost", "frost-no-filter.html", [], 1, /NO BLUR/],
  ["frost", "frost-front-text.html", [], 0, /FROSTS.*bar__bd/],                                // links in front counted as backdrop: a working blur read as WEAK or NO BLUR
  ["frost", "frost-masked-ok.html", [], 0, /FROSTS.*\(masked\)/],                              // masked layers used to be skipped
  ["frost", "frost-masked-broken.html", [], 1, /NO BLUR.*\(masked\)/],
];

const SCRIPT = { audit: "blur-audit.mjs", contrast: "glass-contrast.mjs", frost: "frost-check.mjs" };
let bad = 0;
for (const [kind, file, extra, code, must, mustNot] of CASES) {
  if (only && only !== kind) continue;
  // The audit runs from the fixtures folder so this project's build tools (Autoprefixer, Tailwind) don't soften
  // its findings; the browser checks run from here, where Playwright is installed.
  const r = spawnSync(process.execPath, [join(here, SCRIPT[kind]), fx(file), ...extra], { encoding: "utf8", cwd: kind === "audit" ? join(here, "fixtures") : process.cwd() });
  const out = (r.stdout || "") + (r.stderr || "");
  const problems = [];
  if (r.status !== code) problems.push(`exit ${r.status}, expected ${code}`);
  if (!must.test(out)) problems.push(`output lacks ${must}`);
  if (mustNot && mustNot.test(out)) problems.push(`output has ${mustNot}`);
  const label = `${kind.padEnd(8)} ${file}${extra.length ? " " + extra.join(" ") : ""}`;
  if (problems.length) { bad++; console.log(`FAIL  ${label}: ${problems.join("; ")}\n${out.split("\n").slice(0, 12).map((l) => "      | " + l).join("\n")}`); }
  else console.log(`ok    ${label}`);
}
console.log(bad ? `\n${bad} checker test(s) failed.` : "\nAll checker tests pass.");
process.exitCode = bad ? 1 : 0;

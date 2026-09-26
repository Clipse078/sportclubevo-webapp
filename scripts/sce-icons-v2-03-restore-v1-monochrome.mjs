#!/usr/bin/env node
/**
 * SCE-ICONS-V2-03 — restore approved V1 master geometry as monochrome currentColor SVGs.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const V1_SNAPSHOT = "087dc2f75ddb1d806cb5d9ac1e7924a6c4c5fb1c";
const ICON_DIR = join(ROOT, "public/images/icons");

const MASTER_NAMES = execFileSync(
  "git",
  ["ls-tree", "--name-only", `${V1_SNAPSHOT}:public/images/icons/`],
  { encoding: "utf8", cwd: ROOT },
)
  .split("\n")
  .filter((file) => file.endsWith(".svg"))
  .map((file) => file.replace(/\.svg$/, ""))
  .sort();

function readV1Svg(name) {
  return execFileSync("git", ["show", `${V1_SNAPSHOT}:public/images/icons/${name}.svg`], {
    encoding: "utf8",
    cwd: ROOT,
  });
}

function convertV1ToMonochrome(v1Svg) {
  let svg = v1Svg.trim();
  svg = svg.replace(/\sstyle="[^"]*"/gi, "");
  svg = svg.replace(/stroke="(?!none\b|currentColor\b)([^"]*)"/gi, 'stroke="currentColor"');
  svg = svg.replace(/fill="(?!none\b|currentColor\b)([^"]*)"/gi, 'fill="currentColor"');
  if (!/xmlns=/.test(svg)) {
    svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!/aria-hidden=/.test(svg)) {
    svg = svg.replace(/<svg([^>]*)>/i, "<svg$1 aria-hidden=\"true\">");
  }
  if (!/currentColor/.test(svg)) {
    throw new Error("Monochrome conversion produced no currentColor token");
  }
  return `${svg}\n`;
}

let restored = 0;
for (const name of MASTER_NAMES) {
  const v1 = readV1Svg(name);
  const monochrome = convertV1ToMonochrome(v1);
  writeFileSync(join(ICON_DIR, `${name}.svg`), monochrome);
  restored += 1;
}

console.log(`restored ${restored}/${MASTER_NAMES.length} V1 masters as monochrome SVGs`);

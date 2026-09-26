#!/usr/bin/env node
/**
 * Regenerate v2-authoritative-artwork-fingerprints.ts from public/images/icons/*.svg
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const MASTER_NAMES = execFileSync(
  "git",
  ["ls-tree", "--name-only", "HEAD:public/images/icons/"],
  { encoding: "utf8", cwd: ROOT },
)
  .split("\n")
  .filter((file) => file.endsWith(".svg"))
  .map((file) => file.replace(/\.svg$/, ""))
  .sort();

function fingerprintSvg(relativePath) {
  const raw = readFileSync(join(ROOT, relativePath), "utf8");
  const geometry = raw.replace(/\sstyle="[^"]*"/gi, "").replace(/\s+/g, " ").trim();
  return createHash("sha256").update(geometry).digest("hex");
}

const fingerprints = {};
for (const name of MASTER_NAMES) {
  fingerprints[name] = fingerprintSvg(`public/images/icons/${name}.svg`);
}

const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

const lines = MASTER_NAMES.map(
  (name) => `  "${name}": "${fingerprints[name]}" as const,`,
).join("\n");

const file = `/**
 * Frozen V2 authoritative artwork fingerprints (SCE-ICONS-V2-03).
 * Geometry source: approved V1 final snapshot 087dc2f75ddb1d806cb5d9ac1e7924a6c4c5fb1c
 * Color model: V2 currentColor monochrome
 * Source commit: ${sourceSha}
 * Do not edit — regenerate only via deliberate artwork approval.
 */

import type { SceApprovedMasterIconName } from "../masters/approved-hero-meta";

export const SCE_V2_AUTHORITATIVE_ARTWORK_SOURCE_SHA =
  "${sourceSha}" as const;

export const SCE_V2_AUTHORITATIVE_ARTWORK_FINGERPRINTS = {
${lines}
} as const satisfies Record<SceApprovedMasterIconName, string>;
`;

writeFileSync(
  join(ROOT, "components/design-system/icons/v2/v2-authoritative-artwork-fingerprints.ts"),
  file,
);
console.log("wrote v2-authoritative-artwork-fingerprints.ts for", MASTER_NAMES.length, "masters");

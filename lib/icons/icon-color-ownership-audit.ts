/**
 * Icon color ownership audit — paths that block V2 currentColor consistency.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { SCE_APPROVED_MASTER_ICON_NAMES } from "@/components/design-system/icons/masters/approved-hero-meta";

export type IconColorOwnership =
  | "MASTER_OWNED_COLOR"
  | "COMPONENT_OWNED_COLOR"
  | "STATE_OWNED_COLOR"
  | "SEMANTIC_STATUS_COLOR"
  | "INHERITED_CURRENTCOLOR";

export type IconColorOwnershipRecord = {
  file: string;
  line: number;
  ownership: IconColorOwnership;
  pattern: string;
  notes: string;
};

export type IconColorOwnershipAuditReport = {
  records: IconColorOwnershipRecord[];
  totals: Record<IconColorOwnership, number>;
  blockersForV2: string[];
};

const SCAN_ROOTS = ["components/design-system/icons/masters", "components", "app/(admin)"];
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "__tests__"]);

function walk(dir: string, out: string[] = []): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return out;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts|css)$/.test(entry)) out.push(full);
  }
  return out;
}

function lineOf(source: string, idx: number): number {
  return source.slice(0, idx).split("\n").length;
}

export function runIconColorOwnershipAudit(root = process.cwd()): IconColorOwnershipAuditReport {
  const records: IconColorOwnershipRecord[] = [];

  for (const scanRoot of SCAN_ROOTS) {
    for (const file of walk(join(root, scanRoot))) {
      const rel = relative(root, file);
      const src = readFileSync(file, "utf8");

      const patterns: Array<[RegExp, IconColorOwnership, string]> = [
        [/var\(--sce-icon-(primary|secondary|accent|muted)\)/, "MASTER_OWNED_COLOR", "SCE master token stroke"],
        [/stroke="#[0-9A-Fa-f]{3,8}"/, "MASTER_OWNED_COLOR", "Hard-coded stroke hex in geometry"],
        [/fill="#[0-9A-Fa-f]{3,8}"/, "MASTER_OWNED_COLOR", "Hard-coded fill hex in geometry"],
        [/text-\[var\(--sce-(success|warning|danger|info)/, "SEMANTIC_STATUS_COLOR", "Semantic status text token"],
        [/var\(--sce-(success|warning|danger|info)/, "SEMANTIC_STATUS_COLOR", "Semantic status surface"],
        [/hover:text-|data-\[state=active\]|aria-selected/, "STATE_OWNED_COLOR", "Interactive state color"],
        [/currentColor/, "INHERITED_CURRENTCOLOR", "currentColor inheritance"],
        [/text-\[var\(--(foreground|muted|text-2)\)/, "COMPONENT_OWNED_COLOR", "Component foreground token"],
        [/--sce-icon-primary:\s*#/, "MASTER_OWNED_COLOR", "Inline SVG style baked brand variables"],
      ];

      const lines = src.split("\n");
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i]!;
        for (const [re, ownership, notes] of patterns) {
          if (!re.test(line)) continue;
          records.push({
            file: rel,
            line: i + 1,
            ownership,
            pattern: line.trim().slice(0, 80),
            notes,
          });
          break;
        }
      }
    }
  }

  const totals = records.reduce(
    (acc, r) => {
      acc[r.ownership] = (acc[r.ownership] ?? 0) + 1;
      return acc;
    },
    {} as Record<IconColorOwnership, number>,
  );

  for (const k of [
    "MASTER_OWNED_COLOR",
    "COMPONENT_OWNED_COLOR",
    "STATE_OWNED_COLOR",
    "SEMANTIC_STATUS_COLOR",
    "INHERITED_CURRENTCOLOR",
  ] as IconColorOwnership[]) {
    totals[k] = totals[k] ?? 0;
  }

  const blockersForV2 = [
    `All ${SCE_APPROVED_MASTER_ICON_NAMES.length} V1 approved masters embed MASTER_OWNED_COLOR via var(--sce-icon-*) React geometry and baked SVG style attributes.`,
    "Approved master SVGs under public/images/icons/ ship inline --sce-icon-* hex defaults (not currentColor).",
    "V2-02 must replace geometry with currentColor-compliant monochrome masters before removing token stroke roles.",
    "Status/success/warning surfaces correctly use SEMANTIC_STATUS_COLOR — must remain outside domain master geometry.",
  ];

  return { records, totals, blockersForV2 };
}

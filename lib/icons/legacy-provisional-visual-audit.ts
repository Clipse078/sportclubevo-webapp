/**
 * Legacy / provisional visual language beyond import-level inventory.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type LegacyProvisionalCategory =
  | "INITIALS"
  | "EMOJI"
  | "INLINE_SVG"
  | "CSS_GLYPHS"
  | "PROVISIONAL_COMPONENTS"
  | "DOMAIN_DEBT";

export type LegacyProvisionalRecord = {
  category: LegacyProvisionalCategory;
  file: string;
  line: number;
  snippet: string;
  classification: "CONTENT_IDENTITY" | "DOMAIN_SUBSTITUTE" | "DECORATIVE" | "REQUIRES_REVIEW";
  notes: string;
};

export type LegacyProvisionalVisualAuditReport = {
  records: LegacyProvisionalRecord[];
  totals: Record<LegacyProvisionalCategory, number>;
  domainDebt: LegacyProvisionalRecord[];
};

const SCAN_ROOTS = ["app/(admin)", "components"];
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "baseline-backups", "__tests__", "design-system/icons"]);

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

function classifyInitialsContext(snippet: string, file: string): LegacyProvisionalRecord["classification"] {
  if (/team|crest|avatar|AccountMenu|AdminAvatar|RegistrationApplicant/i.test(file + snippet)) {
    return "CONTENT_IDENTITY";
  }
  if (/org-unit|module|dashboard/i.test(file)) {
    return "DOMAIN_SUBSTITUTE";
  }
  return "REQUIRES_REVIEW";
}

export function runLegacyProvisionalVisualAudit(root = process.cwd()): LegacyProvisionalVisualAuditReport {
  const records: LegacyProvisionalRecord[] = [];

  for (const scanRoot of SCAN_ROOTS) {
    for (const file of walk(join(root, scanRoot))) {
      const rel = relative(root, file);
      if (rel.startsWith("components/design-system/icons/")) continue;
      const src = readFileSync(file, "utf8");

      if (src.length > 250_000) continue;

      const lineRules: Array<[RegExp, LegacyProvisionalCategory, LegacyProvisionalRecord["classification"], string]> = [
        [/getInitials|initials\(/, "INITIALS", "REQUIRES_REVIEW", "Text initial substitute"],
        [/<svg[\s>]/, "INLINE_SVG", "REQUIRES_REVIEW", "Inline SVG outside SCE design system"],
        [/fca-button-primary|fca-pill|DashboardModuleCards/, "PROVISIONAL_COMPONENTS", "DOMAIN_SUBSTITUTE", "Legacy/provisional FCA visual wrapper"],
        [/from "lucide-react"/, "DOMAIN_DEBT", "REQUIRES_REVIEW", "Lucide import (classify downstream usage separately)"],
      ];

      const srcLines = src.split("\n");
      for (let i = 0; i < srcLines.length; i += 1) {
        const line = srcLines[i]!;
        for (const [re, category, defaultClass, notes] of lineRules) {
          if (!re.test(line)) continue;
          const snippet = line.trim().slice(0, 100);
          let classification = defaultClass;
          if (category === "INITIALS") {
            classification = classifyInitialsContext(snippet, rel);
          }
          if (category === "INLINE_SVG") {
            if (/chart|sparkline|progress|loader|spinner|qr|barcode/i.test(rel + snippet)) {
              classification = "DECORATIVE";
            } else if (/logo|crest|avatar|brand/i.test(rel)) {
              classification = "CONTENT_IDENTITY";
            } else {
              classification = "DECORATIVE";
            }
          }
          if (category === "DOMAIN_DEBT" && /Building2|Network|Globe|Users|Newspaper|Landmark|FolderOpen/.test(line)) {
            classification = "DOMAIN_SUBSTITUTE";
          }
          records.push({
            category,
            file: rel,
            line: i + 1,
            snippet,
            classification,
            notes,
          });
          break;
        }
      }
    }
  }

  const totals = records.reduce(
    (acc, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<LegacyProvisionalCategory, number>,
  );

  for (const k of [
    "INITIALS",
    "EMOJI",
    "INLINE_SVG",
    "CSS_GLYPHS",
    "PROVISIONAL_COMPONENTS",
    "DOMAIN_DEBT",
  ] as LegacyProvisionalCategory[]) {
    totals[k] = totals[k] ?? 0;
  }

  const domainDebt = records.filter((r) => r.classification === "DOMAIN_SUBSTITUTE");

  return { records, totals, domainDebt };
}

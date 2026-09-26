import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type LegacyIconSource =
  | "lucide-react"
  | "@heroicons"
  | "react-icons"
  | "fontawesome"
  | "inline-svg";

export type LegacyIconInventoryReport = {
  scannedFiles: number;
  bySource: Record<LegacyIconSource, { count: number; files: string[] }>;
  enforcementActive: boolean;
};

const SOURCE_PATTERNS: Record<LegacyIconSource, RegExp> = {
  "lucide-react": /from\s+["']lucide-react["']/,
  "@heroicons": /from\s+["']@heroicons\//,
  "react-icons": /from\s+["']react-icons\//,
  fontawesome: /from\s+["']@fortawesome|fontawesome/i,
  "inline-svg": /<svg[\s>]/,
};

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "baseline-backups",
  "components/design-system/icons/glyphs",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Read-only scan for legacy external / inline icon usage. */
export function runLegacyIconInventory(root = process.cwd()): LegacyIconInventoryReport {
  const files = walk(root);
  const bySource = Object.fromEntries(
    (Object.keys(SOURCE_PATTERNS) as LegacyIconSource[]).map((source) => [
      source,
      { count: 0, files: [] as string[] },
    ]),
  ) as LegacyIconInventoryReport["bySource"];

  for (const file of files) {
    const rel = relative(root, file);
    if (rel.startsWith("components/design-system/icons/")) continue;

    const src = readFileSync(file, "utf8");
    for (const source of Object.keys(SOURCE_PATTERNS) as LegacyIconSource[]) {
      if (SOURCE_PATTERNS[source].test(src)) {
        bySource[source].count += 1;
        if (bySource[source].files.length < 50) {
          bySource[source].files.push(rel);
        }
      }
    }
  }

  return {
    scannedFiles: files.length,
    bySource,
    enforcementActive: false,
  };
}

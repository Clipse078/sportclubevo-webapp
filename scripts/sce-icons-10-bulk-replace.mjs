#!/usr/bin/env node
/**
 * Mechanical JSX replacements for unambiguous domain Lucide → SCE semantics.
 * Skips files under design-system icon sources and tests.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const REPLACEMENTS = [
  { lucide: "Newspaper", master: "news", defaultSize: 20 },
  { lucide: "Globe2", master: "website", defaultSize: 20 },
  { lucide: "Globe", master: "website", defaultSize: 20 },
  { lucide: "Mail", master: "communication", defaultSize: 20 },
  { lucide: "Wallet", master: "finance", defaultSize: 20 },
  { lucide: "Receipt", master: "billing-invoice", defaultSize: 20 },
  { lucide: "PartyPopper", master: "events", defaultSize: 20 },
  { lucide: "CheckSquare", master: "tasks", defaultSize: 20 },
  { lucide: "ListChecks", master: "tasks", defaultSize: 20 },
  { lucide: "FolderOpen", master: "documents", defaultSize: 20 },
  { lucide: "Plug", master: "integration", defaultSize: 20 },
  { lucide: "MapPin", master: "facility", defaultSize: 20 },
  { lucide: "ShieldCheck", master: "roles-access", defaultSize: 20 },
  { lucide: "UserCircle", master: "people", defaultSize: 20 },
  { lucide: "UsersRound", master: "member", defaultSize: 20 },
  { lucide: "Whistle", master: "coach", defaultSize: 20 },
  { lucide: "HandHelping", master: "volunteer", defaultSize: 20 },
  { lucide: "BadgeDollarSign", master: "sponsor", defaultSize: 20 },
  { lucide: "CalendarRange", master: "season", defaultSize: 20 },
  { lucide: "FileSignature", master: "contract", defaultSize: 20 },
  { lucide: "Monitor", master: "infoboard", defaultSize: 20 },
  { lucide: "Network", master: "org-unit", defaultSize: 20 },
  { lucide: "Landmark", master: "club", defaultSize: 20 },
  { lucide: "ClipboardList", master: "requirements", defaultSize: 20 },
  { lucide: "Send", master: "publish", defaultSize: 20 },
  { lucide: "Settings2", master: "settings", defaultSize: 20 },
  { lucide: "Settings", master: "settings", defaultSize: 20 },
  { lucide: "Shield", master: "roles-access", defaultSize: 20 },
  { lucide: "Users", master: "people", defaultSize: 20 },
  { lucide: "Building2", master: "org-unit", defaultSize: 20 },
  { lucide: "Bell", master: "notifications", defaultSize: 20 },
  { lucide: "Users2", master: "people", defaultSize: 20 },
];

const SKIP = new Set(["node_modules", ".next", ".git", "glyphs", "__tests__"]);

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (SKIP.has(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(e)) out.push(p);
  }
  return out;
}

function ensureImport(source) {
  if (source.includes("ProductDomainSceIcon")) return source;
  const importLine =
    'import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";\n';
  const idx = source.indexOf("\n");
  return importLine + source.slice(idx + 1);
}

function lucideSize(className) {
  if (/h-10|w-10/.test(className)) return 48;
  if (/h-5|w-5/.test(className)) return 20;
  if (/h-6|w-6/.test(className)) return 24;
  if (/h-3|w-3/.test(className)) return 12;
  if (/h-4|w-4/.test(className)) return 16;
  return 20;
}

function processFile(path) {
  const rel = relative(ROOT, path);
  if (rel.startsWith("components/design-system/icons/")) return false;
  let src = readFileSync(path, "utf8");
  if (!src.includes("lucide-react")) return false;
  let changed = false;

  for (const { lucide, master } of REPLACEMENTS) {
    const re = new RegExp(`<${lucide}\\s+className="([^"]*)"\\s*/>`, "g");
    src = src.replace(re, (_, cls) => {
      changed = true;
      const size = lucideSize(cls);
      const cn = cls.includes("text-") || cls.includes("shrink")
        ? ` className="${cls}"`
        : "";
      return `<ProductDomainSceIcon name="${master}" size={${size}}${cn} />`;
    });
    const styleRe = new RegExp(
      `<${lucide}\\s+style=\\{\\{\\s*width:\\s*(\\d+),\\s*height:\\s*(\\d+)\\s*\\}\\}\\s*/>`,
      "g",
    );
    src = src.replace(styleRe, (_, w) => {
      changed = true;
      const size = Number(w) <= 16 ? 16 : Number(w) <= 20 ? 20 : 24;
      return `<ProductDomainSceIcon name="${master}" size={${size}} />`;
    });

    const re2 = new RegExp(`<${lucide}\\s+className="([^"]*)"\\s*>`, "g");
    src = src.replace(re2, (_, cls) => {
      changed = true;
      const size = lucideSize(cls);
      return `<ProductDomainSceIcon name="${master}" size={${size}} className="${cls}" />`;
    });

    const re3 = new RegExp(`<${lucide}\\s+className=\\{([^}]+)\\}\\s*/>`, "g");
    src = src.replace(re3, (_, clsExpr) => {
      changed = true;
      return `<ProductDomainSceIcon name="${master}" size={16} className={${clsExpr}} />`;
    });

    const re4 = new RegExp(
      `<${lucide}\\s+className="([^"]*)"\\s+aria-hidden(?:="true")?\\s*/>`,
      "g",
    );
    src = src.replace(re4, (_, cls) => {
      changed = true;
      const size = lucideSize(cls);
      return `<ProductDomainSceIcon name="${master}" size={${size}} className="${cls}" />`;
    });
  }

  if (changed) {
    src = ensureImport(src);
    writeFileSync(path, src);
  }
  return changed;
}

const files = [...walk(join(ROOT, "app")), ...walk(join(ROOT, "components")), ...walk(join(ROOT, "lib"))];
let n = 0;
for (const f of files) {
  if (processFile(f)) n += 1;
}
console.log(`Updated ${n} files`);

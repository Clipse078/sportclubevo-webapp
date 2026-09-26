import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { SCE_APPROVED_MASTER_ICON_NAMES } from "@/components/design-system/icons/masters/approved-hero-meta";
import { NAV_DESTINATION_SCE_ICON_BY_KEY } from "@/lib/nav/nav-destination-sce-icons";
import { missingSceSemanticConcepts, MISSING_SCE_SEMANTICS } from "@/lib/icons/missing-sce-semantics";
import { LUCIDE_UTILITY_ALLOWLIST } from "@/lib/icons/lucide-utility-allowlist";

export type IconInventoryClassification =
  | "SCE_APPROVED"
  | "UTILITY_ALLOWED"
  | "DOMAIN_REPLACE"
  | "AMBIGUOUS"
  | "DEAD_CODE"
  | "THIRD_PARTY_REQUIRED";

export type IconInventoryOccurrence = {
  file: string;
  line: number;
  symbol: string;
  classification: IconInventoryClassification;
  proposedSceMaster: string | null;
  missingConcept: string | null;
};

export type ProductDomainIconInventoryReport = {
  scannedFiles: number;
  iconOccurrences: number;
  counts: Record<IconInventoryClassification, number>;
  occurrences: IconInventoryOccurrence[];
  unresolvedDomainWithExistingMaster: IconInventoryOccurrence[];
  unresolvedDomainWithoutMaster: IconInventoryOccurrence[];
};

/** Lucide exports with a single approved SCE semantic (safe for automated guard). */
export const UNAMBIGUOUS_DOMAIN_LUCIDE_TO_SCE: Record<string, string> = {
  Newspaper: "news",
  Globe: "website",
  Globe2: "website",
  Mail: "communication",
  Wallet: "finance",
  Receipt: "billing-invoice",
  PartyPopper: "events",
  Landmark: "club",
  FolderOpen: "documents",
  Plug: "integration",
  MapPin: "facility",
  UserCircle: "people",
  Users: "people",
  UsersRound: "member",
  Whistle: "coach",
  HandHelping: "volunteer",
  BadgeDollarSign: "sponsor",
  CalendarRange: "season",
  FileSignature: "contract",
  Monitor: "infoboard",
  Network: "org-unit",
  Building2: "org-unit",
  ClipboardList: "requirements",
};

const SCAN_ROOTS = ["app", "components", "lib"] as const;

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  ".git",
  "baseline-backups",
  "glyphs",
  "__tests__",
]);

const SKIP_FILE_PREFIXES = ["components/design-system/icons/"];

/** Legacy inventory hints — resolved via context in {@link resolveLucideSemantic}. */
export const MISSING_BY_LUCIDE: Record<string, string> = {};

function walk(dir: string, out: string[] = []): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return out;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIR_NAMES.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

function extractLucideImports(source: string): string[] {
  const symbols = new Set<string>();
  const importRe =
    /import\s+\{([^}]+)\}\s+from\s+["']lucide-react["']/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(source))) {
    for (const part of m[1].split(",")) {
      const sym = part.trim().split(/\s+as\s+/)[0]?.trim();
      if (sym) symbols.add(sym);
    }
  }
  return [...symbols];
}

function lineOfSymbol(source: string, symbol: string): number {
  const idx = source.indexOf(symbol);
  if (idx < 0) return 1;
  return source.slice(0, idx).split("\n").length;
}

const SCE_DOMAIN_COMPONENT_BY_MASTER: Record<string, string> = {
  people: "PeopleSceIcon",
  member: "MemberSceIcon",
  "roles-access": "RolesAccessSceIcon",
  "org-unit": "OrgUnitSceIcon",
  organisation: "OrganisationSceIcon",
  website: "WebsiteSceIcon",
  communication: "CommunicationSceIcon",
  season: "SeasonSceIcon",
  facility: "FacilitySceIcon",
  news: "NewsSceIcon",
  tasks: "TasksSceIcon",
  notifications: "NotificationsSceIcon",
  requirements: "RequirementsSceIcon",
  documents: "DocumentsSceIcon",
  match: "MatchSceIcon",
  club: "ClubSceIcon",
  team: "TeamSceIcon",
};

function fileUsesSceMaster(source: string, master: string): boolean {
  const domainComponent = SCE_DOMAIN_COMPONENT_BY_MASTER[master];
  return (
    source.includes(`name="${master}"`) ||
    source.includes(`name={'${master}'}`) ||
    source.includes(`name={\"${master}\"}`) ||
    source.includes(`name={\`${master}\`}`) ||
    (source.includes(`"${master}"`) && source.includes("SceIcon")) ||
    (domainComponent ? source.includes(domainComponent) : false) ||
    (master === "org-unit" && source.includes("OrgUnitTypeSceIcon"))
  );
}

function symbolStillRenderedInJsx(source: string, symbol: string): boolean {
  const tag = new RegExp(`<${symbol}(?![A-Za-z0-9])`);
  return tag.test(source) || new RegExp(`\\b${symbol}\\s+className=`).test(source);
}

function classifySymbol(
  symbol: string,
  file: string,
  source: string,
): Pick<
  IconInventoryOccurrence,
  "classification" | "proposedSceMaster" | "missingConcept"
> {
  if (!symbolStillRenderedInJsx(source, symbol)) {
    return {
      classification: "DEAD_CODE",
      proposedSceMaster: null,
      missingConcept: null,
    };
  }

  if (LUCIDE_UTILITY_ALLOWLIST.has(symbol)) {
    return {
      classification: "UTILITY_ALLOWED",
      proposedSceMaster: null,
      missingConcept: null,
    };
  }

  const missingConcept = MISSING_BY_LUCIDE[symbol];
  if (missingConcept && missingSceSemanticConcepts().has(missingConcept)) {
    return {
      classification: "DOMAIN_REPLACE",
      proposedSceMaster: null,
      missingConcept,
    };
  }

  const proposed = UNAMBIGUOUS_DOMAIN_LUCIDE_TO_SCE[symbol];
  if (proposed && (SCE_APPROVED_MASTER_ICON_NAMES as readonly string[]).includes(proposed)) {
    if (!symbolStillRenderedInJsx(source, symbol) || fileUsesSceMaster(source, proposed)) {
      return {
        classification: symbolStillRenderedInJsx(source, symbol)
          ? "DOMAIN_REPLACE"
          : "SCE_APPROVED",
        proposedSceMaster: proposed,
        missingConcept: null,
      };
    }
    return {
      classification: "DOMAIN_REPLACE",
      proposedSceMaster: proposed,
      missingConcept: null,
    };
  }

  if (symbol.endsWith("Icon") || symbol === "LucideIcon") {
    return {
      classification: "THIRD_PARTY_REQUIRED",
      proposedSceMaster: null,
      missingConcept: null,
    };
  }

  return {
    classification: "AMBIGUOUS",
    proposedSceMaster: null,
    missingConcept: null,
  };
}

export function runProductDomainIconInventory(root = process.cwd()): ProductDomainIconInventoryReport {
  const files: string[] = [];
  for (const scanRoot of SCAN_ROOTS) {
    walk(join(root, scanRoot), files);
  }

  const filtered = files.filter((f) => {
    const rel = relative(root, f);
    return !SKIP_FILE_PREFIXES.some((p) => rel.startsWith(p));
  });

  const occurrences: IconInventoryOccurrence[] = [];
  const counts: Record<IconInventoryClassification, number> = {
    SCE_APPROVED: 0,
    UTILITY_ALLOWED: 0,
    DOMAIN_REPLACE: 0,
    AMBIGUOUS: 0,
    DEAD_CODE: 0,
    THIRD_PARTY_REQUIRED: 0,
  };

  for (const file of filtered) {
    const rel = relative(root, file);
    const source = readFileSync(file, "utf8");
    if (!source.includes("lucide-react") && !source.includes("<svg")) continue;

    for (const symbol of extractLucideImports(source)) {
      const row = classifySymbol(symbol, rel, source);
      const occurrence: IconInventoryOccurrence = {
        file: rel,
        line: lineOfSymbol(source, symbol),
        symbol,
        ...row,
      };
      occurrences.push(occurrence);
      counts[row.classification] += 1;
    }

    if (source.includes("SceIcon") || source.includes("NavDestinationSceIcon")) {
      counts.SCE_APPROVED += 1;
    }
  }

  // Nav mappings count as SCE approved domain surfaces
  counts.SCE_APPROVED += Object.keys(NAV_DESTINATION_SCE_ICON_BY_KEY).length;

  const unresolvedDomainWithExistingMaster = occurrences.filter(
    (o) => o.classification === "DOMAIN_REPLACE" && o.proposedSceMaster,
  );
  const unresolvedDomainWithoutMaster = occurrences.filter(
    (o) => o.classification === "DOMAIN_REPLACE" && o.missingConcept,
  );

  return {
    scannedFiles: filtered.length,
    iconOccurrences: occurrences.length,
    counts,
    occurrences,
    unresolvedDomainWithExistingMaster,
    unresolvedDomainWithoutMaster,
  };
}

export function summarizeMissingSemanticsAccounted(): number {
  return MISSING_SCE_SEMANTICS.length;
}

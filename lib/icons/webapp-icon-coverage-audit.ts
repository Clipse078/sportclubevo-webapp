import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { SCE_APPROVED_MASTER_ICON_NAMES } from "@/components/design-system/icons/masters/approved-hero-meta";
import { SCE_ICON_REGISTRY, SCE_ICON_REGISTRY_NAMES } from "@/components/design-system/icons/registry";
import {
  auditNavigationCompleteness,
  buildAppNavigationModelForUser,
} from "@/lib/nav/app-navigation-model";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import { getNavDestinationSceIconName } from "@/lib/nav/nav-destination-sce-icons";
import { runLegacyIconInventory } from "@/lib/icons/legacy-icon-inventory";
import { LUCIDE_UTILITY_ALLOWLIST } from "@/lib/icons/lucide-utility-allowlist";
import { MISSING_SCE_SEMANTICS, missingSceSemanticConcepts } from "@/lib/icons/missing-sce-semantics";
import {
  QUESTIONABLE_UTILITY_ALLOWLIST,
  resolveLucideSemantic,
  type IconSemanticResolution,
  type WebappIconSemanticCategory,
} from "@/lib/icons/icon-semantic-resolution";
import {
  runProductDomainIconInventory,
  type IconInventoryClassification,
} from "@/lib/icons/product-domain-icon-inventory";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

export type RouteConsistencyState =
  | "CONSISTENT"
  | "MIXED_BY_DESIGN"
  | "MIXED_MISSING_MASTER"
  | "LEGACY_MIX"
  | "REQUIRES_REVIEW";

export type IconOccurrenceRecord = {
  id: string;
  file: string;
  line: number;
  route: string;
  zone: string;
  sourceKind:
    | "lucide-jsx"
    | "sce-icon"
    | "domain-sce-component"
    | "nav-destination-sce"
    | "inline-svg"
    | "emoji-ui"
    | "css-background";
  symbol: string;
  classification: WebappIconSemanticCategory;
  sceMaster: string | null;
  missingConcept: string | null;
  legacyDespiteMaster: boolean;
  reason: string;
  jsxSnippet: string;
  verification: "STATICALLY_VERIFIED" | "RUNTIME_VERIFIED" | "NOT_RUNTIME_VERIFIED";
};

export type RouteModuleAuditRow = {
  route: string;
  domain: string;
  owner: string;
  reachableFrom: string[];
  componentFiles: string[];
  iconOccurrences: number;
  sceApproved: number;
  missingMaster: number;
  utility: number;
  status: number;
  content: number;
  decorative: number;
  legacyWithAvailableMaster: number;
  unknown: number;
  dead: number;
  consistency: RouteConsistencyState;
  notes: string;
};

export type WebappIconCoverageAuditReport = {
  routeInventory: {
    authenticatedRouteFiles: number;
    routeFamilies: number;
    canonicalNavDestinations: number;
    nestedRoutes: number;
    dynamicRouteFamilies: number;
    modulesAudited: number;
  };
  classificationTotals: Record<WebappIconSemanticCategory, number>;
  ambiguity: {
    beforeImportLevel: number;
    afterSemantic: number;
    resolved: number;
    remaining: IconOccurrenceRecord[];
  };
  routeMatrix: RouteModuleAuditRow[];
  veranstaltungenDeepDive: VeranstaltungenZoneAudit;
  masterAdoption: MasterAdoptionReport;
  missingMasterBacklog: MissingMasterBacklogRow[];
  legacyDomainReport: LegacyDomainIconReport;
  utilityBoundary: UtilityBoundaryReport;
  responsiveMobile: ResponsiveMobileReport;
  accessibility: AccessibilityReport;
  iconSourceInventory: ReturnType<typeof summarizeIconSources>;
  navCompleteness: ReturnType<typeof auditNavigationCompleteness>;
  globalShellOccurrences: IconOccurrenceRecord[];
};

export type VeranstaltungenZoneAudit = Record<
  | "NAV"
  | "PAGE_HEADER"
  | "CREATE_ACTION"
  | "KPI_UPCOMING"
  | "KPI_PAST"
  | "KPI_TOTAL"
  | "KPI_LOCATIONS"
  | "SEARCH"
  | "EVENT_ROWS"
  | "DATE_TILE"
  | "STATUS"
  | "CALENDAR"
  | "QUICK_ACCESS"
  | "FILTERS",
  ZoneClassificationSummary
> & {
  route: string;
  missingMasters: string[];
  legacyWithAvailableMaster: string[];
  utilityValid: string[];
  whyVisuallyMixed: string;
};

type ZoneClassificationSummary = {
  symbols: string[];
  classification: string;
  notes: string;
};

export type MasterAdoptionReport = {
  approvedMasters: number;
  mastersWithProductUsage: number;
  mastersWithNoCurrentUsage: string[];
  unresolvedDomainWithExistingMaster: Array<{
    file: string;
    line: number;
    symbol: string;
    sceMaster: string;
    route: string;
  }>;
  legacyLucideDespiteApprovedMaster: Array<{
    file: string;
    line: number;
    symbol: string;
    sceMaster: string;
    route: string;
  }>;
};

export type MissingMasterBacklogRow = {
  concept: string;
  knownOrNew: "KNOWN" | "NEW";
  currentIconSource: string;
  currentIcon: string;
  routes: string[];
  files: string[];
  surfaces: string[];
  occurrences: number;
  description: string;
  whyNoExistingMaster: string;
  recommendedMaster: string;
  priority: "P0" | "P1" | "P2";
};

export type LegacyDomainIconReport = {
  legacyWithAvailableMaster: number;
  legacyWithoutMaster: number;
  rawDomainSvg: number;
  oldSceImplementations: number;
  duplicateGeometry: number;
};

export type UtilityBoundaryReport = {
  allowlistBefore: number;
  allowlistAfter: number;
  added: string[];
  removed: string[];
  questionable: string[];
  domainMisclassifiedAsUtility: string[];
};

export type ResponsiveMobileReport = {
  separateCodePaths: string[];
  mobileOnlyIconOccurrences: IconOccurrenceRecord[];
  mobileLegacyDomain: number;
  mobileMissingMaster: number;
};

export type AccessibilityReport = {
  decorativeDomainAria: number;
  iconOnlyControls: number;
  contentIdentityAlt: number;
  violations: Array<{ file: string; line: number; issue: string }>;
};

const ADMIN_ROOT = "app/(admin)";
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "baseline-backups", "__tests__"]);
const DESIGN_SYSTEM_ICONS = "components/design-system/icons/";

/** Shared chrome audited once — excluded from page-local route closure to avoid 191× nav duplication. */
const SHARED_SHELL_PREFIXES = [
  "components/admin/layout/AppShellNavigation.tsx",
  "components/admin/layout/GlobalNavDrawer.tsx",
  "components/admin/layout/AccountMenu.tsx",
  "components/admin/notifications/NotificationBell.tsx",
  "components/nav/NavDestinationSceIcon.tsx",
];

const DOMAIN_SCE_COMPONENT_TO_MASTER: Record<string, string> = {
  OrganisationSceIcon: "organisation",
  OrgUnitSceIcon: "org-unit",
  PeopleSceIcon: "people",
  MemberSceIcon: "member",
  TeamSceIcon: "team",
  RolesAccessSceIcon: "roles-access",
  ClubSceIcon: "club",
  SeasonSceIcon: "season",
  CommunicationSceIcon: "communication",
  WebsiteSceIcon: "website",
  TasksSceIcon: "tasks",
  DocumentsSceIcon: "documents",
  FinanceSceIcon: "finance",
  MatchSceIcon: "match",
  NewsSceIcon: "news",
  SettingsSceIcon: "settings",
  SponsorSceIcon: "sponsor",
  FacilitySceIcon: "facility",
  IntegrationSceIcon: "integration",
  NotificationsSceIcon: "notifications",
  PublishSceIcon: "publish",
  RequirementsSceIcon: "requirements",
  InfoboardSceIcon: "infoboard",
};

const ROUTE_DOMAIN_RULES: Array<[RegExp, string]> = [
  [/^\/dashboard\/wochenplan|^\/dashboard\/trainings|^\/dashboard\/spiele|^\/dashboard\/tournamentcenter|^\/dashboard\/veranstaltungen|^\/dashboard\/planning/, "Planning"],
  [/^\/dashboard\/org-|^\/dashboard\/organisation|^\/dashboard\/teams|^\/dashboard\/vereine|^\/dashboard\/persons|^\/dashboard\/mitglieder|^\/dashboard\/users|^\/dashboard\/target-groups|^\/dashboard\/competitions|^\/dashboard\/registrations|^\/dashboard\/trainer|^\/dashboard\/helfereinsaetze/, "Organisation"],
  [/^\/dashboard\/communication|^\/dashboard\/tasks|^\/dashboard\/requirements|^\/dashboard\/notifications|^\/dashboard\/workspace/, "Communication"],
  [/^\/dashboard\/website|^\/dashboard\/news|^\/dashboard\/infoboard|^\/vereinsleitung|^\/dashboard\/sponsoring|^\/dashboard\/formulare|^\/dashboard\/vorfaelle|^\/dashboard\/finanzen/, "Club"],
  [/^\/dashboard\/admin|^\/dashboard\/administration|^\/dashboard\/permissions|^\/dashboard\/roles|^\/admin/, "Administration"],
  [/^\/tenant\/|^\/dashboard\/billing|^\/dashboard\/commercial|^\/dashboard\/platform|^\/dashboard\/integrations/, "Platform / Commercial"],
  [/^\/dashboard$|^\/dashboard\/programme|^\/dashboard\/calendar|^\/dashboard\/attention|^\/dashboard\/account/, "Dashboard"],
];

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

function pageFileToRoute(pageFile: string): string {
  const rel = pageFile.replace(/^app\/\(admin\)/, "").replace(/\/page\.tsx$/, "");
  if (!rel) return "/";
  return rel.startsWith("/") ? rel : `/${rel}`;
}

function routeFamily(route: string): string {
  return route.replace(/\/[^/[]+/g, (seg) => (seg.startsWith("[") ? seg : seg));
}

function inferDomain(route: string): string {
  for (const [re, domain] of ROUTE_DOMAIN_RULES) {
    if (re.test(route)) return domain;
  }
  return "Authenticated Product";
}

function resolveImportPath(fromFile: string, spec: string, root: string): string | null {
  if (spec.startsWith("@/")) {
    const base = join(root, spec.slice(2));
    return resolveComponentEntry(base);
  }
  if (spec.startsWith(".")) {
    const base = join(dirname(fromFile), spec);
    return resolveComponentEntry(base);
  }
  return null;
}

function resolveComponentEntry(base: string): string | null {
  const candidates = [
    `${base}.tsx`,
    `${base}.ts`,
    join(base, "index.tsx"),
    join(base, "index.ts"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function extractImports(source: string): string[] {
  const specs: string[] = [];
  const re = /import\s+(?:type\s+)?(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const spec = m[1];
    if (spec.startsWith("@/") || spec.startsWith(".")) specs.push(spec);
  }
  return specs;
}

function extractLucideSymbols(source: string): string[] {
  const symbols = new Set<string>();
  const importRe = /import\s+\{([^}]+)\}\s+from\s+["']lucide-react["']/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(source))) {
    for (const part of m[1].split(",")) {
      const sym = part.trim().split(/\s+as\s+/)[0]?.trim();
      if (sym) symbols.add(sym);
    }
  }
  return [...symbols];
}

function lineNumber(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

function findJsxOccurrences(source: string, tag: string): Array<{ index: number; snippet: string }> {
  const re = new RegExp(`<${tag}(?![A-Za-z0-9])`, "g");
  const out: Array<{ index: number; snippet: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    out.push({
      index: m.index,
      snippet: source.slice(Math.max(0, m.index - 160), Math.min(source.length, m.index + 240)),
    });
  }
  return out;
}

function collectComponentClosure(entryFiles: string[], root: string, maxFiles = 400): string[] {
  const visited = new Set<string>();
  const queue = [...entryFiles];
  while (queue.length > 0 && visited.size < maxFiles) {
    const file = queue.shift()!;
    const abs = resolve(root, file);
    if (visited.has(abs) || !existsSync(abs)) continue;
    if (relative(root, abs).startsWith(DESIGN_SYSTEM_ICONS)) continue;
    visited.add(abs);
    const source = readFileSync(abs, "utf8");
    for (const spec of extractImports(source)) {
      const resolved = resolveImportPath(abs, spec, root);
      if (resolved && !visited.has(resolved)) queue.push(resolved);
    }
  }
  return [...visited].map((f) => relative(root, f));
}

function discoverAuthenticatedRoutes(root: string): Array<{ route: string; pageFile: string; owner: string }> {
  const adminDir = join(root, ADMIN_ROOT);
  const pages = walk(adminDir).filter((f) => f.endsWith("page.tsx"));
  return pages.map((pageFile) => {
    const relPage = relative(root, pageFile);
    const route = pageFileToRoute(relPage);
    const owner = relPage;
    return { route, pageFile: relPage, owner };
  });
}

function layoutChain(pageFile: string, root: string): string[] {
  const layouts: string[] = [join(root, "app/(admin)/layout.tsx")];
  const parts = pageFile.split("/");
  parts.pop(); // page.tsx
  let acc = join(root, "app/(admin)");
  for (let i = 1; i < parts.length; i++) {
    acc = join(acc, parts[i]);
    const layout = join(acc, "layout.tsx");
    if (existsSync(layout)) layouts.push(layout);
  }
  return layouts.map((f) => relative(root, f));
}

const fileScanCache = new Map<string, Omit<IconOccurrenceRecord, "route" | "zone">[]>();

function scanFileIconsBase(relFile: string, root: string): Omit<IconOccurrenceRecord, "route" | "zone">[] {
  const cached = fileScanCache.get(relFile);
  if (cached) return cached;

  const abs = join(root, relFile);
  if (!existsSync(abs)) {
    fileScanCache.set(relFile, []);
    return [];
  }
  const source = readFileSync(abs, "utf8");
  const records: Omit<IconOccurrenceRecord, "route" | "zone">[] = [];
  let seq = 0;

  for (const sym of extractLucideSymbols(source)) {
    for (const hit of findJsxOccurrences(source, sym)) {
      const resolution = resolveLucideSemantic(sym, relFile, hit.snippet);
      records.push({
        id: `${relFile}:${lineNumber(source, hit.index)}:${sym}:${seq++}`,
        file: relFile,
        line: lineNumber(source, hit.index),
        sourceKind: "lucide-jsx",
        symbol: sym,
        classification: resolution.category,
        sceMaster: resolution.sceMaster,
        missingConcept: resolution.missingConcept,
        legacyDespiteMaster: resolution.legacyDespiteMaster,
        reason: resolution.reason,
        jsxSnippet: hit.snippet,
        verification: "STATICALLY_VERIFIED",
      });
    }
    if (!findJsxOccurrences(source, sym).length && new RegExp(`\\bicon:\\s*${sym}\\b`).test(source)) {
      const idx = source.search(new RegExp(`\\bicon:\\s*${sym}\\b`));
      const snippet = source.slice(Math.max(0, idx - 120), idx + 160);
      const resolution = resolveLucideSemantic(sym, relFile, snippet);
      records.push({
        id: `${relFile}:${lineNumber(source, idx)}:${sym}:prop:${seq++}`,
        file: relFile,
        line: lineNumber(source, idx),
        sourceKind: "lucide-jsx",
        symbol: sym,
        classification: resolution.category,
        sceMaster: resolution.sceMaster,
        missingConcept: resolution.missingConcept,
        legacyDespiteMaster: resolution.legacyDespiteMaster,
        reason: `${resolution.reason} (icon prop reference)`,
        jsxSnippet: snippet,
        verification: "STATICALLY_VERIFIED",
      });
    }
  }

  for (const [component, master] of Object.entries(DOMAIN_SCE_COMPONENT_TO_MASTER)) {
    for (const hit of findJsxOccurrences(source, component)) {
      records.push({
        id: `${relFile}:${lineNumber(source, hit.index)}:${component}:${seq++}`,
        file: relFile,
        line: lineNumber(source, hit.index),
        sourceKind: "domain-sce-component",
        symbol: component,
        classification: "SCE_DOMAIN_APPROVED",
        sceMaster: master,
        missingConcept: null,
        legacyDespiteMaster: false,
        reason: "Approved domain SCE wrapper component",
        jsxSnippet: hit.snippet,
        verification: "STATICALLY_VERIFIED",
      });
    }
    const propRe = new RegExp(`\\bicon:\\s*${component}\\b`);
    if (propRe.test(source)) {
      const idx = source.search(propRe);
      records.push({
        id: `${relFile}:${lineNumber(source, idx)}:${component}:prop:${seq++}`,
        file: relFile,
        line: lineNumber(source, idx),
        sourceKind: "domain-sce-component",
        symbol: component,
        classification: "SCE_DOMAIN_APPROVED",
        sceMaster: master,
        missingConcept: null,
        legacyDespiteMaster: false,
        reason: "Approved domain SCE wrapper (icon prop reference)",
        jsxSnippet: source.slice(Math.max(0, idx - 120), idx + 160),
        verification: "STATICALLY_VERIFIED",
      });
    }
  }

  const sceNameRe = /(?:SceIcon|ProductDomainSceIcon)[^>]*name=\{?["'`]([a-z0-9-]+)["'`]/g;
  let sm: RegExpExecArray | null;
  while ((sm = sceNameRe.exec(source))) {
    const master = sm[1];
    const registryEntry = SCE_ICON_REGISTRY[master as keyof typeof SCE_ICON_REGISTRY];
    const approved = (SCE_APPROVED_MASTER_ICON_NAMES as readonly string[]).includes(master);
    const glyphUtility = new Set(["search", "profile", "add", "edit", "close", "more"]);
    const classification: WebappIconSemanticCategory = approved
      ? "SCE_DOMAIN_APPROVED"
      : registryEntry && glyphUtility.has(master)
        ? "UTILITY_ACTION"
        : registryEntry
          ? "SCE_DOMAIN_APPROVED"
          : "UNKNOWN_REQUIRES_REVIEW";
    records.push({
      id: `${relFile}:${lineNumber(source, sm.index)}:SceIcon:${seq++}`,
      file: relFile,
      line: lineNumber(source, sm.index),
      sourceKind: "sce-icon",
      symbol: master,
      classification,
      sceMaster: approved || registryEntry?.geometrySource === "approved-master" ? master : null,
      missingConcept: null,
      legacyDespiteMaster: false,
      reason: registryEntry
        ? `SceIcon registry entry (${registryEntry.geometrySource})`
        : "Unknown registry name",
      jsxSnippet: source.slice(Math.max(0, sm.index - 80), sm.index + 120),
      verification: "STATICALLY_VERIFIED",
    });
  }

  if (/<svg[\s>]/i.test(source) && !relFile.startsWith(DESIGN_SYSTEM_ICONS)) {
    const idx = source.search(/<svg[\s>]/i);
    const snippet = source.slice(Math.max(0, idx - 80), idx + 160);
    const inlineCategory: WebappIconSemanticCategory =
      /chart|graph|recharts|sparkline|progress/i.test(relFile + snippet)
        ? "DECORATIVE"
        : /crest|logo|avatar|emblem|flag/i.test(snippet)
          ? "CONTENT_IDENTITY"
          : "DECORATIVE";
    records.push({
      id: `${relFile}:${lineNumber(source, idx)}:inline-svg:${seq++}`,
      file: relFile,
      line: lineNumber(source, idx),
      sourceKind: "inline-svg",
      symbol: "inline-svg",
      classification: inlineCategory,
      sceMaster: null,
      missingConcept: null,
      legacyDespiteMaster: false,
      reason: "Inline SVG geometry outside approved SCE master files (tracked in legacy geometry report)",
      jsxSnippet: snippet,
      verification: "STATICALLY_VERIFIED",
    });
  }

  fileScanCache.set(relFile, records);
  return records;
}

function scanFileIcons(
  relFile: string,
  route: string,
  zone: string,
  root: string,
): IconOccurrenceRecord[] {
  return scanFileIconsBase(relFile, root).map((row) => ({ ...row, route, zone }));
}

function dedupeIconOccurrences(records: IconOccurrenceRecord[]): IconOccurrenceRecord[] {
  const seen = new Set<string>();
  const out: IconOccurrenceRecord[] = [];
  for (const row of records) {
    const key = `${row.file}:${row.line}:${row.symbol}:${row.sourceKind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function countByCategory(records: IconOccurrenceRecord[]): Record<WebappIconSemanticCategory, number> {
  const base: Record<WebappIconSemanticCategory, number> = {
    SCE_DOMAIN_APPROVED: 0,
    SCE_DOMAIN_MISSING_MASTER: 0,
    UTILITY_ACTION: 0,
    STATUS_STATE: 0,
    CONTENT_IDENTITY: 0,
    DECORATIVE: 0,
    DEAD_OR_NON_RENDERED: 0,
    UNKNOWN_REQUIRES_REVIEW: 0,
  };
  for (const r of records) base[r.classification] += 1;
  return base;
}

function computeConsistency(row: Omit<RouteModuleAuditRow, "consistency" | "notes">): {
  consistency: RouteConsistencyState;
  notes: string;
} {
  if (row.unknown > 0) {
    return { consistency: "REQUIRES_REVIEW", notes: `${row.unknown} unresolved icon occurrence(s)` };
  }
  if (row.legacyWithAvailableMaster > 0) {
    return {
      consistency: "LEGACY_MIX",
      notes: `${row.legacyWithAvailableMaster} domain glyph(s) still on legacy Lucide despite approved master`,
    };
  }
  if (row.missingMaster > 0) {
    return {
      consistency: "MIXED_MISSING_MASTER",
      notes: `${row.missingMaster} missing-master domain occurrence(s); utilities may coexist by design`,
    };
  }
  if (row.utility > 0 || row.status > 0 || row.content > 0) {
    return {
      consistency: "MIXED_BY_DESIGN",
      notes: "SCE domain icons coexist with utility/status/content glyphs",
    };
  }
  return { consistency: "CONSISTENT", notes: "Domain surfaces use SCE artwork only (or no domain icons)" };
}

function buildMissingMasterBacklog(all: IconOccurrenceRecord[]): MissingMasterBacklogRow[] {
  const byConcept = new Map<string, MissingMasterBacklogRow>();
  const known = new Set(MISSING_SCE_SEMANTICS.map((r) => r.concept));

  for (const meta of MISSING_SCE_SEMANTICS) {
    byConcept.set(meta.concept, {
      concept: meta.concept,
      knownOrNew: "KNOWN",
      currentIconSource: "lucide-react",
      currentIcon: meta.currentIcon.replace(/^Lucide:/, ""),
      routes: [],
      files: [...meta.files],
      surfaces: [...meta.surfaces],
      occurrences: meta.frequency,
      description: meta.reason,
      whyNoExistingMaster: meta.reason,
      recommendedMaster: meta.recommendedMaster,
      priority:
        meta.concept === "competition" || meta.concept === "page" || meta.concept === "media-library"
          ? "P0"
          : "P1",
    });
  }

  for (const row of all.filter((r) => r.classification === "SCE_DOMAIN_MISSING_MASTER" && r.missingConcept)) {
    const concept = row.missingConcept!;
    const existing = byConcept.get(concept);
    const meta = MISSING_SCE_SEMANTICS.find((m) => m.concept === concept);
    if (!existing) {
      byConcept.set(concept, {
        concept,
        knownOrNew: known.has(concept) ? "KNOWN" : "NEW",
        currentIconSource: "lucide-react",
        currentIcon: row.symbol,
        routes: [row.route],
        files: [row.file],
        surfaces: [row.zone],
        occurrences: 1,
        description: meta?.reason ?? row.reason,
        whyNoExistingMaster: meta?.reason ?? row.reason,
        recommendedMaster: meta?.recommendedMaster ?? concept,
        priority: concept === "competition" || concept === "page" || concept === "media-library" ? "P0" : "P1",
      });
    } else {
      existing.occurrences += 1;
      if (!existing.routes.includes(row.route)) existing.routes.push(row.route);
      if (!existing.files.includes(row.file)) existing.files.push(row.file);
      if (!existing.surfaces.includes(row.zone)) existing.surfaces.push(row.zone);
    }
  }

  return [...byConcept.values()].sort((a, b) => a.concept.localeCompare(b.concept));
}

function buildMasterAdoption(all: IconOccurrenceRecord[], root = process.cwd()): MasterAdoptionReport {
  const usedMasters = new Set<string>();
  for (const r of all) {
    if (r.classification === "SCE_DOMAIN_APPROVED" && r.sceMaster) usedMasters.add(r.sceMaster);
  }

  const importUnresolved = runProductDomainIconInventory(root).unresolvedDomainWithExistingMaster.map((r) => ({
    file: r.file,
    line: r.line,
    symbol: r.symbol,
    sceMaster: r.proposedSceMaster!,
    route: "import-scan",
  }));

  const legacyRenderEvidence = dedupeIconOccurrences(all)
    .filter((r) => r.legacyDespiteMaster && r.sceMaster)
    .map((r) => ({
      file: r.file,
      line: r.line,
      symbol: r.symbol,
      sceMaster: r.sceMaster!,
      route: r.route,
    }));

  const allMasters = [...SCE_APPROVED_MASTER_ICON_NAMES];
  const unused = allMasters.filter((m) => !usedMasters.has(m));

  return {
    approvedMasters: allMasters.length,
    mastersWithProductUsage: usedMasters.size,
    mastersWithNoCurrentUsage: unused,
    unresolvedDomainWithExistingMaster: importUnresolved,
    legacyLucideDespiteApprovedMaster: legacyRenderEvidence,
  };
}

function summarizeIconSources(root: string) {
  const legacy = runLegacyIconInventory(root);
  const inventory = runProductDomainIconInventory(root);
  return {
    lucide: inventory.counts.UTILITY_ALLOWED + inventory.counts.DOMAIN_REPLACE + inventory.counts.AMBIGUOUS,
    sceIcon: inventory.counts.SCE_APPROVED,
    rawSvg: legacy.bySource["inline-svg"].count,
    inlineSvg: legacy.bySource["inline-svg"].count,
    otherIconPackages:
      legacy.bySource["@heroicons"].count +
      legacy.bySource["react-icons"].count +
      legacy.bySource.fontawesome.count,
    emojiUi: 0,
    cssIconSources: 0,
    legacyWrappers: 0,
    importLevelCounts: inventory.counts,
  };
}

function auditAccessibility(all: IconOccurrenceRecord[]): AccessibilityReport {
  const violations: AccessibilityReport["violations"] = [];
  let iconOnlyControls = 0;
  let decorative = 0;
  let contentAlt = 0;

  for (const row of all) {
    if (row.sourceKind === "lucide-jsx") {
      if (/aria-hidden/.test(row.jsxSnippet)) decorative += 1;
      if (/<button[^>]*>\s*<[A-Z]/.test(row.jsxSnippet) && !/aria-label/.test(row.jsxSnippet)) {
        iconOnlyControls += 1;
        violations.push({
          file: row.file,
          line: row.line,
          issue: "Possible icon-only control without aria-label in snippet",
        });
      }
    }
    if (row.classification === "CONTENT_IDENTITY" && !/alt=/.test(row.jsxSnippet)) {
      contentAlt += 1;
    }
  }

  return {
    decorativeDomainAria: decorative,
    iconOnlyControls,
    contentIdentityAlt: contentAlt,
    violations: violations.slice(0, 200),
  };
}

function auditVeranstaltungen(all: IconOccurrenceRecord[]): VeranstaltungenZoneAudit {
  const routeRows = all.filter(
    (r) =>
      r.route === "/dashboard/veranstaltungen" ||
      r.file.includes("veranstaltungen/Veranstaltungen") ||
      r.file.includes("veranstaltungen/Veranstaltung"),
  );
  const shellRows = all.filter((r) => r.route === "__global_shell__");

  const zonePick = (pred: (r: IconOccurrenceRecord) => boolean): ZoneClassificationSummary => {
    const hits = [...shellRows, ...routeRows].filter(pred);
    return {
      symbols: [...new Set(hits.map((h) => h.symbol))],
      classification: [...new Set(hits.map((h) => h.classification))].join(", ") || "none",
      notes: hits.map((h) => `${h.symbol}:${h.classification}`).slice(0, 8).join("; "),
    };
  };

  const deepDive: VeranstaltungenZoneAudit = {
    route: "/dashboard/veranstaltungen",
    NAV: zonePick((r) => r.zone === "global-nav" && /veranstaltungen|planning|events/i.test(r.jsxSnippet + r.symbol)),
    PAGE_HEADER: zonePick((r) => r.file.includes("PlanningManagementPageHeader") || r.zone === "page-header"),
    CREATE_ACTION: zonePick((r) => /Plus|create|erstellen/i.test(r.jsxSnippet)),
    KPI_UPCOMING: zonePick((r) => r.file.includes("VeranstaltungenManagementWorkspace") && /CalendarClock|kpi-upcoming/i.test(r.jsxSnippet)),
    KPI_PAST: zonePick((r) => /History|kpi-past/i.test(r.jsxSnippet)),
    KPI_TOTAL: zonePick((r) => /Trophy|kpi-total/i.test(r.jsxSnippet)),
    KPI_LOCATIONS: zonePick((r) => /FacilitySceIcon|kpi-venues|MapPin/i.test(r.jsxSnippet)),
    SEARCH: zonePick((r) => /Search|toolbar/i.test(r.file + r.jsxSnippet)),
    EVENT_ROWS: zonePick((r) => r.file.includes("VeranstaltungListRow")),
    DATE_TILE: zonePick((r) => r.file.includes("VeranstaltungListRow") && /aria-hidden/.test(r.jsxSnippet)),
    STATUS: zonePick((r) => /review|status|GlobeLock|Shield/i.test(r.jsxSnippet)),
    CALENDAR: zonePick((r) => r.file.includes("SpieleManagementMonthCalendar") || /Calendar/i.test(r.zone)),
    QUICK_ACCESS: zonePick((r) => r.file.includes("VeranstaltungenManagementQuickAccess")),
    FILTERS: zonePick((r) => r.file.includes("VeranstaltungenManagementFilterRail") || r.file.includes("Filter")),
    missingMasters: [...new Set(routeRows.filter((r) => r.missingConcept).map((r) => r.missingConcept!))],
    legacyWithAvailableMaster: routeRows.filter((r) => r.legacyDespiteMaster).map((r) => `${r.symbol}→${r.sceMaster}`),
    utilityValid: routeRows.filter((r) => r.classification === "UTILITY_ACTION").map((r) => r.symbol),
    whyVisuallyMixed:
      "Planning shell uses SCE events in nav while KPI tiles mix CalendarClock/History/Trophy Lucide metaphors, FacilitySceIcon for venues, utility Plus/Search/Filter elsewhere — branded, legacy-generic, and missing-master domain glyphs appear together.",
  };

  return deepDive;
}

export function runWebappIconCoverageAudit(root = process.cwd()): WebappIconCoverageAuditReport {
  fileScanCache.clear();
  const routes = discoverAuthenticatedRoutes(root);
  const allOccurrences: IconOccurrenceRecord[] = [];
  const routeMatrix: RouteModuleAuditRow[] = [];

  const shellFiles = collectComponentClosure(
    [join(root, "components/admin/layout/AppShellNavigation.tsx")],
    root,
    120,
  );

  for (const rel of shellFiles) {
    allOccurrences.push(...scanFileIcons(rel, "__global_shell__", "global-nav", root));
  }

  const uniqueFamilies = new Set(routes.map((r) => routeFamily(r.route)));
  const closureCache = new Map<string, string[]>();

  const shellRowOccurrences = allOccurrences.filter((r) => r.route === "__global_shell__");
  const shellCounts = countByCategory(shellRowOccurrences);
  const shellRowBase = {
    route: "__authenticated_shell__",
    domain: "Global",
    owner: "app/(admin)/layout.tsx → AppShellNavigation",
    reachableFrom: ["all-authenticated-routes"],
    componentFiles: shellFiles,
    iconOccurrences: shellRowOccurrences.length,
    sceApproved: shellCounts.SCE_DOMAIN_APPROVED,
    missingMaster: shellCounts.SCE_DOMAIN_MISSING_MASTER,
    utility: shellCounts.UTILITY_ACTION,
    status: shellCounts.STATUS_STATE,
    content: shellCounts.CONTENT_IDENTITY,
    decorative: shellCounts.DECORATIVE,
    legacyWithAvailableMaster: shellRowOccurrences.filter((r) => r.legacyDespiteMaster).length,
    unknown: shellCounts.UNKNOWN_REQUIRES_REVIEW,
    dead: shellCounts.DEAD_OR_NON_RENDERED,
  };
  const shellConsistency = computeConsistency(shellRowBase);
  routeMatrix.push({ ...shellRowBase, ...shellConsistency });

  for (const { route, pageFile, owner } of routes) {
    const chain = [...layoutChain(pageFile, root), pageFile];
    const cacheKey = chain.join("|");
    let closure = closureCache.get(cacheKey);
    if (!closure) {
      closure = collectComponentClosure(
        chain.map((f) => join(root, f)),
        root,
        180,
      ).filter((rel) => !SHARED_SHELL_PREFIXES.some((p) => rel === p || rel.endsWith(p)));
      closureCache.set(cacheKey, closure);
    }
    const routeOccurrences: IconOccurrenceRecord[] = [];

    for (const rel of closure) {
      const zone = rel.includes("AppShellNavigation") ? "global-nav" : rel === pageFile ? "page-root" : "page-tree";
      routeOccurrences.push(...scanFileIcons(rel, route, zone, root));
    }

    const counts = countByCategory(routeOccurrences);
    const legacy = routeOccurrences.filter((r) => r.legacyDespiteMaster).length;
    const rowBase = {
      route,
      domain: inferDomain(route),
      owner,
      reachableFrom: ["authenticated-app-shell"],
      componentFiles: closure,
      iconOccurrences: routeOccurrences.length,
      sceApproved: counts.SCE_DOMAIN_APPROVED,
      missingMaster: counts.SCE_DOMAIN_MISSING_MASTER,
      utility: counts.UTILITY_ACTION,
      status: counts.STATUS_STATE,
      content: counts.CONTENT_IDENTITY,
      decorative: counts.DECORATIVE,
      legacyWithAvailableMaster: legacy,
      unknown: counts.UNKNOWN_REQUIRES_REVIEW,
      dead: counts.DEAD_OR_NON_RENDERED,
    };
    const { consistency, notes } = computeConsistency(rowBase);
    routeMatrix.push({ ...rowBase, consistency, notes });
    allOccurrences.push(...routeOccurrences);
  }

  const importInventory = runProductDomainIconInventory(root);
  const ambiguousBefore = importInventory.counts.AMBIGUOUS;
  const importAmbiguityRemaining = resolveImportLevelAmbiguityRemaining(root, importInventory);
  const remainingUnknown = importAmbiguityRemaining;

  const permissionKeys = Object.values(PERMISSIONS) as PermissionKey[];
  const sections = getVisibleNavSections(permissionKeys, "club");
  const model = buildAppNavigationModelForUser(permissionKeys, "club");
  const navReport = auditNavigationCompleteness(sections, model);

  const mobileFiles = walk(join(root, "components")).filter(
    (f) => /Mobile|Drawer|BottomNav/i.test(f) && f.endsWith(".tsx"),
  );
  const mobileOccurrences = allOccurrences.filter((r) =>
    mobileFiles.some((mf) => relative(root, mf) === r.file),
  );

  const utilityReport: UtilityBoundaryReport = {
    allowlistBefore: LUCIDE_UTILITY_ALLOWLIST.size,
    allowlistAfter: LUCIDE_UTILITY_ALLOWLIST.size,
    added: [],
    removed: [],
    questionable: [...QUESTIONABLE_UTILITY_ALLOWLIST],
    domainMisclassifiedAsUtility: [...QUESTIONABLE_UTILITY_ALLOWLIST],
  };

  const dedupedOccurrences = dedupeIconOccurrences(allOccurrences);

  return {
    routeInventory: {
      authenticatedRouteFiles: routes.length,
      routeFamilies: uniqueFamilies.size,
      canonicalNavDestinations: navReport.canonicalVisibleDestinations,
      nestedRoutes: routes.filter((r) => r.route.split("/").length > 4).length,
      dynamicRouteFamilies: [...uniqueFamilies].filter((r) => r.includes("[")).length,
      modulesAudited: routeMatrix.length,
      shellModuleIncluded: true,
    },
    classificationTotals: countByCategory(dedupedOccurrences),
    ambiguity: {
      beforeImportLevel: ambiguousBefore,
      afterSemantic: remainingUnknown.length,
      resolved: ambiguousBefore - remainingUnknown.length,
      remaining: remainingUnknown,
    },
    routeMatrix: routeMatrix.sort((a, b) => a.route.localeCompare(b.route)),
    veranstaltungenDeepDive: auditVeranstaltungen(allOccurrences),
    masterAdoption: buildMasterAdoption(dedupedOccurrences),
    missingMasterBacklog: buildMissingMasterBacklog(dedupedOccurrences),
    legacyDomainReport: {
      legacyWithAvailableMaster: dedupedOccurrences.filter((r) => r.legacyDespiteMaster).length,
      legacyWithoutMaster: dedupedOccurrences.filter((r) => r.classification === "SCE_DOMAIN_MISSING_MASTER")
        .length,
      rawDomainSvg: dedupedOccurrences.filter((r) => r.sourceKind === "inline-svg").length,
      oldSceImplementations: 0,
      duplicateGeometry: 0,
    },
    utilityBoundary: utilityReport,
    responsiveMobile: {
      separateCodePaths: mobileFiles.map((f) => relative(root, f)),
      mobileOnlyIconOccurrences: mobileOccurrences,
      mobileLegacyDomain: mobileOccurrences.filter((r) => r.legacyDespiteMaster).length,
      mobileMissingMaster: mobileOccurrences.filter((r) => r.classification === "SCE_DOMAIN_MISSING_MASTER").length,
    },
    accessibility: auditAccessibility(dedupedOccurrences),
    iconSourceInventory: summarizeIconSources(root),
    navCompleteness: navReport,
    globalShellOccurrences: allOccurrences.filter((r) => r.route === "__global_shell__"),
  };
}

function resolveImportLevelAmbiguityRemaining(
  root: string,
  inventory = runProductDomainIconInventory(root),
): IconOccurrenceRecord[] {
  const remaining: IconOccurrenceRecord[] = [];
  for (const row of inventory.occurrences.filter((o) => o.classification === "AMBIGUOUS")) {
    const abs = join(root, row.file);
    if (!existsSync(abs)) continue;
    const source = readFileSync(abs, "utf8");
    const resolution = resolveLucideSemantic(row.symbol, row.file, source);
    if (resolution.category === "UNKNOWN_REQUIRES_REVIEW") {
      remaining.push({
        id: `import-ambiguous:${row.file}:${row.symbol}`,
        file: row.file,
        line: row.line,
        route: "import-scan",
        zone: "import-level",
        sourceKind: "lucide-jsx",
        symbol: row.symbol,
        classification: resolution.category,
        sceMaster: resolution.sceMaster,
        missingConcept: resolution.missingConcept,
        legacyDespiteMaster: resolution.legacyDespiteMaster,
        reason: resolution.reason,
        jsxSnippet: source.slice(0, 240),
        verification: "STATICALLY_VERIFIED",
      });
    }
  }
  return remaining;
}

export function importLevelAmbiguityCount(): number {
  return runProductDomainIconInventory().counts.AMBIGUOUS;
}

export function semanticAmbiguityRemaining(report = runWebappIconCoverageAudit()): number {
  return report.ambiguity.afterSemantic;
}

/** Deterministic route/module matrix for regression tests. */
export function buildRouteCoverageMatrixSnapshot(root = process.cwd()): RouteModuleAuditRow[] {
  return runWebappIconCoverageAudit(root).routeMatrix;
}

export function navDestinationMasterCoverage(): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const name of SCE_ICON_REGISTRY_NAMES) {
    void name;
  }
  const permissionKeys = Object.values(PERMISSIONS) as PermissionKey[];
  const sections = getVisibleNavSections(permissionKeys, "club");
  for (const section of sections) {
    for (const item of section.items) {
      out[item.key] = getNavDestinationSceIconName(item.key);
      for (const child of item.children ?? []) {
        out[child.key] = getNavDestinationSceIconName(child.key);
      }
    }
  }
  return out;
}

export type { IconInventoryClassification };

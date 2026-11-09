/**
 * SCE-DS2-06R2 — authenticated route inventory scanner.
 * Run: node scripts/sce-ds2-06-route-inventory-scan.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const ADMIN_ROOT = join(ROOT, "app/(admin)");

const CANONICAL_MARKERS = [
  "SceWorkspaceChrome",
  "ListPagePattern",
  "DetailPagePattern",
  "FinanceWorkspaceTabs",
  "SceContextTabs",
];
const HEADER_MARKERS = ["ScePageHeader", "SceWorkspaceChrome", "ListPagePattern", "DetailPagePattern"];
const TAB_MARKERS = ["ScePageTabs", "SceContextTabs", "FinanceWorkspaceTabs"];

function walkPageFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkPageFiles(full, acc);
      continue;
    }
    if (entry === "page.tsx") {
      acc.push(full);
    }
  }
  return acc;
}

function fileRouteFromPath(absPath) {
  let rel = relative(join(ROOT, "app/(admin)"), absPath).replace(/\\/g, "/");
  rel = rel.replace(/\/page\.tsx$/, "");
  const segments = rel
    .split("/")
    .filter((segment) => segment.length > 0 && !segment.startsWith("("));
  if (segments.length === 0) {
    return "/dashboard";
  }
  return `/${segments.join("/")}`.replace(/\/+/g, "/");
}

function classifyArchitecture(source, layoutSources) {
  const blob = [source, ...layoutSources].join("\n");
  if (CANONICAL_MARKERS.some((m) => blob.includes(m))) {
    return "canonical";
  }
  if (blob.includes("PageShell") || blob.includes("ScePageContent")) {
    return "partial";
  }
  return "legacy";
}

function boolMarker(blob, markers) {
  return markers.some((m) => blob.includes(m));
}

function inferPriority(architecture, route) {
  if (architecture === "legacy" && route.startsWith("/dashboard/finance")) {
    return "High";
  }
  if (architecture === "legacy" && /\/dashboard\/(teams|persons|vereine)/.test(route)) {
    return "High";
  }
  if (architecture === "partial") {
    return "Medium";
  }
  if (architecture === "legacy") {
    return "Medium";
  }
  return "Low";
}

function inferAction(architecture, headerAligned, tabsAligned) {
  if (architecture === "canonical" && headerAligned && tabsAligned) {
    return "none";
  }
  if (architecture === "canonical") {
    return "DS2-07: align header/tabs tokens";
  }
  if (architecture === "partial") {
    return "DS2-07: adopt ListPagePattern or DetailPagePattern";
  }
  return "DS2-07: migrate to unified workspace chrome";
}

function readLayoutChain(pageFile) {
  const layouts = [];
  let dir = join(pageFile, "..");
  while (dir.startsWith(ADMIN_ROOT)) {
    const layoutFile = join(dir, "layout.tsx");
    try {
      layouts.push(readFileSync(layoutFile, "utf8"));
    } catch {
      // no layout at this level
    }
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return layouts;
}

function scan() {
  const files = walkPageFiles(ADMIN_ROOT);
  const inventory = [];

  for (const file of files.sort()) {
    const source = readFileSync(file, "utf8");
    const layouts = readLayoutChain(file);
    const blob = [source, ...layouts].join("\n");
    const route = fileRouteFromPath(file);
    const architecture = classifyArchitecture(source, layouts);
    const headerAligned = boolMarker(blob, HEADER_MARKERS);
    const tabsAligned = boolMarker(blob, TAB_MARKERS);
    const relativeSource = relative(ROOT, file).replace(/\\/g, "/");

    inventory.push({
      route,
      source: relativeSource,
      pageArchitecture: architecture,
      headerFinanceAligned: headerAligned,
      tabsFinanceAligned: tabsAligned,
      typographyConsistent: architecture !== "legacy",
      colorsContrastRisk: architecture === "legacy",
      interactionsLegacy: blob.includes("Dialog") && !blob.includes("contextualPanel"),
      priority:
        inferPriority(architecture, route) === "High"
          ? "High"
          : inferPriority(architecture, route) === "Medium"
            ? "Medium"
            : "Low",
      action: inferAction(architecture, headerAligned, tabsAligned),
    });
  }

  return inventory;
}

const inventory = scan();
const outPath = join(ROOT, "lib/design-system/sce-ds2-06-route-inventory.ts");
const ts = `/**
 * SCE-DS2-06R2 — authenticated route inventory (generated; do not hand-edit).
 * Regenerate: node scripts/sce-ds2-06-route-inventory-scan.mjs
 */
export type SceDs206RoutePriority = "Critical" | "High" | "Medium" | "Low";

export type SceDs206RouteInventoryEntry = {
  route: string;
  source: string;
  pageArchitecture: "canonical" | "partial" | "legacy";
  headerFinanceAligned: boolean;
  tabsFinanceAligned: boolean;
  typographyConsistent: boolean;
  colorsContrastRisk: boolean;
  interactionsLegacy: boolean;
  priority: SceDs206RoutePriority;
  action: string;
};

export const SCE_DS2_06_ROUTE_INVENTORY: SceDs206RouteInventoryEntry[] = ${JSON.stringify(inventory, null, 2)} as const;

export const SCE_DS2_06_CORRECTED_IN_R2_ROUTES = [
  "/dashboard/teams",
  "/dashboard/teams/[teamId]",
] as const;
`;

writeFileSync(outPath, ts);
console.log(`Wrote ${inventory.length} routes to ${relative(ROOT, outPath)}`);

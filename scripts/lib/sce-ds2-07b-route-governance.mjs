/**
 * SCE-DS2-07B — route discovery, registry merge, and lifecycle governance.
 * Imported by the DS2-06 scanner and by Vitest. Do not mark a page VERIFIED
 * because it imports workspace chrome or because a production build passed.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative } from "node:path";

export const MIGRATION_PACKAGES = ["DS2-07C", "DS2-07D", "DS2-07E", "DS2-07F", "DS2-07G"];

export const EXCEPTION_IDS = {
  REDIRECT: "SCE-DS2-07B-EX-REDIRECT",
  PUBLIC: "SCE-DS2-07B-EX-PUBLIC",
  PREVIEW: "SCE-DS2-07B-EX-PREVIEW",
  PRINT: "SCE-DS2-07B-EX-PRINT",
};

const CANONICAL_MARKERS = [
  "SceWorkspaceChrome",
  "PlanningActivitiesPageFrame",
  "ListPagePattern",
  "DetailPagePattern",
  "FormPagePattern",
  "FinanceWorkspaceTabs",
  "SceContextTabs",
];

const PAGE_STRUCTURE_MARKERS = [
  "SceWorkspaceChrome",
  "PlanningActivitiesPageFrame",
  "ListPagePattern",
  "DetailPagePattern",
  "FormPagePattern",
];

const TYPOGRAPHY_MARKERS = [
  "ListPagePattern",
  "DetailPagePattern",
  "FormPagePattern",
  "ScePageHeader",
  "SceWorkspaceHeader",
  "sce-type-page-title",
  "sce-type-section-title",
];

const PAGE_FILES = new Set(["page.tsx", "page.ts", "page.jsx", "page.js"]);
const ROUTE_FILES = new Set(["route.tsx", "route.ts", "route.jsx", "route.js"]);
const FRAMEWORK_FILES = new Set([
  "layout.tsx",
  "layout.ts",
  "layout.jsx",
  "layout.js",
  "template.tsx",
  "template.ts",
  "template.jsx",
  "template.js",
  "loading.tsx",
  "loading.ts",
  "loading.jsx",
  "loading.js",
  "error.tsx",
  "error.ts",
  "error.jsx",
  "error.js",
  "global-error.tsx",
  "global-error.ts",
  "not-found.tsx",
  "not-found.ts",
  "not-found.jsx",
  "not-found.js",
  "forbidden.tsx",
  "forbidden.ts",
  "unauthorized.tsx",
  "unauthorized.ts",
  "default.tsx",
  "default.ts",
  "default.jsx",
  "default.js",
]);

const BASELINE_REL = "lib/design-system/sce-ds2-07b-route-baseline.json";
const OVERLAY_REL = "lib/design-system/sce-ds2-07b-governance-overlay.json";
const REGISTRY_REL = "lib/design-system/sce-ds2-07b-route-registry.ts";
const NON_PAGE_REL = "lib/design-system/sce-ds2-07b-non-page-index.json";
const REPORT_REL = "docs/design-system-v2/21-ds2-07b-route-lifecycle-governance.md";

const PACKAGE_LABELS = {
  "DS2-07C": "Admin and configuration",
  "DS2-07D": "Communication and website CMS",
  "DS2-07E": "Planning, matches, training, tournaments and events",
  "DS2-07F": "Vereinsleitung and remaining workspaces",
  "DS2-07G": "Authenticated visual/accessibility verification and closure",
};

function isInside(dir, parent) {
  const rel = relative(parent, dir);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function toPosix(path) {
  return path.replace(/\\/g, "/");
}

export function stripSourceComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Immediate redirect aliases never paint UI. Mirrors the DS2-06 scanner. */
export function isImmediateRedirectPage(source) {
  const src = stripSourceComments(source);
  if (!/\bredirect\s*\(/.test(src)) return false;
  if (/<[A-Z][A-Za-z0-9.]*/.test(src)) return false;
  if (/<(div|main|section|form|span|p|h[1-6]|nav|header|article)\b/.test(src)) return false;
  return true;
}

export function redirectDestinationFromSource(source) {
  const match = source.match(/redirect\(\s*(?:`([^`]*)`|'([^']*)'|"([^"]*)")/);
  const raw = match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
  return raw.replace(/\$\{[^}]+\}/g, ":param") || "dynamic";
}

function emptyEvidence() {
  return { visual: null, accessibility: null, functional: null, responsive: null };
}

export function evidenceAcceptable(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length < 24) return false;
  const withoutChromeOrBuildClaims = trimmed
    .replace(/imports?\s+SceWorkspaceChrome/gi, "")
    .replace(/uses?\s+SceWorkspaceChrome/gi, "")
    .replace(/production build(?:\s+passed)?/gi, "")
    .replace(/passes\s+(?:a\s+|the\s+)?(?:production\s+)?build/gi, "");
  return /(\.test\.tsx?|\.spec\.tsx?|viewport|keyboard|\baxe\b|playwright|vitest)/i.test(
    withoutChromeOrBuildClaims,
  );
}

export function isVerifiedAuthenticatedVisual(entry) {
  if (!entry) return false;
  if (entry.authenticationScope !== "AUTHENTICATED") return false;
  if (entry.routeKind !== "RENDERABLE_PAGE") return false;
  if (entry.migrationStatus !== "VERIFIED") return false;
  if (entry.architecture !== "CANONICAL") return false;
  if (entry.visualVerificationStatus !== "VERIFIED") return false;
  if (entry.accessibilityVerificationStatus !== "VERIFIED") return false;
  if (entry.functionalVerificationStatus !== "VERIFIED") return false;
  const evidence = entry.verificationEvidence ?? {};
  return (
    evidenceAcceptable(evidence.visual) &&
    evidenceAcceptable(evidence.accessibility) &&
    evidenceAcceptable(evidence.functional) &&
    evidenceAcceptable(evidence.responsive)
  );
}

function classifyPath(relFile) {
  const fileName = relFile.split("/").pop() ?? "";
  const withoutFile = relFile.slice(0, Math.max(0, relFile.length - fileName.length)).replace(/\/$/, "");
  const parts = withoutFile.split("/").filter(Boolean);
  const urlSegments = [];
  const keySegments = [];
  let intercept = false;
  let parallelSlot = null;
  for (const segment of parts) {
    if (segment.startsWith("@")) {
      parallelSlot = segment;
      keySegments.push(segment);
      continue;
    }
    if (segment.startsWith("(.")) {
      intercept = true;
      keySegments.push(segment);
      const rest = segment.slice(3);
      if (rest) urlSegments.push(rest);
      continue;
    }
    if (segment.startsWith("(") && segment.endsWith(")")) continue;
    urlSegments.push(segment);
    keySegments.push(segment);
  }
  const urlPattern = `/${urlSegments.join("/")}`.replace(/\/+/g, "/") || "/";
  const routeKey = `/${keySegments.join("/")}`.replace(/\/+/g, "/") || "/";
  return {
    urlPattern: urlPattern === "/" ? "/" : urlPattern.replace(/\/$/, "") || "/",
    routeKey: routeKey === "/" ? "/" : routeKey.replace(/\/$/, "") || "/",
    intercept,
    parallelSlot,
  };
}

function readLayoutChain(pageFile, root) {
  const appRoot = join(root, "app");
  const layouts = [];
  let dir = dirname(pageFile);
  while (isInside(dir, appRoot)) {
    for (const name of ["layout.tsx", "layout.ts", "layout.jsx", "layout.js"]) {
      const layoutFile = join(dir, name);
      if (!existsSync(layoutFile)) continue;
      layouts.push({
        sourceFile: toPosix(relative(root, layoutFile)),
        source: readFileSync(layoutFile, "utf8"),
      });
      break;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return layouts;
}

export function inferModule(sourceFile, urlPattern) {
  if (sourceFile.startsWith("app/(auth)/")) return "auth";
  if (sourceFile.startsWith("app/sce-preview/")) return "design-preview";
  if (sourceFile.startsWith("app/infoboard/")) return "infoboard";
  if (sourceFile.startsWith("app/public/")) return "public-site";
  if (sourceFile.startsWith("app/share/")) return "share";
  if (sourceFile.startsWith("app/(print)/")) return "print";
  if (sourceFile === "app/page.tsx") return "public-site";
  if (sourceFile.includes("/vereinsleitung/")) return "vereinsleitung";
  if (urlPattern === "/tenant" || urlPattern.startsWith("/tenant/")) return "tenant-admin";
  if (/\/finance(\/|$)/.test(urlPattern)) return "finance";
  if (/\/website(\/|$)/.test(urlPattern)) return "website-cms";
  if (
    /\/communication(\/|$)/.test(urlPattern) ||
    /\/communications(\/|$)/.test(urlPattern) ||
    /\/target-groups(\/|$)/.test(urlPattern)
  ) {
    return "communication";
  }
  if (/\/(planner|kalender)(\/|$)/.test(urlPattern)) return "wochenplaner";
  if (/\/infoboard(\/|$)/.test(urlPattern)) return "infoboard";
  if (/\/training(\/|$)/.test(urlPattern) || urlPattern.includes("training-session")) return "training";
  if (/\/matchcenter(\/|$)/.test(urlPattern)) return "matches";
  if (/\/competitions(\/|$)/.test(urlPattern) || /\/tournament/.test(urlPattern)) return "tournaments";
  if (/\/veranstaltungen(\/|$)/.test(urlPattern) || urlPattern.includes("/activity/event")) return "events";
  if (/\/persons(\/|$)/.test(urlPattern) || /\/people-access(\/|$)/.test(urlPattern)) return "persons";
  if (/\/teams(\/|$)/.test(urlPattern)) return "teams";
  if (/\/vereine(\/|$)/.test(urlPattern)) return "clubs";
  if (/\/aufgaben(\/|$)/.test(urlPattern)) return "aufgaben";
  if (/\/events(\/|$)/.test(urlPattern)) return "events";
  if (/\/wochenplan(\/|$)/.test(urlPattern)) return "wochenplaner";
  if (/\/notifications(\/|$)/.test(urlPattern)) return "communication";
  if (/\/(permissions|seasons|runtime)(\/|$)/.test(urlPattern)) return "administration";
  if (/\/settings(\/|$)/.test(urlPattern)) return "settings";
  if (
    urlPattern === "/admin" ||
    /\/(admin|administration|account|platform|workspace|users)(\/|$)/.test(urlPattern) ||
    /\/org-units(\/|$)/.test(urlPattern) ||
    /\/roles(\/|$)/.test(urlPattern)
  ) {
    return "administration";
  }
  if (urlPattern === "/dashboard" || urlPattern.startsWith("/dashboard/")) return "dashboard";
  return "workspace";
}

function inferAuthenticationScope(sourceFile, pageSource) {
  if (sourceFile.startsWith("app/(admin)/")) return "AUTHENTICATED";
  if (sourceFile.startsWith("app/(print)/")) return "AUTHENTICATED";
  if (sourceFile.startsWith("app/(auth)/")) return "PUBLIC";
  if (sourceFile.startsWith("app/infoboard/")) return "PUBLIC";
  if (sourceFile.startsWith("app/public/")) return "PUBLIC";
  if (sourceFile.startsWith("app/share/")) return "PUBLIC";
  if (sourceFile.startsWith("app/sce-preview/")) return "PUBLIC";
  if (sourceFile === "app/page.tsx") return "PUBLIC";
  if (/\b(requireAnyPermission|requirePermission|getRequestAuthSession)\b/.test(pageSource ?? "")) {
    return "AUTHENTICATED";
  }
  return "PUBLIC";
}

function classifyArchitecture(page) {
  if (page.routeKind !== "RENDERABLE_PAGE") return "NOT_APPLICABLE";
  if (page.sourceFile.startsWith("app/(print)/")) return "NOT_APPLICABLE";
  if (page.authenticationScope !== "AUTHENTICATED") return "NOT_APPLICABLE";
  const blob = [page.pageSource, ...page.layoutSources].join("\n");
  if (CANONICAL_MARKERS.some((marker) => blob.includes(marker))) return "CANONICAL";
  if (blob.includes("PageShell") || blob.includes("ScePageContent")) return "PARTIAL";
  return "LEGACY";
}

function packageForModule(moduleName) {
  switch (moduleName) {
    case "administration":
    case "tenant-admin":
    case "settings":
      return "DS2-07C";
    case "communication":
    case "website-cms":
      return "DS2-07D";
    case "wochenplaner":
    case "training":
    case "matches":
    case "tournaments":
    case "events":
      return "DS2-07E";
    default:
      return "DS2-07F";
  }
}

function inferPriority(entry) {
  if (entry.migrationStatus === "EXCEPTION" || entry.routeKind === "REDIRECT_ALIAS") return "Low";
  if (
    entry.architecture === "LEGACY" &&
    (entry.module === "finance" ||
      entry.module === "teams" ||
      entry.module === "persons" ||
      entry.module === "clubs")
  ) {
    return "High";
  }
  if (entry.architecture === "LEGACY" || entry.architecture === "PARTIAL") return "Medium";
  return "Low";
}

function walk(dir, root, pages, nonPages) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "__tests__" || entry === ".next") continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, root, pages, nonPages);
      continue;
    }
    const sourceFile = toPosix(relative(root, full));
    if (!sourceFile.startsWith("app/")) continue;
    const fileName = entry;
    const located = classifyPath(sourceFile.slice(4));
    if (PAGE_FILES.has(fileName)) {
      const pageSource = readFileSync(full, "utf8");
      const layouts = readLayoutChain(full, root);
      const redirect = isImmediateRedirectPage(pageSource);
      const authenticationScope = inferAuthenticationScope(sourceFile, pageSource);
      pages.push({
        sourceFile,
        urlPattern: located.urlPattern,
        routeKey: located.routeKey,
        intercept: located.intercept,
        parallelSlot: located.parallelSlot,
        routeKind: redirect ? "REDIRECT_ALIAS" : "RENDERABLE_PAGE",
        authenticationScope,
        redirectDestination: redirect ? redirectDestinationFromSource(pageSource) : null,
        module: inferModule(sourceFile, located.urlPattern),
        pageSource,
        inheritedLayouts: layouts.map((layout) => layout.sourceFile),
        layoutSources: layouts.map((layout) => layout.source),
      });
      continue;
    }
    if (ROUTE_FILES.has(fileName)) {
      nonPages.push({
        kind: "ROUTE_HANDLER",
        sourceFile,
        urlPattern: located.urlPattern,
        audience: sourceFile.startsWith("app/api/public/") ? "PUBLIC_API" : "API",
      });
      continue;
    }
    if (FRAMEWORK_FILES.has(fileName)) {
      nonPages.push({
        kind: "FRAMEWORK_FILE",
        sourceFile,
        urlPattern: located.urlPattern,
        audience: "FRAMEWORK",
      });
    }
  }
}

export function discoverAppRouter(root) {
  const pages = [];
  const nonPages = [];
  walk(join(root, "app"), root, pages, nonPages);
  pages.sort((a, b) => a.sourceFile.localeCompare(b.sourceFile));
  nonPages.sort((a, b) => a.sourceFile.localeCompare(b.sourceFile) || a.kind.localeCompare(b.kind));
  return { pages, nonPages };
}

function continuedSources(lifecycle) {
  return new Set(
    (lifecycle ?? [])
      .filter((event) => event.change === "MOVED" || event.change === "RENAMED" || event.change === "REDIRECTED")
      .map((event) => event.destinationSource)
      .filter(Boolean),
  );
}

function applyPolicy(page, { baseline, continued }) {
  const architecture = classifyArchitecture(page);
  const introducedAfterBaseline = !baseline.has(page.sourceFile) && !continued.has(page.sourceFile);
  let migrationStatus = "NOT_STARTED";
  let exceptionId = null;
  let exceptionRationale = null;
  let visualVerificationStatus = "PENDING";
  let accessibilityVerificationStatus = "PENDING";
  let functionalVerificationStatus = "PENDING";
  let resolvedArchitecture = architecture;

  if (page.routeKind === "REDIRECT_ALIAS") {
    migrationStatus = "EXCEPTION";
    exceptionId = EXCEPTION_IDS.REDIRECT;
    exceptionRationale = `Redirect alias to ${page.redirectDestination}. Not a visual surface and excluded from verified-page completion.`;
    visualVerificationStatus = "NOT_APPLICABLE";
    accessibilityVerificationStatus = "NOT_APPLICABLE";
    functionalVerificationStatus = "NOT_APPLICABLE";
    resolvedArchitecture = "NOT_APPLICABLE";
  } else if (page.sourceFile.startsWith("app/(print)/")) {
    migrationStatus = "EXCEPTION";
    exceptionId = EXCEPTION_IDS.PRINT;
    exceptionRationale =
      "Print/PDF spielplan document. Semantic paper surface, outside authenticated workspace chrome, and excluded from visual completion.";
    visualVerificationStatus = "NOT_APPLICABLE";
    accessibilityVerificationStatus = "NOT_APPLICABLE";
    functionalVerificationStatus = "NOT_APPLICABLE";
    resolvedArchitecture = "NOT_APPLICABLE";
  } else if (page.sourceFile.startsWith("app/sce-preview/")) {
    migrationStatus = "EXCEPTION";
    exceptionId = EXCEPTION_IDS.PREVIEW;
    exceptionRationale =
      "Internal design specimen. Public preview follows specimen rules and is not an authenticated workspace page.";
    visualVerificationStatus = "NOT_APPLICABLE";
    accessibilityVerificationStatus = "NOT_APPLICABLE";
    functionalVerificationStatus = "NOT_APPLICABLE";
    resolvedArchitecture = "NOT_APPLICABLE";
  } else if (page.authenticationScope === "PUBLIC") {
    migrationStatus = "EXCEPTION";
    exceptionId = EXCEPTION_IDS.PUBLIC;
    exceptionRationale =
      "Public page follows public design-system rules and is not forced into authenticated workspace chrome.";
    visualVerificationStatus = "NOT_APPLICABLE";
    accessibilityVerificationStatus = "NOT_APPLICABLE";
    functionalVerificationStatus = "NOT_APPLICABLE";
    resolvedArchitecture = "NOT_APPLICABLE";
  } else if (architecture === "CANONICAL") {
    migrationStatus = "IMPLEMENTED";
  }

  const entry = {
    urlPattern: page.urlPattern,
    routeKey: page.routeKey,
    sourceFile: page.sourceFile,
    inheritedLayouts: page.inheritedLayouts,
    module: page.module,
    authenticationScope: page.authenticationScope,
    routeKind: page.routeKind,
    intercept: page.intercept,
    parallelSlot: page.parallelSlot,
    architecture: resolvedArchitecture,
    migrationStatus,
    migrationPackage: null,
    priority: "Low",
    visualVerificationStatus,
    accessibilityVerificationStatus,
    functionalVerificationStatus,
    exceptionId,
    exceptionRationale,
    redirectDestination: page.redirectDestination,
    introducedAfterBaseline,
    verificationEvidence: emptyEvidence(),
  };
  if (entry.migrationStatus !== "EXCEPTION" && entry.authenticationScope === "AUTHENTICATED" && entry.routeKind === "RENDERABLE_PAGE") {
    entry.migrationPackage = entry.architecture === "CANONICAL" ? "DS2-07G" : packageForModule(entry.module);
  }
  entry.priority = inferPriority(entry);
  return entry;
}

const OVERRIDE_FIELDS = new Set([
  "architecture",
  "migrationStatus",
  "migrationPackage",
  "priority",
  "visualVerificationStatus",
  "accessibilityVerificationStatus",
  "functionalVerificationStatus",
  "exceptionId",
  "exceptionRationale",
  "verificationEvidence",
]);

function applyOverride(entry, override) {
  if (!override) return entry;
  const next = { ...entry };
  for (const [key, value] of Object.entries(override)) {
    if (!OVERRIDE_FIELDS.has(key)) continue;
    if (key === "verificationEvidence") {
      next.verificationEvidence = { ...entry.verificationEvidence, ...value };
      continue;
    }
    next[key] = value;
  }
  return next;
}

export function buildRegistry({ discovery, baselineSourceFiles, overlay }) {
  const baseline = new Set(baselineSourceFiles ?? []);
  const continued = continuedSources(overlay?.lifecycle);
  const overrides = overlay?.recordOverrides ?? {};
  return discovery.pages.map((page) => applyOverride(applyPolicy(page, { baseline, continued }), overrides[page.sourceFile]));
}

export function assessNewPageContract(page) {
  const blob = [page?.pageSource ?? "", ...(page?.layoutSources ?? [])].join("\n");
  const architecture = PAGE_STRUCTURE_MARKERS.some((marker) => blob.includes(marker));
  const typography =
    TYPOGRAPHY_MARKERS.some((marker) => blob.includes(marker)) ||
    (blob.includes("SceWorkspaceChrome") && /header\s*[:=]/.test(blob));
  const tokens = architecture || blob.includes("sce-type-") || blob.includes("var(--");
  return { architecture, typography, tokens };
}

function violation(code, entry, message) {
  return {
    code,
    sourceFile: entry?.sourceFile ?? null,
    urlPattern: entry?.urlPattern ?? null,
    message,
  };
}

export function evaluateGovernance({ discovery, registry, baselineSourceFiles, lifecycle, overlay }) {
  const blocking = [];
  const tracked = [];
  const baseline = new Set(baselineSourceFiles ?? []);
  const pages = discovery?.pages ?? [];
  const discoveredSources = new Set(pages.map((page) => page.sourceFile));
  const registryBySource = new Map(registry.map((entry) => [entry.sourceFile, entry]));
  const events = lifecycle ?? overlay?.lifecycle ?? [];
  const overrides = overlay?.recordOverrides ?? {};
  const continued = continuedSources(events);
  const pageBySource = new Map(pages.map((page) => [page.sourceFile, page]));

  const urlGroups = new Map();
  for (const page of pages) {
    if (page.intercept || page.parallelSlot) continue;
    const group = urlGroups.get(page.urlPattern) ?? [];
    group.push(page.sourceFile);
    urlGroups.set(page.urlPattern, group);
  }
  for (const [urlPattern, sources] of urlGroups) {
    if (sources.length > 1) {
      blocking.push(
        violation(
          "DS2-07B-DUPLICATE",
          { sourceFile: sources.join(", "), urlPattern },
          `Duplicate URL pattern ${urlPattern}`,
        ),
      );
    }
  }

  for (const page of pages) {
    if (!registryBySource.has(page.sourceFile)) {
      blocking.push(violation("DS2-07B-UNREGISTERED", page, "Discovered page is not registered"));
    }
  }

  const lifecycleBySource = new Map(events.map((event) => [event.sourceFile, event]));
  for (const sourceFile of baseline) {
    if (!discoveredSources.has(sourceFile) && !lifecycleBySource.has(sourceFile)) {
      blocking.push(
        violation(
          "DS2-07B-LIFECYCLE",
          { sourceFile, urlPattern: null },
          "Baseline route is missing without a lifecycle reconciliation record",
        ),
      );
    }
  }

  for (const event of events) {
    const rationale = typeof event.rationale === "string" ? event.rationale.trim() : "";
    if (rationale.length < 12) {
      blocking.push(
        violation("DS2-07B-LIFECYCLE", event, "Lifecycle change requires a documented rationale"),
      );
    }
    if (event.change === "MOVED" || event.change === "RENAMED" || event.change === "REDIRECTED") {
      if (!event.destinationSource) {
        blocking.push(violation("DS2-07B-LIFECYCLE", event, `${event.change} requires destinationSource`));
      } else if (!discoveredSources.has(event.destinationSource)) {
        blocking.push(
          violation("DS2-07B-LIFECYCLE", event, `${event.change} destination is not a discovered page`),
        );
      }
    } else if (event.change === "DELETED") {
      if (discoveredSources.has(event.sourceFile)) {
        blocking.push(
          violation("DS2-07B-LIFECYCLE", event, "DELETED lifecycle record still exists on disk"),
        );
      }
    } else {
      blocking.push(violation("DS2-07B-LIFECYCLE", event, `Unknown lifecycle change ${event.change ?? ""}`.trim()));
    }
  }

  for (const sourceFile of Object.keys(overrides)) {
    if (!discoveredSources.has(sourceFile)) {
      blocking.push(
        violation(
          "DS2-07B-LIFECYCLE",
          { sourceFile, urlPattern: null },
          "Governance override does not match a discovered page",
        ),
      );
    }
  }

  for (const entry of registry) {
    if (!discoveredSources.has(entry.sourceFile)) {
      blocking.push(
        violation("DS2-07B-LIFECYCLE", entry, "Registry entry has no discovered page"),
      );
    }

    if (entry.migrationStatus === "EXCEPTION") {
      const rationale = entry.exceptionRationale?.trim() ?? "";
      if (!entry.exceptionId || !/^SCE-DS2-07B-EX-[A-Z0-9-]+$/.test(entry.exceptionId) || rationale.length < 40) {
        blocking.push(
          violation("DS2-07B-EXCEPTION-RATIONALE", entry, "Approved exception requires an id and rationale"),
        );
      }
    }

    if (entry.migrationPackage && !MIGRATION_PACKAGES.includes(entry.migrationPackage)) {
      blocking.push(
        violation("DS2-07B-INVALID-PACKAGE", entry, `Invalid migration package ${entry.migrationPackage}`),
      );
    }

    if (entry.routeKind === "REDIRECT_ALIAS") {
      if (!entry.redirectDestination) {
        blocking.push(
          violation("DS2-07B-REDIRECT-DESTINATION", entry, "Redirect alias must reference its destination"),
        );
      }
      if (entry.architecture !== "NOT_APPLICABLE") {
        blocking.push(
          violation("DS2-07B-REDIRECT-ARCHITECTURE", entry, "Redirect alias architecture must be NOT_APPLICABLE"),
        );
      }
      const falselyVerified =
        entry.migrationStatus === "VERIFIED" ||
        entry.visualVerificationStatus === "VERIFIED" ||
        entry.accessibilityVerificationStatus === "VERIFIED" ||
        entry.functionalVerificationStatus === "VERIFIED";
      if (falselyVerified) {
        blocking.push(
          violation(
            "DS2-07B-REDIRECT-VERIFIED",
            entry,
            "Redirect alias must not be counted as visually verified",
          ),
        );
      }
    }

    const claimsVerified =
      entry.migrationStatus === "VERIFIED" ||
      entry.visualVerificationStatus === "VERIFIED" ||
      entry.accessibilityVerificationStatus === "VERIFIED" ||
      entry.functionalVerificationStatus === "VERIFIED";
    if (entry.routeKind !== "REDIRECT_ALIAS" && claimsVerified && !isVerifiedAuthenticatedVisual(entry)) {
      blocking.push(
        violation(
          "DS2-07B-VERIFIED-WITHOUT-EVIDENCE",
          entry,
          "VERIFIED requires canonical architecture and visual, accessibility, functional, and responsive evidence",
        ),
      );
    }

    const needsPackage =
      entry.authenticationScope === "AUTHENTICATED" &&
      entry.routeKind === "RENDERABLE_PAGE" &&
      entry.migrationStatus !== "EXCEPTION" &&
      (entry.architecture === "LEGACY" || entry.architecture === "PARTIAL" || entry.architecture === "CANONICAL");
    if (needsPackage && !entry.migrationPackage) {
      blocking.push(violation("DS2-07B-UNASSIGNED", entry, "Authenticated route has no migration package"));
    }
    if (needsPackage && entry.architecture === "CANONICAL" && entry.migrationStatus !== "VERIFIED" && entry.migrationPackage !== "DS2-07G") {
      blocking.push(
        violation("DS2-07B-INVALID-PACKAGE", entry, "Canonical unverified routes belong to DS2-07G"),
      );
    }
    if (
      needsPackage &&
      (entry.architecture === "LEGACY" || entry.architecture === "PARTIAL") &&
      entry.migrationPackage === "DS2-07G"
    ) {
      blocking.push(
        violation(
          "DS2-07B-INVALID-PACKAGE",
          entry,
          "Legacy or partial routes cannot be assigned to the verification-closure package",
        ),
      );
    }

    const isNew = !baseline.has(entry.sourceFile) && !continued.has(entry.sourceFile);
    if (
      !isNew &&
      entry.authenticationScope === "AUTHENTICATED" &&
      entry.routeKind === "RENDERABLE_PAGE" &&
      entry.migrationStatus !== "EXCEPTION" &&
      (entry.architecture === "LEGACY" || entry.architecture === "PARTIAL")
    ) {
      tracked.push({
        code: "DS2-07B-TRACKED-DEBT",
        sourceFile: entry.sourceFile,
        urlPattern: entry.urlPattern,
        migrationPackage: entry.migrationPackage,
        architecture: entry.architecture,
        message: "Existing legacy or partial route is tracked for incremental migration",
      });
    }

    if (
      isNew &&
      entry.authenticationScope === "AUTHENTICATED" &&
      entry.routeKind === "RENDERABLE_PAGE" &&
      entry.migrationStatus !== "EXCEPTION"
    ) {
      const contract = assessNewPageContract(pageBySource.get(entry.sourceFile));
      if (!contract.architecture) {
        blocking.push(
          violation(
            "DS2-07B-NONCANONICAL",
            entry,
            "New authenticated page bypasses canonical Design System 2.0 architecture",
          ),
        );
      }
      if (!contract.tokens) {
        blocking.push(violation("DS2-07B-TOKENS", entry, "New authenticated page is missing design tokens"));
      }
      if (!contract.typography) {
        blocking.push(
          violation(
            "DS2-07B-TYPOGRAPHY",
            entry,
            "New authenticated page is missing typography and page hierarchy",
          ),
        );
      }
      if (!isVerifiedAuthenticatedVisual(entry)) {
        blocking.push(
          violation(
            "DS2-07B-NEW-PAGE-EVIDENCE",
            entry,
            "New authenticated page requires responsive, accessibility, functional, and visual verification evidence",
          ),
        );
      }
    }
  }

  blocking.sort((a, b) => `${a.code}:${a.sourceFile}`.localeCompare(`${b.code}:${b.sourceFile}`));
  tracked.sort((a, b) => a.sourceFile.localeCompare(b.sourceFile));
  return { blocking, tracked };
}

function countBy(items, keyFn, keys) {
  const counts = Object.fromEntries(keys.map((key) => [key, 0]));
  for (const item of items) {
    const key = keyFn(item);
    if (key in counts) counts[key] += 1;
  }
  return counts;
}

function percentNumber(count, total) {
  if (!total) return 0;
  return Math.round((count / total) * 1000) / 10;
}

export function summarizeGovernance({ discovery, registry, evaluation }) {
  const authenticatedRenderable = registry.filter(
    (entry) => entry.authenticationScope === "AUTHENTICATED" && entry.routeKind === "RENDERABLE_PAGE",
  );
  const visualPages = authenticatedRenderable.filter((entry) => entry.migrationStatus !== "EXCEPTION");
  const verified = visualPages.filter((entry) => isVerifiedAuthenticatedVisual(entry));
  const canonical = visualPages.filter((entry) => entry.architecture === "CANONICAL");
  const outstanding = registry.filter(
    (entry) => entry.migrationPackage && entry.migrationStatus !== "VERIFIED" && entry.migrationStatus !== "EXCEPTION",
  );
  const exceptionCounts = {
    [EXCEPTION_IDS.REDIRECT]: 0,
    [EXCEPTION_IDS.PUBLIC]: 0,
    [EXCEPTION_IDS.PREVIEW]: 0,
    [EXCEPTION_IDS.PRINT]: 0,
  };
  for (const entry of registry) {
    if (!entry.exceptionId) continue;
    exceptionCounts[entry.exceptionId] = (exceptionCounts[entry.exceptionId] ?? 0) + 1;
  }
  const outstandingByPackage = Object.fromEntries(MIGRATION_PACKAGES.map((pkg) => [pkg, 0]));
  for (const entry of outstanding) {
    outstandingByPackage[entry.migrationPackage] += 1;
  }
  const unassigned = visualPages.filter((entry) => !entry.migrationPackage);
  return {
    pageCount: registry.length,
    authenticatedRenderableCount: authenticatedRenderable.length,
    authenticatedVisualCount: visualPages.length,
    authenticatedRedirectCount: registry.filter(
      (entry) => entry.authenticationScope === "AUTHENTICATED" && entry.routeKind === "REDIRECT_ALIAS",
    ).length,
    publicRenderableCount: registry.filter(
      (entry) => entry.authenticationScope === "PUBLIC" && entry.routeKind === "RENDERABLE_PAGE",
    ).length,
    publicRedirectCount: registry.filter(
      (entry) => entry.authenticationScope === "PUBLIC" && entry.routeKind === "REDIRECT_ALIAS",
    ).length,
    routeHandlerCount: (discovery?.nonPages ?? []).filter((entry) => entry.kind === "ROUTE_HANDLER").length,
    frameworkFileCount: (discovery?.nonPages ?? []).filter((entry) => entry.kind === "FRAMEWORK_FILE").length,
    architecture: countBy(visualPages, (entry) => entry.architecture, [
      "CANONICAL",
      "PARTIAL",
      "LEGACY",
      "NOT_APPLICABLE",
    ]),
    migrationStatus: countBy(registry, (entry) => entry.migrationStatus, [
      "NOT_STARTED",
      "IN_PROGRESS",
      "IMPLEMENTED",
      "VERIFIED",
      "EXCEPTION",
    ]),
    verifiedAuthenticatedVisualCount: verified.length,
    verifiedAuthenticatedVisualPercent: percentNumber(verified.length, visualPages.length),
    architecturalCanonicalCount: canonical.length,
    architecturalCanonicalPercent: percentNumber(canonical.length, visualPages.length),
    unassignedCount: unassigned.length,
    exceptionsById: exceptionCounts,
    outstandingByPackage,
    introducedAfterBaselineCount: registry.filter((entry) => entry.introducedAfterBaseline).length,
    blockingCount: evaluation.blocking.length,
    trackedDebtCount: evaluation.tracked.length,
  };
}

function formatPercent(count, total) {
  const value = percentNumber(count, total);
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

export function renderReport({ summary, registry, evaluation }) {
  const visual = summary.authenticatedVisualCount;
  const lines = [];
  lines.push("# SCE-DS2-07B — Route lifecycle governance");
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("| --- | --- |");
  lines.push("| **Package** | `SCE-DS2-07B` |");
  lines.push("| **Predecessor** | `SCE-DS2-07A` |");
  lines.push("| **Target branch** | `STAGE` |");
  lines.push("| **Scope** | Governance infrastructure. No mass visual migration. |");
  lines.push("");
  lines.push("Architectural adoption and visual verification are tracked separately. Importing `SceWorkspaceChrome` or passing a production build does not mark a page `VERIFIED`.");
  lines.push("");
  lines.push("Authenticated browser coverage for this package: **none**.");
  lines.push("");
  lines.push("## Discovered routes");
  lines.push("");
  lines.push("| Classification | Count |");
  lines.push("| --- | ---: |");
  lines.push(`| Page entries | ${summary.pageCount} |`);
  lines.push(`| Authenticated renderable pages | ${summary.authenticatedRenderableCount} |`);
  lines.push(`| Authenticated visual pages (completion denominator) | ${summary.authenticatedVisualCount} |`);
  lines.push(`| Authenticated redirect aliases | ${summary.authenticatedRedirectCount} |`);
  lines.push(`| Public renderable pages | ${summary.publicRenderableCount} |`);
  lines.push(`| Public redirect aliases | ${summary.publicRedirectCount} |`);
  lines.push(`| Route handlers | ${summary.routeHandlerCount} |`);
  lines.push(`| Special Next.js framework files | ${summary.frameworkFileCount} |`);
  lines.push("");
  lines.push("Redirect aliases reference a destination and are excluded from visual completion. Public pages keep public design-system rules and are not forced into authenticated workspace chrome. Print documents are an approved semantic exception.");
  lines.push("");
  lines.push("## Authenticated visual architecture");
  lines.push("");
  lines.push("Counts below are authenticated renderable pages excluding approved exceptions. They describe architecture, not verification.");
  lines.push("");
  lines.push("| Architecture | Count |");
  lines.push("| --- | ---: |");
  lines.push(`| CANONICAL | ${summary.architecture.CANONICAL} |`);
  lines.push(`| PARTIAL | ${summary.architecture.PARTIAL} |`);
  lines.push(`| LEGACY | ${summary.architecture.LEGACY} |`);
  lines.push(`| NOT_APPLICABLE | ${summary.architecture.NOT_APPLICABLE} |`);
  lines.push("");
  lines.push(`Architectural canonical adoption: **${summary.architecturalCanonicalCount} / ${visual} (${formatPercent(summary.architecturalCanonicalCount, visual)})**.`);
  lines.push("");
  lines.push("## Verification");
  lines.push("");
  lines.push("| Migration status | Count |");
  lines.push("| --- | ---: |");
  for (const status of ["NOT_STARTED", "IN_PROGRESS", "IMPLEMENTED", "VERIFIED", "EXCEPTION"]) {
    lines.push(`| ${status} | ${summary.migrationStatus[status]} |`);
  }
  lines.push("");
  lines.push(`Verified authenticated visual pages: **${summary.verifiedAuthenticatedVisualCount} / ${visual} (${formatPercent(summary.verifiedAuthenticatedVisualCount, visual)})**.`);
  lines.push("");
  lines.push("`IMPLEMENTED` means canonical workspace architecture is present. `VERIFIED` additionally requires recorded visual, accessibility, functional, and responsive evidence.");
  lines.push("");
  lines.push("## Ownership");
  lines.push("");
  lines.push(`Unassigned authenticated visual routes: **${summary.unassignedCount}**.`);
  lines.push("");
  lines.push("| Package | Outstanding routes | Scope |");
  lines.push("| --- | ---: | --- |");
  for (const pkg of MIGRATION_PACKAGES) {
    lines.push(`| ${pkg} | ${summary.outstandingByPackage[pkg]} | ${PACKAGE_LABELS[pkg]} |`);
  }
  lines.push("");
  lines.push("Canonical pages that are not yet visually verified stay on DS2-07G. Legacy and partial pages stay on DS2-07C–F. Existing tracked debt does not fail CI.");
  lines.push("");
  lines.push("## Exceptions");
  lines.push("");
  lines.push("| Id | Routes |");
  lines.push("| --- | ---: |");
  for (const id of Object.keys(summary.exceptionsById).sort()) {
    lines.push(`| ${id} | ${summary.exceptionsById[id]} |`);
  }
  lines.push("");
  lines.push("## Redirect aliases");
  lines.push("");
  lines.push("| URL pattern | Destination | Source |");
  lines.push("| --- | --- | --- |");
  const aliases = registry
    .filter((entry) => entry.routeKind === "REDIRECT_ALIAS")
    .sort((a, b) => a.urlPattern.localeCompare(b.urlPattern) || a.sourceFile.localeCompare(b.sourceFile));
  for (const alias of aliases) {
    lines.push(`| \`${alias.urlPattern}\` | \`${alias.redirectDestination}\` | \`${alias.sourceFile}\` |`);
  }
  lines.push("");
  lines.push("## Outstanding routes");
  lines.push("");
  for (const pkg of MIGRATION_PACKAGES) {
    lines.push(`### ${pkg}`);
    lines.push("");
    const rows = registry
      .filter((entry) => entry.migrationPackage === pkg && entry.migrationStatus !== "VERIFIED" && entry.migrationStatus !== "EXCEPTION")
      .sort((a, b) => a.urlPattern.localeCompare(b.urlPattern) || a.sourceFile.localeCompare(b.sourceFile));
    if (rows.length === 0) {
      lines.push("None.");
      lines.push("");
      continue;
    }
    lines.push("| URL pattern | Architecture | Status | Priority | Source |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const row of rows) {
      lines.push(`| \`${row.urlPattern}\` | ${row.architecture} | ${row.migrationStatus} | ${row.priority} | \`${row.sourceFile}\` |`);
    }
    lines.push("");
  }
  lines.push("## Changes since the baseline");
  lines.push("");
  lines.push(`New routes introduced since the previous baseline: **${summary.introducedAfterBaselineCount}**.`);
  lines.push("");
  const introduced = registry.filter((entry) => entry.introducedAfterBaseline);
  if (introduced.length === 0) {
    lines.push("None.");
  } else {
    for (const entry of introduced) {
      lines.push(`- \`${entry.sourceFile}\` (\`${entry.urlPattern}\`)`);
    }
  }
  lines.push("");
  lines.push("## CI");
  lines.push("");
  lines.push(`Blocking violations: **${summary.blockingCount}**. Tracked existing debt: **${summary.trackedDebtCount}**.`);
  lines.push("");
  lines.push("Blocking codes cover unregistered pages, duplicate URLs, missing lifecycle reconciliation, non-canonical new authenticated pages, missing verification evidence, redirect aliases marked verified, and invalid package assignments. Tracked debt is reported and does not fail the job.");
  lines.push("");
  if (evaluation.blocking.length > 0) {
    lines.push("### Blocking violations");
    lines.push("");
    for (const item of evaluation.blocking) {
      lines.push(`- \`${item.code}\` ${item.sourceFile ?? ""} ${item.message}`.trim());
    }
    lines.push("");
  }
  lines.push("Regenerate with `node scripts/sce-ds2-06-route-inventory-scan.mjs`. Check with `node scripts/sce-ds2-07b-route-governance-check.mjs`.");
  lines.push("");
  return `${lines.join("\n")}`;
}

export function renderRegistryModule(registry, summary) {
  return `/**
 * SCE-DS2-07B — route lifecycle registry (generated; do not hand-edit).
 * Regenerate: node scripts/sce-ds2-06-route-inventory-scan.mjs
 */
import type { SceDs207bRegistryEntry, SceDs207bSummary } from "./sce-ds2-07b-meta";

export const SCE_DS2_07B_ROUTE_REGISTRY: SceDs207bRegistryEntry[] = ${JSON.stringify(registry, null, 2)};

export const SCE_DS2_07B_SUMMARY: SceDs207bSummary = ${JSON.stringify(summary, null, 2)};
`;
}

function writeAtomic(filePath, contents) {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  writeFileSync(tmp, contents);
  renameSync(tmp, filePath);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function governancePaths(root) {
  return {
    baseline: join(root, BASELINE_REL),
    overlay: join(root, OVERLAY_REL),
    registry: join(root, REGISTRY_REL),
    nonPageIndex: join(root, NON_PAGE_REL),
    report: join(root, REPORT_REL),
  };
}

export function loadGovernanceModel(root) {
  const paths = governancePaths(root);
  if (!existsSync(paths.baseline)) {
    throw new Error(`Missing ${BASELINE_REL}. Create it with SCE_DS2_07B_WRITE_BASELINE=1.`);
  }
  if (!existsSync(paths.overlay)) {
    throw new Error(`Missing ${OVERLAY_REL}.`);
  }
  const discovery = discoverAppRouter(root);
  const baselineSourceFiles = readJson(paths.baseline);
  const overlay = readJson(paths.overlay);
  const registry = buildRegistry({ discovery, baselineSourceFiles, overlay });
  const evaluation = evaluateGovernance({
    discovery,
    registry,
    baselineSourceFiles,
    lifecycle: overlay.lifecycle ?? [],
    overlay,
  });
  const summary = summarizeGovernance({ discovery, registry, evaluation, baselineSourceFiles });
  return { paths, discovery, baselineSourceFiles, overlay, registry, evaluation, summary };
}

export function writeGovernanceArtifacts(root, { writeBaseline = false } = {}) {
  const paths = governancePaths(root);
  if (writeBaseline) {
    const discovery = discoverAppRouter(root);
    writeAtomic(paths.baseline, `${JSON.stringify(discovery.pages.map((page) => page.sourceFile).sort(), null, 2)}\n`);
  }
  const model = loadGovernanceModel(root);
  writeAtomic(paths.registry, renderRegistryModule(model.registry, model.summary));
  writeAtomic(paths.nonPageIndex, `${JSON.stringify(model.discovery.nonPages, null, 2)}\n`);
  writeAtomic(paths.report, renderReport(model));
  return model;
}

export function evaluateRepository(root) {
  const model = loadGovernanceModel(root);
  const drift = [];
  const expectedRegistry = renderRegistryModule(model.registry, model.summary);
  const expectedReport = renderReport(model);
  const expectedNonPages = `${JSON.stringify(model.discovery.nonPages, null, 2)}\n`;
  if (!existsSync(model.paths.registry) || readFileSync(model.paths.registry, "utf8") !== expectedRegistry) {
    drift.push(REGISTRY_REL);
  }
  if (!existsSync(model.paths.report) || readFileSync(model.paths.report, "utf8") !== expectedReport) {
    drift.push(REPORT_REL);
  }
  if (!existsSync(model.paths.nonPageIndex) || readFileSync(model.paths.nonPageIndex, "utf8") !== expectedNonPages) {
    drift.push(NON_PAGE_REL);
  }
  return { ...model, drift };
}

export const GOVERNANCE_RELATIVE_PATHS = {
  BASELINE_REL,
  OVERLAY_REL,
  REGISTRY_REL,
  NON_PAGE_REL,
  REPORT_REL,
};

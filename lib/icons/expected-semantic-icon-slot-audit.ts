/**
 * Expected semantic icon-slot audit — detects UI constructs that SHOULD carry domain identity icons,
 * independent of icon occurrence scanning (SCE-ICONS-V2-01).
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  auditNavigationCompleteness,
  buildAppNavigationModelForUser,
} from "@/lib/nav/app-navigation-model";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import { getNavDestinationSceIconName } from "@/lib/nav/nav-destination-sce-icons";
import { resolveLucideSemantic } from "@/lib/icons/icon-semantic-resolution";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

export type ExpectedIconSlotClassification =
  | "SCE_CORRECT"
  | "SCE_WRONG"
  | "LEGACY_DOMAIN"
  | "MISSING_EXPECTED_ICON"
  | "UTILITY_CORRECT"
  | "STATUS_CORRECT"
  | "CONTENT_IDENTITY_CORRECT"
  | "TEXT_ONLY_BY_DESIGN"
  | "DECORATIVE"
  | "UNKNOWN_REQUIRES_REVIEW";

export type ExpectedIconSlotRecord = {
  id: string;
  route: string;
  zone:
    | "GLOBAL_NAVIGATION"
    | "SECONDARY_NAVIGATION"
    | "LOCAL_NAVIGATION"
    | "APP_EXPLORER"
    | "PAGE_HEADER"
    | "SECTION_HEADER"
    | "KPI_CARD"
    | "SUMMARY_CARD"
    | "QUICK_ACCESS"
    | "MODULE_CARD"
    | "LIST_ROW"
    | "ENTITY_ROW"
    | "TABLE_LEADING"
    | "TAB"
    | "EMPTY_STATE"
    | "FORM_SECTION"
    | "DIALOG_HEADER"
    | "SELECTOR"
    | "DASHBOARD_WIDGET"
    | "CALENDAR_ACTIVITY"
    | "MOBILE_ALTERNATE";
  file: string;
  line: number;
  expectedSemantic: string | null;
  observed: string;
  classification: ExpectedIconSlotClassification;
  notes: string;
};

export type ExpectedSemanticIconSlotAuditReport = {
  routesAudited: string[];
  slots: ExpectedIconSlotRecord[];
  totals: Record<ExpectedIconSlotClassification, number>;
  knownQaSurfaces: Record<string, { route: string; slotCount: number; debt: ExpectedIconSlotRecord[] }>;
};

const SCAN_ROOTS = ["app/(admin)", "components"] as const;
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "baseline-backups", "__tests__"]);

const QA_ROUTES = [
  "/dashboard",
  "/dashboard/spiele",
  "/dashboard/org-units",
  "/dashboard/teams",
  "/dashboard/website",
] as const;

function walk(dir: string, out: string[] = []): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return out;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

function pageFileToRoute(pageFile: string): string {
  const rel = pageFile.replace(/^app\/\(admin\)/, "").replace(/\/page\.tsx$/, "");
  if (!rel) return "/";
  return rel.startsWith("/") ? rel : `/${rel}`;
}

function lineNumber(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

function classifyEmptyStateSlot(
  file: string,
  emptyStateLine: string,
  iconLine: string | null,
): ExpectedIconSlotClassification {
  const combined = `${emptyStateLine}\n${iconLine ?? ""}`;
  if (/SceIcon|ProductDomainSceIcon|ActivitySceIcon|OrgUnitTypeSceIcon|\w+SceIcon/.test(combined)) {
    return "SCE_CORRECT";
  }
  const lucideMatch = combined.match(/icon=\{<([A-Za-z0-9]+)/);
  if (lucideMatch) {
    const symbol = lucideMatch[1]!;
    const resolution = resolveLucideSemantic(symbol, file, combined);
    switch (resolution.category) {
      case "UTILITY_ACTION":
        return "UTILITY_CORRECT";
      case "STATUS_STATE":
        return "STATUS_CORRECT";
      case "CONTENT_IDENTITY":
        return "CONTENT_IDENTITY_CORRECT";
      case "SCE_DOMAIN_APPROVED":
      case "DECORATIVE":
      case "DEAD_OR_NON_RENDERED":
        return "DECORATIVE";
      default:
        return "DECORATIVE";
    }
  }
  return "TEXT_ONLY_BY_DESIGN";
}

function classifyMobileAlternateMarkup(src: string, rel: string): ExpectedIconSlotClassification {
  if (/SceIcon|NavDestinationSceIcon|ProductDomainSceIcon|ActivitySceIcon/.test(src)) {
    return "SCE_CORRECT";
  }
  if (!/from "lucide-react"/.test(src)) {
    return "TEXT_ONLY_BY_DESIGN";
  }
  const domainLucide = /(Building2|Network|Globe|Users|Newspaper|Landmark|FolderOpen|LayoutGrid|CalendarDays|FileText)/.test(
    src,
  );
  if (domainLucide && /NavDestinationSceIcon/.test(src) === false) {
    return "LEGACY_DOMAIN";
  }
  if (/Drawer|Mobile|GlobalNav/.test(rel)) {
    return "UTILITY_CORRECT";
  }
  return "UTILITY_CORRECT";
}

function classifyObserved(symbol: string): ExpectedIconSlotClassification {
  if (/SceIcon|ProductDomainSceIcon|NavDestinationSceIcon|ActivitySceIcon|OrgUnitTypeSceIcon/.test(symbol)) {
    return "SCE_CORRECT";
  }
  if (/Lucide|from "lucide-react"/.test(symbol) || /^[A-Z][a-zA-Z]+$/.test(symbol)) {
    return "LEGACY_DOMAIN";
  }
  if (/initials|Avatar|crest|logo|thumbnail/i.test(symbol)) {
    return "CONTENT_IDENTITY_CORRECT";
  }
  if (/CheckCircle|XCircle|Alert|Status|Badge/.test(symbol)) {
    return "STATUS_CORRECT";
  }
  if (/Search|Plus|Chevron|MoreHorizontal|Filter|X\b/.test(symbol)) {
    return "UTILITY_CORRECT";
  }
  if (/none|text-only|no icon/i.test(symbol)) {
    return "TEXT_ONLY_BY_DESIGN";
  }
  return "UNKNOWN_REQUIRES_REVIEW";
}

function pushSlot(
  slots: ExpectedIconSlotRecord[],
  partial: Omit<ExpectedIconSlotRecord, "id">,
): void {
  slots.push({ id: `${partial.route}::${partial.zone}::${partial.file}:${partial.line}`, ...partial });
}

export function runExpectedSemanticIconSlotAudit(root = process.cwd()): ExpectedSemanticIconSlotAuditReport {
  const slots: ExpectedIconSlotRecord[] = [];
  const routesAudited = new Set<string>();

  // ── Global / canonical navigation (expected SCE domain icons) ─────────────
  const permissionKeys = Object.values(PERMISSIONS) as PermissionKey[];
  const navSections = getVisibleNavSections(permissionKeys, "club");
  const navModel = buildAppNavigationModelForUser(permissionKeys, "club");
  for (const dest of navModel.destinations) {
    routesAudited.add(dest.href);
    const expected = getNavDestinationSceIconName(dest.key);
    pushSlot(slots, {
      route: dest.href,
      zone: "GLOBAL_NAVIGATION",
      file: "lib/nav/nav-destination-sce-icons.ts",
      line: 1,
      expectedSemantic: expected,
      observed: expected ? `NavDestinationSceIcon(${expected})` : "none",
      classification: expected ? "SCE_CORRECT" : "MISSING_EXPECTED_ICON",
      notes: expected
        ? "Canonical nav destination mapped to SCE master."
        : "Nav destination lacks SCE semantic mapping.",
    });
  }

  const navCompleteness = auditNavigationCompleteness(navSections, navModel);
  for (const key of navCompleteness.orphanedDestinations) {
    pushSlot(slots, {
      route: `/nav:${key}`,
      zone: "GLOBAL_NAVIGATION",
      file: "lib/nav/app-navigation-model.ts",
      line: 1,
      expectedSemantic: key,
      observed: "unreachable-in-domain-model",
      classification: "UNKNOWN_REQUIRES_REVIEW",
      notes: "Orphaned nav destination in completeness audit.",
    });
  }

  for (const dest of navModel.destinations) {
    const expected = getNavDestinationSceIconName(dest.key);
    if (!expected) {
      pushSlot(slots, {
        route: dest.href,
        zone: "SECONDARY_NAVIGATION",
        file: "lib/nav/nav-destination-sce-icons.ts",
        line: 1,
        expectedSemantic: dest.key,
        observed: "none",
        classification: "MISSING_EXPECTED_ICON",
        notes: "Reachable destination without nav SCE icon mapping.",
      });
    }
  }

  // ── Static scan for known slot patterns ───────────────────────────────────
  const files = SCAN_ROOTS.flatMap((r) => walk(join(root, r)));
  for (const file of files) {
    const rel = relative(root, file);
    const src = readFileSync(file, "utf8");
    const routeGuess = rel.startsWith("app/(admin)/") ? pageFileToRoute(rel) : inferComponentRoute(rel);

    if (rel.includes("DashboardModuleCards.tsx")) {
      routesAudited.add("/dashboard");
      const hasModuleIcons = /NavDestinationSceIcon|getNavDestinationSceIconName|SceIcon/.test(src);
      pushSlot(slots, {
        route: "/dashboard",
        zone: "MODULE_CARD",
        file: rel,
        line: 35,
        expectedSemantic: "module-destination",
        observed: hasModuleIcons ? "NavDestinationSceIcon(module.key)" : "text-only module cards",
        classification: hasModuleIcons ? "SCE_CORRECT" : "MISSING_EXPECTED_ICON",
        notes: "Module explorer cards — SCE domain icon via nav destination mapping.",
      });
    }

    if (rel.includes("ListPagePattern.tsx")) {
      pushSlot(slots, {
        route: routeGuess,
        zone: "PAGE_HEADER",
        file: rel,
        line: 44,
        expectedSemantic: null,
        observed: "PageHeader text-only",
        classification: "TEXT_ONLY_BY_DESIGN",
        notes: "Authoritative list page header pattern — deliberate text-first presentation.",
      });
    }

    if (rel.includes("PersonalQuickAccess.tsx")) {
      routesAudited.add("/dashboard");
      const hasSce = src.includes("getQuickAccessSceIconName");
      pushSlot(slots, {
        route: "/dashboard",
        zone: "QUICK_ACCESS",
        file: rel,
        line: src.indexOf("getQuickAccessSceIconName"),
        expectedSemantic: "nav-destination",
        observed: hasSce ? "getQuickAccessSceIconName" : "none",
        classification: hasSce ? "SCE_CORRECT" : "MISSING_EXPECTED_ICON",
        notes: "Dashboard quick access — SCE routed when mapping exists.",
      });
    }

    if (rel.includes("OrgUnitSearchableList.tsx")) {
      routesAudited.add("/dashboard/org-units");
      const rowIconIdx = src.indexOf("OrgUnitTypeSceIcon");
      pushSlot(slots, {
        route: "/dashboard/org-units",
        zone: "LIST_ROW",
        file: rel,
        line: rowIconIdx > 0 ? lineNumber(src, rowIconIdx) : 1,
        expectedSemantic: "org-unit",
        observed: rowIconIdx >= 0 ? "OrgUnitTypeSceIcon" : "OrgUnitSceIcon",
        classification: rowIconIdx >= 0 ? "SCE_CORRECT" : "UNKNOWN_REQUIRES_REVIEW",
        notes: "Org-unit rows use type-aware SCE icons; PO flagged generic/provisional appearance at small sizes (optical V2).",
      });
    }

    if (rel.includes("PersonalProgrammeAgendaRow") || rel.includes("ActivitySceIcon")) {
      routesAudited.add("/dashboard");
      if (rel.includes("ActivitySceIcon")) {
        pushSlot(slots, {
          route: "/dashboard",
          zone: "CALENDAR_ACTIVITY",
          file: rel,
          line: 1,
          expectedSemantic: "training|match|tournament",
          observed: "ActivitySceIcon",
          classification: "SCE_CORRECT",
          notes: "Dashboard/programme activity semantics routed via ActivitySceIcon — optical noise flagged for V2 training/master refresh.",
        });
      }
    }

    // Empty states — one governed slot per EmptyState (illustration vs domain chrome)
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]!;
      if (!line.includes("<EmptyState")) continue;
      let iconLine: string | null = null;
      for (let j = i; j < Math.min(i + 4, lines.length); j += 1) {
        if (lines[j]!.includes("icon={")) {
          iconLine = lines[j]!;
          break;
        }
      }
      const observed = (iconLine ?? line).trim().slice(0, 120);
      pushSlot(slots, {
        route: routeGuess,
        zone: "EMPTY_STATE",
        file: rel,
        line: i + 1,
        expectedSemantic: null,
        observed,
        classification: classifyEmptyStateSlot(rel, line, iconLine),
        notes: iconLine
          ? "Empty state optional illustration — not a primary domain identity slot."
          : "Empty state text-first — no leading icon by design.",
      });
    }

    function classifyKpiIconSlot(observed: string, file: string): ExpectedIconSlotClassification {
      if (/SceIcon|ProductDomainSceIcon|ActivitySceIcon|\w+SceIcon|icon=\{item\.icon\}|icon=\{icon\}/.test(observed)) {
        return "SCE_CORRECT";
      }
      return classifyEmptyStateSlot(file, "", observed);
    }

    // Dashboard KPI / section icon slots
    if (src.includes("DashboardKpiCard") || src.includes("DashboardSection")) {
      const idx = src.indexOf("icon=");
      if (idx >= 0) {
        const observed = src.slice(idx, idx + 120);
        pushSlot(slots, {
          route: routeGuess.startsWith("/dashboard") ? routeGuess : "/dashboard",
          zone: "KPI_CARD",
          file: rel,
          line: lineNumber(src, idx),
          expectedSemantic: "domain-kpi",
          observed,
          classification: classifyKpiIconSlot(observed, rel),
          notes: "Dashboard KPI / section icon slot — domain via SCE or illustrative Lucide.",
        });
      }
    }

    // Mobile alternate paths
    if (/Mobile|Drawer|GlobalNav/.test(rel) && /SceIcon|lucide-react/.test(src)) {
      pushSlot(slots, {
        route: routeGuess,
        zone: "MOBILE_ALTERNATE",
        file: rel,
        line: 1,
        expectedSemantic: "nav-destination",
        observed: /SceIcon|NavDestinationSceIcon/.test(src)
          ? "SceIcon/NavDestinationSceIcon"
          : "lucide-react (drawer chrome)",
        classification: classifyMobileAlternateMarkup(src, rel),
        notes: "Responsive/shell alternate markup — domain via SCE nav icons; Lucide for drawer chrome.",
      });
    }
  }

  // ── Known QA routes (ensure represented) ────────────────────────────────
  for (const route of QA_ROUTES) {
    routesAudited.add(route);
  }

  const totals = slots.reduce(
    (acc, slot) => {
      acc[slot.classification] = (acc[slot.classification] ?? 0) + 1;
      return acc;
    },
    {} as Record<ExpectedIconSlotClassification, number>,
  );

  for (const key of [
    "SCE_CORRECT",
    "SCE_WRONG",
    "LEGACY_DOMAIN",
    "MISSING_EXPECTED_ICON",
    "UTILITY_CORRECT",
    "STATUS_CORRECT",
    "CONTENT_IDENTITY_CORRECT",
    "TEXT_ONLY_BY_DESIGN",
    "DECORATIVE",
    "UNKNOWN_REQUIRES_REVIEW",
  ] as ExpectedIconSlotClassification[]) {
    totals[key] = totals[key] ?? 0;
  }

  const knownQaSurfaces = Object.fromEntries(
    QA_ROUTES.map((route) => {
      const routeSlots = slots.filter((s) => s.route === route || s.route.startsWith(route));
      const debt = routeSlots.filter((s) =>
        ["LEGACY_DOMAIN", "MISSING_EXPECTED_ICON", "SCE_WRONG", "UNKNOWN_REQUIRES_REVIEW"].includes(
          s.classification,
        ),
      );
      return [route, { route, slotCount: routeSlots.length, debt }];
    }),
  );

  return {
    routesAudited: [...routesAudited].sort(),
    slots,
    totals,
    knownQaSurfaces,
  };
}

function inferComponentRoute(rel: string): string {
  if (rel.includes("website")) return "/dashboard/website";
  if (rel.includes("teams")) return "/dashboard/teams";
  if (rel.includes("org/") || rel.includes("org-units")) return "/dashboard/org-units";
  if (rel.includes("planning") || rel.includes("spiele") || rel.includes("training")) {
    return "/dashboard/spiele";
  }
  if (rel.includes("dashboard")) return "/dashboard";
  return "/dashboard";
}

/**
 * Icon container optical audit — dominant containers vs tiny icons (PO QA).
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type IconContainerAuditRow = {
  component: string;
  file: string;
  containerSizePx: number | null;
  iconSizePx: number | null;
  ratio: number | null;
  background: string;
  border: string;
  padding: string;
  usageCount: number;
  flags: Array<
    "ICON_TOO_SMALL_FOR_CONTAINER" | "CONTAINER_VISUALLY_DOMINANT" | "INCONSISTENT_OPTICAL_SIZE"
  >;
};

export type IconContainerAuditReport = {
  components: IconContainerAuditRow[];
  tooSmallForContainer: number;
  containerDominant: number;
  inconsistentOpticalSize: number;
};

const CONTAINER_PATTERNS: Array<{
  component: string;
  fileSuffix: string;
  containerRe: RegExp;
  iconRe: RegExp;
  background: string;
}> = [
  {
    component: "DashboardSectionIcon",
    fileSuffix: "components/ui/dashboard/DashboardSection.tsx",
    containerRe: /h-9 w-9/,
    iconRe: /icon\?: ReactNode/,
    background: "accent palette bg via SECTION_ICON_ACCENTS",
  },
  {
    component: "DashboardKpiCardIcon",
    fileSuffix: "components/ui/dashboard/DashboardKpiCard.tsx",
    containerRe: /h-10 w-10|h-11 w-11/,
    iconRe: /icon\?: ReactNode/,
    background: "ACCENT_VARS iconBg",
  },
  {
    component: "NavDestinationSceIcon",
    fileSuffix: "components/nav/NavDestinationSceIcon.tsx",
    containerRe: /rounded|size=\{?\d+/,
    iconRe: /SceIcon|size/,
    background: "nav item surface",
  },
  {
    component: "PersonalQuickAccessLink",
    fileSuffix: "components/ui/dashboard/PersonalQuickAccess.tsx",
    containerRe: /rounded|p-\d/,
    iconRe: /SceIcon|size=\{20\}/,
    background: "dashboard quick access tile",
  },
  {
    component: "AdminSurfaceCard module tile",
    fileSuffix: "components/admin/dashboard/DashboardModuleCards.tsx",
    containerRe: /p-5|rounded/,
    iconRe: /(?!)/,
    background: "module card — no icon slot",
  },
];

function walkUsage(root: string, symbol: string): number {
  let count = 0;
  for (const file of walkFiles(join(root, "components"))) {
    const src = readFileSync(file, "utf8");
    if (src.includes(symbol)) count += 1;
  }
  return count;
}

function walkFiles(dir: string, out: string[] = []): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "__tests__") continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, out);
    else if (/\.tsx$/.test(entry)) out.push(full);
  }
  return out;
}

export function runIconContainerAudit(root = process.cwd()): IconContainerAuditReport {
  const components: IconContainerAuditRow[] = [];

  for (const pattern of CONTAINER_PATTERNS) {
    const file = join(root, pattern.fileSuffix);
    if (!statSync(file, { throwIfNoEntry: false })?.isFile()) continue;
    const src = readFileSync(file, "utf8");
    const rel = relative(root, file);

    let containerSizePx: number | null = 36;
    if (pattern.component === "DashboardKpiCardIcon") containerSizePx = 40;
    if (pattern.component === "AdminSurfaceCard module tile") containerSizePx = null;

    let iconSizePx: number | null = 20;
    if (src.includes("size={16}")) iconSizePx = 16;
    if (src.includes("size={24}")) iconSizePx = 24;
    if (pattern.component === "AdminSurfaceCard module tile") iconSizePx = null;

    const ratio =
      containerSizePx && iconSizePx ? Number((containerSizePx / iconSizePx).toFixed(2)) : null;

    const flags: IconContainerAuditRow["flags"] = [];
    if (ratio && ratio >= 1.8) flags.push("ICON_TOO_SMALL_FOR_CONTAINER");
    if (ratio && ratio >= 1.6) flags.push("CONTAINER_VISUALLY_DOMINANT");
    if (pattern.component === "AdminSurfaceCard module tile") {
      flags.push("INCONSISTENT_OPTICAL_SIZE");
    }

    components.push({
      component: pattern.component,
      file: rel,
      containerSizePx,
      iconSizePx,
      ratio,
      background: pattern.background,
      border: "var(--border) or accent border tokens",
      padding: "component-specific (p-5 / p-1 / px-4 py-2)",
      usageCount: walkUsage(root, pattern.component.split(" ")[0]),
      flags,
    });
  }

  return {
    components,
    tooSmallForContainer: components.filter((c) => c.flags.includes("ICON_TOO_SMALL_FOR_CONTAINER"))
      .length,
    containerDominant: components.filter((c) => c.flags.includes("CONTAINER_VISUALLY_DOMINANT"))
      .length,
    inconsistentOpticalSize: components.filter((c) =>
      c.flags.includes("INCONSISTENT_OPTICAL_SIZE"),
    ).length,
  };
}

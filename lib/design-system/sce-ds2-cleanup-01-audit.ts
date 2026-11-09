/**
 * SCE-DS2-CLEANUP-01 — audit ledger (foundation package).
 * @see docs/design-system-v2/19-ds2-cleanup-01-foundation-delivery.md
 */

export const SCE_DS2_CLEANUP_01_PACKAGE_KEY = "SCE-DS2-CLEANUP-01" as const;

export type SceDs2CleanupClassification = "A" | "B" | "C" | "D";

export type SceDs2CleanupAuditEntry = {
  id: string;
  classification: SceDs2CleanupClassification;
  scope: string;
  action: string;
  successor?: string;
};

/** Authoritative cleanup ledger for CLEANUP-01 — DS2-07 defers broad route/token sweeps. */
export const SCE_DS2_CLEANUP_01_AUDIT: SceDs2CleanupAuditEntry[] = [
  {
    id: "PATTERN-DASHBOARD-SETTINGS",
    classification: "A",
    scope: "components/ui/patterns/DashboardPattern.tsx, SettingsPattern.tsx",
    action: "Removed — zero production consumers; DS2-07 will ship dashboard/settings archetypes on SceWorkspaceChrome.",
  },
  {
    id: "ALIAS-SCE-PAGE-TABS",
    classification: "B",
    scope: "components/sce/page/ScePageTabs.tsx",
    action: "Removed alias; canonical import is SceContextTabs.",
    successor: "SceContextTabs",
  },
  {
    id: "UI-MOTION-ICON-BARREL",
    classification: "B",
    scope: "components/ui/index.ts",
    action: "Dropped MotionIcon from public barrel; AnimatedNavIcon remains canonical for nav motion.",
  },
  {
    id: "SMOKE-ARCHETYPE-HARDCODED-HEX",
    classification: "B",
    scope: "scripts/sce-ds2-06-visual-archetypes-browser-check.mjs",
    action: "Archetype fixture tabs/chips bind to White Edition CSS variables.",
  },
  {
    id: "STATUS-INDICATOR-SEMANTIC",
    classification: "B",
    scope: "components/ui/StatusIndicator.tsx",
    action: "Dots and labels use --sce-color-status-* tokens.",
  },
  {
    id: "WHITE-EDITION-ERROR-INFO",
    classification: "B",
    scope: "app/globals.css [data-sce-theme=\"white\"]",
    action: "Added WCAG-oriented --sce-color-status-error/info overrides on light fills.",
  },
  {
    id: "PAGESHELL-WORKSPACE-CHROME",
    classification: "C",
    scope: "PageShell + SceWorkspaceChrome",
    action: "Retain dual composition; 121 legacy routes migrate in DS2-07.",
  },
  {
    id: "SCE-PAGE-PRIMITIVES-UNWIRED",
    classification: "D",
    scope: "components/sce/page/* (except header alias)",
    action: "Retain DS2-06 foundation primitives pending route wiring in DS2-07.",
  },
  {
    id: "EMERALD-TAILWIND-SWEEP",
    classification: "D",
    scope: "components/** (361 emerald-* usages)",
    action: "Defer module-by-module token migration to DS2-07.",
  },
  {
    id: "LEGACY-FINANZEN-TAB-NAV",
    classification: "D",
    scope: "components/finanzen/FinanzenTabNav.tsx",
    action: "Defer consolidation to SceContextTabs with vereinsleitung/finanzen route owner.",
  },
  {
    id: "MODAL-DIALOG-OVERLAY",
    classification: "C",
    scope: "Dialog, SceModalOverlay, contextual Sheet",
    action: "Retain — active across admin surfaces; per-modal migration tracked in DS2-06 inventory.",
  },
];

/**
 * SCE-DS2-05B — White surface & contrast hardening (dense UI on white canvas).
 * @see docs/design-system-v2/17-ds2-05b-white-surface-contrast-delivery.md
 */

export const SCE_DS2_05B_PACKAGE_KEY = "SCE-DS2-05B" as const;

export const SCE_DS2_05B_PREDECESSOR = "SCE-DS2-05A" as const;

export const SCE_DS2_05B_SUCCESSOR = "SCE-DS2-06" as const;

export const SCE_DS2_05B_DOC_MARKERS = [
  "SCE-DS2-05B",
  "sce-dashboard-cockpit-card",
  "sce-functional-inner-row",
  "SCE_FUNCTIONAL_PANEL_CLASS",
  "sce-platform-wordmark--on-light-surface",
  "--sce-activity-pill-training-bg",
  "docs/design-system-v2/17-ds2-05b-white-surface-contrast-delivery.md",
] as const;

/** Shared functional surfaces tuned under `[data-sce-theme="white"]`. */
export const SCE_DS2_05B_FUNCTIONAL_SURFACE_SELECTORS = [
  "[data-sce-theme=\"white\"] .sce-dashboard-cockpit-card",
  "[data-sce-theme=\"white\"] .fca-card",
  "[data-sce-theme=\"white\"] .sce-integrated-list",
  "[data-sce-theme=\"white\"] .fca-input",
  "[data-sce-theme=\"white\"] .sce-surface-standard",
  "[data-sce-theme=\"white\"] .sce-section-card-v3",
  "[data-sce-theme=\"white\"] [data-sce-data-table-shell=\"true\"]",
] as const;

export const SCE_DS2_05B_COVERAGE_ROUTES = [
  "dashboard",
  "Wochenplaner",
  "Matchcenter",
  "Tournament Center",
  "Club Events",
] as const;

export const SCE_DS2_05B_EXCLUSIONS = [
  "Per-module page migrations (DS2-06)",
  "Infoboard kiosk shells",
  "Production automatic flag enablement",
  "DS2-07 governance closure",
] as const;

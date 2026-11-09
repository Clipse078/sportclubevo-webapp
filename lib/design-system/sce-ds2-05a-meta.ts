/**
 * SCE-DS2-05A — Global white canvas + authenticated shell (DS 2.0 programme).
 * @see docs/design-system-v2/16-ds2-05a-white-canvas-shell-delivery.md
 */

export const SCE_DS2_05A_PACKAGE_KEY = "SCE-DS2-05A" as const;

export const SCE_DS2_05A_PREDECESSOR = "SCE-DS2-04R6" as const;

export const SCE_DS2_05A_SUCCESSOR = "SCE-DS2-05B" as const;

export const SCE_DS2_05A_DOC_MARKERS = [
  "SCE-DS2-05A",
  "data-sce-theme",
  "SCE_WHITE_EDITION",
  "sce-workspace-surface",
  "sce-global-nav-drawer-panel",
  "docs/design-system-v2/16-ds2-05a-white-canvas-shell-delivery.md",
] as const;

export const SCE_DS2_05A_SHELL_SURFACE_SELECTORS = [
  "[data-sce-theme=\"white\"][data-sce-modal-background].sce-authenticated-app-shell",
  "[data-sce-theme=\"white\"] .sce-global-app-header",
  "[data-sce-theme=\"white\"] .sce-domain-nav-panel",
  "[data-sce-theme=\"white\"] .sce-context-nav-panel",
  "[data-sce-theme=\"white\"] .sce-global-nav-drawer-panel",
  "[data-sce-theme=\"white\"] .sce-workspace-surface",
] as const;

export const SCE_DS2_05A_EXCLUSIONS = [
  "Dense forms, tables, and dialog sweeps (DS2-05B)",
  "Per-module page migrations (DS2-06)",
  "Infoboard kiosk shells",
  "Production automatic flag enablement",
] as const;

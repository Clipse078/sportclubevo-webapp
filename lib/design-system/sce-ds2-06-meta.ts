/**
 * SCE-DS2-06 — Unified page & interaction architecture (Finance reference).
 * @see docs/design-system-v2/18-ds2-06-unified-page-architecture-delivery.md
 */

export const SCE_DS2_06_PACKAGE_KEY = "SCE-DS2-06" as const;

export const SCE_DS2_06_PREDECESSOR = "SCE-DS2-05B" as const;

export const SCE_DS2_06_SUCCESSOR = "SCE-DS2-07" as const;

export const SCE_DS2_06_DOC_MARKERS = [
  "SCE-DS2-06",
  "data-sce-workspace-chrome",
  "data-sce-contextual-side-panel",
  "components/sce/page",
  "ScePageHeader",
  "SceContextTabs",
  "SceInlineEditor",
  "docs/design-system-v2/18-ds2-06-unified-page-architecture-delivery.md",
] as const;

/** Mandatory PO route coverage for DS2-06 module sweep (subpackage A–F). */
export const SCE_DS2_06_MANDATORY_ROUTES = [
  "/dashboard",
  "/dashboard/org-units",
  "/dashboard/teams",
  "/dashboard/vereine",
  "/dashboard/persons",
  "/dashboard/competitions",
  "/dashboard/planner/week",
  "/dashboard/finance",
] as const;

export const SCE_DS2_06_PAGE_PRIMITIVES = [
  "ScePageHeader",
  "SceContextTabs",
  "ScePageContent",
  "SceSectionHeader",
  "SceContentPanel",
  "SceInlineEditor",
  "SceExpandablePanel",
] as const;

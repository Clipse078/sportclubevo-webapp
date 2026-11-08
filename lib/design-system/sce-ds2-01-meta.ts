/**
 * SCE-DS2-01 — White Edition foundation tokens (DS 2.0 programme).
 * @see docs/design-system-v2/07-migration-roadmap.md
 */

export const SCE_DS2_01_PACKAGE_KEY = "SCE-DS2-01" as const;

export const SCE_DS2_01_PREDECESSOR = "SCE-DS2-00" as const;

export const SCE_DS2_01_DOC_MARKERS = [
  "SCE-DS2-01",
  "White Edition",
  "data-sce-theme",
  "SCE_WHITE_EDITION",
  "docs/design-system-v2/03-white-first-visual-language.md",
] as const;

/** Feature flag default — PO enables per environment when ready. */
export const SCE_DS2_01_WHITE_EDITION_FLAG_DEFAULT = false;

export const SCE_DS2_01_EXCLUSIONS = [
  "Infoboard kiosk shells",
  "CMS public website builder",
  "Transactional email HTML",
  "Sporting typography roles + SceTeamName (DS2-03)",
] as const;

export const SCE_DS2_01_LEGACY_STYLE_DEPENDENCIES = [
  "Dark-tuned scrollbar thumbs (.sce-app-explorer-scroll) — neutral overrides under white theme only",
  "SCE_WORKSPACE_SURFACE_CLASS backdrop-blur — retained until DS2-05 tunes workspace chrome",
  "fca-* marketing typography classes — admin migration deferred to DS2-06",
] as const;

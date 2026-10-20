/**
 * DS-02 package metadata — guardrail tests and programme documentation.
 */
import { SCE_DESIGN_SYSTEM_01_PO_VISUAL_DIRECTION } from "@/lib/design-system/sce-design-system-01-meta";

export const SCE_DESIGN_SYSTEM_02_PACKAGE_KEY = "SCE-DESIGN-SYSTEM-02" as const;

export const SCE_DESIGN_SYSTEM_02_PREDECESSOR = "SCE-DESIGN-SYSTEM-01" as const;

/** PO visual direction carries forward unchanged from DS-01-R1. */
export const SCE_DESIGN_SYSTEM_02_PO_VISUAL_DIRECTION =
  SCE_DESIGN_SYSTEM_01_PO_VISUAL_DIRECTION;

export const SCE_DESIGN_SYSTEM_02_DOC_MARKERS = [
  "SCE-DESIGN-SYSTEM-02",
  "Foundation source of truth",
  "app/globals.css",
  "BREADCRUMB_ROLLOUT_OWNER",
  "SCE-DESIGN-SYSTEM-03",
  "SceContextTabs",
  "Toggle First",
  "PREMIUM_DOES_NOT_MEAN_OVERSIZED",
  "SceMatchCard",
  "WORKSPACE_SYSTEM_PRODUCT_WIDE",
] as const;

export const SCE_DESIGN_SYSTEM_02_REPRESENTATIVE_PRIMITIVES = [
  "Button",
  "SwitchToggle",
  "Badge",
  "SceWorkspaceSurface",
  "PageShell",
  "SceContextTabs",
  "SceWorkspaceFeatureCard (layout tokens)",
] as const;

export const SCE_DESIGN_SYSTEM_02_MIGRATION_BOUNDARY =
  "Representative adoption only — product-wide visual migration belongs to DS-03 through DS-10." as const;

/** PO workspace/navigation locks recorded at DS-02 closure (rollout in DS-03; DS-10 gate). */
export const SCE_DESIGN_SYSTEM_02_PO_WORKSPACE_LOCK = {
  WORKSPACE_SYSTEM_PRODUCT_WIDE: "YES",
  BREADCRUMB_SYSTEM_PRODUCT_WIDE: "YES",
  CONTEXT_TABS_PRODUCT_WIDE_WHERE_SEMANTIC: "YES",
  LOCAL_PARALLEL_WORKSPACE_SYSTEMS_ALLOWED: "NO",
  PRODUCT_WIDE_WORKSPACE_MIGRATION_REQUIRED: "YES",
  UNEXPLAINED_LEGACY_WORKSPACES_ALLOWED_AT_DS10_CLOSURE: "NO",
  BREADCRUMB_ROLLOUT_OWNER: "SCE-DESIGN-SYSTEM-03",
  CONTEXT_TAB_ROLLOUT_OWNER: "SCE-DESIGN-SYSTEM-03",
} as const;

export const SCE_DESIGN_SYSTEM_02_PO_CLOSURE = {
  PO_FOUNDATION_REVIEW: "PASS",
  PO_ARCHITECTURE_REVIEW: "PASS",
  DS02_STATUS: "CLOSED / ACCEPTED / MERGED",
  FEATURE_HEAD: "00b5eeca31dd9ac9621fa0ee6491707a97f9ac5e",
} as const;

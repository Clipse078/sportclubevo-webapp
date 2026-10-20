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

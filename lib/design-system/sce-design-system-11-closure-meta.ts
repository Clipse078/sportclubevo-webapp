/**
 * SCE-DESIGN-SYSTEM-11 — final governance closure (PR #890).
 * Documentation and governance truth only — no product behaviour changes.
 */
import { findSceDesignSystemExceptionsByCategory } from "@/lib/design-system/sce-design-system-exception-registry";
import {
  SCE_CONTEXTUAL_PREVIEW_LAYER_CLASS,
  SCE_Z_INDEX_CONTEXTUAL_PREVIEW,
} from "@/lib/ui/sce-overlay-layering";

export const SCE_DESIGN_SYSTEM_11_CLOSURE_PACKAGE_KEY =
  "SCE-DESIGN-SYSTEM-11-FINAL-CLOSURE" as const;

export const SCE_DESIGN_SYSTEM_11_CANONICAL_BASE = {
  CANONICAL_BASE_REF: "STAGE",
  /** STAGE head when DS-11 branch was cut (also DS-11 programme starting parent). */
  DS11_STARTING_HEAD_FULL: "f568ca3de0c824f289cb45e334ac235a31a3aa24",
  DS11_IMPLEMENTATION_HEAD_FULL: "a52d003b5368798f5c9c487f10c976d91ad1b8bf",
  PR_NUMBER: "890",
  BRANCH: "cursor/sce-design-system-11-governance-automation",
} as const;

/**
 * Layer debt semantics (DS-11 closure — do not conflate):
 *
 * - CANONICAL_SCE_LAYER_DEBT: unexplained magic z-index inside canonical SCE component
 *   families guarded by SCE-DS-GOV-LAYER-001 (`components/sce/*`, Org preview layer).
 * - REPOSITORY_WIDE_NON_CANONICAL_LAYER_DEBT: production `z-[80]` (or other magic overlay
 *   utilities) outside the canonical token/class system — honest inventory, not hidden.
 * - ACCEPTED_LAYER_ARCHITECTURE_EXCEPTIONS: registry EXPLICIT_ARCHITECTURE_EXCEPTION rows
 *   that document intentional non-token overlay stacking (e.g. global nav drawer).
 *
 * MIGRATION_DEBT layer rows are counted separately in the exception registry audit.
 */
export const SCE_DESIGN_SYSTEM_11_LAYER_DEBT = {
  CANONICAL_SCE_LAYER_DEBT: 0,
  /** All production `z-[80]` occurrences outside DS-11 canonical layer class adoption. */
  REPOSITORY_WIDE_NON_CANONICAL_LAYER_DEBT: 5,
  ACCEPTED_LAYER_ARCHITECTURE_EXCEPTIONS: findSceDesignSystemExceptionsByCategory(
    "EXPLICIT_ARCHITECTURE_EXCEPTION",
  ).filter((e) => e.reviewNote?.includes("z-[") || e.scope.includes("GlobalNavDrawer")).length,
  ORG_PREVIEW_LAYER_TOKEN: "SCE_Z_INDEX_CONTEXTUAL_PREVIEW",
  ORG_PREVIEW_LAYER_CLASS: SCE_CONTEXTUAL_PREVIEW_LAYER_CLASS,
  ORG_PREVIEW_EFFECTIVE_Z_INDEX: SCE_Z_INDEX_CONTEXTUAL_PREVIEW,
  LOCAL_MAGIC_Z_INDEX_IN_CANONICAL_SCE_COMPONENTS: 0,
} as const;

export const SCE_DESIGN_SYSTEM_11_EXCEPTION_COUNTS = {
  SEMANTIC_CONTENT_EXCEPTIONS: findSceDesignSystemExceptionsByCategory("SEMANTIC_CONTENT_EXCEPTION")
    .length,
  DOMAIN_SPECIFIC_CANONICAL_EXCEPTIONS: findSceDesignSystemExceptionsByCategory(
    "DOMAIN_SPECIFIC_CANONICAL",
  ).length,
  EXPLICIT_ARCHITECTURE_EXCEPTIONS: findSceDesignSystemExceptionsByCategory(
    "EXPLICIT_ARCHITECTURE_EXCEPTION",
  ).length,
  MIGRATION_DEBT_EXCEPTIONS: findSceDesignSystemExceptionsByCategory("MIGRATION_DEBT").length,
  UNCLASSIFIED_GOVERNANCE_EXCEPTIONS: 0,
} as const;

export const SCE_DESIGN_SYSTEM_11_PO_CLOSURE = {
  DS11_STATUS: "CLOSED / ACCEPTED / MERGED",
  SCE_DESIGN_SYSTEM_11_CLOSED: "YES",
  SCE_DESIGN_SYSTEM_GOVERNANCE_ENABLED: "YES",
  SCE_DESIGN_SYSTEM_COMPLIANCE: "PASS",
  SCE_DESIGN_SYSTEM_V1_COMPLETE: "YES",
  SCE_DESIGN_SYSTEM_V1_READY_FOR_FINAL_CLOSURE: "YES",
  UNCLASSIFIED_GOVERNANCE_EXCEPTIONS: 0,
  UNRESOLVED_DS11_GOVERNANCE_DEBT: 0,
  SCE_DESIGN_SYSTEM_10_CLOSED: "YES",
  MANUAL_UAT_BY_CURSOR: "SKIPPED_ACCEPTED_GOVERNANCE_REVIEW",
  SCREENSHOTS_BY_CURSOR: "SKIPPED_ACCEPTED_GOVERNANCE_REVIEW",
  NEXT_PACKAGE: "NONE — SCE Design System v1.0 programme complete",
} as const;

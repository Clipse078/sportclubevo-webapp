/**
 * SCE-DESIGN-SYSTEM-07-R1 — visual convergence & representative adoption (PO R1).
 */
import {
  SCE_DESIGN_SYSTEM_07_GOVERNANCE,
  SCE_DESIGN_SYSTEM_07_PO_FLAGS,
  SCE_DESIGN_SYSTEM_07_PO_REVIEW,
} from "@/lib/design-system/sce-design-system-07-meta";
import {
  SCE_EMPTY_STATE_DISTINCTIONS,
  SCE_FEEDBACK_CONTEXT_RULE,
  SCE_READINESS_STATUS_PANEL_CONTRACT,
} from "@/lib/design-system/sce-feedback-status-foundation";

export const SCE_DESIGN_SYSTEM_07_R1_PACKAGE_KEY = "SCE-DESIGN-SYSTEM-07-R1" as const;

export const SCE_DESIGN_SYSTEM_07_R1_PO_FINDINGS = {
  DS07_INITIAL_VISUAL_REVIEW: "PARTIAL_PASS",
  DS07_R1_REQUIRED: "YES",
  DS07_R1_VISUAL_UAT: "PASS",
  COMMUNICATION_EMAIL_SENDER_REFERENCE: "ACCEPTED",
  TOURNAMENT_PLANUNG_DIRECTION: "ACCEPTED",
  DASHBOARD_REFERENCE: "ACCEPTED",
  PEOPLE_ACCESS_FEEDBACK_LAYER: "ACCEPTED",
  EMPTY_STATE_ADOPTION_PROOF: "ACCEPTED",
} as const;

export const SCE_DESIGN_SYSTEM_07_R1_GOVERNANCE = {
  ...SCE_DESIGN_SYSTEM_07_GOVERNANCE,
  ...SCE_EMPTY_STATE_DISTINCTIONS,
  ...SCE_FEEDBACK_CONTEXT_RULE,
  READINESS_PANEL: SCE_READINESS_STATUS_PANEL_CONTRACT,
  VISIBLE_DESIGN_CONVERGENCE_REQUIRED: "YES",
  DS07_TABLE_REDESIGN_CLAIM: "NO",
  DS08_OWNS_DENSE_ADMIN_TABLE: "YES",
} as const;

/** Explicit debt — DS-07 does NOT claim Personen & Zugänge dense table is visually final. */
export const SCE_DESIGN_SYSTEM_07_DS08_HANDOFF_DEBT = [
  "dense administrative table/list hierarchy",
  "row density",
  "column alignment",
  "responsive dense UI",
  "table/list actions",
  "table headers",
  "row hover/focus",
  "scanning hierarchy",
  "status placement",
  "metadata density",
] as const;

export const SCE_DESIGN_SYSTEM_07_R1_REPRESENTATIVE_ADOPTION = {
  EMPTY_STATE_CONTAINED_IN_LIST_SURFACE: "TenantUsersSearchableList + PlanningHubFilteredEmptyState",
  FILTERED_NO_RESULTS_RESET_ACTION: "TenantUsersSearchableList people-access-reset-filters",
  PEOPLE_LIST_LOADING_GEOMETRY: "SceSkeleton recipe people-access-list",
  READINESS_VISUAL_DNA: "SceReadinessStatusPanel — Email Sender + Tournament Planung (no local restyle)",
  TOURNAMENT_PLANUNG_VERTICAL_RHYTHM: "data-sce-planung-vertical-rhythm space-y-5",
  FEEDBACK_NEAREST_CONTEXT: "data-sce-feedback-surface people-access-list",
} as const;

export const SCE_DESIGN_SYSTEM_07_R1_PO_REVIEW = {
  ...SCE_DESIGN_SYSTEM_07_PO_REVIEW,
  DS07_R1_STATUS: "CLOSED / ACCEPTED / MERGED",
  PO_DS07_R1_VISUAL_UAT: "PASS",
  PR: "885",
  MANUAL_UAT_BY_CURSOR: SCE_DESIGN_SYSTEM_07_PO_FLAGS.MANUAL_UAT_BY_CURSOR,
  SCREENSHOTS_BY_CURSOR: SCE_DESIGN_SYSTEM_07_PO_FLAGS.SCREENSHOTS_BY_CURSOR,
  /** Accepted R1 implementation HEAD (PO closure). */
  R1_FEATURE_HEAD_FULL: "a19bff63838e1ad8a7384f29b2eb1665bb0d890d",
} as const;

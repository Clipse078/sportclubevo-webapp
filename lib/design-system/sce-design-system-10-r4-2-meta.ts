/**
 * SCE-DESIGN-SYSTEM-10 — R4.2 unified Aufgaben workspace / action-type convergence.
 */
export const SCE_DESIGN_SYSTEM_10_R4_2_PACKAGE_KEY = "SCE-DESIGN-SYSTEM-10-R4.2" as const;

export { SCE_AUFGABEN_ACTION_TYPE_COMPLETION_MODEL, SCE_AUFGABEN_ACTION_TYPE_MENTAL_MODEL, SCE_AUFGABEN_R4_2_WORKSPACE_LOCKS } from "@/lib/aufgaben/action-type-semantics";

export const SCE_DESIGN_SYSTEM_10_R4_2_CREATE_LOCKS = {
  UNIFIED_CREATE_ENTRY_POINT: "YES",
  WORKSPACE_PRIMARY_CREATE_CTA: "ERSTELLEN",
  CREATE_CHOOSER_REQUIRED: "YES",
  AUFGABE_CREATABLE_FROM_WORKSPACE: "YES",
  ANFORDERUNG_CREATABLE_FROM_WORKSPACE: "YES",
  TEILNAHME_CREATABLE_FROM_WORKSPACE: "NO",
  NESTED_MODAL_DEFAULT: "NO",
  CREATE_CHOICE_KEYBOARD_ACCESSIBLE: "YES",
  CREATE_CHOICE_TEXTUAL_SEMANTICS: "YES",
  PARALLEL_REQUIREMENT_CREATION_UI: "NO",
} as const;

export const SCE_DESIGN_SYSTEM_10_R4_2_ANFORDERUNG_DEADLINE = {
  CURRENT_DOMAIN_RULE: "dueAt nullable in Prisma; overdue tracking requires dueAt when ACTIVE",
  R4_2_RULE: "New drafts require dueAt at creation (server + form); historical rows unchanged",
  MANDATORY_FOR_NEW: "YES",
  REASON: "No schema migration; validation at create action + required date input only for new records",
} as const;

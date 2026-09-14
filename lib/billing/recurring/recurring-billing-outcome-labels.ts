import type { RecurringBillingContractOutcome } from "./recurring-billing-types";

const OUTCOME_LABELS_DE: Record<RecurringBillingContractOutcome, string> = {
  CREATED_AND_SENT: "Erstellt und versendet",
  CREATED_NOT_SENT: "Erstellt (nicht versendet)",
  SKIPPED_ALREADY_INVOICED: "Bereits abgerechnet",
  SKIPPED_NOT_DUE: "Noch nicht fällig",
  SKIPPED_INACTIVE: "Vertrag inaktiv",
  SKIPPED_BEFORE_START: "Vor Vertragsstart",
  SKIPPED_ENDED: "Vertrag beendet",
  SKIPPED_ALL_INVOICED: "Alle Perioden abgerechnet",
  BLOCKED_NO_RECIPIENT: "Blockiert: Empfänger fehlt",
  BLOCKED_NO_BANK_ACCOUNT: "Blockiert: Bankkonto fehlt",
  BLOCKED_INVALID_CONFIGURATION: "Blockiert: Konfiguration",
  PREVIEW_WOULD_CREATE: "Vorschau: würde erstellt",
  FAILED: "Fehler",
};

export function presentRecurringBillingOutcomeDe(
  outcome: RecurringBillingContractOutcome | string,
): string {
  if (outcome in OUTCOME_LABELS_DE) {
    return OUTCOME_LABELS_DE[outcome as RecurringBillingContractOutcome];
  }
  return outcome;
}

export function recurringBillingOutcomeTone(
  outcome: RecurringBillingContractOutcome | string,
): "success" | "warning" | "muted" | "default" {
  switch (outcome) {
    case "PREVIEW_WOULD_CREATE":
      return "success";
    case "SKIPPED_ALREADY_INVOICED":
    case "SKIPPED_NOT_DUE":
      return "default";
    case "BLOCKED_NO_RECIPIENT":
    case "BLOCKED_NO_BANK_ACCOUNT":
    case "BLOCKED_INVALID_CONFIGURATION":
    case "FAILED":
      return "warning";
    case "CREATED_AND_SENT":
    case "CREATED_NOT_SENT":
      return "success";
    default:
      return "muted";
  }
}

import type {
  BankReconciliationMatchMethod,
  BankReconciliationMatchStatus,
} from "@prisma/client";
import type { Camt054ReconciliationEntryOutcome } from "./camt054-reconciliation-types";

export type Camt054MatchClassification = {
  matchStatus: BankReconciliationMatchStatus;
  matchMethod: BankReconciliationMatchMethod | null;
};

export function classifyCamt054EntryOutcome(
  outcome: Camt054ReconciliationEntryOutcome,
  invoiceStatus?: string | null,
): Camt054MatchClassification {
  switch (outcome) {
    case "applied":
    case "planned":
      return { matchStatus: "MATCHED", matchMethod: "QRR_EXACT" };
    case "skipped_duplicate":
      return { matchStatus: "DUPLICATE", matchMethod: "DUPLICATE_TRANSACTION" };
    case "unmatched_invoice":
      return { matchStatus: "UNMATCHED", matchMethod: "QRR_NOT_FOUND" };
    case "skipped_no_reference":
      return { matchStatus: "UNMATCHED", matchMethod: "NO_REFERENCE" };
    case "skipped_unsupported_reference":
      return { matchStatus: "UNMATCHED", matchMethod: "UNSUPPORTED_REFERENCE" };
    case "unmatched_legal_entity":
      return { matchStatus: "UNMATCHED", matchMethod: "WRONG_LEGAL_ENTITY" };
    case "skipped_currency_mismatch":
      return { matchStatus: "REVIEW_REQUIRED", matchMethod: "CURRENCY_MISMATCH" };
    case "skipped_overpayment":
      return { matchStatus: "REVIEW_REQUIRED", matchMethod: "AMOUNT_EXCEEDS_OUTSTANDING" };
    case "skipped_rejected":
      return { matchStatus: "ERROR", matchMethod: "REJECTED_ENTRY" };
    case "skipped_invoice_not_payable":
      if (invoiceStatus === "PAID") {
        return { matchStatus: "REVIEW_REQUIRED", matchMethod: "INVOICE_ALREADY_PAID" };
      }
      return { matchStatus: "ERROR", matchMethod: "NOT_PAYABLE" };
    default:
      return { matchStatus: "ERROR", matchMethod: null };
  }
}

export function matchStatusLabel(status: BankReconciliationMatchStatus): string {
  switch (status) {
    case "MATCHED":
      return "Zugeordnet";
    case "UNMATCHED":
      return "Nicht zugeordnet";
    case "REVIEW_REQUIRED":
      return "Prüfung erforderlich";
    case "DUPLICATE":
      return "Duplikat";
    case "ERROR":
      return "Fehler";
    default:
      return status;
  }
}

export function matchMethodLabel(method: BankReconciliationMatchMethod | null): string | null {
  if (!method) return null;
  switch (method) {
    case "QRR_EXACT":
      return "QRR exakt";
    case "QRR_NOT_FOUND":
      return "QRR nicht gefunden";
    case "MANUAL_ASSIGNMENT":
      return "Manuelle Zuordnung";
    case "AMOUNT_EXCEEDS_OUTSTANDING":
      return "Betrag übersteigt offenen Saldo";
    case "CURRENCY_MISMATCH":
      return "Währungsabweichung";
    case "INVOICE_ALREADY_PAID":
      return "Rechnung bereits bezahlt";
    case "DUPLICATE_TRANSACTION":
      return "Transaktion bereits verbucht";
    case "UNSUPPORTED_REFERENCE":
      return "Referenztyp nicht unterstützt";
    case "NO_REFERENCE":
      return "Keine Referenz";
    case "REJECTED_ENTRY":
      return "Abgelehnte Buchung";
    case "WRONG_LEGAL_ENTITY":
      return "Anderer Rechtsträger";
    case "NOT_PAYABLE":
      return "Rechnung nicht zahlbar";
    case "PARSE_ERROR":
      return "XML-Fehler";
    default:
      return method;
  }
}

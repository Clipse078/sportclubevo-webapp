import type { Camt054CreditTransaction } from "../camt054/camt054-types";

export type Camt054ReconciliationEntryOutcome =
  | "applied"
  | "planned"
  | "skipped_duplicate"
  | "skipped_rejected"
  | "skipped_no_reference"
  | "skipped_unsupported_reference"
  | "unmatched_invoice"
  | "unmatched_legal_entity"
  | "skipped_currency_mismatch"
  | "skipped_overpayment"
  | "skipped_invoice_not_payable";

export type Camt054ReconciliationEntryResult = {
  bankTransactionId: string;
  outcome: Camt054ReconciliationEntryOutcome;
  transaction: Camt054CreditTransaction;
  invoiceKey: string | null;
  invoiceNumber: string | null;
  paymentKey: string | null;
  message: string | null;
};

export type Camt054ReconciliationReport = {
  legalEntityKey: string;
  messageId: string | null;
  dryRun: boolean;
  appliedCount: number;
  skippedCount: number;
  entries: Camt054ReconciliationEntryResult[];
};

export type ReconcileCamt054Input = {
  legalEntityKey: string;
  xml: string;
  dryRun: boolean;
  actorUserId: string;
};

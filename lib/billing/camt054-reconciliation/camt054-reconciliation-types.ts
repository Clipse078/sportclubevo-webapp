import type {
  BankReconciliationMatchMethod,
  BankReconciliationMatchStatus,
} from "@prisma/client";
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
  invoiceStatus: string | null;
  paymentInstructionId: string | null;
  paymentKey: string | null;
  message: string | null;
  matchStatus: BankReconciliationMatchStatus;
  matchMethod: BankReconciliationMatchMethod | null;
};

export type Camt054ReconciliationReport = {
  legalEntityKey: string;
  messageId: string | null;
  dryRun: boolean;
  appliedCount: number;
  skippedCount: number;
  matchedCount: number;
  unmatchedCount: number;
  reviewRequiredCount: number;
  duplicateCount: number;
  errorCount: number;
  importKey: string | null;
  entries: Camt054ReconciliationEntryResult[];
};

export type ReconcileCamt054Input = {
  legalEntityKey: string;
  xml: string;
  dryRun: boolean;
  actorUserId: string;
  filename?: string;
  contentSha256?: string;
};

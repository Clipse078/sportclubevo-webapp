import type { InvoicePaymentInstructionRecord } from "../invoice-payment-instruction-types";
import type {
  InvoiceIssuerSnapshotRecord,
  InvoiceLineRecord,
  InvoiceRecipientSnapshotRecord,
  InvoiceRecord,
  InvoiceTaxSnapshotRecord,
} from "../native-billing-commercial-types";

export type InvoicePdfDocumentData = {
  invoice: InvoiceRecord;
  lines: InvoiceLineRecord[];
  taxSnapshots: InvoiceTaxSnapshotRecord[];
  issuer: InvoiceIssuerSnapshotRecord;
  recipient: InvoiceRecipientSnapshotRecord;
  paymentInstruction: InvoicePaymentInstructionRecord | null;
  spcPayload: string | null;
  /** Populated when Swiss QR section is rendered; never log. */
  creditorAccount: string | null;
  isVoid: boolean;
  includeSwissPaymentSection: boolean;
};

export type InvoicePdfGenerationOptions = {
  /** When true, omit regulated Swiss QR payment section (e.g. VOID). */
  omitSwissPaymentSection?: boolean;
};

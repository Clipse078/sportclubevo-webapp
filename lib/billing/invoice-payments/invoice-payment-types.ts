export type InvoicePaymentRecord = {
  id: string;
  key: string;
  invoiceId: string;
  amountMinor: number;
  currency: string;
  paymentDate: Date;
  method: "BANK_TRANSFER_MANUAL";
  reference: string | null;
  note: string | null;
  source: "MANUAL" | "CAMT054" | "STRIPE";
  status: "CONFIRMED" | "REVERSED";
  externalReference: string | null;
  bankTransactionId: string | null;
  reversedAt: Date | null;
  reversedByUserId: string | null;
  reversalReason: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InvoicePaymentSummary = {
  invoiceId: string;
  invoiceKey: string;
  currency: string;
  grossTotalMinor: number;
  paidTotalMinor: number;
  outstandingMinor: number;
  isFullyPaid: boolean;
  lastPaymentDate: Date | null;
  payments: InvoicePaymentRecord[];
};

export type RecordInvoicePaymentInput = {
  invoiceKey: string;
  amountMinor: number;
  currency: string;
  paymentDate: string;
  method: "BANK_TRANSFER_MANUAL";
  reference?: string | null;
  note?: string | null;
  actorUserId: string;
};

export type ReverseInvoicePaymentInput = {
  paymentKey: string;
  reason: string;
  actorUserId: string;
};

export type Camt054CreditTransaction = {
  bankTransactionId: string;
  amountMinor: number;
  currency: string;
  paymentDate: string;
  creditorReference: string | null;
  referenceType: "QRR" | "SCOR" | "UNKNOWN";
  rejected: boolean;
  messageId: string | null;
  debtorName: string | null;
};

export type Camt054ParseResult = {
  messageId: string | null;
  transactions: Camt054CreditTransaction[];
};

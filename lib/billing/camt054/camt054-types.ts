export type Camt054CreditTransaction = {
  bankTransactionId: string;
  accountServiceReference: string | null;
  endToEndId: string | null;
  amountMinor: number;
  currency: string;
  paymentDate: string;
  bookingDate: string;
  valueDate: string | null;
  creditorReference: string | null;
  referenceType: "QRR" | "SCOR" | "UNKNOWN";
  rejected: boolean;
  reversal: boolean;
  messageId: string | null;
  debtorName: string | null;
};

export type Camt054ParseResult = {
  messageId: string | null;
  /** Internal only; never serialize or log. */
  accountIdentification: string | null;
  accountIdentificationMasked: string | null;
  bookingPeriodStart: string | null;
  bookingPeriodEnd: string | null;
  totalCreditsMinor: number;
  creditCurrency: string | null;
  transactions: Camt054CreditTransaction[];
};

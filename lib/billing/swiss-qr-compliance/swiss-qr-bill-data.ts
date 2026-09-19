import type { BillingReferenceStrategy } from "@prisma/client";
import type { SwissStructuredAddress } from "../swiss-qr/swiss-structured-address";
import type { SixIgQrBillVersion } from "./six-qr-bill-standard";
import { SIX_IG_QR_BILL_VERSION } from "./six-qr-bill-standard";

export type SwissQrAccount = {
  iban: string;
  qrIban: string | null;
};

export type SwissQrCreditor = SwissStructuredAddress;

export type SwissQrDebtor = SwissStructuredAddress;

export type SwissQrReference = {
  type: BillingReferenceStrategy;
  value: string | null;
};

export type SwissQrAmount = {
  amountMinor: number;
  currency: string;
};

export type SwissQrAdditionalInformation = {
  unstructuredMessage: string | null;
  billingInformation: string | null;
};

export type SwissQrBillData = {
  standardVersion: SixIgQrBillVersion;
  account: SwissQrAccount;
  creditor: SwissQrCreditor;
  debtor: SwissQrDebtor;
  amount: SwissQrAmount;
  reference: SwissQrReference;
  additionalInformation: SwissQrAdditionalInformation;
};

export function createSwissQrBillData(
  input: Omit<SwissQrBillData, "standardVersion"> & {
    standardVersion?: SixIgQrBillVersion;
  },
): SwissQrBillData {
  return {
    standardVersion: input.standardVersion ?? SIX_IG_QR_BILL_VERSION,
    account: input.account,
    creditor: input.creditor,
    debtor: input.debtor,
    amount: input.amount,
    reference: input.reference,
    additionalInformation: input.additionalInformation,
  };
}

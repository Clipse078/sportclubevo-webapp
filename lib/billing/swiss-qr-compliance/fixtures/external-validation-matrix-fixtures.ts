import type { InvoicePaymentInstructionRecord } from "../../invoice-payment-instruction-types";
import type {
  InvoiceIssuerSnapshotRecord,
  InvoiceLineRecord,
  InvoiceRecipientSnapshotRecord,
  InvoiceRecord,
  InvoiceTaxSnapshotRecord,
} from "../../native-billing-commercial-types";
import { createSwissQrBillData, type SwissQrBillData } from "../swiss-qr-bill-data";
import { SIX_QR_FIELD_LIMITS } from "../six-qr-bill-standard";

/** Deterministic synthetic identifiers — not production tenant or customer data. */
export const SYNTHETIC_QR_IBAN = "CH693000523573415901X";
export const SYNTHETIC_IBAN = "CH9300762011623852957";
export const SYNTHETIC_QRR_REF = "273282026000002025434650072";
export const SYNTHETIC_SCOR_REF = "RF18539007547034";

const platformCreditor = {
  name: "SportClubEvo Platform GmbH",
  street: "Musterstrasse",
  houseNumber: "1",
  postalCode: "8000",
  city: "Zürich",
  countryCode: "CH",
} as const;

const platformDebtor = {
  name: "Demo Sportverein AG",
  street: "Sportweg",
  houseNumber: "12",
  postalCode: "4000",
  city: "Basel",
  countryCode: "CH",
} as const;

export type ExternalValidationReferenceType = "QRR" | "SCOR" | "NON";

export type ExternalValidationMatrixCase = {
  caseId: string;
  purpose: string;
  referenceType: ExternalValidationReferenceType;
  currency: "CHF";
  /** When set, a final invoice PDF is generated through the real payment-part pipeline. */
  generatePdf?: boolean;
  data: SwissQrBillData;
};

function qrrBill(
  partial: Omit<Partial<SwissQrBillData>, "account" | "reference"> & {
    reference?: SwissQrBillData["reference"];
  } = {},
): SwissQrBillData {
  return createSwissQrBillData({
    account: { iban: SYNTHETIC_IBAN, qrIban: SYNTHETIC_QR_IBAN },
    creditor: partial.creditor ?? platformCreditor,
    debtor: partial.debtor ?? platformDebtor,
    amount: partial.amount ?? { amountMinor: 21512, currency: "CHF" },
    reference: partial.reference ?? { type: "QRR", value: SYNTHETIC_QRR_REF },
    additionalInformation: partial.additionalInformation ?? {
      unstructuredMessage: "Rechnung SYNTH-2026-000042",
      billingInformation: null,
    },
  });
}

function ibanBill(
  referenceType: "SCOR" | "NON",
  partial: Partial<SwissQrBillData> = {},
): SwissQrBillData {
  return createSwissQrBillData({
    account: { iban: SYNTHETIC_IBAN, qrIban: null },
    creditor: partial.creditor ?? platformCreditor,
    debtor: partial.debtor ?? platformDebtor,
    amount: partial.amount ?? { amountMinor: 21512, currency: "CHF" },
    reference:
      partial.reference ??
      (referenceType === "SCOR"
        ? { type: "SCOR", value: SYNTHETIC_SCOR_REF }
        : { type: "NON", value: null }),
    additionalInformation: partial.additionalInformation ?? {
      unstructuredMessage: `Engine capability IBAN/${referenceType}`,
      billingInformation: null,
    },
  });
}

const boundaryName = "N".repeat(SIX_QR_FIELD_LIMITS.name);
const boundaryStreet = "S".repeat(SIX_QR_FIELD_LIMITS.street);
const boundaryHouse = "9".repeat(SIX_QR_FIELD_LIMITS.buildingNumber);
const boundaryPostal = "1".repeat(SIX_QR_FIELD_LIMITS.postalCode);
const boundaryCity = "C".repeat(SIX_QR_FIELD_LIMITS.city);
const boundaryMessage = "M".repeat(SIX_QR_FIELD_LIMITS.unstructuredMessage);

export const externalValidationMatrixCases: ExternalValidationMatrixCase[] = [
  {
    caseId: "qrr-normal-chf",
    purpose: "Representative CHF QR-IBAN / QRR invoice with structured creditor and debtor.",
    referenceType: "QRR",
    currency: "CHF",
    data: qrrBill(),
  },
  {
    caseId: "qrr-umlauts-chf",
    purpose: "Valid German/Swiss extended character set (ä, ö, ü) on creditor and debtor.",
    referenceType: "QRR",
    currency: "CHF",
    data: qrrBill({
      creditor: {
        ...platformCreditor,
        name: "Müller & Söhne Verwaltung",
        city: "Zürich",
      },
      debtor: {
        ...platformDebtor,
        name: "Grüezi Bäcker AG",
        street: "Brötwg",
      },
      additionalInformation: {
        unstructuredMessage: "Rechnung für Grösse & Qualität",
        billingInformation: null,
      },
    }),
  },
  {
    caseId: "qrr-accent-fr-it-chf",
    purpose: "Valid French/Italian accented characters supported by SIX extended charset.",
    referenceType: "QRR",
    currency: "CHF",
    data: qrrBill({
      creditor: { ...platformCreditor, name: "Société générale demo" },
      debtor: { ...platformDebtor, city: "Genève", name: "Città Sportiva Lugano" },
      additionalInformation: {
        unstructuredMessage: "Facture periode ete - reference valide",
        billingInformation: null,
      },
    }),
  },
  {
    caseId: "qrr-boundary-fields-chf",
    purpose: "Valid maximum field lengths (structured address and unstructured message).",
    referenceType: "QRR",
    currency: "CHF",
    data: qrrBill({
      creditor: {
        name: boundaryName,
        street: boundaryStreet,
        houseNumber: boundaryHouse,
        postalCode: boundaryPostal,
        city: boundaryCity,
        countryCode: "CH",
      },
      additionalInformation: {
        unstructuredMessage: boundaryMessage,
        billingInformation: null,
      },
    }),
  },
  {
    caseId: "qrr-small-amount-chf",
    purpose: "Minimum valid CHF amount (0.01).",
    referenceType: "QRR",
    currency: "CHF",
    data: qrrBill({
      amount: { amountMinor: 1, currency: "CHF" },
    }),
  },
  {
    caseId: "qrr-large-amount-chf",
    purpose: "Large valid CHF amount at SIX upper bound.",
    referenceType: "QRR",
    currency: "CHF",
    data: qrrBill({
      amount: { amountMinor: 99_999_999_999, currency: "CHF" },
    }),
  },
  {
    caseId: "iban-scor-chf",
    purpose:
      "Engine capability: standards-valid SCOR on IBAN (supported path; distinct from primary QRR product usage).",
    referenceType: "SCOR",
    currency: "CHF",
    data: ibanBill("SCOR"),
  },
  {
    caseId: "iban-non-chf",
    purpose:
      "Engine capability: standards-valid NON reference on IBAN (supported path; distinct from primary QRR product usage).",
    referenceType: "NON",
    currency: "CHF",
    data: ibanBill("NON"),
  },
  {
    caseId: "sce-realistic-chf",
    purpose:
      "Synthetic but realistic SportClubEvo platform subscription invoice shape (generic tenant; primary cross-bank artifact).",
    referenceType: "QRR",
    currency: "CHF",
    generatePdf: true,
    data: qrrBill({
      amount: { amountMinor: 42900, currency: "CHF" },
      additionalInformation: {
        unstructuredMessage: "SportClubEvo Abonnement SYNTH-2026-000042",
        billingInformation: null,
      },
    }),
  },
];

/** SCE product requires structured debtor; optional debtor omission is not a supported engine path. */
export const externalValidationExcludedCases = [
  {
    caseId: "qrr-optional-debtor-chf",
    reason:
      "SIX allows omitting debtor in some layouts, but SportClubEvo validates a structured debtor on every Swiss QR bill (fail-closed product rule).",
  },
] as const;

const synthInvoiceDate = new Date("2026-03-01T12:00:00.000Z");

export function buildSyntheticSceRealisticInvoicePdfInputs(): {
  invoice: InvoiceRecord;
  lines: InvoiceLineRecord[];
  taxSnapshots: InvoiceTaxSnapshotRecord[];
  issuer: InvoiceIssuerSnapshotRecord;
  recipient: InvoiceRecipientSnapshotRecord;
  paymentInstruction: InvoicePaymentInstructionRecord;
} {
  const invoiceId = "inv-synth-platform-042";
  return {
    invoice: {
      id: invoiceId,
      key: "inv-synth-2026-000042",
      invoiceNumber: "SYNTH-2026-000042",
      legalEntityId: "le-synth-platform",
      billingCustomerId: "bc-synth-demo",
      billingContractId: "contract-synth-demo",
      status: "FINALIZED",
      currency: "CHF",
      periodStart: synthInvoiceDate,
      periodEnd: new Date("2026-03-31T12:00:00.000Z"),
      invoiceDate: synthInvoiceDate,
      dueDate: new Date("2026-04-15T12:00:00.000Z"),
      paymentTermsDays: 30,
      netTotalMinor: 39700,
      vatTotalMinor: 3200,
      grossTotalMinor: 42900,
      contractLabel: "SYNTH-PLATFORM-2026",
      finalizedAt: synthInvoiceDate,
      createdAt: synthInvoiceDate,
      updatedAt: synthInvoiceDate,
    },
    lines: [
      {
        id: "line-synth-1",
        invoiceId,
        description: "SportClubEvo Plattform Abonnement",
        quantity: "1",
        unitPriceNetMinor: 39700,
        lineNetMinor: 39700,
        vatRateBps: 810,
        vatMinor: 3200,
        lineGrossMinor: 42900,
        sortOrder: 0,
      },
    ],
    taxSnapshots: [
      {
        id: "tax-synth-1",
        invoiceId,
        taxLabel: "MWST 8.1%",
        taxRateBps: 810,
        taxableBaseMinor: 39700,
        taxAmountMinor: 3200,
        currency: "CHF",
      },
    ],
    issuer: {
      id: "iss-synth-1",
      invoiceId,
      legalName: platformCreditor.name,
      displayName: "SportClubEvo",
      uid: "CHE-000.000.000",
      vatId: "CHE-000.000.000 MWST",
      addressLine1: platformCreditor.street,
      houseNumber: platformCreditor.houseNumber,
      postalCode: platformCreditor.postalCode,
      city: platformCreditor.city,
      countryCode: platformCreditor.countryCode,
      currency: "CHF",
    },
    recipient: {
      id: "rec-synth-1",
      invoiceId,
      companyOrName: platformDebtor.name,
      street: platformDebtor.street,
      houseNumber: platformDebtor.houseNumber,
      postalCode: platformDebtor.postalCode,
      city: platformDebtor.city,
      countryCode: platformDebtor.countryCode,
      invoiceEmail: null,
    },
    paymentInstruction: {
      id: "pay-synth-1",
      invoiceId,
      billingBankAccountId: "bba-synth-demo",
      paymentMethod: "BANK_TRANSFER_SWISS_QR",
      referenceType: "QRR",
      reference: SYNTHETIC_QRR_REF,
      amountMinor: 42900,
      currency: "CHF",
      creditorAccountMasked: "CH** **** **** **** *901X",
      additionalInformation: "SportClubEvo Abonnement SYNTH-2026-000042",
      createdAt: synthInvoiceDate,
    },
  };
}

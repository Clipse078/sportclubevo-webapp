import type { InvoicePaymentInstructionRecord } from "../../invoice-payment-instruction-types";
import type {
  InvoiceIssuerSnapshotRecord,
  InvoiceLineRecord,
  InvoiceRecipientSnapshotRecord,
  InvoiceRecord,
  InvoiceTaxSnapshotRecord,
} from "../../native-billing-commercial-types";
import type { InvoicePdfDocumentData } from "../invoice-pdf-types";

const baseDate = new Date("2026-09-01T12:00:00.000Z");
const periodEnd = new Date("2026-09-30T12:00:00.000Z");
const dueDate = new Date("2026-10-01T12:00:00.000Z");

export function buildFixtureInvoice(overrides?: Partial<InvoiceRecord>): InvoiceRecord {
  return {
    id: "inv-id-fca-2",
    key: "inv-fca-2026-001-2",
    invoiceNumber: "2026-000002",
    legalEntityId: "le-tulip",
    billingCustomerId: "bc-fca",
    billingContractId: "contract-fca",
    status: "FINALIZED",
    currency: "CHF",
    periodStart: baseDate,
    periodEnd,
    invoiceDate: baseDate,
    dueDate,
    paymentTermsDays: 30,
    netTotalMinor: 19900,
    vatTotalMinor: 1612,
    grossTotalMinor: 21512,
    contractLabel: "FCA-2026-001",
    finalizedAt: baseDate,
    createdAt: baseDate,
    updatedAt: baseDate,
    ...overrides,
  };
}

export function buildFixtureIssuer(): InvoiceIssuerSnapshotRecord {
  return {
    id: "iss-1",
    invoiceId: "inv-id-fca-2",
    legalName: "Tulip Digital - Duijster",
    displayName: "SportClubEvo by Tulip Digital",
    uid: "CHE-228.036.135",
    vatId: "CHE-228.036.135 MWST",
    addressLine1: "Binningerstrasse",
    houseNumber: "46",
    postalCode: "4123",
    city: "Allschwil",
    countryCode: "CH",
    currency: "CHF",
  };
}

export function buildFixtureRecipient(): InvoiceRecipientSnapshotRecord {
  return {
    id: "rec-1",
    invoiceId: "inv-id-fca-2",
    companyOrName: "FC Allschwil",
    street: "Hegenheimermattweg",
    houseNumber: "130",
    postalCode: "4123",
    city: "Allschwil",
    countryCode: "CH",
    invoiceEmail: null,
  };
}

export function buildFixtureLine(overrides?: Partial<InvoiceLineRecord>): InvoiceLineRecord {
  return {
    id: "line-1",
    invoiceId: "inv-id-fca-2",
    description: "SportClubEvo Platform",
    quantity: "1",
    unitPriceNetMinor: 19900,
    lineNetMinor: 19900,
    vatRateBps: 810,
    vatMinor: 1612,
    lineGrossMinor: 21512,
    sortOrder: 0,
    ...overrides,
  };
}

export function buildFixtureTax(): InvoiceTaxSnapshotRecord {
  return {
    id: "tax-1",
    invoiceId: "inv-id-fca-2",
    taxLabel: "MWST 8.1%",
    taxRateBps: 810,
    taxableBaseMinor: 19900,
    taxAmountMinor: 1612,
    currency: "CHF",
  };
}

export function buildFixturePaymentInstruction(
  overrides?: Partial<InvoicePaymentInstructionRecord>,
): InvoicePaymentInstructionRecord {
  return {
    id: "ipi-1",
    invoiceId: "inv-id-fca-2",
    billingBankAccountId: "bba-ubs",
    paymentMethod: "BANK_TRANSFER_SWISS_QR",
    referenceType: "QRR",
    reference: "273282026000002025434650072",
    amountMinor: 21512,
    currency: "CHF",
    creditorAccountMasked: "CH** **** **** **** *654 0",
    additionalInformation: null,
    createdAt: baseDate,
    ...overrides,
  };
}

export function buildFixturePdfDocumentData(
  overrides?: Partial<InvoicePdfDocumentData>,
): InvoicePdfDocumentData {
  const invoice = buildFixtureInvoice();
  const instruction = buildFixturePaymentInstruction();
  return {
    invoice,
    lines: [buildFixtureLine()],
    taxSnapshots: [buildFixtureTax()],
    issuer: buildFixtureIssuer(),
    recipient: buildFixtureRecipient(),
    paymentInstruction: instruction,
    spcPayload: null,
    creditorAccount: null,
    isVoid: false,
    includeSwissPaymentSection: true,
    ...overrides,
  };
}

export const FIXTURE_QR_IBAN = "CH4431999123000889012";

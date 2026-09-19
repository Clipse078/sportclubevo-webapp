import type { SwissQrBillData } from "../swiss-qr-bill-data";
import { createSwissQrBillData } from "../swiss-qr-bill-data";
import type { SwissQrComplianceCode } from "../swiss-qr-compliance-codes";
import { SWISS_QR_COMPLIANCE_CODES } from "../swiss-qr-compliance-codes";

const tulipCreditor = {
  name: "Tulip Digital - Duijster",
  street: "Binningerstrasse",
  houseNumber: "46",
  postalCode: "4123",
  city: "Allschwil",
  countryCode: "CH",
};

const fcaDebtor = {
  name: "FC Allschwil",
  street: "Hegenheimermattweg",
  houseNumber: "130",
  postalCode: "4123",
  city: "Allschwil",
  countryCode: "CH",
};

const QR_IBAN = "CH693000523573415901X";
const QRR_REF = "273282026000002025434650072";
const IBAN = "CH9300762011623852957";
const SCOR_REF = "RF18539007547034";

export type GoldenValidFixture = {
  id: string;
  data: SwissQrBillData;
  expectedCreditorAccount: string;
  expectedPayloadContains?: string[];
  goldenPayloadNormalized?: string;
};

export type GoldenInvalidFixture = {
  id: string;
  data: SwissQrBillData;
  expectedCode: SwissQrComplianceCode;
};

function baseBill(partial: Partial<SwissQrBillData> & Pick<SwissQrBillData, "account" | "reference">): SwissQrBillData {
  return createSwissQrBillData({
    account: partial.account,
    creditor: partial.creditor ?? tulipCreditor,
    debtor: partial.debtor ?? fcaDebtor,
    amount: partial.amount ?? { amountMinor: 21512, currency: "CHF" },
    reference: partial.reference,
    additionalInformation: partial.additionalInformation ?? {
      unstructuredMessage: null,
      billingInformation: null,
    },
  });
}

export const goldenValidFixtures: GoldenValidFixture[] = [
  {
    id: "tulip-qrr-chf",
    expectedCreditorAccount: QR_IBAN,
    data: baseBill({
      account: { iban: IBAN, qrIban: QR_IBAN },
      reference: { type: "QRR", value: QRR_REF },
      additionalInformation: { unstructuredMessage: "Rechnung 2026-000002", billingInformation: null },
    }),
    expectedPayloadContains: ["QRR", QRR_REF, "215.12", "Tulip Digital - Duijster"],
  },
  {
    id: "iban-scor-chf",
    expectedCreditorAccount: IBAN,
    data: baseBill({
      account: { iban: IBAN, qrIban: null },
      reference: { type: "SCOR", value: SCOR_REF },
    }),
    expectedPayloadContains: ["SCOR", SCOR_REF],
  },
  {
    id: "iban-non-chf",
    expectedCreditorAccount: IBAN,
    data: baseBill({
      account: { iban: IBAN, qrIban: null },
      reference: { type: "NON", value: null },
    }),
    expectedPayloadContains: ["NON\r\n\r\n"],
  },
  {
    id: "umlaut-creditor",
    expectedCreditorAccount: IBAN,
    data: baseBill({
      account: { iban: IBAN, qrIban: null },
      creditor: { ...tulipCreditor, name: "Müller & Söhne AG" },
      reference: { type: "NON", value: null },
    }),
    expectedPayloadContains: ["Müller & Söhne AG"],
  },
  {
    id: "accent-debtor",
    expectedCreditorAccount: IBAN,
    data: baseBill({
      account: { iban: IBAN, qrIban: null },
      debtor: { ...fcaDebtor, city: "Genève" },
      reference: { type: "NON", value: null },
    }),
    expectedPayloadContains: ["Genève"],
  },
  {
    id: "min-amount",
    expectedCreditorAccount: IBAN,
    data: baseBill({
      account: { iban: IBAN, qrIban: null },
      amount: { amountMinor: 1, currency: "CHF" },
      reference: { type: "NON", value: null },
    }),
    expectedPayloadContains: ["0.01"],
  },
  {
    id: "iban-scor-eur-shaped",
    expectedCreditorAccount: IBAN,
    data: baseBill({
      account: { iban: IBAN, qrIban: null },
      amount: { amountMinor: 1000, currency: "EUR" },
      reference: { type: "SCOR", value: SCOR_REF },
    }),
  },
];

export const goldenInvalidFixtures: GoldenInvalidFixture[] = [
  {
    id: "invalid-iban-checksum",
    expectedCode: SWISS_QR_COMPLIANCE_CODES.INVALID_IBAN,
    data: baseBill({
      account: { iban: "CH9300762011623852958", qrIban: null },
      reference: { type: "NON", value: null },
    }),
  },
  {
    id: "iban-with-qrr",
    expectedCode: SWISS_QR_COMPLIANCE_CODES.INVALID_REFERENCE_COMBINATION,
    data: baseBill({
      account: { iban: IBAN, qrIban: null },
      reference: { type: "QRR", value: QRR_REF },
    }),
  },
  {
    id: "invalid-qrr-checksum",
    expectedCode: SWISS_QR_COMPLIANCE_CODES.INVALID_QRR,
    data: baseBill({
      account: { iban: IBAN, qrIban: QR_IBAN },
      reference: { type: "QRR", value: "210000000003139471430009018" },
    }),
  },
  {
    id: "invalid-scor",
    expectedCode: SWISS_QR_COMPLIANCE_CODES.INVALID_SCOR,
    data: baseBill({
      account: { iban: IBAN, qrIban: null },
      reference: { type: "SCOR", value: "RF000000000" },
    }),
  },
  {
    id: "non-with-reference",
    expectedCode: SWISS_QR_COMPLIANCE_CODES.INVALID_REFERENCE_COMBINATION,
    data: baseBill({
      account: { iban: IBAN, qrIban: null },
      reference: { type: "NON", value: QRR_REF },
    }),
  },
  {
    id: "oversized-name",
    expectedCode: SWISS_QR_COMPLIANCE_CODES.FIELD_TOO_LONG,
    data: baseBill({
      account: { iban: IBAN, qrIban: null },
      creditor: { ...tulipCreditor, name: "X".repeat(71) },
      reference: { type: "NON", value: null },
    }),
  },
  {
    id: "illegal-character",
    expectedCode: SWISS_QR_COMPLIANCE_CODES.INVALID_CREDITOR,
    data: baseBill({
      account: { iban: IBAN, qrIban: null },
      creditor: { ...tulipCreditor, name: "Hello 🌍" },
      reference: { type: "NON", value: null },
    }),
  },
  {
    id: "zero-amount",
    expectedCode: SWISS_QR_COMPLIANCE_CODES.INVALID_AMOUNT,
    data: baseBill({
      account: { iban: IBAN, qrIban: null },
      amount: { amountMinor: 0, currency: "CHF" },
      reference: { type: "NON", value: null },
    }),
  },
];

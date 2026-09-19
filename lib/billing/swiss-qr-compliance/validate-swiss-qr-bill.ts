import type { BillingReferenceStrategy } from "@prisma/client";
import {
  isQrIban,
  paymentAccountForStrategy,
  validateChLiIbanShape,
} from "../swiss-qr/swiss-iban";
import { validateScorReference } from "../swiss-qr/swiss-scor";
import { validateSwissStructuredAddress } from "../swiss-qr/swiss-structured-address";
import { assertSwissReferenceAccountCompatibility } from "../swiss-qr/swiss-reference-compat";
import { SwissQrrError, validateQrrReference } from "../swiss-qr/swiss-qrr";
import { SwissScorError } from "../swiss-qr/swiss-scor";
import { SwissIbanError } from "../swiss-qr/swiss-iban";
import { SwissReferenceCompatError } from "../swiss-qr/swiss-reference-compat";
import {
  SCE_SWISS_QR_PRODUCT_CURRENCIES,
  SIX_QR_FIELD_LIMITS,
  SIX_QR_PERMITTED_CURRENCIES,
} from "./six-qr-bill-standard";
import { SWISS_QR_COMPLIANCE_CODES } from "./swiss-qr-compliance-codes";
import {
  SwissQrComplianceError,
  type SwissQrComplianceIssue,
} from "./swiss-qr-compliance-error";
import type { SwissQrBillData } from "./swiss-qr-bill-data";
import { assertSwissQrPermittedCharacters } from "./validate-swiss-qr-character-set";

function mapKnownError(error: unknown): SwissQrComplianceIssue | null {
  if (error instanceof SwissQrComplianceError) {
    return { code: error.code, message: error.message, field: error.field };
  }
  if (error instanceof SwissReferenceCompatError) {
    return {
      code: SWISS_QR_COMPLIANCE_CODES.INVALID_REFERENCE_COMBINATION,
      message: error.message,
    };
  }
  if (error instanceof SwissIbanError) {
    return {
      code: SWISS_QR_COMPLIANCE_CODES.INVALID_IBAN,
      message: error.message,
    };
  }
  if (error instanceof SwissQrrError) {
    return {
      code: SWISS_QR_COMPLIANCE_CODES.INVALID_QRR,
      message: error.message,
    };
  }
  if (error instanceof SwissScorError) {
    return {
      code: SWISS_QR_COMPLIANCE_CODES.INVALID_SCOR,
      message: error.message,
    };
  }
  return null;
}

function pushIssue(issues: SwissQrComplianceIssue[], error: unknown): void {
  const mapped = mapKnownError(error);
  if (mapped) {
    issues.push(mapped);
    return;
  }
  if (error instanceof Error) {
    issues.push({
      code: SWISS_QR_COMPLIANCE_CODES.INVALID_ADDRESS,
      message: error.message,
    });
    return;
  }
  issues.push({
    code: SWISS_QR_COMPLIANCE_CODES.PAYLOAD_SERIALIZATION_FAILED,
    message: "Unbekannter Validierungsfehler.",
  });
}

function assertFieldMaxLength(value: string, max: number, field: string): void {
  if (value.length > max) {
    throw new SwissQrComplianceError(
      SWISS_QR_COMPLIANCE_CODES.FIELD_TOO_LONG,
      `${field} überschreitet die maximal zulässige Länge (${max}).`,
      field,
    );
  }
}

function validateStructuredParty(
  address: SwissQrBillData["creditor"],
  label: string,
  issues: SwissQrComplianceIssue[],
): void {
  try {
    const validated = validateSwissStructuredAddress(address, label);
    assertFieldMaxLength(validated.name, SIX_QR_FIELD_LIMITS.name, `${label}: Name`);
    assertFieldMaxLength(validated.street, SIX_QR_FIELD_LIMITS.street, `${label}: Strasse`);
    if (validated.houseNumber) {
      assertFieldMaxLength(
        validated.houseNumber,
        SIX_QR_FIELD_LIMITS.buildingNumber,
        `${label}: Hausnummer`,
      );
    }
    assertFieldMaxLength(validated.postalCode, SIX_QR_FIELD_LIMITS.postalCode, `${label}: PLZ`);
    assertFieldMaxLength(validated.city, SIX_QR_FIELD_LIMITS.city, `${label}: Ort`);
    assertSwissQrPermittedCharacters(validated.name, `${label}: Name`);
    assertSwissQrPermittedCharacters(validated.street, `${label}: Strasse`);
    if (validated.houseNumber) {
      assertSwissQrPermittedCharacters(validated.houseNumber, `${label}: Hausnummer`);
    }
    assertSwissQrPermittedCharacters(validated.postalCode, `${label}: PLZ`);
    assertSwissQrPermittedCharacters(validated.city, `${label}: Ort`);
  } catch (error) {
    const code =
      error instanceof SwissQrComplianceError &&
      error.code === SWISS_QR_COMPLIANCE_CODES.FIELD_TOO_LONG
        ? error.code
        : label.includes("Gläubiger")
          ? SWISS_QR_COMPLIANCE_CODES.INVALID_CREDITOR
          : SWISS_QR_COMPLIANCE_CODES.INVALID_DEBTOR;
    const mapped = mapKnownError(error);
    if (mapped) {
      issues.push({ ...mapped, code: mapped.code === SWISS_QR_COMPLIANCE_CODES.FIELD_TOO_LONG ? mapped.code : code });
    } else if (error instanceof Error) {
      issues.push({ code, message: error.message });
    }
  }
}

function validateReference(
  data: SwissQrBillData,
  creditorAccount: string,
  issues: SwissQrComplianceIssue[],
): void {
  const strategy = data.reference.type;
  try {
    assertSwissReferenceAccountCompatibility({
      iban: data.account.iban,
      qrIban: data.account.qrIban,
      referenceStrategy: strategy,
    });

    if (strategy === "QRR") {
      if (!isQrIban(creditorAccount)) {
        throw new SwissQrComplianceError(
          SWISS_QR_COMPLIANCE_CODES.QRR_ACCOUNT_MISMATCH,
          "QRR erfordert eine QR-IBAN im Zahlungsteil.",
        );
      }
      if (!data.reference.value?.trim()) {
        throw new SwissQrComplianceError(
          SWISS_QR_COMPLIANCE_CODES.INVALID_QRR,
          "QRR-Referenz fehlt.",
        );
      }
      validateQrrReference(data.reference.value);
      return;
    }

    if (strategy === "SCOR") {
      if (isQrIban(creditorAccount)) {
        throw new SwissQrComplianceError(
          SWISS_QR_COMPLIANCE_CODES.INVALID_REFERENCE_COMBINATION,
          "SCOR ist mit QR-IBAN nicht zulässig.",
        );
      }
      if (!data.reference.value?.trim()) {
        throw new SwissQrComplianceError(
          SWISS_QR_COMPLIANCE_CODES.INVALID_SCOR,
          "SCOR-Referenz fehlt.",
        );
      }
      validateScorReference(data.reference.value);
      return;
    }

    if (strategy === "NON") {
      if (data.reference.value?.trim()) {
        throw new SwissQrComplianceError(
          SWISS_QR_COMPLIANCE_CODES.INVALID_REFERENCE_COMBINATION,
          "Bei Referenztyp NON darf keine Referenz gesetzt sein.",
        );
      }
      return;
    }

    throw new SwissQrComplianceError(
      SWISS_QR_COMPLIANCE_CODES.INVALID_REFERENCE_COMBINATION,
      "Unbekannte Referenzstrategie.",
    );
  } catch (error) {
    pushIssue(issues, error);
  }
}

function validateAmount(data: SwissQrBillData, issues: SwissQrComplianceIssue[]): void {
  const { amountMinor, currency } = data.amount;
  const normalizedCurrency = currency.trim().toUpperCase();

  if (
    !SIX_QR_PERMITTED_CURRENCIES.includes(
      normalizedCurrency as (typeof SIX_QR_PERMITTED_CURRENCIES)[number],
    )
  ) {
    issues.push({
      code: SWISS_QR_COMPLIANCE_CODES.INVALID_CURRENCY,
      message: `Währung ${normalizedCurrency} ist in SIX QR nicht zulässig.`,
      field: "currency",
    });
    return;
  }

  if (
    !SCE_SWISS_QR_PRODUCT_CURRENCIES.includes(
      normalizedCurrency as (typeof SCE_SWISS_QR_PRODUCT_CURRENCIES)[number],
    )
  ) {
    issues.push({
      code: SWISS_QR_COMPLIANCE_CODES.UNSUPPORTED_PRODUCT_CURRENCY,
      message: `SportClubEvo unterstützt Swiss QR derzeit nur für ${SCE_SWISS_QR_PRODUCT_CURRENCIES.join(", ")}.`,
      field: "currency",
    });
    return;
  }

  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    issues.push({
      code: SWISS_QR_COMPLIANCE_CODES.INVALID_AMOUNT,
      message: "Betrag muss in Rappen als positive Ganzzahl vorliegen.",
      field: "amountMinor",
    });
    return;
  }

  const major = amountMinor / 100;
  if (major < SIX_QR_FIELD_LIMITS.amountMinMajor) {
    issues.push({
      code: SWISS_QR_COMPLIANCE_CODES.INVALID_AMOUNT,
      message: `Betrag muss mindestens ${SIX_QR_FIELD_LIMITS.amountMinMajor} ${normalizedCurrency} sein.`,
      field: "amountMinor",
    });
  }
  if (major > SIX_QR_FIELD_LIMITS.amountMaxMajor) {
    issues.push({
      code: SWISS_QR_COMPLIANCE_CODES.INVALID_AMOUNT,
      message: "Betrag überschreitet das SIX-Maximum.",
      field: "amountMinor",
    });
  }
}

function validateAdditionalInformation(
  data: SwissQrBillData,
  issues: SwissQrComplianceIssue[],
): void {
  const ustrd = data.additionalInformation.unstructuredMessage?.trim() ?? "";
  const bkg = data.additionalInformation.billingInformation?.trim() ?? "";
  if (ustrd.length > SIX_QR_FIELD_LIMITS.unstructuredMessage) {
    issues.push({
      code: SWISS_QR_COMPLIANCE_CODES.FIELD_TOO_LONG,
      message: "Zusatzinformation (Ustrd) ist zu lang.",
      field: "additionalInformation.unstructuredMessage",
    });
  }
  if (bkg.length > SIX_QR_FIELD_LIMITS.billingInformation) {
    issues.push({
      code: SWISS_QR_COMPLIANCE_CODES.FIELD_TOO_LONG,
      message: "Billing information ist zu lang.",
      field: "additionalInformation.billingInformation",
    });
  }
  if (ustrd.length + bkg.length > SIX_QR_FIELD_LIMITS.combinedAdditionalInformation) {
    issues.push({
      code: SWISS_QR_COMPLIANCE_CODES.FIELD_TOO_LONG,
      message: "Zusatzinformationen überschreiten gemeinsam 140 Zeichen.",
      field: "additionalInformation",
    });
  }
  try {
    if (ustrd) assertSwissQrPermittedCharacters(ustrd, "Zusatzinformation");
    if (bkg) assertSwissQrPermittedCharacters(bkg, "Billing information");
  } catch (error) {
    pushIssue(issues, error);
  }
}

export function validateSwissQrBillData(data: SwissQrBillData): SwissQrComplianceIssue[] {
  const issues: SwissQrComplianceIssue[] = [];

  try {
    validateChLiIbanShape(data.account.iban);
  } catch {
    issues.push({
      code: SWISS_QR_COMPLIANCE_CODES.INVALID_IBAN,
      message: "IBAN ist ungültig.",
      field: "account.iban",
    });
  }

  if (data.account.qrIban) {
    try {
      const qr = validateChLiIbanShape(data.account.qrIban);
      if (!isQrIban(qr)) {
        issues.push({
          code: SWISS_QR_COMPLIANCE_CODES.INVALID_QR_IBAN,
          message: "QR-IBAN IID liegt ausserhalb des QR-Bereichs.",
          field: "account.qrIban",
        });
      }
    } catch {
      issues.push({
        code: SWISS_QR_COMPLIANCE_CODES.INVALID_QR_IBAN,
        message: "QR-IBAN ist ungültig.",
        field: "account.qrIban",
      });
    }
  }

  validateStructuredParty(data.creditor, "Gläubiger", issues);
  validateStructuredParty(data.debtor, "Schuldner", issues);
  validateAmount(data, issues);
  validateAdditionalInformation(data, issues);

  let creditorAccount = "";
  try {
    creditorAccount = paymentAccountForStrategy(
      { iban: data.account.iban, qrIban: data.account.qrIban },
      data.reference.type,
    );
  } catch (error) {
    if (data.reference.type === "QRR" && error instanceof SwissIbanError) {
      issues.push({
        code: SWISS_QR_COMPLIANCE_CODES.INVALID_REFERENCE_COMBINATION,
        message: error.message,
      });
    } else {
      pushIssue(issues, error);
    }
  }

  if (creditorAccount) {
    validateReference(data, creditorAccount, issues);
  }

  return issues;
}

export function resolveCreditorPaymentAccount(data: SwissQrBillData): string {
  return paymentAccountForStrategy(
    { iban: data.account.iban, qrIban: data.account.qrIban },
    data.reference.type,
  );
}

export function referenceTypeForPayload(type: BillingReferenceStrategy): BillingReferenceStrategy {
  return type;
}

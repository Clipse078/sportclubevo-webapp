import type { BillingBankAccountRecord } from "../native-billing-types";
import { NativeBillingValidationError } from "../native-billing-types";
import { assertSwissReferenceAccountCompatibility } from "./swiss-reference-compat";

function isActiveAccount(account: BillingBankAccountRecord, now = new Date()): boolean {
  if (account.activeUntil && account.activeUntil <= now) {
    return false;
  }
  return true;
}

export function selectEligibleBillingBankAccount(
  accounts: BillingBankAccountRecord[],
  legalEntityId: string,
  currency: string,
): BillingBankAccountRecord {
  const normalizedCurrency = currency.trim().toUpperCase();
  const eligible = accounts.filter((account) => {
    if (account.legalEntityId !== legalEntityId) {
      return false;
    }
    if (!isActiveAccount(account)) {
      return false;
    }
    if (account.currency.trim().toUpperCase() !== normalizedCurrency) {
      return false;
    }
    return isSwissReferenceAccountCompatible(account);
  });

  if (eligible.length === 0) {
    throw new NativeBillingValidationError(
      "Kein aktives Bankkonto mit passender Währung und Referenzstrategie gefunden.",
    );
  }

  const defaults = eligible.filter((a) => a.isDefault);
  if (defaults.length === 1) {
    return defaults[0]!;
  }
  if (defaults.length > 1) {
    throw new NativeBillingValidationError(
      "Mehrere Standard-Bankkonten — Auswahl ist mehrdeutig.",
    );
  }
  if (eligible.length === 1) {
    return eligible[0]!;
  }

  throw new NativeBillingValidationError(
    "Mehrere geeignete Bankkonten — bitte genau ein Standardkonto festlegen.",
  );
}

function isSwissReferenceAccountCompatible(account: BillingBankAccountRecord): boolean {
  try {
    assertSwissReferenceAccountCompatibility({
      iban: account.iban,
      qrIban: account.qrIban,
      referenceStrategy: account.referenceStrategy,
    });
    return true;
  } catch {
    return false;
  }
}

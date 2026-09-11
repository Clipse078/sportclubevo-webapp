import { describe, expect, it } from "vitest";
import type { BillingBankAccountRecord } from "../../native-billing-types";
import { NativeBillingValidationError } from "../../native-billing-types";
import { selectEligibleBillingBankAccount } from "../swiss-bank-account-selection";

const baseAccount = (overrides: Partial<BillingBankAccountRecord>): BillingBankAccountRecord => ({
  id: "ba-1",
  legalEntityId: "le-1",
  label: "Main",
  bankName: null,
  currency: "CHF",
  iban: "CH9300762011623852957",
  qrIban: null,
  referenceStrategy: "SCOR",
  qrrReferencePrefix: null,
  creditorName: "Creditor",
  creditorAddressLine1: "Street",
  creditorHouseNumber: null,
  creditorPostalCode: "4000",
  creditorCity: "Basel",
  creditorCountryCode: "CH",
  activeFrom: new Date(),
  activeUntil: null,
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("billing bank account selection", () => {
  it("selects single eligible default account", () => {
    const selected = selectEligibleBillingBankAccount(
      [baseAccount({ isDefault: true })],
      "le-1",
      "CHF",
    );
    expect(selected.id).toBe("ba-1");
  });

  it("fails when currency mismatches", () => {
    expect(() =>
      selectEligibleBillingBankAccount([baseAccount({ currency: "EUR" })], "le-1", "CHF"),
    ).toThrow(NativeBillingValidationError);
  });

  it("fails when account is inactive", () => {
    expect(() =>
      selectEligibleBillingBankAccount(
        [baseAccount({ activeUntil: new Date("2020-01-01") })],
        "le-1",
        "CHF",
      ),
    ).toThrow(NativeBillingValidationError);
  });

  it("fails when legal entity differs", () => {
    expect(() =>
      selectEligibleBillingBankAccount([baseAccount({ legalEntityId: "le-2" })], "le-1", "CHF"),
    ).toThrow(NativeBillingValidationError);
  });

  it("fails when multiple eligible accounts without default", () => {
    expect(() =>
      selectEligibleBillingBankAccount(
        [baseAccount({ id: "ba-1" }), baseAccount({ id: "ba-2" })],
        "le-1",
        "CHF",
      ),
    ).toThrow(NativeBillingValidationError);
  });
});

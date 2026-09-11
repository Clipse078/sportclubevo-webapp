import { describe, expect, it } from "vitest";
import { maskIban, redactIbanInText } from "../iban-mask";
import { serializeBillingBankAccountMasked, auditBankAccountSnapshot } from "../native-billing-serializers";
import type { BillingBankAccountRecord } from "../native-billing-types";

const sampleAccount: BillingBankAccountRecord = {
  id: "ba-1",
  legalEntityId: "le-1",
  label: "Main",
  bankName: null,
  currency: "CHF",
  iban: "CH9300762011623852957",
  qrIban: "CH4431990123000889012",
  referenceStrategy: "NON",
  qrrReferencePrefix: null,
  creditorName: "Issuer",
  creditorAddressLine1: "Street",
  creditorHouseNumber: null,
  creditorPostalCode: "4000",
  creditorCity: "Basel",
  creditorCountryCode: "CH",
  activeFrom: new Date(),
  activeUntil: null,
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("billing bank account security surfaces", () => {
  it("masks API payloads", () => {
    const serialized = serializeBillingBankAccountMasked(sampleAccount);
    expect(serialized.ibanMasked).toBe("****2957");
    expect(serialized.qrIbanMasked).toBe("****9012");
    expect(JSON.stringify(serialized)).not.toContain("CH9300762011623852957");
    expect(serialized).not.toHaveProperty("iban");
  });

  it("masks audit snapshots", () => {
    const audit = auditBankAccountSnapshot(sampleAccount);
    expect(JSON.stringify(audit)).not.toContain("CH9300762011623852957");
    expect(audit.ibanMasked).toBe("****2957");
  });

  it("redacts IBAN-like tokens in log text", () => {
    const message = redactIbanInText("Failed for CH9300762011623852957");
    expect(message).not.toContain("CH9300762011623852957");
    expect(message).toContain("****2957");
  });

  it("maskIban keeps tail only", () => {
    expect(maskIban("CH9300762011623852957")).toBe("****2957");
  });
});

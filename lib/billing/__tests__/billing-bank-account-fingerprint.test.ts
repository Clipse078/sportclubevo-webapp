import { describe, expect, it } from "vitest";
import { BILLING_FIELD_CRYPTO_TEST_KEY_BASE64 } from "../billing-field-crypto";
import {
  computeBillingBankAccountIbanFingerprint,
  normalizeBillingBankAccountIban,
} from "../billing-bank-account-fingerprint";

describe("billing bank account fingerprints", () => {
  it("normalizes Swiss IBAN formatting", () => {
    expect(normalizeBillingBankAccountIban("ch93 0076 2011 6238 5295 7")).toBe(
      "CH9300762011623852957",
    );
  });

  it("produces stable HMAC fingerprints for the same normalized IBAN", () => {
    process.env.SCE_BILLING_ENCRYPTION_KEY = BILLING_FIELD_CRYPTO_TEST_KEY_BASE64;
    const a = computeBillingBankAccountIbanFingerprint("CH9300762011623852957");
    const b = computeBillingBankAccountIbanFingerprint(
      normalizeBillingBankAccountIban("CH93 0076 2011 6238 5295 7"),
    );
    expect(a).toBe(b);
    expect(a).not.toContain("CH93");
  });
});

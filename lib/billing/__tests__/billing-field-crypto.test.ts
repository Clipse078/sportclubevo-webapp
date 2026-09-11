import { afterEach, describe, expect, it } from "vitest";
import {
  BILLING_FIELD_CRYPTO_TEST_KEY_BASE64,
  BillingFieldCryptoError,
  decryptBillingField,
  encryptBillingField,
  resolveBillingEncryptionKey,
} from "../billing-field-crypto";

const TEST_ENV = {
  NODE_ENV: "test",
  APP_ENV: "test",
  SCE_BILLING_ENCRYPTION_KEY: BILLING_FIELD_CRYPTO_TEST_KEY_BASE64,
} as NodeJS.ProcessEnv;

describe("billing field crypto", () => {
  afterEach(() => {
    delete process.env.SCE_BILLING_ENCRYPTION_KEY;
  });

  it("encrypts and decrypts roundtrip", () => {
    const plaintext = "CH9300762011623852957";
    const payload = encryptBillingField(plaintext, TEST_ENV);
    expect(decryptBillingField(payload, TEST_ENV)).toBe(plaintext);
  });

  it("produces distinct ciphertext for identical plaintext", () => {
    const a = encryptBillingField("CH9300762011623852957", TEST_ENV);
    const b = encryptBillingField("CH9300762011623852957", TEST_ENV);
    expect(a).not.toBe(b);
  });

  it("fails authentication when ciphertext is tampered", () => {
    const payload = encryptBillingField("CH9300762011623852957", TEST_ENV);
    const tampered = payload.replace(/.$/, payload.endsWith("A") ? "B" : "A");
    expect(() => decryptBillingField(tampered, TEST_ENV)).toThrow(BillingFieldCryptoError);
  });

  it("fails safely with wrong key", () => {
    const payload = encryptBillingField("CH9300762011623852957", TEST_ENV);
    const wrongKeyEnv = {
      ...TEST_ENV,
      SCE_BILLING_ENCRYPTION_KEY: Buffer.alloc(32, 2).toString("base64"),
    };
    expect(() => decryptBillingField(payload, wrongKeyEnv)).toThrow(BillingFieldCryptoError);
  });

  it("fails safely on malformed payload", () => {
    expect(() => decryptBillingField("not-a-payload", TEST_ENV)).toThrow(BillingFieldCryptoError);
  });

  it("uses test fallback key only in test runtime", () => {
    const { key } = resolveBillingEncryptionKey({ NODE_ENV: "test", APP_ENV: "test" });
    expect(key.length).toBe(32);
  });

  it("requires configured key outside test runtime", () => {
    expect(() =>
      resolveBillingEncryptionKey({ NODE_ENV: "production", APP_ENV: "stage", VERCEL: "1", VERCEL_ENV: "production" }),
    ).toThrow(BillingFieldCryptoError);
  });
});

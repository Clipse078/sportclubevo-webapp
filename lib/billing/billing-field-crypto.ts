import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getRuntimeEnvironment } from "@/lib/env";

export const BILLING_FIELD_CRYPTO_VERSION = 1;

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

/** Deterministic 32-byte key used only when runtime is classified as test. */
export const BILLING_FIELD_CRYPTO_TEST_KEY_BASE64 =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

export class BillingFieldCryptoError extends Error {
  readonly name = "BillingFieldCryptoError";

  constructor(message: string) {
    super(message);
  }
}

function decodeKeyMaterial(raw: string): Buffer {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new BillingFieldCryptoError("Billing encryption key is empty.");
  }

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  const fromBase64 = Buffer.from(trimmed, "base64");
  if (fromBase64.length === KEY_BYTES) {
    return fromBase64;
  }

  throw new BillingFieldCryptoError(
    "Billing encryption key must be 32 bytes (base64) or 64 hex characters.",
  );
}

export function resolveBillingEncryptionKey(
  processEnv: NodeJS.ProcessEnv = process.env,
): { key: Buffer; version: number } {
  const configured = processEnv.SCE_BILLING_ENCRYPTION_KEY?.trim();
  if (configured) {
    return { key: decodeKeyMaterial(configured), version: BILLING_FIELD_CRYPTO_VERSION };
  }

  const runtime = getRuntimeEnvironment(processEnv);
  if (runtime.isTest || runtime.nodeEnv === "test") {
    return {
      key: decodeKeyMaterial(BILLING_FIELD_CRYPTO_TEST_KEY_BASE64),
      version: BILLING_FIELD_CRYPTO_VERSION,
    };
  }

  throw new BillingFieldCryptoError(
    "SCE_BILLING_ENCRYPTION_KEY is not configured for billing field encryption.",
  );
}

/** v1 payload: version:ivB64:tagB64:ciphertextB64 */
export function encryptBillingField(
  plaintext: string,
  processEnv: NodeJS.ProcessEnv = process.env,
): string {
  if (plaintext.length === 0) {
    throw new BillingFieldCryptoError("Cannot encrypt empty billing field value.");
  }

  const { key, version } = resolveBillingEncryptionKey(processEnv);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    `v${version}`,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptBillingField(
  payload: string,
  processEnv: NodeJS.ProcessEnv = process.env,
): string {
  const parts = payload.split(":");
  if (parts.length !== 4) {
    throw new BillingFieldCryptoError("Malformed encrypted billing field payload.");
  }

  const [versionToken, ivB64, tagB64, ciphertextB64] = parts;
  const version = Number.parseInt(versionToken.replace(/^v/, ""), 10);
  if (version !== BILLING_FIELD_CRYPTO_VERSION) {
    throw new BillingFieldCryptoError(
      `Unsupported billing field encryption version: ${versionToken}.`,
    );
  }

  const { key } = resolveBillingEncryptionKey(processEnv);
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new BillingFieldCryptoError("Malformed encrypted billing field payload.");
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  } catch {
    throw new BillingFieldCryptoError("Billing field decryption failed.");
  }
}

export function validateBillingEncryptionKeyConfiguration(
  processEnv: NodeJS.ProcessEnv = process.env,
): { ok: true } | { ok: false; reason: string } {
  try {
    resolveBillingEncryptionKey(processEnv);
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof BillingFieldCryptoError
        ? error.message
        : "Billing encryption key validation failed.";
    return { ok: false, reason: message };
  }
}

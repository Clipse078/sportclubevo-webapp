import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getRuntimeEnvironment } from "@/lib/env";

export const COMMUNICATION_SECRET_CRYPTO_VERSION = 1;

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

export const COMMUNICATION_SECRET_CRYPTO_TEST_KEY_BASE64 =
  "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=";

export class CommunicationSecretCryptoError extends Error {
  readonly name = "CommunicationSecretCryptoError";

  constructor(message: string) {
    super(message);
  }
}

function decodeKeyMaterial(raw: string): Buffer {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new CommunicationSecretCryptoError("Communication encryption key is empty.");
  }
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  const fromBase64 = Buffer.from(trimmed, "base64");
  if (fromBase64.length === KEY_BYTES) {
    return fromBase64;
  }
  throw new CommunicationSecretCryptoError(
    "Communication encryption key must be 32 bytes (base64) or 64 hex characters.",
  );
}

export function resolveCommunicationEncryptionKey(
  processEnv: NodeJS.ProcessEnv = process.env,
): { key: Buffer; version: number } {
  const configured = processEnv.SCE_COMMUNICATION_ENCRYPTION_KEY?.trim();
  if (configured) {
    return {
      key: decodeKeyMaterial(configured),
      version: COMMUNICATION_SECRET_CRYPTO_VERSION,
    };
  }
  const runtime = getRuntimeEnvironment(processEnv);
  if (runtime.isTest || runtime.nodeEnv === "test") {
    return {
      key: decodeKeyMaterial(COMMUNICATION_SECRET_CRYPTO_TEST_KEY_BASE64),
      version: COMMUNICATION_SECRET_CRYPTO_VERSION,
    };
  }
  throw new CommunicationSecretCryptoError(
    "SCE_COMMUNICATION_ENCRYPTION_KEY is not configured for mailbox credential encryption.",
  );
}

export function encryptCommunicationSecret(
  plaintext: string,
  processEnv: NodeJS.ProcessEnv = process.env,
): string {
  if (plaintext.length === 0) {
    throw new CommunicationSecretCryptoError("Cannot encrypt empty mailbox credential.");
  }
  const { key, version } = resolveCommunicationEncryptionKey(processEnv);
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

export function decryptCommunicationSecret(
  payload: string,
  processEnv: NodeJS.ProcessEnv = process.env,
): string {
  const parts = payload.split(":");
  if (parts.length !== 4) {
    throw new CommunicationSecretCryptoError("Malformed encrypted credential payload.");
  }
  const [versionToken, ivB64, tagB64, ciphertextB64] = parts;
  const version = Number.parseInt(versionToken.replace(/^v/, ""), 10);
  if (version !== COMMUNICATION_SECRET_CRYPTO_VERSION) {
    throw new CommunicationSecretCryptoError(
      `Unsupported communication credential encryption version: ${versionToken}.`,
    );
  }
  const { key } = resolveCommunicationEncryptionKey(processEnv);
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new CommunicationSecretCryptoError("Malformed encrypted credential payload.");
  }
  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  } catch {
    throw new CommunicationSecretCryptoError("Mailbox credential decryption failed.");
  }
}

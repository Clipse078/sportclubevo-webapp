/**
 * SCE-DS2-07G — verification database guard for Node scripts (no TS import).
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const VERIFICATION_DATABASE_NAME = "sce_ds2_07g_verification";

export function maskDatabaseUrl(url) {
  if (!url) return "(not set)";
  try {
    const parsed = new URL(url);
    const user = parsed.username || "(no user)";
    return `${parsed.protocol}//${user}:***@${parsed.hostname}${parsed.pathname}`;
  } catch {
    return url.replace(/:[^@/]*@/, ":***@");
  }
}

function isLocalHost(hostname) {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

export function assertSafeVerificationDatabaseUrl() {
  const candidate =
    process.env.DATABASE_URL_VERIFICATION?.trim() ||
    (process.env.TEST_DATABASE_URL?.trim()?.includes(VERIFICATION_DATABASE_NAME)
      ? process.env.TEST_DATABASE_URL.trim()
      : "");

  if (!candidate) {
    throw new Error(
      "Refusing verification DB access: DATABASE_URL_VERIFICATION is required for isolated fixture resolution.",
    );
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(`Refusing verification DB access: malformed target ${maskDatabaseUrl(candidate)}`);
  }

  const database = parsed.pathname.replace(/^\//, "");
  if (!isLocalHost(parsed.hostname)) {
    throw new Error(
      `Refusing verification DB access: host must be local. Target: ${maskDatabaseUrl(candidate)}`,
    );
  }
  if (database !== VERIFICATION_DATABASE_NAME) {
    throw new Error(
      `Refusing verification DB access: database must be ${VERIFICATION_DATABASE_NAME}. Target: ${maskDatabaseUrl(candidate)}`,
    );
  }

  const runtimeDatabase = process.env.DATABASE_URL?.trim();
  if (runtimeDatabase && runtimeDatabase === candidate) {
    throw new Error(
      "Refusing verification DB access: DATABASE_URL_VERIFICATION must not equal operational DATABASE_URL.",
    );
  }

  if (parsed.hostname.includes("neon.tech")) {
    throw new Error("Refusing verification DB access: Neon targets are not allowed.");
  }

  return candidate;
}

export function loadVerificationFixtureManifest() {
  try {
    const path = require.resolve(
      "../../lib/design-system/sce-ds2-07g-verification-fixtures.json",
    );
    return JSON.parse(require("node:fs").readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function fingerprintVerificationDatabase(url) {
  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, "");
  return `${parsed.hostname}/${database}`;
}

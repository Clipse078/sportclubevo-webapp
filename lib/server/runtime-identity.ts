import { createHash } from "node:crypto";
import { getEffectivePrismaRuntimeConnectionSource } from "@/lib/db/runtime-connection";
import { getRuntimeEnvironment } from "@/lib/env";

export type CanonicalEnvironment =
  | "PRODUCTION"
  | "STAGE"
  | "PREVIEW"
  | "ACCEPTANCE"
  | "LOCAL";

export type RuntimeDataEnvironment = CanonicalEnvironment | "UNKNOWN";

export class RuntimeDataEnvironmentError extends Error {
  readonly name = "RuntimeDataEnvironmentError";
  constructor(
    message: string,
    readonly code:
      | "DATA_ENVIRONMENT_MISSING"
      | "DATA_ENVIRONMENT_INVALID"
      | "DATA_ENVIRONMENT_MISMATCH"
      | "DATABASE_IDENTITY_UNPROVEN",
  ) {
    super(message);
  }
}

function canonicalize(value: string | null | undefined): RuntimeDataEnvironment {
  switch (value?.trim().toUpperCase()) {
    case "PROD":
    case "PRODUCTION":
      return "PRODUCTION";
    case "STAGE":
      return "STAGE";
    case "PREVIEW":
      return "PREVIEW";
    case "ACCEPTANCE":
      return "ACCEPTANCE";
    case "LOCAL":
    case "DEVELOPMENT":
    case "TEST":
      return "LOCAL";
    default:
      return "UNKNOWN";
  }
}

export function getRuntimeDataEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeDataEnvironment {
  return canonicalize(env.SCE_DATA_ENVIRONMENT);
}

export function getRuntimeDeploymentEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): CanonicalEnvironment {
  const runtime = getRuntimeEnvironment({
    ...env,
    NODE_ENV: env.NODE_ENV ?? "development",
  });
  if (runtime.isProd) return "PRODUCTION";
  if (runtime.isStage) return "STAGE";
  if (runtime.isPreview) return "PREVIEW";
  if (runtime.isAcceptance) return "ACCEPTANCE";
  return "LOCAL";
}

export function getDatabaseFingerprintFromEffectivePrismaSource(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const source = getEffectivePrismaRuntimeConnectionSource(env).value;
  if (!source) return null;
  try {
    const url = new URL(source);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) return null;
    const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
    if (!url.hostname || !database) return null;
    return createHash("sha256")
      .update(`${url.hostname.toLowerCase()}:${database}`)
      .digest("hex")
      .slice(0, 16);
  } catch {
    return null;
  }
}

export type RuntimeIdentity = {
  deploymentEnvironment: CanonicalEnvironment;
  dataEnvironment: RuntimeDataEnvironment;
  vercelEnvironment: string | null;
  commitSha: string | null;
  deploymentId: string | null;
  databaseFingerprint: string | null;
  databaseFingerprintConfigured: boolean;
  databaseFingerprintMatchesConfiguredTarget: boolean;
  legalEntityKey: string | null;
};

export function resolveRuntimeIdentity(
  env: NodeJS.ProcessEnv = process.env,
  legalEntityKey: string | null = null,
): RuntimeIdentity {
  const databaseFingerprint =
    getDatabaseFingerprintFromEffectivePrismaSource(env);
  const configuredFingerprint =
    env.SCE_DATA_DATABASE_FINGERPRINT?.trim().toLowerCase() || null;
  return {
    deploymentEnvironment: getRuntimeDeploymentEnvironment(env),
    dataEnvironment: getRuntimeDataEnvironment(env),
    vercelEnvironment: env.VERCEL_ENV?.trim() || null,
    commitSha: env.VERCEL_GIT_COMMIT_SHA?.trim() || null,
    deploymentId: env.VERCEL_DEPLOYMENT_ID?.trim() || null,
    databaseFingerprint,
    databaseFingerprintConfigured: configuredFingerprint !== null,
    databaseFingerprintMatchesConfiguredTarget:
      databaseFingerprint !== null &&
      configuredFingerprint !== null &&
      databaseFingerprint === configuredFingerprint,
    legalEntityKey,
  };
}

export function requireBillingDataEnvironment(
  expected: CanonicalEnvironment,
  env: NodeJS.ProcessEnv = process.env,
): RuntimeIdentity {
  const raw = env.SCE_DATA_ENVIRONMENT?.trim();
  const identity = resolveRuntimeIdentity(env);
  if (!raw) {
    throw new RuntimeDataEnvironmentError(
      "SCE_DATA_ENVIRONMENT is required for billing operations.",
      "DATA_ENVIRONMENT_MISSING",
    );
  }
  if (identity.dataEnvironment === "UNKNOWN") {
    throw new RuntimeDataEnvironmentError(
      "SCE_DATA_ENVIRONMENT is invalid.",
      "DATA_ENVIRONMENT_INVALID",
    );
  }
  if (identity.dataEnvironment !== expected) {
    throw new RuntimeDataEnvironmentError(
      `Billing requires ${expected} data, but this runtime is configured for ${identity.dataEnvironment}.`,
      "DATA_ENVIRONMENT_MISMATCH",
    );
  }
  if (
    identity.deploymentEnvironment !== "LOCAL" &&
    !identity.databaseFingerprintMatchesConfiguredTarget
  ) {
    throw new RuntimeDataEnvironmentError(
      "The effective Prisma database identity does not match SCE_DATA_DATABASE_FINGERPRINT.",
      "DATABASE_IDENTITY_UNPROVEN",
    );
  }
  return identity;
}

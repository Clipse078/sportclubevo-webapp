/**
 * WORKSPACE-08-06 — server-only Workspace storage configuration (fail closed).
 */

import {
  WORKSPACE_STORAGE_PROVIDER_IDS,
  isKnownWorkspaceStorageProviderId,
  type WorkspaceStorageProviderId,
} from "@/lib/workspace/storage/provider-identity";
import { WorkspaceStorageOperationError } from "@/lib/workspace/storage/storage-errors";

export type WorkspaceS3CompatibleConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

const DEFAULT_UPLOAD_PROVIDER: WorkspaceStorageProviderId =
  WORKSPACE_STORAGE_PROVIDER_IDS.VERCEL_BLOB;

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

function redactSecret(value: string): string {
  return value ? "[REDACTED]" : "(missing)";
}

export function getConfiguredWorkspaceUploadStorageProviderId(): WorkspaceStorageProviderId {
  const raw = process.env.WORKSPACE_STORAGE_PROVIDER?.trim();
  if (!raw) {
    return DEFAULT_UPLOAD_PROVIDER;
  }
  if (!isKnownWorkspaceStorageProviderId(raw)) {
    throw new WorkspaceStorageOperationError(
      "INVALID_CONFIGURATION",
      `Unsupported WORKSPACE_STORAGE_PROVIDER value: ${raw}`,
    );
  }
  return raw;
}

export function getWorkspaceS3CompatibleConfig(): WorkspaceS3CompatibleConfig {
  const endpoint = process.env.WORKSPACE_S3_ENDPOINT?.trim() ?? "";
  const region = process.env.WORKSPACE_S3_REGION?.trim() ?? "";
  const bucket = process.env.WORKSPACE_S3_BUCKET?.trim() ?? "";
  const accessKeyId =
    process.env.WORKSPACE_S3_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey =
    process.env.WORKSPACE_S3_SECRET_ACCESS_KEY?.trim() ?? "";
  const forcePathStyle =
    process.env.WORKSPACE_S3_FORCE_PATH_STYLE?.trim().toLowerCase() ===
    "true";

  if (!endpoint) {
    throw new WorkspaceStorageOperationError(
      "INVALID_CONFIGURATION",
      "WORKSPACE_S3_ENDPOINT is required for s3-compatible storage.",
    );
  }

  if (!/^https?:\/\/.+/i.test(endpoint)) {
    throw new WorkspaceStorageOperationError(
      "INVALID_CONFIGURATION",
      "WORKSPACE_S3_ENDPOINT must be a valid HTTP(S) URL.",
    );
  }

  if (isProductionRuntime() && endpoint.toLowerCase().startsWith("http://")) {
    throw new WorkspaceStorageOperationError(
      "INVALID_CONFIGURATION",
      "WORKSPACE_S3_ENDPOINT must use HTTPS in production.",
    );
  }

  if (!bucket) {
    throw new WorkspaceStorageOperationError(
      "INVALID_CONFIGURATION",
      "WORKSPACE_S3_BUCKET is required for s3-compatible storage.",
    );
  }

  if (!accessKeyId || !secretAccessKey) {
    throw new WorkspaceStorageOperationError(
      "INVALID_CONFIGURATION",
      "WORKSPACE_S3_ACCESS_KEY_ID and WORKSPACE_S3_SECRET_ACCESS_KEY are required for s3-compatible storage.",
    );
  }

  if (!region) {
    throw new WorkspaceStorageOperationError(
      "INVALID_CONFIGURATION",
      "WORKSPACE_S3_REGION is required for s3-compatible storage.",
    );
  }

  return {
    endpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    forcePathStyle,
  };
}

/** Example Swiss Exoscale SOS profile (documentation / tests only — no credentials). */
export const EXOSCALE_SOS_EXAMPLE_CONFIG_PROFILE = {
  provider: WORKSPACE_STORAGE_PROVIDER_IDS.S3_COMPATIBLE,
  endpoint: "https://sos-ch-gva-2.exo.io",
  region: "ch-gva-2",
  bucket: "sportclubevo-workspace-example",
  forcePathStyle: false,
  note:
    "Set WORKSPACE_S3_* env vars in deployment; never commit credentials. ch-dk-2 is also supported by Exoscale SOS.",
} as const;

export function assertStorageConfigurationSafeForLogging(
  config: WorkspaceS3CompatibleConfig,
): Record<string, string | boolean> {
  return {
    endpoint: config.endpoint,
    region: config.region,
    bucket: config.bucket,
    forcePathStyle: config.forcePathStyle,
    accessKeyId: redactSecret(config.accessKeyId),
    secretAccessKey: redactSecret(config.secretAccessKey),
  };
}

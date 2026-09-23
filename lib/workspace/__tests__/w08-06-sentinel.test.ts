import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { WORKSPACE_STORAGE_PROVIDER_IDS } from "@/lib/workspace/storage/provider-identity";
import {
  EXOSCALE_SOS_EXAMPLE_CONFIG_PROFILE,
  getConfiguredWorkspaceUploadStorageProviderId,
} from "@/lib/workspace/storage/workspace-storage-config";
import { getWorkspaceStorageProvider } from "@/lib/workspace/storage/workspace-storage-provider-registry";
import { VercelBlobWorkspaceStorage } from "@/lib/workspace/storage/adapters/vercel-blob-workspace-storage";
import { S3CompatibleWorkspaceStorage } from "@/lib/workspace/storage/adapters/s3-compatible-workspace-storage";
import { WORKSPACE_IMMUTABLE_VERSION_IDENTITY_FIELDS } from "@/lib/workspace/version/version-domain";
import { BREAK_GLASS_DOES_NOT_BYPASS_SCAN_POLICY } from "@/lib/workspace/governance/break-glass-constants";

const root = resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("WORKSPACE-08-06 sentinels", () => {
  it("W08-06-01 domain services do not import @vercel/blob", () => {
    for (const rel of [
      "lib/workspace/document-service.ts",
      "lib/workspace/document-download-service.ts",
      "lib/workspace/document-version-write-service.ts",
      "lib/workspace/governance/workspace-purge-storage.ts",
    ]) {
      expect(read(rel)).not.toMatch(/@vercel\/blob/);
    }
  });

  it("W08-06-03 Vercel SDK isolated to Vercel adapter", () => {
    expect(read("lib/workspace/storage/adapters/vercel-blob-workspace-storage.ts")).toMatch(
      /@vercel\/blob/,
    );
    expect(read("lib/workspace/upload-storage.ts")).not.toMatch(/@vercel\/blob/);
  });

  it("W08-06-04 S3 SDK isolated to S3 adapter", () => {
    expect(read("lib/workspace/storage/adapters/s3-compatible-workspace-storage.ts")).toMatch(
      /@aws-sdk\/client-s3/,
    );
    expect(read("lib/workspace/document-service.ts")).not.toMatch(/@aws-sdk\/client-s3/);
  });

  it("W08-06-05 unknown provider fails closed", () => {
    expect(read("lib/workspace/storage/workspace-storage-provider-registry.ts")).toMatch(
      /Unknown workspace storage provider/,
    );
  });

  it("W08-06-10 vercel-blob resolves Vercel adapter", () => {
    expect(
      getWorkspaceStorageProvider(WORKSPACE_STORAGE_PROVIDER_IDS.VERCEL_BLOB),
    ).toBeInstanceOf(VercelBlobWorkspaceStorage);
  });

  it("W08-06-11 s3-compatible resolves S3 adapter", () => {
    expect(
      getWorkspaceStorageProvider(WORKSPACE_STORAGE_PROVIDER_IDS.S3_COMPATIBLE),
    ).toBeInstanceOf(S3CompatibleWorkspaceStorage);
  });

  it("W08-06-13 default upload provider is vercel-blob without env override", () => {
    const previous = process.env.WORKSPACE_STORAGE_PROVIDER;
    delete process.env.WORKSPACE_STORAGE_PROVIDER;
    expect(getConfiguredWorkspaceUploadStorageProviderId()).toBe(
      WORKSPACE_STORAGE_PROVIDER_IDS.VERCEL_BLOB,
    );
    if (previous) {
      process.env.WORKSPACE_STORAGE_PROVIDER = previous;
    }
  });

  it("W08-06-14 download resolves persisted provider", () => {
    expect(read("lib/workspace/document-download-service.ts")).toMatch(
      /getWorkspaceStorageProvider\(document\.storageProvider\)/,
    );
  });

  it("W08-06-15 preview resolves persisted provider", () => {
    expect(read("app/api/workspace/documents/[documentId]/preview/route.ts")).toMatch(
      /getWorkspaceStorageProvider\(\s*document\.storageProvider/,
    );
  });

  it("W08-06-17 purge resolves provider per version", () => {
    expect(read("lib/workspace/governance/workspace-purge-storage.ts")).toMatch(
      /storageProvider/,
    );
    expect(read("lib/workspace/governance/workspace-purge-storage.ts")).toMatch(
      /getWorkspaceStorageProvider/,
    );
  });

  it("W08-06-19 shared key identity includes provider", () => {
    expect(read("lib/workspace/governance/workspace-purge-storage.ts")).toMatch(
      /storageProvider,\s*\n\s*NOT: \{ documentId \}/,
    );
  });

  it("W08-06-29 S3 PutObject does not set public-read ACL", () => {
    expect(read("lib/workspace/storage/adapters/s3-compatible-workspace-storage.ts")).not.toMatch(
      /public-read/,
    );
  });

  it("W08-06-31 S3 upload does not persist signed URL", () => {
    expect(read("lib/workspace/storage/adapters/s3-compatible-workspace-storage.ts")).toMatch(
      /storageUrl: null/,
    );
  });

  it("W08-06-35 missing S3 configuration fails closed", () => {
    expect(read("lib/workspace/storage/workspace-storage-config.ts")).toMatch(
      /WORKSPACE_S3_ENDPOINT is required/,
    );
  });

  it("W08-06-36 configuration errors do not expose secret values", () => {
    const src = read("lib/workspace/storage/workspace-storage-config.ts");
    expect(src).not.toMatch(/secretAccessKey\s*\}/);
    expect(src).toMatch(/REDACTED/);
  });

  it("W08-06-39 break-glass scan policy constant unchanged", () => {
    expect(BREAK_GLASS_DOES_NOT_BYPASS_SCAN_POLICY).toBe(true);
  });

  it("W08-06-44 no automatic object migration job", () => {
    expect(read("lib/workspace/background-jobs/job-payload.ts")).not.toMatch(
      /STORAGE_MIGRATION/,
    );
  });

  it("W08-06-45 no dual-write introduced", () => {
    expect(read("lib/workspace/document-version-write-service.ts")).not.toMatch(
      /dualWrite|dual-write/i,
    );
  });

  it("W08-06-47 Exoscale example has no credentials", () => {
    expect(EXOSCALE_SOS_EXAMPLE_CONFIG_PROFILE.endpoint).toMatch(/^https:\/\//);
    expect(JSON.stringify(EXOSCALE_SOS_EXAMPLE_CONFIG_PROFILE)).not.toMatch(
      /secret|password|keyId/i,
    );
  });

  it("W08-06-48 provider configuration modules are server-side lib paths", () => {
    expect(read("lib/workspace/storage/workspace-storage-config.ts")).toMatch(
      /process\.env/,
    );
    expect(read("app/api/workspace/documents/route.ts")).not.toMatch(
      /WORKSPACE_S3_SECRET/,
    );
  });

  it("W08-06-16 W07 references remain version-id based", () => {
    expect(WORKSPACE_IMMUTABLE_VERSION_IDENTITY_FIELDS).toContain("storageProvider");
    expect(read("lib/tasks/task-document-reference-service.ts")).not.toMatch(
      /storageProvider/,
    );
  });

  it("W08-06-24 scan job payload has no storage credentials", () => {
    expect(read("lib/workspace/background-jobs/job-payload.ts")).not.toMatch(
      /SECRET_ACCESS_KEY|WORKSPACE_S3_/,
    );
  });

  it("W08-06-46 Swiss capability documented without verified residency claim", () => {
    expect(read("docs/workspace/WORKSPACE-08-06-STORAGE-PORTABILITY.md")).toMatch(
      /SWISS_STORAGE_CAPABLE.*YES/i,
    );
    expect(read("docs/workspace/WORKSPACE-08-06-STORAGE-PORTABILITY.md")).toMatch(
      /SWISS_STORAGE_VERIFIED.*NO/i,
    );
  });
});

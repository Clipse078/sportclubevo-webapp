import { describe, expect, it } from "vitest";
import { assertCamt054ReconciliationDatabaseAlignment } from "../camt054-reconciliation-database-alignment";
import { getDatabaseFingerprintFromEffectivePrismaSource } from "@/lib/server/runtime-identity";

const STAGE_URL =
  "postgresql://u:p@ep-wispy-hall-aso93dy6-pooler.c-4.eu-central-1.aws.neon.tech/neondb";
const OTHER_URL =
  "postgresql://u:p@ep-other-branch-aso93dy6-pooler.c-4.eu-central-1.aws.neon.tech/neondb";

describe("assertCamt054ReconciliationDatabaseAlignment", () => {
  const stageFingerprint = getDatabaseFingerprintFromEffectivePrismaSource({
    NODE_ENV: "production",
    DATABASE_URL: STAGE_URL,
  })!;

  it("passes when Preview explicitly attests STAGE data and the effective DB", () => {
    expect(() =>
      assertCamt054ReconciliationDatabaseAlignment({
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "preview",
        APP_ENV: "preview",
        DATABASE_URL: STAGE_URL,
        SCE_DATA_ENVIRONMENT: "STAGE",
        SCE_DATA_DATABASE_FINGERPRINT: stageFingerprint,
      }),
    ).not.toThrow();
  });

  it("throws when Preview DATABASE_URL does not match the configured fingerprint", () => {
    expect(() => {
      assertCamt054ReconciliationDatabaseAlignment({
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "preview",
        APP_ENV: "preview",
        DATABASE_URL: OTHER_URL,
        SCE_DATA_ENVIRONMENT: "STAGE",
        SCE_DATA_DATABASE_FINGERPRINT: stageFingerprint,
      });
    }).toThrow(
      expect.objectContaining({
        code: "PREVIEW_NOT_TARGETING_STAGE_DB",
        message: expect.stringMatching(/STAGE-Datenumgebung/i),
      }),
    );
  });

  it("throws when Preview claims a different data environment", () => {
    expect(() =>
      assertCamt054ReconciliationDatabaseAlignment({
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "preview",
        APP_ENV: "preview",
        DATABASE_URL: STAGE_URL,
        SCE_DATA_ENVIRONMENT: "ACCEPTANCE",
        SCE_DATA_DATABASE_FINGERPRINT: stageFingerprint,
      }),
    ).toThrow(
      expect.objectContaining({ code: "PREVIEW_NOT_TARGETING_STAGE_DB" }),
    );
  });

  it.each([
    ["missing DATABASE_URL", { SCE_DATA_ENVIRONMENT: "STAGE" }],
    ["missing data environment", { DATABASE_URL: STAGE_URL }],
    [
      "missing database fingerprint attestation",
      { DATABASE_URL: STAGE_URL, SCE_DATA_ENVIRONMENT: "STAGE" },
    ],
    [
      "non-PostgreSQL DATABASE_URL",
      {
        DATABASE_URL: "https://example.invalid/neondb",
        SCE_DATA_ENVIRONMENT: "STAGE",
        SCE_DATA_DATABASE_FINGERPRINT: stageFingerprint,
      },
    ],
  ])("fails closed when alignment is unprovable: %s", (_label, urls) => {
    expect(() =>
      assertCamt054ReconciliationDatabaseAlignment({
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "preview",
        APP_ENV: "preview",
        ...urls,
      }),
    ).toThrow(
      expect.objectContaining({ code: "PREVIEW_NOT_TARGETING_STAGE_DB" }),
    );
  });

  it("does not block STAGE production reconciliation", () => {
    expect(() =>
      assertCamt054ReconciliationDatabaseAlignment({
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "production",
        APP_ENV: "stage",
        DATABASE_URL: STAGE_URL,
        SCE_DATA_ENVIRONMENT: "STAGE",
        SCE_DATA_DATABASE_FINGERPRINT: stageFingerprint,
      }),
    ).not.toThrow();
  });
});

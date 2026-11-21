import { describe, expect, it } from "vitest";

import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";
import {
  SCE_PUBLIC_REFERENCE_BACKFILL_OPERATION_ID,
  assertScePublicReferenceBackfillAllowed,
  buildGuardedLiveCommand,
  summarizeBackfillCandidates,
} from "../sce-public-reference-backfill-cli";
import type { ScePublicReferenceBackfillRow } from "../sce-public-reference-backfill";

const LOCAL_DATABASE_URL = "postgresql://user:password@127.0.0.1:5432/sce_ref_cli";
const STAGE_DATABASE_URL =
  process.env.STAGE_DB_URL?.trim() ??
  "postgresql://user:password@ep-wispy-hall-aso93dy6-pooler.c-4.eu-central-1.aws.neon.tech/neondb";

describe("sce-public-reference-backfill-cli", () => {
  it("blocks remote live STAGE without authorization", () => {
    expect(() =>
      assertScePublicReferenceBackfillAllowed({
        dryRun: false,
        tenantFilter: null,
        databaseUrl: STAGE_DATABASE_URL,
        env: {
          NODE_ENV: "production",
          APP_ENV: "stage",
          SCE_DATA_ENVIRONMENT: "STAGE",
          SCE_DATA_DATABASE_FINGERPRINT: STAGE_CANONICAL_DATABASE_FINGERPRINT,
          DATABASE_URL: STAGE_DATABASE_URL,
        },
      }),
    ).toThrow(/explicit authorization/);
  });

  it("allows remote dry-run when STAGE fingerprint guards pass", () => {
    expect(() =>
      assertScePublicReferenceBackfillAllowed({
        dryRun: true,
        tenantFilter: null,
        databaseUrl: STAGE_DATABASE_URL,
        env: {
          NODE_ENV: "production",
          APP_ENV: "stage",
          SCE_DATA_ENVIRONMENT: "STAGE",
          SCE_DATA_DATABASE_FINGERPRINT: STAGE_CANONICAL_DATABASE_FINGERPRINT,
          DATABASE_URL: STAGE_DATABASE_URL,
        },
      }),
    ).not.toThrow();
  });

  it("allows remote live STAGE with matching authorization", () => {
    expect(() =>
      assertScePublicReferenceBackfillAllowed({
        dryRun: false,
        tenantFilter: null,
        databaseUrl: STAGE_DATABASE_URL,
        env: {
          NODE_ENV: "production",
          APP_ENV: "stage",
          SCE_DATA_ENVIRONMENT: "STAGE",
          SCE_DATA_DATABASE_FINGERPRINT: STAGE_CANONICAL_DATABASE_FINGERPRINT,
          SCE_OPERATION_AUTHORIZATION: `${SCE_PUBLIC_REFERENCE_BACKFILL_OPERATION_ID}:stage`,
          DATABASE_URL: STAGE_DATABASE_URL,
        },
      }),
    ).not.toThrow();
  });

  it("allows local live execution with explicit intent", () => {
    expect(() =>
      assertScePublicReferenceBackfillAllowed({
        dryRun: false,
        tenantFilter: null,
        databaseUrl: LOCAL_DATABASE_URL,
        env: { NODE_ENV: "development", APP_ENV: "local", DATABASE_URL: LOCAL_DATABASE_URL },
      }),
    ).not.toThrow();
  });

  it("summarizes candidates by kind and tenant", () => {
    const rows: ScePublicReferenceBackfillRow[] = [
      { kind: "task", id: "t1", tenantId: "ten-a", createdAt: new Date() },
      { kind: "task", id: "t2", tenantId: "ten-a", createdAt: new Date() },
      { kind: "target", id: "z1", tenantId: "ten-b", createdAt: new Date() },
    ];
    expect(summarizeBackfillCandidates(rows)).toEqual({
      total: 3,
      tenantCount: 2,
      byKind: { strategy: 0, target: 1, task: 2, meldung: 0 },
      byTenant: {
        "ten-a": { strategy: 0, target: 0, task: 2, meldung: 0 },
        "ten-b": { strategy: 0, target: 1, task: 0, meldung: 0 },
      },
      tenantKeys: ["ten-a", "ten-b"],
    });
  });

  it("documents the guarded STAGE live command", () => {
    const command = buildGuardedLiveCommand();
    expect(command).toContain(SCE_PUBLIC_REFERENCE_BACKFILL_OPERATION_ID);
    expect(command).not.toContain("--dry-run");
    expect(command).toContain(STAGE_CANONICAL_DATABASE_FINGERPRINT);
  });
});
import { describe, expect, it } from "vitest";
import {
  EXECUTE_CONFIRMATION,
  OPERATION_ID,
  evaluateCleanupExecuteGuards,
} from "@/lib/finance/commitment/finance-07d-stage-uat-commitment-cleanup";
import {
  FIN_07D_UAT_CLEANUP_TENANT_ID,
  FIN_07D_UAT_CLEANUP_TENANT_KEY,
  FIN_07D_UAT_CONTROLLED_COMMITMENTS,
  FIN_07D_UAT_CONTROLLED_POLICY,
} from "@/lib/finance/commitment/finance-07d-uat-commitment-cleanup-ledger";
import { STAGE_CANONICAL_DATABASE_FINGERPRINT } from "@/lib/billing/swiss-cleanup-01-stage-acceptance-data";

const STAGE_URL =
  "postgresql://u:p@ep-wispy-hall-aso93dy6-pooler.c-4.eu-central-1.aws.neon.tech/neondb";

function stageEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    APP_ENV: "stage",
    SCE_DATA_ENVIRONMENT: "STAGE",
    DATABASE_URL: STAGE_URL,
    SCE_DATA_DATABASE_FINGERPRINT: STAGE_CANONICAL_DATABASE_FINGERPRINT,
    SCE_OPERATION_AUTHORIZATION: `${OPERATION_ID}:stage`,
    ...overrides,
  };
}

describe("FIN-07D UAT commitment cleanup ledger", () => {
  it("scopes tenant to fc-allschwil programme tenant", () => {
    expect(FIN_07D_UAT_CLEANUP_TENANT_KEY).toBe("fc-allschwil");
    expect(FIN_07D_UAT_CLEANUP_TENANT_ID).toBe("cmomwboak0000tsf3zzivrs46");
  });

  it("allowlists exactly three PO UAT commitment titles and ids", () => {
    expect(FIN_07D_UAT_CONTROLLED_COMMITMENTS).toHaveLength(3);
    expect(FIN_07D_UAT_CONTROLLED_COMMITMENTS.map((r) => r.title)).toEqual([
      "UAT — FIN-07D Below Threshold",
      "UAT — FIN-07D Exact Threshold",
      "UAT — FIN-07D Above Threshold",
    ]);
  });

  it("marks UAT-only policy cleanup when seed created policy", () => {
    expect(FIN_07D_UAT_CONTROLLED_POLICY.createdForUatOnly).toBe(true);
    expect(FIN_07D_UAT_CONTROLLED_POLICY.policyId).toMatch(/^cm/);
  });
});

describe("FIN-07D execute guards", () => {
  it("dry-run does not evaluate execute-only gates as FAIL", () => {
    const results = evaluateCleanupExecuteGuards({
      execute: false,
      confirm: null,
      env: {},
      databaseUrl: undefined,
    });
    expect(results.every((r) => r.status !== "FAIL")).toBe(true);
  });

  it("execute PASS with full stage authorization", () => {
    const results = evaluateCleanupExecuteGuards({
      execute: true,
      confirm: EXECUTE_CONFIRMATION,
      env: stageEnv(),
      databaseUrl: STAGE_URL,
    });
    expect(results.filter((r) => r.status === "FAIL")).toEqual([]);
  });
});

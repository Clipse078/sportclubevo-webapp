import { describe, expect, it } from "vitest";
import {
  EXECUTE_CONFIRMATION,
  OPERATION_ID,
  evaluateCleanupExecuteGuards,
} from "@/lib/finance/commitment/finance-07b-r6-stage-uat-commitment-cleanup";
import {
  FIN_07B_UAT_CLEANUP_TENANT_ID,
  FIN_07B_UAT_CLEANUP_TENANT_KEY,
  FIN_07B_UAT_CONTROLLED_COMMITMENTS,
} from "@/lib/finance/commitment/finance-07b-uat-commitment-cleanup-ledger";
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

describe("FIN-07B R6 UAT commitment cleanup ledger", () => {
  it("scopes tenant to fc-allschwil programme tenant", () => {
    expect(FIN_07B_UAT_CLEANUP_TENANT_KEY).toBe("fc-allschwil");
    expect(FIN_07B_UAT_CLEANUP_TENANT_ID).toBe("cmomwboak0000tsf3zzivrs46");
  });

  it("allowlists exactly two PO UAT commitment titles", () => {
    expect(FIN_07B_UAT_CONTROLLED_COMMITMENTS).toHaveLength(2);
    expect(FIN_07B_UAT_CONTROLLED_COMMITMENTS.map((r) => r.title)).toEqual([
      "UAT — Hallenturniere Winter",
      "TEST 2",
    ]);
  });
});

describe("FIN-07B R6 execute guards", () => {
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

  it("wrong environment FAIL", () => {
    const results = evaluateCleanupExecuteGuards({
      execute: true,
      confirm: EXECUTE_CONFIRMATION,
      env: stageEnv({ APP_ENV: "prod", SCE_DATA_ENVIRONMENT: "PRODUCTION" }),
      databaseUrl: STAGE_URL,
    });
    expect(results.some((r) => r.gate === "APP_ENV_STAGE" && r.status === "FAIL")).toBe(
      true,
    );
  });
});

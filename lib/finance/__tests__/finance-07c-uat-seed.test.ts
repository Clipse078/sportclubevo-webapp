import { describe, expect, it } from "vitest";
import {
  EXECUTE_CONFIRMATION,
  FIN_07C_UAT_SEED_ACTOR_USER_ID,
  evaluateSeedExecuteAllowed,
  expectedOperationAuthorization,
} from "@/lib/finance/commitment/finance-07c-stage-uat-commitment-seed";
import {
  FIN_07C_UAT_PENDING_APPROVAL_TITLE,
  FIN_07C_UAT_REJECTION_TITLE,
} from "@/lib/finance/commitment/finance-07c-uat-commitment-seed-ledger";
import { resolveFinanceCommitmentSelectedYearId } from "@/lib/finance/commitment/resolve-finance-commitment-selected-year";

describe("FIN-07C STAGE UAT seed guards", () => {
  it("uses identifiable UAT titles", () => {
    expect(FIN_07C_UAT_PENDING_APPROVAL_TITLE).toContain("FIN-07C");
    expect(FIN_07C_UAT_REJECTION_TITLE).toContain("FIN-07C");
  });

  it("requires execute confirmation and operation authorization", () => {
    const env = {
      NODE_ENV: "production",
      APP_ENV: "stage",
      SCE_DATA_ENVIRONMENT: "STAGE",
      SCE_DATA_DATABASE_FINGERPRINT: "acd3b37682911890",
    };
    expect(expectedOperationAuthorization(env)).toBe(
      "finance-07c-stage-uat-commitment-seed:stage",
    );
    expect(
      evaluateSeedExecuteAllowed({
        execute: true,
        confirm: "wrong",
        env,
      }).allowed,
    ).toBe(false);
    expect(
      evaluateSeedExecuteAllowed({
        execute: true,
        confirm: EXECUTE_CONFIRMATION,
        env: {
          ...env,
          SCE_OPERATION_AUTHORIZATION: "finance-07c-stage-uat-commitment-seed:stage",
        },
      }).allowed,
    ).toBe(false);
  });

  it("pins fc-allschwil club admin actor for seed writes", () => {
    expect(FIN_07C_UAT_SEED_ACTOR_USER_ID).toMatch(/^cms/);
  });

  it("targets configured current finance year instead of newest calendar year", () => {
    const years = [{ id: "fy-2027" }, { id: "fy-2026" }];
    expect(
      resolveFinanceCommitmentSelectedYearId({
        requestedYearId: null,
        years,
        currentFinanceYearId: "fy-2026",
      }),
    ).toBe("fy-2026");
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import { generateFinanceYearProjection } from "@/lib/finance/services/finance-projection-generation-service";

function authCtx(manage: boolean) {
  return {
    tenantId: "tenant-1",
    userId: "user-1",
    permissionKeys: new Set(
      manage
        ? ["finance.forecast.view", "finance.forecast.manage"]
        : ["finance.forecast.view"],
    ),
  };
}

describe("FIN-04B-05 generation action authorization", () => {
  it("rejects view-only users before touching persistence", async () => {
    const db = {} as never;
    await expect(
      generateFinanceYearProjection(db, authCtx(false), { financeYearId: "fy1" }),
    ).rejects.toBeInstanceOf(FinanceDomainError);
  });
});

describe("FIN-04B-05 generation action wiring contract", () => {
  it("wires forecast server actions to projection generation orchestrator", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/(admin)/dashboard/finance/forecast/actions.ts"),
      "utf8",
    );
    expect(source).toContain("generateProjectionAction");
    expect(source).toContain("generateFinanceYearProjection");
    expect(source).toContain('revalidatePath("/dashboard/finance/forecast")');
  });

  it("delegates persistence lifecycle regression to FIN-04B-04 orchestrator tests", () => {
    const regression = readFileSync(
      resolve(process.cwd(), "lib/finance/__tests__/finance-04b-04-methodology-engine.test.ts"),
      "utf8",
    );
    expect(regression).toContain("generateFinanceYearProjection");
    expect(regression).toContain("supersedes on regenerate");
  });
});

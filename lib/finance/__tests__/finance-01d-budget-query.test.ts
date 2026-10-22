import { describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { loadBudgetWorkspaceSnapshot } from "@/lib/finance/services/finance-budget-query-service";

const tenantId = "tenant-a";

const yearRow = { id: "year-1", tenantId, name: "2027", startDate: new Date("2027-01-01") };

const db = {
  financeYear: {
    findMany: vi.fn(async () => [yearRow]),
    findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
      id === yearRow.id ? yearRow : null,
    ),
  },
  financeConfiguration: {
    findUnique: vi.fn(async () => ({
      currentFinanceYearId: "year-1",
      baseCurrency: "USD",
    })),
  },
  financialAccount: {
    findMany: vi.fn(async () => [
      {
        id: "acc-1",
        tenantId,
        name: "Fees",
        lifecycle: "ACTIVE",
        canonicalSemantic: "INCOME",
        sortOrder: 0,
        reportingGroup: { name: "Operating" },
      },
    ]),
  },
  financeBudget: {
    findUnique: vi.fn(async () => null),
  },
};

describe("FIN-01D budget workspace query", () => {
  it("loads baseCurrency from FinanceConfiguration for workspace context", async () => {
    const result = await loadBudgetWorkspaceSnapshot(
      db as never,
      {
        tenantId,
        userId: "user-1",
        permissionKeys: new Set([PERMISSIONS.FINANCE_BUDGET_VIEW]),
      },
      "year-1",
    );

    expect(result.baseCurrency).toBe("USD");
    expect(result.snapshot?.currency).toBe("USD");
    const configCalls = db.financeConfiguration.findUnique.mock.calls;
    expect(
      configCalls.some(
        (call) =>
          call[0]?.where?.tenantId === tenantId &&
          call[0]?.select &&
          "baseCurrency" in call[0].select,
      ),
    ).toBe(true);
  });
});

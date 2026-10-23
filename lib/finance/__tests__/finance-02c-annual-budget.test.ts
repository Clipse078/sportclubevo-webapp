import { beforeEach, describe, expect, it } from "vitest";
import { resolveApprovedBudgetMeasure } from "@/lib/finance/reporting/approved-budget-measure-provider";
import {
  approveBudgetVersion,
  getOrCreateDraftBudgetForYear,
  upsertBudgetLine,
} from "@/lib/finance/services/finance-budget-service";
import {
  createAnnualBudgetForYear,
  loadAnnualBudgetCreationContext,
} from "@/lib/finance/services/finance-annual-budget-service";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";

const tenantA = "tenant-a";

function ctx(userId = "user-1"): FinanceAuthContext {
  return {
    tenantId: tenantA,
    userId,
    permissionKeys: new Set([
      "finance.budget.view",
      "finance.budget.manage",
      "finance.approve",
    ]),
  };
}

type Store = {
  financeYear: Array<{
    id: string;
    tenantId: string;
    name: string;
    startDate: Date;
    endDate: Date;
  }>;
  financeConfiguration: Array<{ tenantId: string; baseCurrency: string | null }>;
  financeBudget: Array<{
    id: string;
    tenantId: string;
    financeYearId: string;
    currentBaselineVersionId: string | null;
  }>;
  financeBudgetVersion: Array<{
    id: string;
    budgetId: string;
    status: "DRAFT" | "APPROVED";
    versionNumber: number;
    baseCurrency: string | null;
    approvedAt: Date | null;
    approvedByUserId: string | null;
    createdByUserId: string | null;
    createdAt: Date;
  }>;
  financeBudgetLine: Array<{
    id: string;
    budgetVersionId: string;
    financialAccountId: string;
    amountMinor: number;
  }>;
  financialAccount: Array<{
    id: string;
    tenantId: string;
    canonicalSemantic: string;
    lifecycle: "ACTIVE" | "ARCHIVED";
  }>;
};

function makeDb(store: Store) {
  let lineSeq = 0;
  let versionSeq = 0;
  let budgetSeq = 0;

  const api = {
    financeYear: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financeYear.find((y) => y.id === where.id) ?? null,
      findMany: async ({
        where,
        orderBy,
      }: {
        where: { tenantId: string };
        orderBy?: { startDate: "desc" };
      }) => {
        let rows = store.financeYear.filter((y) => y.tenantId === where.tenantId);
        if (orderBy?.startDate === "desc") {
          rows = [...rows].sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
        }
        return rows;
      },
    },
    financeConfiguration: {
      findUnique: async ({ where }: { where: { tenantId: string } }) =>
        store.financeConfiguration.find((c) => c.tenantId === where.tenantId) ?? null,
    },
    financeBudget: {
      findMany: async ({ where }: { where: { tenantId: string } }) =>
        store.financeBudget
          .filter((b) => b.tenantId === where.tenantId)
          .map((budget) => ({
            ...budget,
            versions: store.financeBudgetVersion
              .filter((v) => v.budgetId === budget.id)
              .map((v) => ({ id: v.id, status: v.status })),
          })),
      findUnique: async ({
        where,
        include,
      }: {
        where:
          | { id: string }
          | { tenantId_financeYearId: { tenantId: string; financeYearId: string } };
        include?: {
          versions?: { orderBy?: unknown; include?: { lines?: { include?: unknown } } };
        };
      }) => {
        const budget =
          "id" in where
            ? (store.financeBudget.find((b) => b.id === where.id) ?? null)
            : (store.financeBudget.find(
                (b) =>
                  b.tenantId === where.tenantId_financeYearId.tenantId &&
                  b.financeYearId === where.tenantId_financeYearId.financeYearId,
              ) ?? null);
        if (!budget) return null;
        if (!include?.versions) return budget;
        const versions = store.financeBudgetVersion
          .filter((v) => v.budgetId === budget.id)
          .sort((a, b) => b.versionNumber - a.versionNumber)
          .map((v) => {
            const lines = store.financeBudgetLine
              .filter((l) => l.budgetVersionId === v.id)
              .map((line) => ({
                ...line,
                financialAccount: store.financialAccount.find(
                  (a) => a.id === line.financialAccountId,
                )!,
              }));
            return { ...v, lines };
          });
        return { ...budget, versions };
      },
      create: async ({ data, include }: { data: Record<string, unknown>; include?: unknown }) => {
        budgetSeq += 1;
        const budgetId = `budget-${budgetSeq}`;
        store.financeBudget.push({
          id: budgetId,
          tenantId: data.tenantId as string,
          financeYearId: data.financeYearId as string,
          currentBaselineVersionId: null,
        });
        const versionsCreate = (data.versions as { create: Record<string, unknown> }).create;
        versionSeq += 1;
        const versionId = `version-${versionSeq}`;
        store.financeBudgetVersion.push({
          id: versionId,
          budgetId,
          status: "DRAFT",
          versionNumber: 1,
          baseCurrency: null,
          approvedAt: null,
          approvedByUserId: null,
          createdByUserId: (versionsCreate.createdByUserId as string) ?? null,
          createdAt: new Date(),
        });
        const nestedLines = (
          versionsCreate.lines as { create: Array<Record<string, unknown>> } | undefined
        )?.create;
        if (nestedLines) {
          for (const line of nestedLines) {
            lineSeq += 1;
            store.financeBudgetLine.push({
              id: `line-${lineSeq}`,
              budgetVersionId: versionId,
              financialAccountId: line.financialAccountId as string,
              amountMinor: line.amountMinor as number,
            });
          }
        }
        const budget = store.financeBudget.find((b) => b.id === budgetId)!;
        if (!include) return budget;
        const versions = store.financeBudgetVersion
          .filter((v) => v.budgetId === budgetId)
          .map((v) => ({
            ...v,
            lines: store.financeBudgetLine
              .filter((l) => l.budgetVersionId === v.id)
              .map((line) => ({
                ...line,
                financialAccount: store.financialAccount.find(
                  (a) => a.id === line.financialAccountId,
                )!,
              })),
          }));
        return { ...budget, versions };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { currentBaselineVersionId?: string };
      }) => {
        const budget = store.financeBudget.find((b) => b.id === where.id)!;
        if (data.currentBaselineVersionId !== undefined) {
          budget.currentBaselineVersionId = data.currentBaselineVersionId;
        }
        return budget;
      },
    },
    financeBudgetVersion: {
      findUnique: async ({ where, include }: { where: { id: string }; include?: unknown }) => {
        const version = store.financeBudgetVersion.find((v) => v.id === where.id);
        if (!version || !include) return version ?? null;
        const budgetRow = store.financeBudget.find((b) => b.id === version.budgetId)!;
        const budgetVersions = store.financeBudgetVersion
          .filter((v) => v.budgetId === budgetRow.id)
          .map((v) => ({ id: v.id, status: v.status }));
        const budget = { ...budgetRow, versions: budgetVersions };
        const lines = store.financeBudgetLine
          .filter((l) => l.budgetVersionId === version.id)
          .map((line) => ({
            ...line,
            financialAccount: store.financialAccount.find((a) => a.id === line.financialAccountId)!,
          }));
        return {
          ...version,
          budget,
          lines,
        };
      },
      findFirst: async () => null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string; status?: "DRAFT" };
        data: Record<string, unknown>;
      }) => {
        const version = store.financeBudgetVersion.find((v) => v.id === where.id)!;
        if (where.status && version.status !== where.status) {
          throw new Error("immutable");
        }
        Object.assign(version, data);
        return version;
      },
    },
    financeBudgetLine: {
      upsert: async ({
        create,
        update,
      }: {
        create: Record<string, string | number>;
        update: { amountMinor: number };
      }) => {
        const existing = store.financeBudgetLine.find(
          (l) =>
            l.budgetVersionId === create.budgetVersionId &&
            l.financialAccountId === create.financialAccountId,
        );
        if (existing) {
          existing.amountMinor = update.amountMinor;
          return existing;
        }
        lineSeq += 1;
        const line = {
          id: `line-${lineSeq}`,
          budgetVersionId: create.budgetVersionId as string,
          financialAccountId: create.financialAccountId as string,
          amountMinor: create.amountMinor as number,
        };
        store.financeBudgetLine.push(line);
        return line;
      },
    },
    financialAccount: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financialAccount.find((a) => a.id === where.id) ?? null,
    },
    $transaction: async <T>(fn: (tx: typeof api) => Promise<T>) => fn(api),
  };
  return api;
}

describe("FIN-02C annual budget creation", () => {
  let store: Store;
  let db: ReturnType<typeof makeDb>;

  beforeEach(() => {
    store = {
      financeYear: [
        {
          id: "year-2026",
          tenantId: tenantA,
          name: "FY 2026",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-12-31"),
        },
        {
          id: "year-2027",
          tenantId: tenantA,
          name: "FY 2027",
          startDate: new Date("2027-01-01"),
          endDate: new Date("2027-12-31"),
        },
      ],
      financeConfiguration: [{ tenantId: tenantA, baseCurrency: "EUR" }],
      financeBudget: [],
      financeBudgetVersion: [],
      financeBudgetLine: [],
      financialAccount: [
        { id: "acc-inc", tenantId: tenantA, canonicalSemantic: "INCOME", lifecycle: "ACTIVE" },
        { id: "acc-exp", tenantId: tenantA, canonicalSemantic: "EXPENSE", lifecycle: "ACTIVE" },
        { id: "acc-arch", tenantId: tenantA, canonicalSemantic: "EXPENSE", lifecycle: "ARCHIVED" },
      ],
    };
    db = makeDb(store);
  });

  async function seedApproved2026Baseline() {
    const { workingVersion } = await getOrCreateDraftBudgetForYear(db, ctx(), "year-2026");
    await upsertBudgetLine(db, ctx(), {
      budgetVersionId: workingVersion.id,
      financialAccountId: "acc-inc",
      amountMinor: 100_00,
    });
    await upsertBudgetLine(db, ctx(), {
      budgetVersionId: workingVersion.id,
      financialAccountId: "acc-exp",
      amountMinor: 40_00,
    });
    await upsertBudgetLine(db, ctx(), {
      budgetVersionId: workingVersion.id,
      financialAccountId: "acc-arch",
      amountMinor: 10_00,
    });
    await approveBudgetVersion(db, ctx("approver"), workingVersion.id);
  }

  it("creates empty annual budget with draft v1 and no lines", async () => {
    const result = await createAnnualBudgetForYear(db, ctx(), {
      targetFinanceYearId: "year-2027",
      mode: "EMPTY",
    });
    expect(result.summary.mode).toBe("EMPTY");
    const version = store.financeBudgetVersion.find((v) => v.id === result.workingVersionId)!;
    expect(version.status).toBe("DRAFT");
    expect(store.financeBudgetLine.filter((l) => l.budgetVersionId === version.id)).toEqual([]);
    expect(store.financeBudget.find((b) => b.financeYearId === "year-2027")?.currentBaselineVersionId).toBeNull();
  });

  it("rejects duplicate annual budget creation", async () => {
    await createAnnualBudgetForYear(db, ctx(), {
      targetFinanceYearId: "year-2027",
      mode: "EMPTY",
    });
    await expect(
      createAnnualBudgetForYear(db, ctx(), {
        targetFinanceYearId: "year-2027",
        mode: "EMPTY",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_BUDGET_ALREADY_EXISTS" });
  });

  it("copies current baseline amounts into target draft and excludes archived accounts", async () => {
    await seedApproved2026Baseline();
    const result = await createAnnualBudgetForYear(db, ctx(), {
      targetFinanceYearId: "year-2027",
      mode: "COPY_FROM_PRIOR",
      sourceFinanceYearId: "year-2026",
    });
    expect(result.summary.mode).toBe("COPY_FROM_PRIOR");
    if (result.summary.mode !== "COPY_FROM_PRIOR") return;
    expect(result.summary.copiedLineCount).toBe(2);
    expect(result.summary.excludedArchivedLineCount).toBe(1);

    const targetLines = store.financeBudgetLine.filter(
      (l) => l.budgetVersionId === result.workingVersionId,
    );
    expect(targetLines).toHaveLength(2);
    expect(targetLines.find((l) => l.financialAccountId === "acc-inc")?.amountMinor).toBe(100_00);

    const sourceLine = store.financeBudgetLine.find(
      (l) =>
        l.budgetVersionId ===
          store.financeBudget.find((b) => b.financeYearId === "year-2026")!
            .currentBaselineVersionId &&
        l.financialAccountId === "acc-inc",
    )!;
    sourceLine.amountMinor = 999_00;
    const targetAfter = store.financeBudgetLine.filter(
      (l) => l.budgetVersionId === result.workingVersionId,
    );
    expect(targetAfter.find((l) => l.financialAccountId === "acc-inc")?.amountMinor).toBe(100_00);
  });

  it("defaults copy source to closest preceding eligible year", async () => {
    await seedApproved2026Baseline();
    const context = await loadAnnualBudgetCreationContext(db, ctx(), "year-2027");
    expect(context.defaultCopySourceFinanceYearId).toBe("year-2026");
    expect(context.eligibleCopySources).toHaveLength(1);
  });

  it("does not expose draft-only prior year as copy source", async () => {
    await getOrCreateDraftBudgetForYear(db, ctx(), "year-2026");
    const context = await loadAnnualBudgetCreationContext(db, ctx(), "year-2027");
    expect(context.eligibleCopySources).toEqual([]);
  });

  it("keeps copied target draft out of approved reporting", async () => {
    await seedApproved2026Baseline();
    const created = await createAnnualBudgetForYear(db, ctx(), {
      targetFinanceYearId: "year-2027",
      mode: "COPY_FROM_PRIOR",
      sourceFinanceYearId: "year-2026",
    });
    const targetBudget = store.financeBudget.find((b) => b.financeYearId === "year-2027")!;
    const measure = resolveApprovedBudgetMeasure({
      currentBaselineVersionId: targetBudget.currentBaselineVersionId,
      versions: store.financeBudgetVersion
        .filter((v) => v.budgetId === targetBudget.id)
        .map((v) => ({
          ...v,
          lines: store.financeBudgetLine.filter((l) => l.budgetVersionId === v.id),
        })),
    });
    expect(measure).toBeNull();
    expect(store.financeBudgetVersion.find((v) => v.id === created.workingVersionId)?.status).toBe(
      "DRAFT",
    );
  });

  it("rejects cross-currency prior-year copy", async () => {
    await seedApproved2026Baseline();
    const baselineId = store.financeBudget.find((b) => b.financeYearId === "year-2026")!
      .currentBaselineVersionId!;
    store.financeBudgetVersion.find((v) => v.id === baselineId)!.baseCurrency = "CHF";
    await expect(
      createAnnualBudgetForYear(db, ctx(), {
        targetFinanceYearId: "year-2027",
        mode: "COPY_FROM_PRIOR",
        sourceFinanceYearId: "year-2026",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_INVALID_CURRENCY" });
  });
});

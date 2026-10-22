import { describe, expect, it, beforeEach } from "vitest";
import { resolveCurrentGovernanceBaselineVersion } from "@/lib/finance/budget/current-governance-baseline";
import {
  buildApprovedBudgetReportingContextKey,
  resolveApprovedBudgetMeasure,
} from "@/lib/finance/reporting/approved-budget-measure-provider";
import {
  approveBudgetVersion,
  createWorkingBudgetRevision,
  getOrCreateDraftBudgetForYear,
  upsertBudgetLine,
} from "@/lib/finance/services/finance-budget-service";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

function ctx(userId = "user-1", tenantId = tenantA): FinanceAuthContext {
  return {
    tenantId,
    userId,
    permissionKeys: new Set([
      "finance.budget.view",
      "finance.budget.manage",
      "finance.approve",
    ]),
  };
}

type Store = {
  financeYear: Array<{ id: string; tenantId: string; name: string }>;
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
  const api = {
    financeYear: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financeYear.find((y) => y.id === where.id) ?? null,
    },
    financeConfiguration: {
      findUnique: async ({ where }: { where: { tenantId: string } }) =>
        store.financeConfiguration.find((c) => c.tenantId === where.tenantId) ?? null,
    },
    financeBudget: {
      findUnique: async ({
        where,
        include,
      }: {
        where:
          | { tenantId_financeYearId: { tenantId: string; financeYearId: string } }
          | { id: string };
        include?: { versions?: { orderBy?: unknown; include?: { lines?: boolean } } };
      }) => {
        const budget =
          "id" in where
            ? (store.financeBudget.find((b) => b.id === where.id) ?? null)
            : (store.financeBudget.find(
                (b) =>
                  b.tenantId === where.tenantId_financeYearId.tenantId &&
                  b.financeYearId === where.tenantId_financeYearId.financeYearId,
              ) ?? null);
        if (!budget || !include?.versions) return budget;
        return {
          ...budget,
          versions: store.financeBudgetVersion
            .filter((v) => v.budgetId === budget.id)
            .sort((a, b) => b.versionNumber - a.versionNumber)
            .map((v) => ({
              ...v,
              lines: store.financeBudgetLine.filter((l) => l.budgetVersionId === v.id),
            })),
        };
      },
      create: async ({ data, include }: { data: Record<string, unknown>; include?: unknown }) => {
        const budgetId = `budget-${store.financeBudget.length + 1}`;
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
        const budget = store.financeBudget.find((b) => b.id === budgetId)!;
        const versions = store.financeBudgetVersion.filter((v) => v.budgetId === budgetId);
        return include ? { ...budget, versions, financeYear: store.financeYear[0] } : budget;
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
      delete: async ({ where }: { where: { id: string } }) => {
        store.financeBudget = store.financeBudget.filter((b) => b.id !== where.id);
      },
    },
    financeBudgetVersion: {
      findUnique: async ({ where, include }: { where: { id: string }; include?: unknown }) => {
        const version = store.financeBudgetVersion.find((v) => v.id === where.id);
        if (!version || !include) return version ?? null;
        const budget = store.financeBudget.find((b) => b.id === version.budgetId)!;
        const budgetVersions = store.financeBudgetVersion
          .filter((v) => v.budgetId === budget.id)
          .map((v) => ({ id: v.id, status: v.status }));
        const lines = store.financeBudgetLine
          .filter((l) => l.budgetVersionId === version.id)
          .map((line) => ({
            ...line,
            financialAccount: store.financialAccount.find((a) => a.id === line.financialAccountId)!,
          }));
        return {
          ...version,
          budget: { ...budget, versions: budgetVersions },
          lines,
        };
      },
      findFirst: async () => null,
      create: async ({ data, include }: { data: Record<string, unknown>; include?: unknown }) => {
        versionSeq += 1;
        const versionId = `version-${versionSeq}`;
        const version = {
          id: versionId,
          budgetId: data.budgetId as string,
          status: data.status as "DRAFT" | "APPROVED",
          versionNumber: data.versionNumber as number,
          baseCurrency: null,
          approvedAt: null,
          approvedByUserId: null,
          createdByUserId: (data.createdByUserId as string) ?? null,
          createdAt: new Date(),
        };
        store.financeBudgetVersion.push(version);
        const linesCreate = (data.lines as { create: Array<Record<string, unknown>> } | undefined)
          ?.create;
        if (linesCreate) {
          for (const line of linesCreate) {
            lineSeq += 1;
            store.financeBudgetLine.push({
              id: `line-${lineSeq}`,
              budgetVersionId: versionId,
              financialAccountId: line.financialAccountId as string,
              amountMinor: line.amountMinor as number,
            });
          }
        }
        if (!include) return version;
        return {
          ...version,
          lines: store.financeBudgetLine.filter((l) => l.budgetVersionId === versionId),
        };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string; status?: "DRAFT" };
        data: Record<string, unknown>;
      }) => {
        const version = store.financeBudgetVersion.find((v) => v.id === where.id);
        if (!version) throw new Error("not found");
        if (where.status && version.status !== where.status) {
          throw new Error("FINANCE_BUDGET_IMMUTABLE");
        }
        Object.assign(version, data);
        return version;
      },
    },
    financeBudgetLine: {
      count: async ({ where }: { where: { budgetVersionId: string } }) =>
        store.financeBudgetLine.filter((l) => l.budgetVersionId === where.budgetVersionId).length,
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: {
          budgetVersionId_financialAccountId: {
            budgetVersionId: string;
            financialAccountId: string;
          };
        };
        create: Record<string, number | string>;
        update: { amountMinor: number };
      }) => {
        const existing = store.financeBudgetLine.find(
          (l) =>
            l.budgetVersionId ===
              where.budgetVersionId_financialAccountId.budgetVersionId &&
            l.financialAccountId ===
              where.budgetVersionId_financialAccountId.financialAccountId,
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
      findUnique: async () => null,
      delete: async () => ({ deleted: true }),
    },
    financialAccount: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financialAccount.find((a) => a.id === where.id) ?? null,
    },
    $transaction: async <T>(fn: (tx: typeof api) => Promise<T>) => fn(api),
  };
  return api;
}

describe("FIN-02B controlled re-baselining", () => {
  let store: Store;
  let db: ReturnType<typeof makeDb>;

  beforeEach(() => {
    store = {
      financeYear: [{ id: "year-1", tenantId: tenantA, name: "2026" }],
      financeConfiguration: [{ tenantId: tenantA, baseCurrency: "CHF" }],
      financeBudget: [],
      financeBudgetVersion: [],
      financeBudgetLine: [],
      financialAccount: [
        { id: "acc-inc", tenantId: tenantA, canonicalSemantic: "INCOME", lifecycle: "ACTIVE" },
        { id: "acc-exp", tenantId: tenantA, canonicalSemantic: "EXPENSE", lifecycle: "ACTIVE" },
      ],
    };
    db = makeDb(store);
  });

  async function seedApprovedBaseline() {
    const { workingVersion } = await getOrCreateDraftBudgetForYear(db, ctx(), "year-1");
    await upsertBudgetLine(db, ctx(), {
      budgetVersionId: workingVersion.id,
      financialAccountId: "acc-inc",
      amountMinor: 150_000_00,
    });
    await upsertBudgetLine(db, ctx(), {
      budgetVersionId: workingVersion.id,
      financialAccountId: "acc-exp",
      amountMinor: 75_000_00,
    });
    await approveBudgetVersion(db, ctx("approver-1"), workingVersion.id);
    return workingVersion.id;
  }

  it("sets current baseline pointer on first approval", async () => {
    const v1Id = await seedApprovedBaseline();
    const budget = store.financeBudget[0]!;
    expect(budget.currentBaselineVersionId).toBe(v1Id);
  });

  it("re-baselines working revision while preserving historical v1", async () => {
    const v1Id = await seedApprovedBaseline();
    const v1Before = structuredClone(store.financeBudgetVersion.find((v) => v.id === v1Id)!);
    const v1LinesBefore = structuredClone(
      store.financeBudgetLine.filter((l) => l.budgetVersionId === v1Id),
    );

    const { workingVersion: v2 } = await createWorkingBudgetRevision(db, ctx(), "year-1");
    await upsertBudgetLine(db, ctx(), {
      budgetVersionId: v2.id,
      financialAccountId: "acc-inc",
      amountMinor: 200_000_00,
    });
    await upsertBudgetLine(db, ctx(), {
      budgetVersionId: v2.id,
      financialAccountId: "acc-exp",
      amountMinor: 125_000_00,
    });

    const measureBefore = resolveApprovedBudgetMeasure({
      currentBaselineVersionId: store.financeBudget[0]!.currentBaselineVersionId,
      versions: store.financeBudgetVersion.map((v) => ({
        ...v,
        lines: store.financeBudgetLine.filter((l) => l.budgetVersionId === v.id),
      })),
    });
    expect(measureBefore?.budgetVersionId).toBe(v1Id);

    await approveBudgetVersion(db, ctx("approver-2"), v2.id);

    const v1After = store.financeBudgetVersion.find((v) => v.id === v1Id)!;
    expect(v1After.status).toBe("APPROVED");
    expect(v1After.approvedByUserId).toBe(v1Before.approvedByUserId);
    expect(v1After.baseCurrency).toBe(v1Before.baseCurrency);
    expect(store.financeBudgetLine.filter((l) => l.budgetVersionId === v1Id)).toEqual(v1LinesBefore);

    expect(store.financeBudget[0]!.currentBaselineVersionId).toBe(v2.id);

    const measureAfter = resolveApprovedBudgetMeasure({
      currentBaselineVersionId: store.financeBudget[0]!.currentBaselineVersionId,
      versions: store.financeBudgetVersion.map((v) => ({
        ...v,
        lines: store.financeBudgetLine.filter((l) => l.budgetVersionId === v.id),
      })),
    });
    expect(measureAfter?.budgetVersionId).toBe(v2.id);
    expect(measureAfter?.valuesByAccountId.get("acc-inc")).toBe(200_000_00);
    expect(measureAfter?.valuesByAccountId.get("acc-exp")).toBe(125_000_00);
  });

  it("changes reportingContextKey after re-baseline", async () => {
    const v1Id = await seedApprovedBaseline();
    const keyBefore = buildApprovedBudgetReportingContextKey({
      tenantId: tenantA,
      financeYearId: "year-1",
      budgetVersionId: v1Id,
    });
    const { workingVersion: v2 } = await createWorkingBudgetRevision(db, ctx(), "year-1");
    await upsertBudgetLine(db, ctx(), {
      budgetVersionId: v2.id,
      financialAccountId: "acc-inc",
      amountMinor: 1,
    });
    await approveBudgetVersion(db, ctx(), v2.id);
    const keyAfter = buildApprovedBudgetReportingContextKey({
      tenantId: tenantA,
      financeYearId: "year-1",
      budgetVersionId: v2.id,
    });
    expect(keyBefore).not.toBe(keyAfter);
  });

  it("rejects cross-tenant version approval", async () => {
    store.financeBudget.push({
      id: "b-other",
      tenantId: tenantB,
      financeYearId: "year-b",
      currentBaselineVersionId: null,
    });
    store.financeBudgetVersion.push({
      id: "v-other",
      budgetId: "b-other",
      status: "DRAFT",
      versionNumber: 1,
      baseCurrency: null,
      approvedAt: null,
      approvedByUserId: null,
      createdByUserId: null,
      createdAt: new Date(),
    });
    store.financeConfiguration.push({ tenantId: tenantB, baseCurrency: "CHF" });
    store.financeYear.push({ id: "year-b", tenantId: tenantB, name: "2026" });
    store.financialAccount.push({
      id: "acc-b",
      tenantId: tenantB,
      canonicalSemantic: "EXPENSE",
      lifecycle: "ACTIVE",
    });
    store.financeBudgetLine.push({
      id: "l-b",
      budgetVersionId: "v-other",
      financialAccountId: "acc-b",
      amountMinor: 1,
    });

    await expect(approveBudgetVersion(db, ctx(), "v-other")).rejects.toMatchObject({
      code: "FINANCE_CROSS_TENANT",
    });
  });

  it("rejects approving non-draft revision", async () => {
    const v1Id = await seedApprovedBaseline();
    await expect(approveBudgetVersion(db, ctx(), v1Id)).rejects.toMatchObject({
      code: "FINANCE_BUDGET_IMMUTABLE",
    });
  });

  it("resolves current baseline via pointer when multiple approved versions exist", () => {
    const resolved = resolveCurrentGovernanceBaselineVersion({
      currentBaselineVersionId: "v2",
      versions: [
        { id: "v1", status: "APPROVED" },
        { id: "v2", status: "APPROVED" },
      ],
    });
    expect(resolved?.id).toBe("v2");
  });

  it("does not guess when multiple approved versions exist without pointer", () => {
    const resolved = resolveCurrentGovernanceBaselineVersion({
      currentBaselineVersionId: null,
      versions: [
        { id: "v1", status: "APPROVED" },
        { id: "v2", status: "APPROVED" },
      ],
    });
    expect(resolved).toBeNull();
  });
});

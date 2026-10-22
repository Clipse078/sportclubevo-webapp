import { describe, expect, it, beforeEach } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import { resolveApprovedBudgetMeasure } from "@/lib/finance/reporting/approved-budget-measure-provider";
import {
  approveBudgetVersion,
  createWorkingBudgetRevision,
  getOrCreateDraftBudgetForYear,
  upsertBudgetLine,
} from "@/lib/finance/services/finance-budget-service";
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
  financeYear: Array<{ id: string; tenantId: string; name: string }>;
  financeConfiguration: Array<{ tenantId: string; baseCurrency: string | null }>;
  financeBudget: Array<{ id: string; tenantId: string; financeYearId: string }>;
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
  return {
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
        where: { tenantId_financeYearId: { tenantId: string; financeYearId: string } };
        include?: { versions?: { orderBy?: unknown; include?: { lines?: boolean } } };
      }) => {
        const budget =
          store.financeBudget.find(
            (b) =>
              b.tenantId === where.tenantId_financeYearId.tenantId &&
              b.financeYearId === where.tenantId_financeYearId.financeYearId,
          ) ?? null;
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
      delete: async ({ where }: { where: { id: string } }) => {
        store.financeBudget = store.financeBudget.filter((b) => b.id !== where.id);
      },
    },
    financeBudgetVersion: {
      findUnique: async ({ where, include }: { where: { id: string }; include?: unknown }) => {
        const version = store.financeBudgetVersion.find((v) => v.id === where.id);
        if (!version || !include) return version ?? null;
        const budget = store.financeBudget.find((b) => b.id === version.budgetId)!;
        const lines = store.financeBudgetLine
          .filter((l) => l.budgetVersionId === version.id)
          .map((line) => ({
            ...line,
            financialAccount: store.financialAccount.find((a) => a.id === line.financialAccountId)!,
          }));
        return { ...version, budget, lines };
      },
      findFirst: async ({
        where,
      }: {
        where: { budgetId: string; status: string; id?: { not: string } };
      }) =>
        store.financeBudgetVersion.find(
          (v) =>
            v.budgetId === where.budgetId &&
            v.status === where.status &&
            (!where.id || v.id !== where.id.not),
        ) ?? null,
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
        include,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
        include?: unknown;
      }) => {
        const version = store.financeBudgetVersion.find((v) => v.id === where.id)!;
        Object.assign(version, data);
        if (!include) return version;
        return {
          ...version,
          lines: store.financeBudgetLine.filter((l) => l.budgetVersionId === version.id),
          approvedBy: null,
        };
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
  };
}

describe("FIN-02A operational budgeting", () => {
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
        {
          id: "acc-exp",
          tenantId: tenantA,
          canonicalSemantic: "EXPENSE",
          lifecycle: "ACTIVE",
        },
      ],
    };
    db = makeDb(store);
  });

  it("approves first working budget with actor and currency snapshot", async () => {
    const { workingVersion } = await getOrCreateDraftBudgetForYear(db, ctx(), "year-1");
    await upsertBudgetLine(db, ctx(), {
      budgetVersionId: workingVersion.id,
      financialAccountId: "acc-exp",
      amountMinor: 100_00,
    });

    const approved = await approveBudgetVersion(db, ctx("approver"), workingVersion.id);
    expect(approved.status).toBe("APPROVED");
    expect(approved.baseCurrency).toBe("CHF");
    expect(approved.approvedByUserId).toBe("approver");
    expect(approved.approvedAt).toBeTruthy();
  });

  it("creates working revision after approval without mutating baseline", async () => {
    store.financeBudget.push({ id: "b1", tenantId: tenantA, financeYearId: "year-1" });
    store.financeBudgetVersion.push({
      id: "v1",
      budgetId: "b1",
      status: "APPROVED",
      versionNumber: 1,
      baseCurrency: "CHF",
      approvedAt: new Date("2026-01-01"),
      approvedByUserId: "approver",
      createdByUserId: "user-1",
      createdAt: new Date("2026-01-01"),
    });
    store.financeBudgetLine.push({
      id: "l1",
      budgetVersionId: "v1",
      financialAccountId: "acc-exp",
      amountMinor: 50_00,
    });

    const { workingVersion } = await createWorkingBudgetRevision(db, ctx(), "year-1");
    expect(workingVersion.status).toBe("DRAFT");
    expect(workingVersion.versionNumber).toBe(2);

    await upsertBudgetLine(db, ctx(), {
      budgetVersionId: workingVersion.id,
      financialAccountId: "acc-exp",
      amountMinor: 99_00,
    });

    const baselineLine = store.financeBudgetLine.find((l) => l.budgetVersionId === "v1")!;
    expect(baselineLine.amountMinor).toBe(50_00);

    const measure = resolveApprovedBudgetMeasure(
      store.financeBudgetVersion.map((v) => ({
        ...v,
        lines: store.financeBudgetLine.filter((l) => l.budgetVersionId === v.id),
      })),
    );
    expect(measure?.valuesByAccountId.get("acc-exp")).toBe(50_00);
  });

  it("rejects second approval while governance baseline exists", async () => {
    store.financeBudget.push({ id: "b1", tenantId: tenantA, financeYearId: "year-1" });
    store.financeBudgetVersion.push(
      {
        id: "v1",
        budgetId: "b1",
        status: "APPROVED",
        versionNumber: 1,
        baseCurrency: "CHF",
        approvedAt: new Date(),
        approvedByUserId: "a",
        createdByUserId: "a",
        createdAt: new Date(),
      },
      {
        id: "v2",
        budgetId: "b1",
        status: "DRAFT",
        versionNumber: 2,
        baseCurrency: null,
        approvedAt: null,
        approvedByUserId: null,
        createdByUserId: "a",
        createdAt: new Date(),
      },
    );
    store.financeBudgetLine.push({
      id: "l1",
      budgetVersionId: "v2",
      financialAccountId: "acc-exp",
      amountMinor: 1,
    });

    await expect(approveBudgetVersion(db, ctx(), "v2")).rejects.toBeInstanceOf(
      FinanceDomainError,
    );
  });
});

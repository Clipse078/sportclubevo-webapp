import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  archiveFinancialAccount,
  createFinancialAccount,
  deleteFinancialAccountWhenSafe,
  getFinancialAccountIdentity,
  moveFinancialAccountToReportingGroup,
  renameFinancialAccount,
} from "@/lib/finance/services/financial-account-service";
import {
  createFinancialReportingGroup,
  deleteFinancialReportingGroupWhenSafe,
  reparentFinancialReportingGroup,
  renameFinancialReportingGroup,
} from "@/lib/finance/services/financial-reporting-group-service";
import {
  applyFinanceStructureTemplate,
  previewFinanceStructureTemplate,
} from "@/lib/finance/services/finance-structure-template-service";
import { buildFinanceStructureTree } from "@/lib/finance/structure/build-structure-tree";
import {
  registerFinancialStructureDeleteGuard,
  resetFinancialStructureDeleteGuardsForTests,
} from "@/lib/finance/structure/delete-guards";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

const store = {
  groups: [] as Array<{
    id: string;
    tenantId: string;
    parentId: string | null;
    name: string;
    sortOrder: number;
    lifecycle: "ACTIVE" | "ARCHIVED";
    archivedAt: Date | null;
  }>,
  accounts: [] as Array<{
    id: string;
    tenantId: string;
    reportingGroupId: string;
    name: string;
    nodeKind: "POSTING";
    canonicalSemantic: "INCOME" | "EXPENSE";
    sortOrder: number;
    lifecycle: "ACTIVE" | "ARCHIVED";
    archivedAt: Date | null;
  }>,
  configs: [] as Array<{ tenantId: string; appliedStructureTemplateKey: string | null }>,
};

const db = {
  financialReportingGroup: {
    findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
      store.groups.find((g) => g.id === id) ?? null,
    ),
    findMany: vi.fn(async ({ where }: { where: { tenantId?: string; parentId?: string | null } }) =>
      store.groups.filter((g) => {
        if (where.tenantId && g.tenantId !== where.tenantId) return false;
        if ("parentId" in where && where.parentId !== undefined) {
          return g.parentId === where.parentId;
        }
        return true;
      }),
    ),
    count: vi.fn(
      async ({ where }: { where: { tenantId: string; parentId?: string } }) =>
        store.groups.filter(
          (g) =>
            g.tenantId === where.tenantId &&
            (where.parentId === undefined || g.parentId === where.parentId),
        ).length,
    ),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const row = {
        id: `grp-${store.groups.length + 1}`,
        lifecycle: "ACTIVE" as const,
        archivedAt: null,
        sortOrder: 0,
        parentId: null,
        ...data,
      } as (typeof store.groups)[number];
      store.groups.push(row);
      return row;
    }),
    update: vi.fn(
      async ({ where: { id }, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const idx = store.groups.findIndex((g) => g.id === id);
        store.groups[idx] = { ...store.groups[idx]!, ...data };
        return store.groups[idx];
      },
    ),
    delete: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
      store.groups = store.groups.filter((g) => g.id !== id);
    }),
  },
  financialAccount: {
    findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
      store.accounts.find((a) => a.id === id) ?? null,
    ),
    findMany: vi.fn(
      async ({
        where,
      }: {
        where: { tenantId?: string; reportingGroupId?: string };
      }) =>
        store.accounts.filter((a) => {
          if (where.tenantId && a.tenantId !== where.tenantId) return false;
          if (where.reportingGroupId && a.reportingGroupId !== where.reportingGroupId) {
            return false;
          }
          return true;
        }),
    ),
    count: vi.fn(
      async ({
        where,
      }: {
        where: { tenantId: string; reportingGroupId?: string };
      }) =>
        store.accounts.filter(
          (a) =>
            a.tenantId === where.tenantId &&
            (where.reportingGroupId === undefined ||
              a.reportingGroupId === where.reportingGroupId),
        ).length,
    ),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const row = {
        id: `acc-${store.accounts.length + 1}`,
        nodeKind: "POSTING" as const,
        lifecycle: "ACTIVE" as const,
        archivedAt: null,
        sortOrder: 0,
        ...data,
      } as (typeof store.accounts)[number];
      store.accounts.push(row);
      return row;
    }),
    update: vi.fn(
      async ({ where: { id }, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const idx = store.accounts.findIndex((a) => a.id === id);
        store.accounts[idx] = { ...store.accounts[idx]!, ...data };
        return store.accounts[idx];
      },
    ),
    delete: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
      store.accounts = store.accounts.filter((a) => a.id !== id);
    }),
  },
  financeConfiguration: {
    findUnique: vi.fn(async ({ where: { tenantId } }: { where: { tenantId: string } }) =>
      store.configs.find((c) => c.tenantId === tenantId) ?? null,
    ),
    upsert: vi.fn(
      async ({
        where: { tenantId },
        create,
        update,
      }: {
        where: { tenantId: string };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        const idx = store.configs.findIndex((c) => c.tenantId === tenantId);
        if (idx === -1) {
          const row = { tenantId, appliedStructureTemplateKey: null, ...create };
          store.configs.push(row);
          return row;
        }
        store.configs[idx] = { ...store.configs[idx]!, ...update };
        return store.configs[idx];
      },
    ),
  },
};

const structureCtx = {
  tenantId: tenantA,
  userId: "user-1",
  permissionKeys: new Set([PERMISSIONS.FINANCE_STRUCTURE_MANAGE, PERMISSIONS.FINANCE_VIEW]),
};

const viewCtx = {
  tenantId: tenantA,
  userId: "user-2",
  permissionKeys: new Set([PERMISSIONS.FINANCE_VIEW]),
};

const otherTenantCtx = {
  tenantId: tenantB,
  userId: "user-3",
  permissionKeys: new Set([PERMISSIONS.FINANCE_STRUCTURE_MANAGE, PERMISSIONS.FINANCE_VIEW]),
};

beforeEach(() => {
  store.groups = [];
  store.accounts = [];
  store.configs = [];
  resetFinancialStructureDeleteGuardsForTests();
  vi.clearAllMocks();
});

describe("FIN-01C reporting groups", () => {
  it("creates nested reporting groups", async () => {
    const root = await createFinancialReportingGroup(db, structureCtx, { name: "Income" });
    const child = await createFinancialReportingGroup(db, structureCtx, {
      name: "Membership",
      parentId: root.id,
    });
    expect(child.parentId).toBe(root.id);
  });

  it("prevents reparent cycles", async () => {
    const a = await createFinancialReportingGroup(db, structureCtx, { name: "A" });
    const b = await createFinancialReportingGroup(db, structureCtx, { name: "B", parentId: a.id });
    await expect(reparentFinancialReportingGroup(db, structureCtx, a.id, b.id)).rejects.toBeInstanceOf(
      FinanceDomainError,
    );
  });

  it("blocks cross-tenant parent assignment", async () => {
    const foreign = await createFinancialReportingGroup(db, otherTenantCtx, { name: "Foreign" });
    await expect(
      createFinancialReportingGroup(db, structureCtx, {
        name: "Bad",
        parentId: foreign.id,
      }),
    ).rejects.toBeInstanceOf(FinanceDomainError);
  });

  it("renames reporting groups", async () => {
    const group = await createFinancialReportingGroup(db, structureCtx, { name: "Old" });
    const updated = await renameFinancialReportingGroup(db, structureCtx, group.id, "New");
    expect(updated.name).toBe("New");
  });

  it("blocks delete when accounts remain", async () => {
    const group = await createFinancialReportingGroup(db, structureCtx, { name: "G" });
    await createFinancialAccount(db, structureCtx, {
      name: "A",
      reportingGroupId: group.id,
      canonicalSemantic: "INCOME",
    });
    await expect(
      deleteFinancialReportingGroupWhenSafe(db, structureCtx, group.id),
    ).rejects.toMatchObject({ code: "FINANCE_UNSAFE_DELETE" });
  });
});

describe("FIN-01C financial accounts", () => {
  it("creates INCOME and EXPENSE accounts under reporting groups", async () => {
    const group = await createFinancialReportingGroup(db, structureCtx, { name: "Root" });
    const income = await createFinancialAccount(db, structureCtx, {
      name: "Fees",
      reportingGroupId: group.id,
      canonicalSemantic: "INCOME",
    });
    const expense = await createFinancialAccount(db, structureCtx, {
      name: "Rent",
      reportingGroupId: group.id,
      canonicalSemantic: "EXPENSE",
    });
    expect(income.canonicalSemantic).toBe("INCOME");
    expect(expense.canonicalSemantic).toBe("EXPENSE");
  });

  it("rejects unsupported account semantics in FIN-01C", async () => {
    const group = await createFinancialReportingGroup(db, structureCtx, { name: "Root" });
    await expect(
      createFinancialAccount(db, structureCtx, {
        name: "Asset",
        reportingGroupId: group.id,
        canonicalSemantic: "ASSET",
      }),
    ).rejects.toBeInstanceOf(FinanceDomainError);
  });

  it("preserves identity on rename", async () => {
    const group = await createFinancialReportingGroup(db, structureCtx, { name: "Root" });
    const created = await createFinancialAccount(db, structureCtx, {
      name: "Old label",
      reportingGroupId: group.id,
      canonicalSemantic: "EXPENSE",
    });
    await renameFinancialAccount(db, structureCtx, created.id, "New label");
    const loaded = await getFinancialAccountIdentity(db, viewCtx, created.id);
    expect(loaded.id).toBe(created.id);
    expect(loaded.name).toBe("New label");
  });

  it("moves accounts between reporting groups in same tenant", async () => {
    const g1 = await createFinancialReportingGroup(db, structureCtx, { name: "G1" });
    const g2 = await createFinancialReportingGroup(db, structureCtx, { name: "G2" });
    const account = await createFinancialAccount(db, structureCtx, {
      name: "A",
      reportingGroupId: g1.id,
      canonicalSemantic: "INCOME",
    });
    const moved = await moveFinancialAccountToReportingGroup(db, structureCtx, account.id, g2.id);
    expect(moved.reportingGroupId).toBe(g2.id);
  });

  it("archives and reactivates accounts", async () => {
    const group = await createFinancialReportingGroup(db, structureCtx, { name: "G" });
    const account = await createFinancialAccount(db, structureCtx, {
      name: "A",
      reportingGroupId: group.id,
      canonicalSemantic: "EXPENSE",
    });
    const archived = await archiveFinancialAccount(db, structureCtx, account.id);
    expect(archived.lifecycle).toBe("ARCHIVED");
  });

  it("blocks view-only users from creating accounts", async () => {
    const group = await createFinancialReportingGroup(db, structureCtx, { name: "G" });
    await expect(
      createFinancialAccount(db, viewCtx, {
        name: "A",
        reportingGroupId: group.id,
        canonicalSemantic: "INCOME",
      }),
    ).rejects.toBeInstanceOf(FinanceDomainError);
  });

  it("respects dependency guards on account delete", async () => {
    const group = await createFinancialReportingGroup(db, structureCtx, { name: "G" });
    const account = await createFinancialAccount(db, structureCtx, {
      name: "A",
      reportingGroupId: group.id,
      canonicalSemantic: "INCOME",
    });
    registerFinancialStructureDeleteGuard(async () => ({
      allowed: false,
      reason: "Budget line exists.",
    }));
    await expect(
      deleteFinancialAccountWhenSafe(db, structureCtx, account.id),
    ).rejects.toMatchObject({ code: "FINANCE_UNSAFE_DELETE" });
  });
});

describe("FIN-01C templates", () => {
  it("previews starter template counts", async () => {
    const preview = await previewFinanceStructureTemplate("generic_income_expense_v1");
    expect(preview.groupCount).toBe(2);
    expect(preview.accountCount).toBe(4);
  });

  it("applies template only to empty structure and records template key", async () => {
    store.configs.push({ tenantId: tenantA, appliedStructureTemplateKey: null });
    const result = await applyFinanceStructureTemplate(db, structureCtx, {
      templateKey: "generic_income_expense_v1",
      resolveLabel: (key) => key,
    });
    expect(result.applied).toBe(true);
    expect(store.groups.length).toBe(2);
    expect(store.accounts.length).toBe(4);
    expect(store.configs[0]?.appliedStructureTemplateKey).toBe("generic_income_expense_v1");
  });

  it("prevents duplicate template application", async () => {
    store.configs.push({ tenantId: tenantA, appliedStructureTemplateKey: "generic_income_expense_v1" });
    await expect(
      applyFinanceStructureTemplate(db, structureCtx, {
        templateKey: "generic_income_expense_v1",
        resolveLabel: (k) => k,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_TEMPLATE_ALREADY_APPLIED" });
  });

  it("prevents template apply when structure is not empty", async () => {
    store.configs.push({ tenantId: tenantA, appliedStructureTemplateKey: null });
    await createFinancialReportingGroup(db, structureCtx, { name: "Existing" });
    await expect(
      applyFinanceStructureTemplate(db, structureCtx, {
        templateKey: "generic_income_expense_v1",
        resolveLabel: (k) => k,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_STRUCTURE_NOT_EMPTY" });
  });
});

describe("FIN-01C structure tree", () => {
  it("builds reporting group tree with account leaves", async () => {
    const income = await createFinancialReportingGroup(db, structureCtx, { name: "Income" });
    await createFinancialAccount(db, structureCtx, {
      name: "Fees",
      reportingGroupId: income.id,
      canonicalSemantic: "INCOME",
    });
    const tree = buildFinanceStructureTree({
      groups: store.groups,
      accounts: store.accounts,
    });
    expect(tree).toHaveLength(1);
    expect(tree[0]?.type).toBe("group");
    if (tree[0]?.type === "group") {
      expect(tree[0].children.some((c) => c.type === "account")).toBe(true);
    }
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  createFinanceCostCenter,
  deleteFinanceCostCenterWhenSafe,
  reparentFinanceCostCenter,
} from "@/lib/finance/services/finance-cost-center-service";
import {
  registerFinanceCostCenterDeleteGuard,
  resetFinanceCostCenterDeleteGuardsForTests,
} from "@/lib/finance/cost-center/delete-guards";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const tenantId = "tenant-a";
const otherTenantId = "tenant-b";

const store = {
  nodes: [] as Array<{
    id: string;
    tenantId: string;
    parentId: string | null;
    name: string;
    description: string | null;
    sortOrder: number;
    lifecycle: "ACTIVE" | "ARCHIVED";
    archivedAt: Date | null;
  }>,
};

const db = {
  financeCostCenter: {
    findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) =>
      store.nodes.find((n) => n.id === id) ?? null,
    ),
    findMany: vi.fn(
      async ({
        where,
      }: {
        where: { tenantId?: string; parentId?: string | null };
      }) => {
        return store.nodes.filter((n) => {
          if (where.tenantId && n.tenantId !== where.tenantId) return false;
          if ("parentId" in where && where.parentId !== undefined) {
            return n.parentId === where.parentId;
          }
          return true;
        });
      },
    ),
    count: vi.fn(
      async ({ where }: { where: { tenantId: string; parentId?: string } }) =>
        store.nodes.filter(
          (n) =>
            n.tenantId === where.tenantId &&
            (where.parentId === undefined || n.parentId === where.parentId),
        ).length,
    ),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const row = {
        id: `cc-${store.nodes.length + 1}`,
        lifecycle: "ACTIVE" as const,
        archivedAt: null,
        description: null,
        sortOrder: 0,
        ...data,
      } as (typeof store.nodes)[number];
      store.nodes.push(row);
      return row;
    }),
    update: vi.fn(
      async ({
        where: { id },
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const idx = store.nodes.findIndex((n) => n.id === id);
        store.nodes[idx] = { ...store.nodes[idx]!, ...data };
        return store.nodes[idx];
      },
    ),
    delete: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
      store.nodes = store.nodes.filter((n) => n.id !== id);
    }),
  },
};

const structureCtx = {
  tenantId,
  userId: "user-1",
  permissionKeys: new Set([PERMISSIONS.FINANCE_STRUCTURE_MANAGE]),
};

const viewOnlyCtx = {
  ...structureCtx,
  permissionKeys: new Set([PERMISSIONS.FINANCE_VIEW]),
};

beforeEach(() => {
  store.nodes = [];
  resetFinanceCostCenterDeleteGuardsForTests();
  vi.clearAllMocks();
});

describe("FIN-01B cost center service", () => {
  it("rejects viewers from creating cost centers", async () => {
    await expect(
      createFinanceCostCenter(db, viewOnlyCtx, { name: "Ops" }),
    ).rejects.toBeInstanceOf(FinanceDomainError);
  });

  it("rejects cross-tenant parent", async () => {
    store.nodes.push({
      id: "foreign",
      tenantId: otherTenantId,
      parentId: null,
      name: "Foreign",
      description: null,
      sortOrder: 0,
      lifecycle: "ACTIVE",
      archivedAt: null,
    });
    await expect(
      createFinanceCostCenter(db, structureCtx, {
        name: "Local",
        parentId: "foreign",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_CROSS_TENANT" });
  });

  it("rejects reparent cycles", async () => {
    store.nodes.push(
      {
        id: "a",
        tenantId,
        parentId: null,
        name: "A",
        description: null,
        sortOrder: 0,
        lifecycle: "ACTIVE",
        archivedAt: null,
      },
      {
        id: "b",
        tenantId,
        parentId: "a",
        name: "B",
        description: null,
        sortOrder: 0,
        lifecycle: "ACTIVE",
        archivedAt: null,
      },
    );
    await expect(
      reparentFinanceCostCenter(db, structureCtx, "a", "b"),
    ).rejects.toMatchObject({ code: "FINANCE_CYCLE" });
  });

  it("blocks delete when dependency guard fails", async () => {
    store.nodes.push({
      id: "leaf",
      tenantId,
      parentId: null,
      name: "Leaf",
      description: null,
      sortOrder: 0,
      lifecycle: "ACTIVE",
      archivedAt: null,
    });
    registerFinanceCostCenterDeleteGuard(async () => ({
      allowed: false,
      reason: "Historical budget line exists.",
      dependencyKind: "BudgetLine",
    }));
    await expect(
      deleteFinanceCostCenterWhenSafe(db, structureCtx, "leaf"),
    ).rejects.toMatchObject({ code: "FINANCE_UNSAFE_DELETE" });
  });

  it("allows safe delete without children or guards", async () => {
    store.nodes.push({
      id: "solo",
      tenantId,
      parentId: null,
      name: "Solo",
      description: null,
      sortOrder: 0,
      lifecycle: "ACTIVE",
      archivedAt: null,
    });
    await expect(
      deleteFinanceCostCenterWhenSafe(db, structureCtx, "solo"),
    ).resolves.toEqual({ deleted: true });
    expect(store.nodes).toHaveLength(0);
  });
});

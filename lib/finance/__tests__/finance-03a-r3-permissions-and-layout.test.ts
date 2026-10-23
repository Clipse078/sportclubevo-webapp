import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { FinanceDomainError } from "@/lib/finance/errors";
import { canManageActuals, requireFinanceActualManage } from "@/lib/finance/finance-authorization";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  createFinanceActualEntry,
  deleteFinanceActualEntry,
  updateFinanceActualEntry,
} from "@/lib/finance/services/finance-actual-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TENANT_CLUB_ADMIN_DELEGATION_REGRESSION_KEYS } from "@/lib/permissions/tenant-club-admin-permission-contract";
import { FINANCE_ACTUALS_BOOKINGS_TABLE_CLASS } from "@/lib/finance/presentation/finance-actuals-bookings-table-layout";
import { FINANCE_VARIANCE_COMPARISON_TABLE_CLASS } from "@/lib/finance/presentation/finance-variance-comparison-table-layout";

function ctx(permissions: string[]): FinanceAuthContext {
  return {
    tenantId: "tenant-a",
    userId: "user-1",
    permissionKeys: new Set(permissions),
  };
}

describe("FIN-03A-R3 actual manage authorization", () => {
  it("grants manage via finance.actual.manage", () => {
    expect(canManageActuals(ctx([PERMISSIONS.FINANCE_ACTUAL_MANAGE]))).toBe(true);
  });

  it("grants manage via finance.admin (Club Admin finance administration)", () => {
    expect(canManageActuals(ctx([PERMISSIONS.FINANCE_ADMIN]))).toBe(true);
  });

  it("denies manage for view-only actual permission", () => {
    expect(canManageActuals(ctx([PERMISSIONS.FINANCE_ACTUAL_VIEW]))).toBe(false);
  });

  it("requireFinanceActualManage throws when neither manage nor admin", () => {
    expect(() => requireFinanceActualManage(ctx([PERMISSIONS.FINANCE_ACTUAL_VIEW]))).toThrow(
      FinanceDomainError,
    );
  });
});

describe("FIN-03A-R3 Club Admin contract regression keys", () => {
  it("includes finance.actual.view and finance.actual.manage", () => {
    expect(TENANT_CLUB_ADMIN_DELEGATION_REGRESSION_KEYS).toContain(
      PERMISSIONS.FINANCE_ACTUAL_VIEW,
    );
    expect(TENANT_CLUB_ADMIN_DELEGATION_REGRESSION_KEYS).toContain(
      PERMISSIONS.FINANCE_ACTUAL_MANAGE,
    );
  });
});

describe("FIN-03A-R3 server CRUD guards", () => {
  const store = {
    financeYear: [
      {
        id: "year-1",
        tenantId: "tenant-a",
        name: "FY 2026",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-12-31T00:00:00.000Z"),
      },
    ],
    financeConfiguration: [{ tenantId: "tenant-a", baseCurrency: "CHF" }],
    financialAccount: [
      {
        id: "acc-income",
        tenantId: "tenant-a",
        name: "Membership",
        canonicalSemantic: "INCOME" as const,
        lifecycle: "ACTIVE" as const,
      },
    ],
    financeActualEntry: [] as Array<{
      id: string;
      tenantId: string;
      financeYearId: string;
      financialAccountId: string;
      effectiveDate: Date;
      amountMinor: number;
      currency: string;
      description: string | null;
      source: "MANUAL";
      createdByUserId: string | null;
      updatedByUserId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>,
    financeBudget: [],
    financeBudgetVersion: [],
  };

  const db = {
    financeYear: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financeYear.find((y) => y.id === where.id) ?? null,
    },
    financeConfiguration: {
      findUnique: async ({ where }: { where: { tenantId: string } }) =>
        store.financeConfiguration.find((c) => c.tenantId === where.tenantId) ?? null,
    },
    financialAccount: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financialAccount.find((a) => a.id === where.id) ?? null,
    },
    financeActualEntry: {
      create: async ({ data }: { data: (typeof store.financeActualEntry)[number] }) => {
        const row = { ...data, id: "actual-1", createdAt: new Date(), updatedAt: new Date() };
        store.financeActualEntry.push(row);
        return row;
      },
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financeActualEntry.find((e) => e.id === where.id) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<(typeof store.financeActualEntry)[number]>;
      }) => {
        const row = store.financeActualEntry.find((e) => e.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        store.financeActualEntry.splice(
          store.financeActualEntry.findIndex((e) => e.id === where.id),
          1,
        );
      },
      count: async () => 0,
    },
    financeBudget: { findUnique: async () => null },
    financeBudgetVersion: { findUnique: async () => null },
    financeBudgetLine: { count: async () => 0 },
    financialReportingGroup: { findMany: async () => [] },
  };

  it("denies create/edit/delete without manage permission", async () => {
    const viewOnly = ctx([PERMISSIONS.FINANCE_ACTUAL_VIEW]);
    await expect(
      createFinanceActualEntry(db, viewOnly, {
        financeYearId: "year-1",
        financialAccountId: "acc-income",
        effectiveDate: "2026-03-15",
        amountMinor: 100,
        currency: "CHF",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORBIDDEN" });

    store.financeActualEntry.push({
      id: "existing",
      tenantId: "tenant-a",
      financeYearId: "year-1",
      financialAccountId: "acc-income",
      effectiveDate: new Date("2026-03-15"),
      amountMinor: 100,
      currency: "CHF",
      description: null,
      source: "MANUAL",
      createdByUserId: null,
      updatedByUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      updateFinanceActualEntry(db, viewOnly, "existing", { amountMinor: 200 }),
    ).rejects.toMatchObject({ code: "FINANCE_FORBIDDEN" });
    await expect(deleteFinanceActualEntry(db, viewOnly, "existing")).rejects.toMatchObject({
      code: "FINANCE_FORBIDDEN",
    });
  });

  it("allows create with finance.admin", async () => {
    store.financeActualEntry.length = 0;
    const row = await createFinanceActualEntry(db, ctx([PERMISSIONS.FINANCE_ADMIN]), {
      financeYearId: "year-1",
      financialAccountId: "acc-income",
      effectiveDate: "2026-03-15",
      amountMinor: 100,
      currency: "CHF",
    });
    expect(row.amountMinor).toBe(100);
  });
});

describe("FIN-03A-R3 shared variance comparison table layout", () => {
  const panel = readFileSync(
    join(process.cwd(), "components/admin/finance/FinanceActualsWorkspacePanel.tsx"),
    "utf8",
  );
  const layout = readFileSync(
    join(
      process.cwd(),
      "lib/finance/presentation/finance-variance-comparison-table-layout.tsx",
    ),
    "utf8",
  );
  const de = readFileSync(join(process.cwd(), "messages/de.json"), "utf8");

  it("uses one shared column definition for Einnahmen and Ausgaben tables", () => {
    expect(layout).toContain("FinanceVarianceComparisonColGroup");
    expect(layout).toContain(FINANCE_VARIANCE_COMPARISON_TABLE_CLASS);
    expect(panel).toContain("finance-variance-comparison-table-layout");
    expect(panel.match(/FinanceVarianceComparisonColGroup mode=/g)?.length).toBe(1);
    expect(panel).toContain("FINANCE_VARIANCE_COMPARISON_TABLE_CLASS");
    expect(panel.match(/data-finance-variance-comparison-table/g)?.length).toBe(1);
    expect(panel).toContain("data-finance-variance-comparison-table");
  });

  it("renders German Abweichung label, not Delta", () => {
    expect(de).toContain('"deltaColumn": "Abweichung"');
    expect(de).not.toContain('"deltaColumn": "Delta"');
  });

  it("account picker uses semantic suffix without separate type selector", () => {
    expect(panel).toContain(" · ");
    expect(panel).not.toMatch(/type="radio"/);
    expect(panel).not.toMatch(/canonicalSemantic.*select/i);
  });
});

describe("FIN-03A-R4 Ist-Buchungen table layout and create deduplication", () => {
  const panel = readFileSync(
    join(process.cwd(), "components/admin/finance/FinanceActualsWorkspacePanel.tsx"),
    "utf8",
  );
  const bookingsLayout = readFileSync(
    join(
      process.cwd(),
      "lib/finance/presentation/finance-actuals-bookings-table-layout.tsx",
    ),
    "utf8",
  );

  it("defines stable six-column geometry for Datum through Aktionen", () => {
    expect(bookingsLayout).toContain("FinanceActualsBookingsColGroup");
    expect(bookingsLayout).toContain("WITH_ACTIONS");
    expect(bookingsLayout).toContain("VIEW_ONLY");
    expect(bookingsLayout).toContain("tabular-nums");
    expect(bookingsLayout).toContain(FINANCE_ACTUALS_BOOKINGS_TABLE_CLASS);
  });

  it("panel consumes one bookings colgroup for header and body", () => {
    expect(panel).toContain("finance-actuals-bookings-table-layout");
    expect(panel.match(/FinanceActualsBookingsColGroup/g)?.length).toBe(1);
    expect(panel).toContain("data-finance-actuals-bookings-table");
  });

  it("retains single toolbar create action only", () => {
    expect(panel.match(/data-finance-actual-create/g)?.length).toBe(1);
    expect(panel).not.toContain("data-finance-actual-create-entries");
  });
});

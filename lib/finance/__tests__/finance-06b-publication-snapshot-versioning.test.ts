import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { FinanceDomainError } from "@/lib/finance/errors";
import { buildFinanceManagementPnlReadModel } from "@/lib/finance/reporting/build-finance-management-pnl-read-model";
import { buildFinancePublicationSnapshotV1 } from "@/lib/finance/publishing/build-finance-publication-snapshot-v1";
import { FINANCE_PUBLICATION_SNAPSHOT_SCHEMA_VERSION } from "@/lib/finance/publishing/finance-publication-reporting-semantic-version";
import {
  canPublishFinancialReports,
  canShareFinancialReports,
} from "@/lib/finance/publishing/finance-publishing-authorization";
import { defaultManagementPnlPublicationScope } from "@/lib/finance/publishing/finance-publication-scope";
import { assertPublishedPublicationVersionImmutable } from "@/lib/finance/publishing/finance-publication-lifecycle";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import * as managementReporting from "@/lib/finance/services/finance-management-reporting-query-service";
import {
  assertFinancePublicationVersionNotMutated,
  loadFinancePublicationVersionSnapshot,
  publishFinanceManagementPnlSnapshot,
} from "@/lib/finance/services/finance-publication-service";
import {
  createPublicationMockStore,
  makePublicationMockPrisma,
} from "@/lib/finance/__tests__/finance-06b-publication-mock-db";

const tenantA = "tenant-a";
const tenantB = "tenant-b";
const yearId = "fy-2026";

function ctx(tenantId: string, permissions: string[]): FinanceAuthContext {
  return { tenantId, userId: "user-1", permissionKeys: new Set(permissions) };
}

const publishPerms = [
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FINANCE_PUBLICATION_VIEW,
  PERMISSIONS.FINANCE_REPORTING_PUBLISH,
];

const viewOnly = [PERMISSIONS.FINANCE_VIEW, PERMISSIONS.FINANCE_PUBLICATION_VIEW];
const shareOnly = [
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FINANCE_PUBLICATION_VIEW,
  PERMISSIONS.FINANCE_REPORTING_SHARE,
];

function basePnlModel(forecastIncome = 200_00, forecastExpense = 80_00) {
  const groups = [
    {
      id: "g1",
      tenantId: tenantA,
      name: "Operations",
      parentId: null,
      sortOrder: 0,
      lifecycle: "ACTIVE" as const,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const accounts = [
    {
      id: "acc-i",
      tenantId: tenantA,
      reportingGroupId: "g1",
      name: "Income",
      sortOrder: 0,
      lifecycle: "ACTIVE" as const,
      archivedAt: null,
      canonicalSemantic: "INCOME" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "acc-e",
      tenantId: tenantA,
      reportingGroupId: "g1",
      name: "Expense",
      sortOrder: 1,
      lifecycle: "ACTIVE" as const,
      archivedAt: null,
      canonicalSemantic: "EXPENSE" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const budgetMap = new Map([
    ["acc-i", 180_00],
    ["acc-e", 90_00],
  ]);
  const actualMap = new Map([
    ["acc-i", 170_00],
    ["acc-e", 85_00],
  ]);
  const forecastMap = new Map([
    ["acc-i", forecastIncome],
    ["acc-e", forecastExpense],
  ]);

  return buildFinanceManagementPnlReadModel({
    tenantId: tenantA,
    financeYearId: yearId,
    financeYearName: "FY2026",
    baseCurrency: "EUR",
    structureAvailability: "AVAILABLE",
    actualCutoffDate: null,
    groups,
    accounts,
    approvedMeasure: {
      measure: "APPROVED_BUDGET",
      budgetVersionId: "bv1",
      approvedAt: new Date(),
      baseCurrency: "EUR",
      valuesByAccountId: budgetMap,
    },
    actualMeasure: {
      measure: "ACTUAL",
      grain: "ANNUAL_FULL_YEAR",
      cutoffDate: null,
      valuesByAccountId: actualMap,
    },
    forecastMeasure: {
      measure: "CURRENT_FORECAST",
      forecastVersionId: "fv1",
      forecastId: "f1",
      valuesByAccountId: forecastMap,
    },
    sourceVisibility: { approvedBudget: true, actual: true, currentForecast: true },
  });
}

function setupMockDb() {
  const store = createPublicationMockStore();
  store.financeYear.push({ id: yearId, tenantId: tenantA, name: "FY2026" });
  store.financeYear.push({ id: "fy-b", tenantId: tenantB, name: "FY2026-B" });
  const prisma = makePublicationMockPrisma(store);
  return { store, prisma };
}

describe("FIN-06B publication snapshot & versioning", () => {
  it("captures canonical Management P&L snapshot payload", () => {
    const model = basePnlModel();
    const snapshot = buildFinancePublicationSnapshotV1({
      publicationId: "pub-1",
      publicationVersion: 1,
      title: "FY2026 P&L",
      reportingScope: defaultManagementPnlPublicationScope(yearId),
      audienceClass: "INTERNAL_AUTHENTICATED",
      publisherUserId: "user-1",
      publishedAt: new Date("2026-10-25T12:00:00.000Z"),
      pnlReadModel: model,
    });
    expect(snapshot.schemaVersion).toBe(FINANCE_PUBLICATION_SNAPSHOT_SCHEMA_VERSION);
    expect(snapshot.currencyCode).toBe("EUR");
    expect(snapshot.renderedReportingSemanticPayload.kind).toBe("MANAGEMENT_PNL");
    expect(snapshot.totals.resultMinor).toBe(120_00);
  });

  it("persists V1 and keeps it unchanged after live source changes", async () => {
    const { prisma } = setupMockDb();
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValueOnce(basePnlModel());

    const first = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    expect(first.versionNumber).toBe(1);

    const v1Read = await loadFinancePublicationVersionSnapshot(prisma, ctx(tenantA, publishPerms), {
      publicationId: first.publicationId,
      versionNumber: 1,
    });
    expect(v1Read.ok).toBe(true);
    if (!v1Read.ok) return;
    const v1Snapshot = v1Read.snapshot;

    loader.mockResolvedValueOnce(basePnlModel(500_00, 100_00));
    const second = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    expect(second.versionNumber).toBe(2);

    const v1Again = await loadFinancePublicationVersionSnapshot(prisma, ctx(tenantA, publishPerms), {
      publicationId: first.publicationId,
      versionNumber: 1,
    });
    expect(v1Again.ok).toBe(true);
    if (!v1Again.ok) return;
    expect(v1Again.snapshot).toEqual(v1Snapshot);
    expect(v1Again.snapshot.totals.resultMinor).toBe(120_00);

    const v2Read = await loadFinancePublicationVersionSnapshot(prisma, ctx(tenantA, publishPerms), {
      publicationId: first.publicationId,
      versionNumber: 2,
    });
    expect(v2Read.ok).toBe(true);
    if (!v2Read.ok) return;
    expect(v2Read.snapshot.totals.resultMinor).toBe(400_00);
    expect(v2Read.snapshot.totals.resultMinor).not.toBe(v1Snapshot.totals.resultMinor);

    await assertFinancePublicationVersionNotMutated(prisma, first.versionId, v1Snapshot);
    loader.mockRestore();
  });

  it("sequences version numbers deterministically under concurrent publish attempts", async () => {
    const { prisma } = setupMockDb();
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockImplementation(async () => basePnlModel());

    const results = await Promise.allSettled([
      publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
        financeYearId: yearId,
      }),
      publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
        financeYearId: yearId,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<
      Awaited<ReturnType<typeof publishFinanceManagementPnlSnapshot>>
    >[];
    expect(fulfilled).toHaveLength(2);
    const numbers = fulfilled.map((r) => r.value.versionNumber).sort();
    expect(numbers).toEqual([1, 2]);
    loader.mockRestore();
  });

  it("requires publish permission and rejects view/share-only roles", async () => {
    const { prisma } = setupMockDb();
    expect(canPublishFinancialReports(ctx(tenantA, viewOnly))).toBe(false);
    expect(canShareFinancialReports(ctx(tenantA, shareOnly))).toBe(true);
    expect(canPublishFinancialReports(ctx(tenantA, shareOnly))).toBe(false);

    await expect(
      publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, viewOnly), {
        financeYearId: yearId,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORBIDDEN" });

    await expect(
      publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, shareOnly), {
        financeYearId: yearId,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORBIDDEN" });
  });

  it("isolates tenants and hides foreign publications", async () => {
    const { prisma, store } = setupMockDb();
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValue(basePnlModel());

    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });

    const foreignRead = await loadFinancePublicationVersionSnapshot(
      prisma,
      ctx(tenantB, publishPerms),
      { publicationId: published.publicationId, versionNumber: 1 },
    );
    expect(foreignRead.ok).toBe(false);
    if (!foreignRead.ok) {
      expect(foreignRead.notFound).toBe(true);
    }

    const row = store.financePublicationVersion.find((v) => v.id === published.versionId);
    expect(row?.tenantId).toBe(tenantA);
    loader.mockRestore();
  });

  it("rejects client-supplied snapshot hints and blocks in-place historical edits", async () => {
    const { prisma, store } = setupMockDb();
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValue(basePnlModel());

    await expect(
      publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
        financeYearId: yearId,
        clientSnapshotHint: { totals: { resultMinor: 999_99 } },
      }),
    ).rejects.toMatchObject({ code: "FINANCE_PUBLICATION_INVALID_SNAPSHOT" });

    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });

    const v1Read = await loadFinancePublicationVersionSnapshot(prisma, ctx(tenantA, publishPerms), {
      publicationId: published.publicationId,
      versionNumber: 1,
    });
    expect(v1Read.ok).toBe(true);
    if (!v1Read.ok) return;

    expect(() => assertPublishedPublicationVersionImmutable("PUBLISHED")).toThrow(FinanceDomainError);

    const version = store.financePublicationVersion.find((v) => v.id === published.versionId)!;
    version.snapshotPayloadJson = {
      ...(version.snapshotPayloadJson as object),
      totals: { incomeMinor: 1, expenseMinor: 1, resultMinor: 1 },
    };
    await expect(
      assertFinancePublicationVersionNotMutated(prisma, published.versionId, v1Read.snapshot),
    ).rejects.toMatchObject({ code: "FINANCE_PUBLICATION_IMMUTABLE" });
    loader.mockRestore();
  });

  it("read path serves stored snapshot without calling live FIN-05 loader", async () => {
    const { prisma } = setupMockDb();
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValueOnce(basePnlModel());

    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    loader.mockClear();

    const read = await loadFinancePublicationVersionSnapshot(prisma, ctx(tenantA, publishPerms), {
      publicationId: published.publicationId,
      versionNumber: 1,
    });
    expect(read.ok).toBe(true);
    expect(loader).not.toHaveBeenCalled();
    loader.mockRestore();
  });
});

describe("FIN-06B architecture guards", () => {
  const repoRoot = process.cwd();
  const serviceSource = readFileSync(
    join(repoRoot, "lib/finance/services/finance-publication-service.ts"),
    "utf8",
  );

  it("does not hardcode country or CHF in publication core", () => {
    const sources = [
      readFileSync(join(repoRoot, "lib/finance/publishing/build-finance-publication-snapshot-v1.ts"), "utf8"),
      serviceSource,
    ].join("\n");
    expect(sources).not.toMatch(/\bSwitzerland\b/i);
    expect(sources).not.toMatch(/"CHF"/);
  });

  it("published read path does not reconstruct from live management reporting loader", () => {
    const readFn = serviceSource.slice(
      serviceSource.indexOf("export async function loadFinancePublicationVersionSnapshot"),
      serviceSource.indexOf("export async function assertFinancePublicationVersionNotMutated"),
    );
    expect(readFn).not.toContain("loadFinanceManagementPnlReadModel");
    expect(readFn).toContain("parseFinancePublicationSnapshotPayloadV1");
  });
});

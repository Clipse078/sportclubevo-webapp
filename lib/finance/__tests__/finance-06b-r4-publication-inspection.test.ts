import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildFinanceManagementPnlReadModel } from "@/lib/finance/reporting/build-finance-management-pnl-read-model";
import { buildFinancePublicationSnapshotV1 } from "@/lib/finance/publishing/build-finance-publication-snapshot-v1";
import { defaultManagementPnlPublicationScope } from "@/lib/finance/publishing/finance-publication-scope";
import { buildFinancePublishedManagementPnlInspectionReadModel } from "@/lib/finance/presentation/build-finance-published-management-pnl-read-model";
import * as managementReporting from "@/lib/finance/services/finance-management-reporting-query-service";
import {
  loadFinancePublicationVersionSnapshot,
  publishFinanceManagementPnlSnapshot,
} from "@/lib/finance/services/finance-publication-service";
import {
  createPublicationMockStore,
  makePublicationMockPrisma,
} from "@/lib/finance/__tests__/finance-06b-publication-mock-db";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";

const tenantA = "tenant-a";
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

function poBaselinePnlModel() {
  return buildFinanceManagementPnlReadModel({
    tenantId: tenantA,
    financeYearId: yearId,
    financeYearName: "FY 2026",
    baseCurrency: "CHF",
    structureAvailability: "AVAILABLE",
    actualCutoffDate: null,
    groups: [
      {
        id: "g1",
        tenantId: tenantA,
        name: "Operations",
        parentId: null,
        sortOrder: 0,
        lifecycle: "ACTIVE",
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    accounts: [
      {
        id: "acc-i",
        tenantId: tenantA,
        reportingGroupId: "g1",
        name: "Income",
        sortOrder: 0,
        lifecycle: "ACTIVE",
        archivedAt: null,
        canonicalSemantic: "INCOME",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    approvedMeasure: {
      measure: "APPROVED_BUDGET",
      budgetVersionId: "bv1",
      approvedAt: new Date(),
      baseCurrency: "CHF",
      valuesByAccountId: new Map([["acc-i", 150_000_00]]),
    },
    actualMeasure: {
      measure: "ACTUAL",
      grain: "ANNUAL_FULL_YEAR",
      cutoffDate: null,
      valuesByAccountId: new Map([["acc-i", 7_776_00]]),
    },
    forecastMeasure: {
      measure: "CURRENT_FORECAST",
      forecastVersionId: "fv1",
      forecastId: "f1",
      valuesByAccountId: new Map([["acc-i", 161_533_00]]),
    },
    sourceVisibility: { approvedBudget: true, actual: true, currentForecast: true },
  });
}

describe("FIN-06B-R4 publication inspection read model", () => {
  it("renders management summary and P&L rows from stored snapshot only", () => {
    const model = poBaselinePnlModel();
    const snapshot = buildFinancePublicationSnapshotV1({
      publicationId: "pub-1",
      publicationVersion: 1,
      title: "FY 2026 — Management P&L",
      reportingScope: defaultManagementPnlPublicationScope(yearId),
      audienceClass: "INTERNAL_AUTHENTICATED",
      publisherUserId: "user-1",
      publishedAt: new Date("2026-10-25T12:00:00.000Z"),
      pnlReadModel: model,
    });

    const presentation = buildFinancePublishedManagementPnlInspectionReadModel({
      snapshot,
      lifecycleStatus: "PUBLISHED",
      contentLabel: "Erfolgsrechnung",
    });

    expect(presentation.identity.publicationVersion).toBe(1);
    expect(presentation.pnl.managementResult.currentForecast.amountMinor).toBe(161_533_00);
    expect(presentation.pnl.managementResult.approvedBudget.amountMinor).toBe(150_000_00);
    expect(presentation.pnl.managementResult.actual.amountMinor).toBe(7_776_00);
    expect(
      presentation.pnl.interpretation.forecastVsBudgetManagementResult.rawDeltaMinor,
    ).toBe(11_533_00);
    expect(presentation.pnl.incomeSection.nodes.length).toBeGreaterThan(0);
  });

  it("historical inspection path does not invoke live FIN-05 Management P&L loader", async () => {
    const store = createPublicationMockStore();
    store.financeYear.push({ id: yearId, tenantId: tenantA, name: "FY 2026" });
    const prisma = makePublicationMockPrisma(store);
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValueOnce(poBaselinePnlModel());

    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });

    loader.mockClear();
    loader.mockResolvedValueOnce(poBaselinePnlModel());

    const read = await loadFinancePublicationVersionSnapshot(prisma, ctx(tenantA, viewOnly), {
      publicationId: published.publicationId,
      versionNumber: 1,
    });
    expect(read.ok).toBe(true);
    if (!read.ok) return;

    const presentation = buildFinancePublishedManagementPnlInspectionReadModel({
      snapshot: read.snapshot,
      lifecycleStatus: read.lifecycleStatus,
      contentLabel: "Erfolgsrechnung",
    });

    expect(presentation.pnl.managementResult.currentForecast.amountMinor).toBe(161_533_00);
    expect(loader).not.toHaveBeenCalled();
    loader.mockRestore();
  });

  it("architecture guard: inspection presentation is snapshot-sourced", () => {
    const inspectionActionSource = readFileSync(
      join(process.cwd(), "app/(admin)/dashboard/finance/reports/publication-actions.ts"),
      "utf8",
    );
    const readModelSource = readFileSync(
      join(
        process.cwd(),
        "lib/finance/presentation/build-finance-published-management-pnl-read-model.ts",
      ),
      "utf8",
    );
    expect(inspectionActionSource).not.toContain("loadFinanceManagementPnlReadModel");
    expect(readModelSource).not.toContain("loadFinanceManagementPnlReadModel");
    expect(inspectionActionSource).toContain("buildFinancePublishedManagementPnlInspectionReadModel");
  });
});

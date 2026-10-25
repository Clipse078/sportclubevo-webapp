import { describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import * as managementReporting from "@/lib/finance/services/finance-management-reporting-query-service";
import {
  loadFinancePublicationVersionSnapshot,
  publishFinanceManagementPnlSnapshot,
} from "@/lib/finance/services/finance-publication-service";
import {
  buildPoBaselineManagementPnlReadModel,
  metricsFromLivePnl,
  metricsFromStoredSnapshot,
  R5_LIVE_AFTER_MUTATION,
  R5_V1_BASELINE,
} from "@/lib/finance/uat/sce-finance-06b-r5-immutability-uat";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  createPublicationMockStore,
  makePublicationMockPrisma,
} from "@/lib/finance/__tests__/finance-06b-publication-mock-db";

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

function setupMockDb() {
  const store = createPublicationMockStore();
  store.financeYear.push({ id: yearId, tenantId: tenantA, name: "FY 2026" });
  return { store, prisma: makePublicationMockPrisma(store) };
}

describe("FIN-06B-R6 versioning contract", () => {
  it("A→B→C: V1=A, V2=B, live=C; no historical read uses current FIN-05 truth", async () => {
    const { prisma } = setupMockDb();
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");

    const snapshotA = buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId });
    loader.mockResolvedValueOnce(snapshotA);
    const v1 = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });

    const snapshotB = buildPoBaselineManagementPnlReadModel({
      tenantId: tenantA,
      financeYearId: yearId,
      mitgliedsForecastMinor: R5_LIVE_AFTER_MUTATION.mitgliedsbeitraegeForecastMinor,
    });
    loader.mockResolvedValueOnce(snapshotB);
    const v2 = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    expect(v1.versionNumber).toBe(1);
    expect(v2.versionNumber).toBe(2);

    const snapshotC = buildPoBaselineManagementPnlReadModel({
      tenantId: tenantA,
      financeYearId: yearId,
      mitgliedsForecastMinor: R5_LIVE_AFTER_MUTATION.mitgliedsbeitraegeForecastMinor + 100_00,
    });
    loader.mockResolvedValueOnce(snapshotC);
    const liveC = await managementReporting.loadFinanceManagementPnlReadModel(
      prisma,
      ctx(tenantA, viewOnly),
      { financeYearId: yearId },
    );
    expect(liveC.availability).toBe("AVAILABLE");
    if (liveC.availability !== "AVAILABLE") return;
    expect(liveC.managementResult.currentForecast.amountMinor).not.toBe(
      R5_LIVE_AFTER_MUTATION.forecastResultMinor,
    );

    loader.mockClear();
    const readV1 = await loadFinancePublicationVersionSnapshot(prisma, ctx(tenantA, viewOnly), {
      publicationId: v1.publicationId,
      versionNumber: 1,
    });
    const readV2 = await loadFinancePublicationVersionSnapshot(prisma, ctx(tenantA, viewOnly), {
      publicationId: v1.publicationId,
      versionNumber: 2,
    });
    expect(readV1.ok).toBe(true);
    expect(readV2.ok).toBe(true);
    if (!readV1.ok || !readV2.ok) return;

    expect(metricsFromStoredSnapshot(readV1.snapshot).forecastResultMinor).toBe(
      R5_V1_BASELINE.forecastResultMinor,
    );
    expect(metricsFromStoredSnapshot(readV2.snapshot).forecastResultMinor).toBe(
      R5_LIVE_AFTER_MUTATION.forecastResultMinor,
    );
    expect(metricsFromLivePnl(liveC).forecastResultMinor).toBe(
      liveC.managementResult.currentForecast.amountMinor,
    );
    expect(loader).not.toHaveBeenCalled();

    loader.mockRestore();
  });
});

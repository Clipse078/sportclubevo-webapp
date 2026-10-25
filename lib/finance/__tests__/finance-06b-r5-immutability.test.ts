import { describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  assertFinancePublicationVersionNotMutated,
  loadFinancePublicationVersionSnapshot,
  publishFinanceManagementPnlSnapshot,
} from "@/lib/finance/services/finance-publication-service";
import * as managementReporting from "@/lib/finance/services/finance-management-reporting-query-service";
import {
  canPublishFinancialReports,
  canShareFinancialReports,
  canViewFinancePublicationHistory,
} from "@/lib/finance/publishing/finance-publishing-authorization";
import {
  buildPoBaselineManagementPnlReadModel,
  metricsEqual,
  metricsFromLivePnl,
  metricsFromStoredSnapshot,
  R5_LIVE_AFTER_MUTATION,
  R5_V1_BASELINE,
  snapshotPayloadDigest,
} from "@/lib/finance/uat/sce-finance-06b-r5-immutability-uat";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
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

function setupMockDb() {
  const store = createPublicationMockStore();
  store.financeYear.push({ id: yearId, tenantId: tenantA, name: "FY 2026" });
  store.financeYear.push({ id: "fy-b", tenantId: tenantB, name: "FY 2026-B" });
  const prisma = makePublicationMockPrisma(store);
  return { store, prisma };
}

describe("FIN-06B-R5 immutability acceptance flow", () => {
  it("A–K: publish V1 at A, mutate live to B, V1 frozen, publish V2 at B, both inspectable without FIN-05 history rebuild", async () => {
    const { prisma } = setupMockDb();
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");

    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const v1Published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    expect(v1Published.versionNumber).toBe(1);

    const v1Read = await loadFinancePublicationVersionSnapshot(prisma, ctx(tenantA, viewOnly), {
      publicationId: v1Published.publicationId,
      versionNumber: 1,
    });
    expect(v1Read.ok).toBe(true);
    if (!v1Read.ok) return;
    const v1DigestAtCapture = snapshotPayloadDigest(v1Read.snapshot);
    expect(metricsEqual(metricsFromStoredSnapshot(v1Read.snapshot), R5_V1_BASELINE)).toBe(true);

    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({
        tenantId: tenantA,
        financeYearId: yearId,
        mitgliedsForecastMinor: R5_LIVE_AFTER_MUTATION.mitgliedsbeitraegeForecastMinor,
      }),
    );
    const liveAfterMutation = await managementReporting.loadFinanceManagementPnlReadModel(
      prisma,
      ctx(tenantA, viewOnly),
      { financeYearId: yearId },
    );
    expect(liveAfterMutation.availability).toBe("AVAILABLE");
    if (liveAfterMutation.availability !== "AVAILABLE") return;
    expect(metricsEqual(metricsFromLivePnl(liveAfterMutation), R5_LIVE_AFTER_MUTATION)).toBe(true);

    const v1AfterMutation = await loadFinancePublicationVersionSnapshot(prisma, ctx(tenantA, viewOnly), {
      publicationId: v1Published.publicationId,
      versionNumber: 1,
    });
    expect(v1AfterMutation.ok).toBe(true);
    if (!v1AfterMutation.ok) return;
    expect(snapshotPayloadDigest(v1AfterMutation.snapshot)).toBe(v1DigestAtCapture);
    await assertFinancePublicationVersionNotMutated(
      prisma,
      v1Published.versionId,
      v1Read.snapshot,
    );

    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({
        tenantId: tenantA,
        financeYearId: yearId,
        mitgliedsForecastMinor: R5_LIVE_AFTER_MUTATION.mitgliedsbeitraegeForecastMinor,
      }),
    );
    const v2Published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    expect(v2Published.versionNumber).toBe(2);

    loader.mockClear();
    const v1Historical = await loadFinancePublicationVersionSnapshot(prisma, ctx(tenantA, viewOnly), {
      publicationId: v1Published.publicationId,
      versionNumber: 1,
    });
    const v2Historical = await loadFinancePublicationVersionSnapshot(prisma, ctx(tenantA, viewOnly), {
      publicationId: v1Published.publicationId,
      versionNumber: 2,
    });
    expect(v1Historical.ok).toBe(true);
    expect(v2Historical.ok).toBe(true);
    if (!v1Historical.ok || !v2Historical.ok) return;
    expect(metricsEqual(metricsFromStoredSnapshot(v1Historical.snapshot), R5_V1_BASELINE)).toBe(true);
    expect(metricsEqual(metricsFromStoredSnapshot(v2Historical.snapshot), R5_LIVE_AFTER_MUTATION)).toBe(
      true,
    );
    expect(loader).not.toHaveBeenCalled();

    expect(canPublishFinancialReports(ctx(tenantA, shareOnly))).toBe(false);
    expect(canShareFinancialReports(ctx(tenantA, shareOnly))).toBe(true);
    expect(canViewFinancePublicationHistory(ctx(tenantA, viewOnly))).toBe(true);

    const foreign = await loadFinancePublicationVersionSnapshot(prisma, ctx(tenantB, publishPerms), {
      publicationId: v1Published.publicationId,
      versionNumber: 1,
    });
    expect(foreign.ok).toBe(false);

    loader.mockRestore();
  });
});

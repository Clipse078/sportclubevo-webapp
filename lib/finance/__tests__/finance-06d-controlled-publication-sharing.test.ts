import { describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildPoBaselineManagementPnlReadModel,
  metricsEqual,
  metricsFromStoredSnapshot,
  R5_LIVE_AFTER_MUTATION,
  R5_V1_BASELINE,
} from "@/lib/finance/uat/sce-finance-06b-r5-immutability-uat";
import {
  publishFinanceManagementPnlSnapshot,
} from "@/lib/finance/services/finance-publication-service";
import * as managementReporting from "@/lib/finance/services/finance-management-reporting-query-service";
import {
  canManageFinancialShares,
  canPublishFinancialReports,
  canShareFinancialReports,
} from "@/lib/finance/publishing/finance-publishing-authorization";
import {
  createFinancePublicationShare,
  listFinancePublicationSharesForVersion,
  resolveFinancePublicationShareByRawToken,
  revokeFinancePublicationShare,
} from "@/lib/finance/services/finance-publication-share-service";
import {
  deriveFinancePublicationShareStatus,
} from "@/lib/finance/publishing/finance-publication-share-status";
import {
  FINANCE_PUBLICATION_SHARE_SECURITY,
} from "@/lib/finance/publishing/finance-publication-share-security";
import { hashFinanceShareLinkToken } from "@/lib/finance/publishing/finance-share-link-token";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  createPublicationShareMockStore,
  makePublicationShareMockPrisma,
} from "@/lib/finance/__tests__/finance-06d-publication-share-mock-db";

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

const sharePerms = [
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FINANCE_PUBLICATION_VIEW,
  PERMISSIONS.FINANCE_REPORTING_SHARE,
];

const manageSharePerms = [...sharePerms, PERMISSIONS.FINANCE_SHARE_MANAGE];

const viewOnly = [PERMISSIONS.FINANCE_VIEW, PERMISSIONS.FINANCE_PUBLICATION_VIEW];

function setup() {
  const store = createPublicationShareMockStore();
  store.financeYear.push({ id: yearId, tenantId: tenantA, name: "FY 2026" });
  store.financeYear.push({ id: "fy-b", tenantId: tenantB, name: "FY 2026-B" });
  const prisma = makePublicationShareMockPrisma(store);
  return { store, prisma };
}

describe("FIN-06D controlled publication sharing", () => {
  it("documents token security decisions", () => {
    expect(FINANCE_PUBLICATION_SHARE_SECURITY.RAW_TOKEN_PERSISTENCE).toContain("NEVER");
    expect(FINANCE_PUBLICATION_SHARE_SECURITY.ENUMERATION_RESISTANCE).toBeTruthy();
  });

  it("separates view, share, publish, and manage permissions", () => {
    expect(canShareFinancialReports(ctx(tenantA, viewOnly))).toBe(false);
    expect(canPublishFinancialReports(ctx(tenantA, sharePerms))).toBe(false);
    expect(canManageFinancialShares(ctx(tenantA, sharePerms))).toBe(false);
    expect(canManageFinancialShares(ctx(tenantA, manageSharePerms))).toBe(true);
  });

  it("creates share with optional expiry, binds to exact version, stores hash only", async () => {
    const { prisma, store } = setup();
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });

    const expiresAt = new Date(Date.now() + 86_400_000);
    const created = await createFinancePublicationShare(prisma, ctx(tenantA, sharePerms), {
      publicationId: published.publicationId,
      versionNumber: 1,
      expiresAt,
    });

    expect(created.rawToken.length).toBeGreaterThan(20);
    expect(created.versionNumber).toBe(1);
    const stored = store.financePublicationShare[0];
    expect(stored.tokenHash).toBe(hashFinanceShareLinkToken(created.rawToken));
    expect(stored.tokenHash).not.toBe(created.rawToken);
    expect(stored.publicationVersionId).toBeTruthy();
    expect(store.auditLog.some((e) => e.action === "SHARE_CREATED")).toBe(true);
  });

  it("V1 share remains V1 after V2 is published", async () => {
    const { prisma } = setup();
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const v1 = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    const v1Share = await createFinancePublicationShare(prisma, ctx(tenantA, sharePerms), {
      publicationId: v1.publicationId,
      versionNumber: 1,
      expiresAt: null,
    });

    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({
        tenantId: tenantA,
        financeYearId: yearId,
        mitgliedsForecastMinor: R5_LIVE_AFTER_MUTATION.mitgliedsbeitraegeForecastMinor,
      }),
    );
    await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });

    const v2Share = await createFinancePublicationShare(prisma, ctx(tenantA, sharePerms), {
      publicationId: v1.publicationId,
      versionNumber: 2,
      expiresAt: null,
    });

    const v1Access = await resolveFinancePublicationShareByRawToken(prisma, v1Share.rawToken);
    const v2Access = await resolveFinancePublicationShareByRawToken(prisma, v2Share.rawToken);
    expect(v1Access.ok).toBe(true);
    expect(v2Access.ok).toBe(true);
    if (!v1Access.ok || !v2Access.ok) return;

    expect(v1Access.versionNumber).toBe(1);
    expect(v2Access.versionNumber).toBe(2);
    expect(metricsEqual(metricsFromStoredSnapshot(v1Access.snapshot), R5_V1_BASELINE)).toBe(true);
    expect(metricsEqual(metricsFromStoredSnapshot(v2Access.snapshot), R5_LIVE_AFTER_MUTATION)).toBe(
      true,
    );
  });

  it("revokes share and blocks external access; derives expired status", async () => {
    const { prisma } = setup();
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    const share = await createFinancePublicationShare(prisma, ctx(tenantA, sharePerms), {
      publicationId: published.publicationId,
      versionNumber: 1,
      expiresAt: null,
    });

    await revokeFinancePublicationShare(prisma, ctx(tenantA, manageSharePerms), {
      shareId: share.shareId,
    });

    const blocked = await resolveFinancePublicationShareByRawToken(prisma, share.rawToken);
    expect(blocked.ok).toBe(false);

    expect(
      deriveFinancePublicationShareStatus({
        revokedAt: new Date(),
        expiresAt: null,
      }),
    ).toBe("REVOKED");
    expect(
      deriveFinancePublicationShareStatus({
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      }),
    ).toBe("EXPIRED");
  });

  it("enforces tenant isolation on share management", async () => {
    const { prisma } = setup();
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    const share = await createFinancePublicationShare(prisma, ctx(tenantA, sharePerms), {
      publicationId: published.publicationId,
      versionNumber: 1,
      expiresAt: null,
    });

    await expect(
      listFinancePublicationSharesForVersion(prisma, ctx(tenantB, manageSharePerms), {
        publicationId: published.publicationId,
        versionNumber: 1,
      }),
    ).rejects.toThrow();

    await expect(
      revokeFinancePublicationShare(prisma, ctx(tenantB, manageSharePerms), {
        shareId: share.shareId,
      }),
    ).rejects.toThrow();
  });

  it("returns unavailable for invalid or expired tokens without enumeration", async () => {
    const { prisma } = setup();
    const invalid = await resolveFinancePublicationShareByRawToken(prisma, "not-a-valid-token");
    expect(invalid).toEqual({ ok: false, reason: "UNAVAILABLE" });
  });

  it("lists shares for version without exposing token material", async () => {
    const { prisma } = setup();
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    await createFinancePublicationShare(prisma, ctx(tenantA, sharePerms), {
      publicationId: published.publicationId,
      versionNumber: 1,
      expiresAt: null,
    });

    const listed = await listFinancePublicationSharesForVersion(prisma, ctx(tenantA, sharePerms), {
      publicationId: published.publicationId,
      versionNumber: 1,
    });
    expect(listed.length).toBe(1);
    expect(JSON.stringify(listed)).not.toContain("tokenHash");
  });
});

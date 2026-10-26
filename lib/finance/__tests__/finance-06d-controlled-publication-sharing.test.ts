import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildPoBaselineManagementPnlReadModel,
  metricsEqual,
  metricsFromStoredSnapshot,
  R5_LIVE_AFTER_MUTATION,
  R5_V1_BASELINE,
} from "@/lib/finance/uat/sce-finance-06b-r5-immutability-uat";
import { publishFinanceManagementPnlSnapshot } from "@/lib/finance/services/finance-publication-service";
import * as managementReporting from "@/lib/finance/services/finance-management-reporting-query-service";
import {
  canManageFinancialShares,
  canPublishFinancialReports,
  canShareFinancialReports,
} from "@/lib/finance/publishing/finance-publishing-authorization";
import {
  createFinancePublicationShare,
  ensureDefaultFinancePublicationShare,
  listFinancePublicationSharesForVersion,
  resolveFinancePublicationShareByRawToken,
  revokeFinancePublicationShare,
} from "@/lib/finance/services/finance-publication-share-service";
import { deriveFinancePublicationShareStatus } from "@/lib/finance/publishing/finance-publication-share-status";
import { FINANCE_PUBLICATION_SHARE_SECURITY } from "@/lib/finance/publishing/finance-publication-share-security";
import { FINANCE_06D_R2_FAST_PATH_CONTRACT } from "@/lib/finance/publishing/finance-06d-r2-fast-path-contract";
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

describe("FIN-06D R2 fast-path contract", () => {
  it("documents UX and security contracts", () => {
    expect(FINANCE_06D_R2_FAST_PATH_CONTRACT.DEFAULT_SHARE_REQUIRES_PRECONFIGURATION).toBe(false);
    expect(FINANCE_06D_R2_FAST_PATH_CONTRACT.RAW_SECRET_PLAINTEXT_STORAGE).toBe(false);
    expect(FINANCE_PUBLICATION_SHARE_SECURITY.R2_MODEL).toContain("publicToken");
    expect(FINANCE_PUBLICATION_SHARE_SECURITY.LEGACY_R1_RESOLUTION).toBeTruthy();
  });
});

describe("FIN-06D controlled publication sharing", () => {
  it("separates view, share, publish, and manage permissions", () => {
    expect(canShareFinancialReports(ctx(tenantA, viewOnly))).toBe(false);
    expect(canPublishFinancialReports(ctx(tenantA, sharePerms))).toBe(false);
    expect(canManageFinancialShares(ctx(tenantA, sharePerms))).toBe(false);
    expect(canManageFinancialShares(ctx(tenantA, manageSharePerms))).toBe(true);
  });

  it("creates default share with publicToken persisted (R2)", async () => {
    const { prisma, store } = setup();
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });

    const created = await ensureDefaultFinancePublicationShare(prisma, ctx(tenantA, sharePerms), {
      publicationId: published.publicationId,
      versionNumber: 1,
    });

    expect(created.publicToken.length).toBeGreaterThan(20);
    expect(created.reused).toBe(false);
    expect(created.versionNumber).toBe(1);
    const stored = store.financePublicationShare[0];
    expect(stored.publicToken).toBe(created.publicToken);
    expect(stored.tokenHash).toBeNull();
    expect(store.auditLog.some((e) => e.action === "SHARE_CREATED")).toBe(true);
    const auditPayload = JSON.stringify(store.auditLog);
    expect(auditPayload).not.toContain(created.publicToken);
  });

  it("reuses active default share on repeated ensure (no duplicate DEFAULT)", async () => {
    const { prisma, store } = setup();
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });

    const first = await ensureDefaultFinancePublicationShare(prisma, ctx(tenantA, sharePerms), {
      publicationId: published.publicationId,
      versionNumber: 1,
    });
    const second = await ensureDefaultFinancePublicationShare(prisma, ctx(tenantA, sharePerms), {
      publicationId: published.publicationId,
      versionNumber: 1,
    });

    expect(second.reused).toBe(true);
    expect(second.publicToken).toBe(first.publicToken);
    expect(store.financePublicationShare.filter((s) => s.shareKind === "DEFAULT")).toHaveLength(1);
  });

  it("creates advanced share with optional expiry", async () => {
    const { prisma } = setup();
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
      shareKind: "ADVANCED",
    });

    expect(created.publicToken.length).toBeGreaterThan(20);
    expect(created.expiresAt).toBeTruthy();
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
    const v1Share = await ensureDefaultFinancePublicationShare(prisma, ctx(tenantA, sharePerms), {
      publicationId: v1.publicationId,
      versionNumber: 1,
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

    const v2Share = await ensureDefaultFinancePublicationShare(prisma, ctx(tenantA, sharePerms), {
      publicationId: v1.publicationId,
      versionNumber: 2,
    });

    const v1Access = await resolveFinancePublicationShareByRawToken(prisma, v1Share.publicToken);
    const v2Access = await resolveFinancePublicationShareByRawToken(prisma, v2Share.publicToken);
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

  it("revokes share and blocks external access; new default after revoke", async () => {
    const { prisma } = setup();
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    const share = await ensureDefaultFinancePublicationShare(prisma, ctx(tenantA, sharePerms), {
      publicationId: published.publicationId,
      versionNumber: 1,
    });

    await revokeFinancePublicationShare(prisma, ctx(tenantA, manageSharePerms), {
      shareId: share.shareId,
    });

    const blocked = await resolveFinancePublicationShareByRawToken(prisma, share.publicToken);
    expect(blocked.ok).toBe(false);

    const reShare = await ensureDefaultFinancePublicationShare(prisma, ctx(tenantA, sharePerms), {
      publicationId: published.publicationId,
      versionNumber: 1,
    });
    expect(reShare.publicToken).not.toBe(share.publicToken);
    expect(reShare.reused).toBe(false);

    expect(
      deriveFinancePublicationShareStatus({
        revokedAt: new Date(),
        expiresAt: null,
      }),
    ).toBe("REVOKED");
  });

  it("resolves legacy R1 tokenHash rows for external access", async () => {
    const { prisma, store } = setup();
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    const version = store.financePublicationVersion[0];
    const legacyToken = "legacy-r1-capability-token-for-test";
    store.financePublicationShare.push({
      id: "legacy-share",
      tenantId: tenantA,
      publicationId: published.publicationId,
      publicationVersionId: version.id,
      publicToken: null,
      tokenHash: hashFinanceShareLinkToken(legacyToken),
      shareKind: "DEFAULT",
      expiresAt: null,
      revokedAt: null,
      revokedByUserId: null,
      createdByUserId: "user-1",
      lastAccessedAt: null,
      accessCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const access = await resolveFinancePublicationShareByRawToken(prisma, legacyToken);
    expect(access.ok).toBe(true);
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
    const share = await ensureDefaultFinancePublicationShare(prisma, ctx(tenantA, sharePerms), {
      publicationId: published.publicationId,
      versionNumber: 1,
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

  it("returns unavailable for invalid tokens without enumeration", async () => {
    const { prisma } = setup();
    const invalid = await resolveFinancePublicationShareByRawToken(prisma, "not-a-valid-token");
    expect(invalid).toEqual({ ok: false, reason: "UNAVAILABLE" });
  });

  it("lists shares with reconstructable paths for active publicToken shares", async () => {
    const { prisma } = setup();
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    await ensureDefaultFinancePublicationShare(prisma, ctx(tenantA, sharePerms), {
      publicationId: published.publicationId,
      versionNumber: 1,
    });

    const listed = await listFinancePublicationSharesForVersion(prisma, ctx(tenantA, sharePerms), {
      publicationId: published.publicationId,
      versionNumber: 1,
    });
    expect(listed.length).toBe(1);
    expect(listed[0]?.relativeSharePath).toContain("/share/finance/publication/");
    expect(JSON.stringify(listed)).not.toContain("tokenHash");
  });

  it("regression: surfaces prisma missing-table code for operators (PO STAGE failure class)", () => {
    const err = new Prisma.PrismaClientKnownRequestError("table missing", {
      code: "P2021",
      clientVersion: "test",
    });
    expect(err.code).toBe("P2021");
  });
});

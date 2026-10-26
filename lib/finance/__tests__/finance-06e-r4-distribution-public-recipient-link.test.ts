/**
 * FIN-06E-R4 — DISTRIBUTION public recipient link (Prisma enum + share resolver).
 */

process.env.APP_BASE_URL = "https://fcallschwil.sportclubevo.com";

import { describe, expect, it, vi } from "vitest";
import { FinancePublicationShareKind } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildPoBaselineManagementPnlReadModel,
  R5_V1_BASELINE,
} from "@/lib/finance/uat/sce-finance-06b-r5-immutability-uat";
import { publishFinanceManagementPnlSnapshot } from "@/lib/finance/services/finance-publication-service";
import * as managementReporting from "@/lib/finance/services/finance-management-reporting-query-service";
import {
  resolveFinancePublicationShareByRawToken,
  loadFinancePublicationShareContextForPdf,
} from "@/lib/finance/services/finance-publication-share-service";
import { createFinancePublicationDistribution } from "@/lib/finance/services/finance-publication-distribution-service";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import type { FinancePublicationDistributionEmailPort } from "@/lib/finance/delivery/finance-publication-distribution-email-port";
import { buildFinancePublicationDistributionEmail } from "@/lib/finance/email/build-finance-publication-distribution-email";
import { buildNotificationAbsoluteHref } from "@/lib/notifications/internal-href";
import {
  financePublicationSharePath,
  financePublicationSharePdfApiPath,
} from "@/lib/finance/publishing/finance-publication-share-path";
import {
  createPublicationDistributionMockStore,
  makePublicationDistributionMockPrisma,
} from "@/lib/finance/__tests__/finance-06e-publication-distribution-mock-db";
import {
  createPublicationShareMockStore,
  makePublicationShareMockPrisma,
} from "@/lib/finance/__tests__/finance-06d-publication-share-mock-db";
import { deriveFinancePublicationShareStatus } from "@/lib/finance/publishing/finance-publication-share-status";

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

const distributePerms = [
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FINANCE_PUBLICATION_VIEW,
  PERMISSIONS.FINANCE_REPORTING_DISTRIBUTE,
];

const emailLabels = {
  subject: "{tenant} — {year} v{version}",
  greeting: "Hi",
  intro: "Report",
  optionalMessageHeading: "Note",
  viewReportCta: "Bericht ansehen",
  downloadPdfCta: "PDF herunterladen",
  footer: "{tenant}",
};

function distributionSetup() {
  const store = createPublicationDistributionMockStore();
  store.financeYear.push({ id: yearId, tenantId: tenantA, name: "FY 2026" });
  store.tenant.push({ id: tenantA, name: "FC Allschwil" });
  store.user.push({ id: "user-1", firstName: "Alex", lastName: "Admin" });
  store.person.push({
    id: "person-1",
    tenantId: tenantA,
    firstName: "Berta",
    lastName: "Board",
    displayName: null,
    email: "berta@example.com",
    isActive: true,
  });
  return { store, prisma: makePublicationDistributionMockPrisma(store) };
}

describe("FIN-06E-R4 Prisma/runtime contract", () => {
  it("accepts FinancePublicationShareKind.DISTRIBUTION through @prisma/client", () => {
    expect(FinancePublicationShareKind.DISTRIBUTION).toBe("DISTRIBUTION");
  });
});

describe("FIN-06E-R4 DISTRIBUTION public share resolver", () => {
  it("loads a persisted DISTRIBUTION share for external publication access", async () => {
    const { prisma, store } = distributionSetup();
    const send = vi.fn().mockResolvedValue({
      provider: "mock",
      providerMessageId: "msg-1",
      from: "noreply@test",
    });
    const emailPort: FinancePublicationDistributionEmailPort = { send };
    vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel").mockResolvedValue(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });

    await createFinancePublicationDistribution(
      prisma,
      ctx(tenantA, distributePerms),
      {
        publicationId: published.publicationId,
        versionNumber: 1,
        idempotencyKey: "idem-r4-public",
        localeCode: "de",
        recipients: [{ kind: "PERSON", personId: "person-1" }],
        emailLabels,
      },
      { emailPort },
    );

    const share = store.financePublicationShare.find((s) => s.shareKind === "DISTRIBUTION");
    expect(share?.publicToken).toBeTruthy();

    const viewAccess = await resolveFinancePublicationShareByRawToken(prisma, share!.publicToken!);
    expect(viewAccess.ok).toBe(true);
    if (!viewAccess.ok) return;
    expect(viewAccess.versionNumber).toBe(1);
    expect(viewAccess.publicationVersionId).toBe(share!.publicationVersionId);

    const pdfAccess = await loadFinancePublicationShareContextForPdf(prisma, share!.publicToken!);
    expect(pdfAccess.ok).toBe(true);
    if (!pdfAccess.ok) return;
    expect(pdfAccess.publicationVersionId).toBe(viewAccess.publicationVersionId);
  });

  it("binds DISTRIBUTION link to the version distributed, not the latest publication version", async () => {
    const { prisma, store } = distributionSetup();
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    const v1Row = store.financePublicationVersion.find((v) => v.versionNumber === 1)!;
    const v1Snapshot = v1Row.snapshotPayloadJson;

    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({
        tenantId: tenantA,
        financeYearId: yearId,
        managementResultMinor: R5_V1_BASELINE.managementResultMinor + 500_000,
      }),
    );
    await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });

    const send = vi.fn().mockResolvedValue({
      provider: "mock",
      providerMessageId: "msg-v1",
      from: "noreply@test",
    });
    await createFinancePublicationDistribution(
      prisma,
      ctx(tenantA, distributePerms),
      {
        publicationId: published.publicationId,
        versionNumber: 1,
        idempotencyKey: "idem-r4-version-pin",
        localeCode: "de",
        recipients: [{ kind: "EXTERNAL", email: "board@example.com" }],
        emailLabels,
      },
      { emailPort: { send } },
    );

    const share = store.financePublicationShare.find((s) => s.shareKind === "DISTRIBUTION");
    const access = await resolveFinancePublicationShareByRawToken(prisma, share!.publicToken!);
    expect(access.ok).toBe(true);
    if (!access.ok) return;
    expect(access.versionNumber).toBe(1);
    expect(access.publicationVersionId).toBe(v1Row.id);
    expect(v1Row.snapshotPayloadJson).toEqual(v1Snapshot);
    expect(access.snapshot.publicationVersion).toBe(1);
  });

  it("keeps DEFAULT and ADVANCED shares valid alongside DISTRIBUTION", async () => {
    const store = createPublicationShareMockStore();
    store.financeYear.push({ id: yearId, tenantId: tenantA, name: "FY 2026" });
    const prisma = makePublicationShareMockPrisma(store);
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    const version = store.financePublicationVersion[0]!;

    for (const [kind, token] of [
      ["DEFAULT", "tok-default-r4"],
      ["ADVANCED", "tok-advanced-r4"],
      ["DISTRIBUTION", "tok-distribution-r4"],
    ] as const) {
      store.financePublicationShare.push({
        id: `share-${kind}`,
        tenantId: tenantA,
        publicationId: published.publicationId,
        publicationVersionId: version.id,
        publicToken: token,
        tokenHash: null,
        shareKind: kind,
        expiresAt: kind === "ADVANCED" ? new Date(Date.now() + 86_400_000) : null,
        revokedAt: null,
        revokedByUserId: null,
        createdByUserId: "user-1",
        lastAccessedAt: null,
        accessCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    for (const token of ["tok-default-r4", "tok-advanced-r4", "tok-distribution-r4"]) {
      const access = await resolveFinancePublicationShareByRawToken(prisma, token);
      expect(access.ok).toBe(true);
    }
  });

  it("blocks revoked and expired shares including DISTRIBUTION", async () => {
    const store = createPublicationShareMockStore();
    store.financeYear.push({ id: yearId, tenantId: tenantA, name: "FY 2026" });
    const prisma = makePublicationShareMockPrisma(store);
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    const version = store.financePublicationVersion[0]!;

    store.financePublicationShare.push({
      id: "share-revoked",
      tenantId: tenantA,
      publicationId: published.publicationId,
      publicationVersionId: version.id,
      publicToken: "tok-revoked-dist",
      tokenHash: null,
      shareKind: "DISTRIBUTION",
      expiresAt: null,
      revokedAt: new Date(),
      revokedByUserId: "user-1",
      createdByUserId: "user-1",
      lastAccessedAt: null,
      accessCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    store.financePublicationShare.push({
      id: "share-expired",
      tenantId: tenantA,
      publicationId: published.publicationId,
      publicationVersionId: version.id,
      publicToken: "tok-expired-adv",
      tokenHash: null,
      shareKind: "ADVANCED",
      expiresAt: new Date(Date.now() - 60_000),
      revokedAt: null,
      revokedByUserId: null,
      createdByUserId: "user-1",
      lastAccessedAt: null,
      accessCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(
      deriveFinancePublicationShareStatus({
        revokedAt: new Date(),
        expiresAt: null,
      }),
    ).toBe("REVOKED");

    const revoked = await resolveFinancePublicationShareByRawToken(prisma, "tok-revoked-dist");
    expect(revoked.ok).toBe(false);
    const expired = await resolveFinancePublicationShareByRawToken(prisma, "tok-expired-adv");
    expect(expired.ok).toBe(false);
  });

  it("enforces tenant isolation for DISTRIBUTION tokens", async () => {
    const store = createPublicationShareMockStore();
    store.financeYear.push({ id: yearId, tenantId: tenantA, name: "FY 2026" });
    const prisma = makePublicationShareMockPrisma(store);
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    const version = store.financePublicationVersion[0]!;
    store.financePublicationShare.push({
      id: "share-cross-tenant",
      tenantId: tenantA,
      publicationId: published.publicationId,
      publicationVersionId: version.id,
      publicToken: "tok-cross-tenant",
      tokenHash: null,
      shareKind: "DISTRIBUTION",
      expiresAt: null,
      revokedAt: null,
      revokedByUserId: null,
      createdByUserId: "user-1",
      lastAccessedAt: null,
      accessCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    version.tenantId = "tenant-b";

    const access = await resolveFinancePublicationShareByRawToken(prisma, "tok-cross-tenant");
    expect(access.ok).toBe(false);
  });
});

describe("FIN-06E-R4 distribution email public URLs", () => {
  it("uses tenant canonical public host for view and PDF capability links", () => {
    const token = "distribution-capability-token";
    const rendered = buildFinancePublicationDistributionEmail({
      labels: emailLabels,
      tenantName: "FC Allschwil",
      reportTitle: "Finanzbericht",
      financeYearLabel: "FY 2026",
      versionNumber: 4,
      publishedAtLabel: "26.10.2026",
      senderDisplayName: null,
      optionalMessage: null,
      sharePublicToken: token,
      locale: "de",
    });

    const expectedView = buildNotificationAbsoluteHref(financePublicationSharePath(token));
    const expectedPdf = buildNotificationAbsoluteHref(financePublicationSharePdfApiPath(token));

    expect(expectedView).toBe("https://fcallschwil.sportclubevo.com/share/finance/publication/distribution-capability-token");
    expect(expectedPdf).toBe(
      "https://fcallschwil.sportclubevo.com/api/share/finance/publication/distribution-capability-token/pdf",
    );
    expect(rendered.html).toContain(expectedView);
    expect(rendered.html).toContain(expectedPdf);
    expect(rendered.html).not.toContain("vercel.app");
  });
});

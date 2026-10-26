process.env.APP_BASE_URL = "https://app.test";

import { describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildPoBaselineManagementPnlReadModel,
  R5_V1_BASELINE,
} from "@/lib/finance/uat/sce-finance-06b-r5-immutability-uat";
import { publishFinanceManagementPnlSnapshot } from "@/lib/finance/services/finance-publication-service";
import * as managementReporting from "@/lib/finance/services/finance-management-reporting-query-service";
import {
  canDistributeFinancialReports,
  canShareFinancialReports,
} from "@/lib/finance/publishing/finance-publishing-authorization";
import { FINANCE_06E_PUBLICATION_DISTRIBUTION_MODEL } from "@/lib/finance/publishing/finance-publishing-sharing-architecture-contract";
import { FINANCE_06E_PUBLICATION_HISTORY_CONTRACT } from "@/lib/finance/publishing/finance-publication-distribution-contract";
import {
  createFinancePublicationDistribution,
  getFinancePublicationDistributionDetail,
  listFinancePublicationDistributionSummariesForVersion,
} from "@/lib/finance/services/finance-publication-distribution-service";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  FinancePublicationDistributionEmailDeliveryError,
  type FinancePublicationDistributionEmailPort,
} from "@/lib/finance/delivery/finance-publication-distribution-email-port";
import { FINANCE_PUBLICATION_DISTRIBUTION_AUDIT } from "@/lib/finance/audit/finance-publication-distribution-audit";
import {
  createPublicationDistributionMockStore,
  makePublicationDistributionMockPrisma,
} from "@/lib/finance/__tests__/finance-06e-publication-distribution-mock-db";

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

const distributePerms = [
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FINANCE_PUBLICATION_VIEW,
  PERMISSIONS.FINANCE_REPORTING_DISTRIBUTE,
];

const shareOnly = [
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FINANCE_PUBLICATION_VIEW,
  PERMISSIONS.FINANCE_REPORTING_SHARE,
];

const viewOnly = [PERMISSIONS.FINANCE_VIEW, PERMISSIONS.FINANCE_PUBLICATION_VIEW];

const emailLabels = {
  subject: "{tenant} — {year} v{version}",
  greeting: "Hi",
  intro: "Report {report}",
  optionalMessageHeading: "Note",
  viewReportCta: "View",
  downloadPdfCta: "PDF",
  footer: "{tenant}",
};

function mockEmailPort(send = vi.fn()): FinancePublicationDistributionEmailPort {
  send.mockResolvedValue({
    provider: "mock",
    providerMessageId: "msg-1",
    from: "noreply@test",
  });
  return { send };
}

function setupDistribution() {
  const store = createPublicationDistributionMockStore();
  store.financeYear.push({ id: yearId, tenantId: tenantA, name: "FY 2026" });
  store.tenant.push({ id: tenantA, name: "Club A" });
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
  const prisma = makePublicationDistributionMockPrisma(store);
  return { store, prisma };
}

describe("FIN-06E publication distribution architecture", () => {
  it("documents distribution boundaries separate from share and live report", () => {
    expect(FINANCE_06E_PUBLICATION_DISTRIBUTION_MODEL.neverEmailLiveFin05Report).toBe(true);
    expect(FINANCE_06E_PUBLICATION_HISTORY_CONTRACT.PUBLICATION_HISTORY_DEPENDS_ON_DISTRIBUTION).toBe(
      false,
    );
  });
});

describe("FIN-06E permissions", () => {
  it("separates share and distribute", () => {
    expect(canShareFinancialReports(ctx(tenantA, shareOnly))).toBe(true);
    expect(canDistributeFinancialReports(ctx(tenantA, shareOnly))).toBe(false);
    expect(canDistributeFinancialReports(ctx(tenantA, distributePerms))).toBe(true);
    expect(canDistributeFinancialReports(ctx(tenantA, viewOnly))).toBe(false);
  });
});

describe("FIN-06E distribution service", () => {
  it("binds distribution to publicationVersionId and sends per recipient", async () => {
    const { prisma, store } = setupDistribution();
    const send = vi.fn();
    const emailPort = mockEmailPort(send);
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });

    const result = await createFinancePublicationDistribution(
      prisma,
      ctx(tenantA, distributePerms),
      {
        publicationId: published.publicationId,
        versionNumber: 1,
        idempotencyKey: "idem-1",
        localeCode: "en",
        recipients: [{ kind: "PERSON", personId: "person-1" }],
        emailLabels,
      },
      { emailPort },
    );

    expect(result.sentCount).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]?.to).toBe("berta@example.com");

    const distribution = store.financePublicationDistribution[0];
    expect(distribution?.publicationVersionId).toBeTruthy();
    const share = store.financePublicationShare.find((s) => s.shareKind === "DISTRIBUTION");
    expect(share?.publicationVersionId).toBe(distribution?.publicationVersionId);
  });

  it("resumes PROCESSING distributions without duplicate shares or emails", async () => {
    const { prisma, store } = setupDistribution();
    const send = vi.fn().mockResolvedValue({
      provider: "mock",
      providerMessageId: "msg-resume",
      from: "noreply@test",
    });
    const emailPort = mockEmailPort(send);
    vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel").mockResolvedValue(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    const versionRow = store.financePublicationVersion.find((v) => v.versionNumber === 1);
    const shareId = "share-resume-1";
    const publicToken = "tok-resume-public";
    store.financePublicationShare.push({
      id: shareId,
      tenantId: tenantA,
      publicationId: published.publicationId,
      publicationVersionId: versionRow!.id,
      publicToken,
      tokenHash: null,
      shareKind: "DISTRIBUTION",
      expiresAt: null,
      createdByUserId: "user-1",
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    store.financePublicationDistribution.push({
      id: "dist-processing",
      tenantId: tenantA,
      publicationId: published.publicationId,
      publicationVersionId: versionRow!.id,
      createdByUserId: "user-1",
      optionalMessage: null,
      status: "PROCESSING",
      idempotencyKey: "idem-processing",
      localeCode: "en",
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    });
    store.financePublicationDistributionRecipient.push({
      id: "rec-pending",
      tenantId: tenantA,
      distributionId: "dist-processing",
      personId: "person-1",
      recipientEmail: "berta@example.com",
      recipientDisplayName: "Berta Board",
      isExternalRecipient: false,
      publicationShareId: shareId,
      status: "PENDING",
      sentAt: null,
      failedAt: null,
      failureCode: null,
      deliveryMetadataJson: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const shareCountBefore = store.financePublicationShare.length;
    const result = await createFinancePublicationDistribution(
      prisma,
      ctx(tenantA, distributePerms),
      {
        publicationId: published.publicationId,
        versionNumber: 1,
        idempotencyKey: "idem-processing",
        localeCode: "en",
        recipients: [{ kind: "PERSON", personId: "person-1" }],
        emailLabels,
      },
      { emailPort },
    );

    expect(result.reused).toBe(true);
    expect(result.status).toBe("COMPLETED");
    expect(send).toHaveBeenCalledTimes(1);
    expect(store.financePublicationShare).toHaveLength(shareCountBefore);
    expect(store.financePublicationDistributionRecipient[0]?.status).toBe("SENT");
    expect(store.financePublicationDistribution[0]?.status).toBe("COMPLETED");
  });

  it("is idempotent for duplicate idempotency keys", async () => {
    const { prisma } = setupDistribution();
    const send = vi.fn();
    const emailPort = mockEmailPort(send);
    vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel").mockResolvedValue(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    const input = {
      publicationId: published.publicationId,
      versionNumber: 1,
      idempotencyKey: "idem-dup",
      localeCode: "en",
      recipients: [{ kind: "EXTERNAL", email: "ext@example.com" }],
      emailLabels,
    };
    await createFinancePublicationDistribution(prisma, ctx(tenantA, distributePerms), input, {
      emailPort,
    });
    const second = await createFinancePublicationDistribution(
      prisma,
      ctx(tenantA, distributePerms),
      input,
      { emailPort },
    );
    expect(second.reused).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("marks recipient and distribution failed when provider rejects", async () => {
    const { prisma, store } = setupDistribution();
    const send = vi.fn().mockRejectedValue(
      new FinancePublicationDistributionEmailDeliveryError(
        "PERMANENT_PROVIDER_FAILURE",
        "provider rejected",
        true,
      ),
    );
    const emailPort: FinancePublicationDistributionEmailPort = { send };
    vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel").mockResolvedValue(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    const result = await createFinancePublicationDistribution(
      prisma,
      ctx(tenantA, distributePerms),
      {
        publicationId: published.publicationId,
        versionNumber: 1,
        idempotencyKey: "idem-reject",
        localeCode: "en",
        recipients: [{ kind: "EXTERNAL", email: "ext@example.com" }],
        emailLabels,
      },
      { emailPort },
    );
    expect(result.status).toBe("FAILED");
    expect(result.primaryFailureCode).toBe("PERMANENT_PROVIDER_FAILURE");
    expect(store.financePublicationDistributionRecipient[0]?.status).toBe("FAILED");
  });

  it("preserves partial failure per recipient", async () => {
    const { prisma, store } = setupDistribution();
    store.person.push({
      id: "person-2",
      tenantId: tenantA,
      firstName: "Carl",
      lastName: "Committee",
      displayName: null,
      email: "carl@example.com",
      isActive: true,
    });
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        provider: "mock",
        providerMessageId: "ok",
        from: "noreply@test",
      })
      .mockRejectedValueOnce(new Error("provider down"));
    const emailPort: FinancePublicationDistributionEmailPort = { send };
    vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel").mockResolvedValue(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    const result = await createFinancePublicationDistribution(
      prisma,
      ctx(tenantA, distributePerms),
      {
        publicationId: published.publicationId,
        versionNumber: 1,
        idempotencyKey: "idem-partial",
        localeCode: "en",
        recipients: [
          { kind: "PERSON", personId: "person-1" },
          { kind: "PERSON", personId: "person-2" },
        ],
        emailLabels,
      },
      { emailPort },
    );
    expect(result.sentCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.status).toBe("PARTIAL");
  });

  it("denies cross-tenant distribution history", async () => {
    const { prisma } = setupDistribution();
    vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel").mockResolvedValue(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    const emailPort = mockEmailPort(vi.fn());
    const created = await createFinancePublicationDistribution(
      prisma,
      ctx(tenantA, distributePerms),
      {
        publicationId: published.publicationId,
        versionNumber: 1,
        idempotencyKey: "idem-tenant",
        localeCode: "en",
        recipients: [{ kind: "EXTERNAL", email: "ext@example.com" }],
        emailLabels,
      },
      { emailPort },
    );
    await expect(
      getFinancePublicationDistributionDetail(prisma, ctx(tenantB, distributePerms), {
        distributionId: created.distributionId,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_NOT_FOUND" });
  });

  it("records audit without raw tokens", async () => {
    const { prisma, store } = setupDistribution();
    const emailPort = mockEmailPort(vi.fn());
    vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel").mockResolvedValue(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    await createFinancePublicationDistribution(prisma, ctx(tenantA, distributePerms), {
      publicationId: published.publicationId,
      versionNumber: 1,
      idempotencyKey: "idem-audit",
      localeCode: "de",
      recipients: [{ kind: "EXTERNAL", email: "audit@example.com" }],
      emailLabels,
    }, { emailPort });

    const auditJson = JSON.stringify(store.auditLog);
    expect(auditJson).toContain(FINANCE_PUBLICATION_DISTRIBUTION_AUDIT.actions.created);
    expect(auditJson).not.toMatch(/publicToken|tokenHash/);
    expect(auditJson).not.toContain("audit@example.com");
  });

  it("lists distribution history lazily without coupling publication history load", async () => {
    const { prisma } = setupDistribution();
    vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel").mockResolvedValue(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    const emailPort = mockEmailPort(vi.fn());
    await createFinancePublicationDistribution(prisma, ctx(tenantA, distributePerms), {
      publicationId: published.publicationId,
      versionNumber: 1,
      idempotencyKey: "idem-list",
      localeCode: "en",
      recipients: [{ kind: "EXTERNAL", email: "list@example.com" }],
      emailLabels,
    }, { emailPort });

    const history = await listFinancePublicationDistributionSummariesForVersion(
      prisma,
      ctx(tenantA, distributePerms),
      { publicationId: published.publicationId, versionNumber: 1 },
    );
    expect(history.distributions).toHaveLength(1);
    expect(history.distributions[0]?.recipientCount).toBe(1);
  });

  it("keeps published v1 snapshot immutable when v2 is published", async () => {
    const { prisma, store } = setupDistribution();
    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    const v1Before = store.financePublicationVersion.find((v) => v.versionNumber === 1)?.snapshotPayloadJson;
    loader.mockResolvedValueOnce(
      buildPoBaselineManagementPnlReadModel({
        tenantId: tenantA,
        financeYearId: yearId,
        managementResultMinor: R5_V1_BASELINE.managementResultMinor + 999_999,
      }),
    );
    await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
      financeYearId: yearId,
    });
    const v1After = store.financePublicationVersion.find((v) => v.versionNumber === 1)?.snapshotPayloadJson;
    expect(v1After).toEqual(v1Before);
  });
});

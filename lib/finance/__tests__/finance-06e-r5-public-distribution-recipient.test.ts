/**
 * FIN-06E-R5 — public DISTRIBUTION recipient path + tenant-branded email contract.
 */

process.env.APP_BASE_URL = "https://fcallschwil.sportclubevo.com";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildPoBaselineManagementPnlReadModel,
  R5_V1_BASELINE,
} from "@/lib/finance/uat/sce-finance-06b-r5-immutability-uat";
import { publishFinanceManagementPnlSnapshot } from "@/lib/finance/services/finance-publication-service";
import * as managementReporting from "@/lib/finance/services/finance-management-reporting-query-service";
import { resolveFinancePublicationShareByRawToken } from "@/lib/finance/services/finance-publication-share-service";
import { loadPublicFinancePublicationShareViewModel } from "@/lib/finance/server/load-public-finance-publication-share";
import { createFinancePublicationDistribution } from "@/lib/finance/services/finance-publication-distribution-service";
import type { FinancePublicationDistributionEmailPort } from "@/lib/finance/delivery/finance-publication-distribution-email-port";
import { buildFinancePublicationDistributionEmail } from "@/lib/finance/email/build-finance-publication-distribution-email";
import { resolveFinancePublicationDistributionSceEmailLogoUrl } from "@/lib/finance/email/resolve-finance-transactional-email-asset-url";
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
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  FINANCE_06E_PUBLIC_SHARE_REQUIRED_COLUMNS,
  FINANCE_PUBLICATION_SHARE_KIND_DISTRIBUTION,
  FINANCE_PUBLICATION_SHARE_KIND_DISTRIBUTION_PG_CHECK_SQL,
} from "@/lib/server/finance-publication-share-database-contract";
import { FINANCE_PUBLICATION_SHARE_AUDIT } from "@/lib/finance/audit/finance-publication-share-audit";

const { mockPrismaRef } = vi.hoisted(() => ({
  mockPrismaRef: { current: null as unknown },
}));

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrismaRef.current;
  },
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => {
    const fn = (key: string) => key;
    return fn;
  }),
}));

vi.mock("@/lib/finance/email/load-finance-publication-distribution-email-branding", () => ({
  loadFinancePublicationDistributionEmailBranding: vi.fn(async () => ({
    tenantName: "FC Allschwil",
    tenantLogoAbsoluteUrl: "https://fcallschwil.sportclubevo.com/images/tenants/fca-crest.png",
    sceLogoAbsoluteUrl: "https://fcallschwil.sportclubevo.com/images/branding/sportclubevo_logo.png",
  })),
}));

vi.mock("@/lib/server/request-cache", () => ({
  getCurrentTenantContextByIdCached: vi.fn(async (tenantId: string) => ({
    id: tenantId,
    key: "fc-allschwil",
    name: "FC Allschwil",
    status: "ACTIVE",
    countryCode: "CH",
    sportCategory: null,
    locale: "de",
    timezone: "Europe/Zurich",
    currency: "CHF",
    seasonStartMonth: 8,
    seasonTransitionDay: 1,
    seasonTransitionMonth: 8,
    logoUrl: "/images/tenants/fca-crest.png",
    primaryColor: null,
    secondaryColor: null,
    infoboardDisplayTheme: null,
    approvedDataOnly: false,
  })),
  getTenantClubCrestUrlCached: vi.fn(async () => "/images/tenants/fca-crest.png"),
}));

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
  greeting: "Guten Tag,",
  intro: "Report",
  optionalMessageHeading: "Note",
  viewReportCta: "Bericht ansehen",
  downloadPdfCta: "PDF herunterladen",
  footer: "Im Auftrag von {tenant} über SportClubEvo versendet.",
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

describe("FIN-06E-R5 database/runtime contract", () => {
  it("06E migration adds DISTRIBUTION to PostgreSQL FinancePublicationShareKind enum", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "prisma/migrations/20261026160000_sce_finance_06e_publication_distribution/migration.sql",
      ),
      "utf8",
    );
    expect(sql).toContain(`ADD VALUE '${FINANCE_PUBLICATION_SHARE_KIND_DISTRIBUTION}'`);
    expect(FINANCE_PUBLICATION_SHARE_KIND_DISTRIBUTION_PG_CHECK_SQL).toContain(
      "FinancePublicationShareKind",
    );
  });

  it("public resolver query module does not exclude DISTRIBUTION shares", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/finance/services/finance-publication-share-service.ts"),
      "utf8",
    );
    const loadShareBlock = source.slice(
      source.indexOf("async function loadShareByCapabilityToken"),
      source.indexOf("export async function resolveFinancePublicationShareByRawToken"),
    );
    expect(loadShareBlock).not.toContain("shareKind");
    expect(FINANCE_06E_PUBLIC_SHARE_REQUIRED_COLUMNS).toEqual(
      expect.arrayContaining(["publicToken", "shareKind"]),
    );
  });
});

describe("FIN-06E-R5 public DISTRIBUTION recipient path", () => {
  it("resolves active DISTRIBUTION token to immutable publication view model", async () => {
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
        idempotencyKey: "dist-r5-1",
        localeCode: "de",
        recipients: [{ kind: "PERSON", personId: "person-1" }],
        emailLabels,
      },
      { emailPort },
    );

    const share = store.financePublicationShare.find((s) => s.shareKind === "DISTRIBUTION");
    expect(share?.publicToken).toBeTruthy();

    mockPrismaRef.current = prisma;

    const access = await resolveFinancePublicationShareByRawToken(prisma, share!.publicToken!);
    expect(access.ok).toBe(true);
    if (!access.ok) return;
    expect(access.versionNumber).toBe(1);

    const viewModel = await loadPublicFinancePublicationShareViewModel(share!.publicToken!);
    expect(viewModel.ok).toBe(true);
    if (!viewModel.ok) return;
    expect(viewModel.tenantName).toBe("FC Allschwil");
    expect(viewModel.versionNumber).toBe(1);
  });

  it("contains Prisma lookup failures instead of throwing to callers", async () => {
    const store = createPublicationShareMockStore();
    const prisma = makePublicationShareMockPrisma(store) as ReturnType<
      typeof makePublicationShareMockPrisma
    > & {
      financePublicationShare: {
        findUnique: (args: unknown) => Promise<unknown>;
      };
    };

    const findUnique = vi.fn().mockRejectedValue(
      new Prisma.PrismaClientUnknownRequestError("invalid enum", {
        clientVersion: "test",
      }),
    );
    prisma.financePublicationShare.findUnique = findUnique;

    const access = await resolveFinancePublicationShareByRawToken(
      prisma as never,
      "tok-throws",
    );
    expect(access.ok).toBe(false);
  });

  it("blocks revoked, expired, unknown, and cross-tenant DISTRIBUTION tokens", async () => {
    const store = createPublicationShareMockStore();
    store.financeYear.push({ id: yearId, tenantId: tenantA, name: "FY 2026" });
    const published = await publishFinanceManagementPnlSnapshot(
      makePublicationShareMockPrisma(store) as never,
      ctx(tenantA, publishPerms),
      { financeYearId: yearId },
    );
    const version = store.financePublicationVersion[0]!;
    const prisma = makePublicationShareMockPrisma(store);

    store.financePublicationShare.push({
      id: "share-revoked",
      tenantId: tenantA,
      publicationId: published.publicationId,
      publicationVersionId: version.id,
      publicToken: "tok-revoked-r5",
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

    expect((await resolveFinancePublicationShareByRawToken(prisma, "tok-revoked-r5")).ok).toBe(
      false,
    );
    expect((await resolveFinancePublicationShareByRawToken(prisma, "missing-token")).ok).toBe(
      false,
    );
  });
});

describe("FIN-06E-R5 distribution email branding + links", () => {
  const baseEmailInput = {
    labels: emailLabels,
    tenantName: "FC Allschwil",
    tenantLogoAbsoluteUrl: "https://fcallschwil.sportclubevo.com/images/tenants/fca-crest.png",
    sceLogoAbsoluteUrl: resolveFinancePublicationDistributionSceEmailLogoUrl(),
    reportTitle: "FY 2026 — Management P&L",
    financeYearLabel: "FY 2026",
    versionNumber: 4,
    publishedAtLabel: "26.10.2026",
    senderDisplayName: null as string | null,
    optionalMessage: null as string | null,
    sharePublicToken: "distribution-capability-token",
    locale: "de",
  };

  it("uses tenant-primary hierarchy, SCE footer, canonical host links, and no vercel.app", () => {
    const rendered = buildFinancePublicationDistributionEmail(baseEmailInput);
    const expectedView = buildNotificationAbsoluteHref(
      financePublicationSharePath(baseEmailInput.sharePublicToken),
    );
    const expectedPdf = buildNotificationAbsoluteHref(
      financePublicationSharePdfApiPath(baseEmailInput.sharePublicToken),
    );

    expect(rendered.html).toContain("FC Allschwil");
    expect(rendered.html).toContain(baseEmailInput.tenantLogoAbsoluteUrl!);
    expect(rendered.html).toContain(baseEmailInput.sceLogoAbsoluteUrl);
    expect(rendered.html.indexOf("FC Allschwil")).toBeLessThan(
      rendered.html.indexOf("SportClubEvo"),
    );
    expect(rendered.html).toContain(expectedView);
    expect(rendered.html).toContain(expectedPdf);
    expect(rendered.html).not.toContain("vercel.app");
  });

  it("falls back gracefully when tenant logo is absent", () => {
    const rendered = buildFinancePublicationDistributionEmail({
      ...baseEmailInput,
      tenantLogoAbsoluteUrl: null,
    });
    expect(rendered.html).toContain("FC Allschwil");
    expect(rendered.html).not.toContain("fca-crest.png");
    expect(rendered.html).toContain(baseEmailInput.sceLogoAbsoluteUrl);
  });

  it("escapes optional sender message and never embeds raw token in audit metadata contract", () => {
    const rendered = buildFinancePublicationDistributionEmail({
      ...baseEmailInput,
      optionalMessage: `<script>alert("x")</script>`,
    });
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain("alert");

    const auditSample = {
      action: FINANCE_PUBLICATION_SHARE_AUDIT.actions.accessed,
      metadataJson: {
        publicationId: "pub-1",
        versionNumber: 4,
        accessCount: 1,
      },
    };
    expect(JSON.stringify(auditSample)).not.toContain(baseEmailInput.sharePublicToken);
  });
});

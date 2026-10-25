import { describe, expect, it, vi, beforeEach } from "vitest";
import { createRequire } from "node:module";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse") as {
  PDFParse: new (options: { data: Buffer }) => {
    getText: () => Promise<{ text: string }>;
    destroy?: () => Promise<void>;
  };
};

async function extractPdfText(pdfBytes: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: Buffer.from(pdfBytes) });
  const result = await parser.getText();
  if (parser.destroy) {
    await parser.destroy();
  }
  return result.text;
}
import {
  FINANCE_06C_R1_IMPLEMENTATION,
  FINANCE_PUBLICATION_ARTIFACT_PIPELINE,
  FINANCE_PUBLICATION_PDF_ARTIFACT,
} from "@/lib/finance/publishing/finance-publication-artifact-contract";
import {
  FINANCE_06C_PDF_ARTIFACT_REQUIREMENT,
  FINANCE_06C_PRODUCT_MODEL,
} from "@/lib/finance/publishing/finance-publishing-sharing-architecture-contract";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  createPublicationMockStore,
  makePublicationMockPrisma,
} from "@/lib/finance/__tests__/finance-06b-publication-mock-db";
import {
  publishFinanceManagementPnlSnapshot,
  loadFinancePublicationVersionSnapshot,
  assertFinancePublicationVersionNotMutated,
} from "@/lib/finance/services/finance-publication-service";
import { generateFinancePublicationPdfArtifactForTenant } from "@/lib/finance/services/finance-publication-artifact-service";
import * as managementReporting from "@/lib/finance/services/finance-management-reporting-query-service";
import {
  buildPoBaselineManagementPnlReadModel,
  metricsFromStoredSnapshot,
  R5_LIVE_AFTER_MUTATION,
  R5_V1_BASELINE,
  snapshotPayloadDigest,
} from "@/lib/finance/uat/sce-finance-06b-r5-immutability-uat";
import { formatFinanceManagementMoneyMinor } from "@/lib/finance/presentation/finance-money-presentation";
import { buildFinancePublicationPdfFilename } from "@/lib/finance/artifacts/finance-publication-pdf/sanitize-finance-publication-pdf-filename";
import { financePublicationPdfDownloadPath } from "@/lib/finance/presentation/finance-publication-pdf-download-path";
import type { FinancePublicationPdfLabels } from "@/lib/finance/artifacts/finance-publication-pdf/finance-publication-pdf-types";

vi.mock("@/lib/server/request-cache", () => ({
  getCurrentTenantContextByIdCached: vi.fn(async (tenantId: string) => ({
    id: tenantId,
    key: "tenant-a",
    name: "FC Allschwil",
    status: "ACTIVE",
    countryCode: "CH",
    sportCategory: null,
    locale: "de-CH",
    timezone: "Europe/Zurich",
    currency: "CHF",
    seasonStartMonth: 8,
    seasonTransitionDay: 1,
    seasonTransitionMonth: 8,
    logoUrl: null,
    primaryColor: null,
    secondaryColor: null,
    infoboardDisplayTheme: null,
    approvedDataOnly: false,
  })),
}));

const tenantA = "tenant-a";
const tenantB = "tenant-b";
const yearId = "fy-2026";

const publishPerms = [
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FINANCE_PUBLICATION_VIEW,
  PERMISSIONS.FINANCE_REPORTING_PUBLISH,
];

const viewPerms = [PERMISSIONS.FINANCE_VIEW, PERMISSIONS.FINANCE_PUBLICATION_VIEW];

function ctx(tenantId: string, permissions: string[]): FinanceAuthContext {
  return { tenantId, userId: "user-1", permissionKeys: new Set(permissions) };
}

const pdfLabels: FinancePublicationPdfLabels = {
  reportTypeLabel: "Management income statement",
  publishedVersionLabel: "Version {version}",
  financialYearLabel: "Financial year",
  executiveSummaryTitle: "Interpretation",
  expectedResultLabel: "Expected result",
  budgetResultLabel: "Budget result",
  actualResultLabel: "Actual",
  varianceVsBudgetLabel: "Variance vs budget",
  favorabilityFavorable: "Favorable",
  favorabilityUnfavorable: "Unfavorable",
  favorabilityOnPlan: "On plan",
  incomeSection: "Income",
  expenseSection: "Expenses",
  incomeSectionTotal: "Total income",
  expenseSectionTotal: "Total expenses",
  managementResult: "Result",
  columnBudget: "Budget",
  columnActual: "Actual",
  columnForecast: "Forecast",
  columnVariance: "Variance",
  unassignedGroup: "Unassigned",
  publishedAtLabel: "Published",
  pdfGeneratedAtLabel: "PDF generated",
  publicationReferenceLabel: "Publication",
  sportClubEvoDocumentMark: "SportClubEvo",
  pageLabel: "Page",
};

function setupMockDb() {
  const store = createPublicationMockStore();
  store.financeYear.push({ id: yearId, tenantId: tenantA, name: "FY 2026" });
  store.financeYear.push({ id: "fy-b", tenantId: tenantB, name: "FY 2026-B" });
  return { store, prisma: makePublicationMockPrisma(store) };
}

async function publishV1AndV2(prisma: ReturnType<typeof makePublicationMockPrisma>) {
  const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
  loader.mockResolvedValueOnce(
    buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
  );
  const v1 = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
    financeYearId: yearId,
  });
  loader.mockResolvedValueOnce(
    buildPoBaselineManagementPnlReadModel({
      tenantId: tenantA,
      financeYearId: yearId,
      mitgliedsForecastMinor: R5_LIVE_AFTER_MUTATION.mitgliedsbeitraegeForecastMinor,
    }),
  );
  const v2 = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
    financeYearId: yearId,
  });
  loader.mockRestore();
  return { v1, v2, loader };
}

describe("FIN-06C-R1 publication PDF artifact architecture", () => {
  it("records R1 implementation and artifact pipeline locks", () => {
    expect(FINANCE_06C_R1_IMPLEMENTATION.status).toBe("IMPLEMENTED_PO_UAT_PENDING");
    expect(FINANCE_06C_PRODUCT_MODEL.fin06cStatus).toBe("IN_PROGRESS");
    expect(FINANCE_PUBLICATION_ARTIFACT_PIPELINE.persistenceRequiredInR1).toBe(false);
    expect(FINANCE_PUBLICATION_ARTIFACT_PIPELINE.onDemandGenerationFromSnapshot).toBe(true);
    expect(FINANCE_PUBLICATION_PDF_ARTIFACT.technology).toBe("pdf-lib");
    expect(FINANCE_06C_PDF_ARTIFACT_REQUIREMENT.readPath[1]).toBe("snapshotPayloadJson");
  });
});

describe("FIN-06C-R1 publication PDF generation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("A immutability: PDF(V1) reflects snapshot A after live finance moves to C", async () => {
    const { prisma } = setupMockDb();
    const { v1 } = await publishV1AndV2(prisma);

    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
    loader.mockResolvedValue(
      buildPoBaselineManagementPnlReadModel({
        tenantId: tenantA,
        financeYearId: yearId,
        mitgliedsForecastMinor: 999_999_00,
      }),
    );

    const v1Read = await loadFinancePublicationVersionSnapshot(prisma, ctx(tenantA, viewPerms), {
      publicationId: v1.publicationId,
      versionNumber: 1,
    });
    expect(v1Read.ok).toBe(true);
    if (!v1Read.ok) return;
    const digestBefore = snapshotPayloadDigest(v1Read.snapshot);

    const pdf = await generateFinancePublicationPdfArtifactForTenant(prisma, ctx(tenantA, viewPerms), {
      publicationId: v1.publicationId,
      versionNumber: 1,
      labels: pdfLabels,
      reportTypeContentLabel: "Management income statement",
    });

    expect(pdf.ok).toBe(true);
    if (!pdf.ok) return;
    expect(loader).not.toHaveBeenCalled();
    expect(pdf.pdfBytes.length).toBeGreaterThan(100);
    expect(Buffer.from(pdf.pdfBytes).subarray(0, 5).toString("utf8")).toBe("%PDF-");

    const expectedResult = formatFinanceManagementMoneyMinor(
      R5_V1_BASELINE.forecastResultMinor,
      "CHF",
      "de-CH",
    );
    const parsed = { text: await extractPdfText(pdf.pdfBytes) };
    expect(parsed.text).toContain("FC Allschwil");
    expect(parsed.text.replace(/\u00a0/g, " ")).toContain(
      expectedResult.replace(/\u00a0/g, " "),
    );

    const v1After = await loadFinancePublicationVersionSnapshot(prisma, ctx(tenantA, viewPerms), {
      publicationId: v1.publicationId,
      versionNumber: 1,
    });
    if (!v1After.ok) throw new Error("version missing");
    expect(snapshotPayloadDigest(v1After.snapshot)).toBe(digestBefore);
  });

  it("B version differentiation: PDF(V1) and PDF(V2) differ on expected result", async () => {
    const { prisma } = setupMockDb();
    const { v1, v2 } = await publishV1AndV2(prisma);

    const pdf1 = await generateFinancePublicationPdfArtifactForTenant(
      prisma,
      ctx(tenantA, viewPerms),
      {
        publicationId: v1.publicationId,
        versionNumber: 1,
        labels: pdfLabels,
        reportTypeContentLabel: "Management income statement",
      },
    );
    const pdf2 = await generateFinancePublicationPdfArtifactForTenant(
      prisma,
      ctx(tenantA, viewPerms),
      {
        publicationId: v2.publicationId,
        versionNumber: 2,
        labels: pdfLabels,
        reportTypeContentLabel: "Management income statement",
      },
    );
    expect(pdf1.ok && pdf2.ok).toBe(true);
    if (!pdf1.ok || !pdf2.ok) return;

    const text1 = (await extractPdfText(pdf1.pdfBytes)).replace(/\u00a0/g, " ");
    const text2 = (await extractPdfText(pdf2.pdfBytes)).replace(/\u00a0/g, " ");
    const v1Amount = formatFinanceManagementMoneyMinor(
      R5_V1_BASELINE.forecastResultMinor,
      "CHF",
      "de-CH",
    ).replace(/\u00a0/g, " ");
    const v2Amount = formatFinanceManagementMoneyMinor(
      R5_LIVE_AFTER_MUTATION.forecastResultMinor,
      "CHF",
      "de-CH",
    ).replace(/\u00a0/g, " ");
    expect(text1).toContain(v1Amount);
    expect(text2).toContain(v2Amount);
    expect(text1).not.toContain(v2Amount);
  });

  it("C tenant isolation and D permissions", async () => {
    const { prisma } = setupMockDb();
    const { v1 } = await publishV1AndV2(prisma);

    const foreign = await generateFinancePublicationPdfArtifactForTenant(
      prisma,
      ctx(tenantB, viewPerms),
      {
        publicationId: v1.publicationId,
        versionNumber: 1,
        labels: pdfLabels,
        reportTypeContentLabel: "Management income statement",
      },
    );
    expect(foreign).toEqual({ ok: false, notFound: true });

    const noView = await generateFinancePublicationPdfArtifactForTenant(
      prisma,
      ctx(tenantA, [PERMISSIONS.FINANCE_VIEW]),
      {
        publicationId: v1.publicationId,
        versionNumber: 1,
        labels: pdfLabels,
        reportTypeContentLabel: "Management income statement",
      },
    );
    expect(noView).toEqual({ ok: false, forbidden: true });
  });

  it("E content and F localization + H filename", async () => {
    const { prisma } = setupMockDb();
    const { v1 } = await publishV1AndV2(prisma);
    const pdf = await generateFinancePublicationPdfArtifactForTenant(
      prisma,
      ctx(tenantA, viewPerms),
      {
        publicationId: v1.publicationId,
        versionNumber: 1,
        labels: pdfLabels,
        reportTypeContentLabel: "Management income statement",
      },
    );
    expect(pdf.ok).toBe(true);
    if (!pdf.ok) return;

    expect(pdf.filename).toMatch(/Version-1\.pdf$/);
    expect(buildFinancePublicationPdfFilename({
      organisationName: "Müller & Söhne",
      reportTitle: "Erfolgsrechnung",
      financeYearLabel: "FY 2026",
      versionNumber: 2,
    })).toContain("Muller-Sohne");

    const body = await extractPdfText(pdf.pdfBytes);
    expect(body).toMatch(/Mitgliedsbeitr/i);
    const versionRead = await loadFinancePublicationVersionSnapshot(prisma, ctx(tenantA, viewPerms), {
      publicationId: v1.publicationId,
      versionNumber: 1,
    });
    expect(versionRead.ok).toBe(true);
    if (!versionRead.ok) return;
    expect(metricsFromStoredSnapshot(versionRead.snapshot).forecastResultMinor).toBe(
      R5_V1_BASELINE.forecastResultMinor,
    );
  });

  it("J snapshot immutability guard still holds after artifact generation", async () => {
    const { store, prisma } = setupMockDb();
    const { v1 } = await publishV1AndV2(prisma);
    const versionRow = store.financePublicationVersion.find(
      (v) => v.publicationId === v1.publicationId && v.versionNumber === 1,
    );
    expect(versionRow).toBeTruthy();
    const read = await loadFinancePublicationVersionSnapshot(prisma, ctx(tenantA, viewPerms), {
      publicationId: v1.publicationId,
      versionNumber: 1,
    });
    if (!read.ok) throw new Error("missing");
    await generateFinancePublicationPdfArtifactForTenant(prisma, ctx(tenantA, viewPerms), {
      publicationId: v1.publicationId,
      versionNumber: 1,
      labels: pdfLabels,
      reportTypeContentLabel: "Management income statement",
    });
    await assertFinancePublicationVersionNotMutated(prisma, versionRow!.id, read.snapshot);
  });

  it("download path encodes publication identity", () => {
    expect(
      financePublicationPdfDownloadPath({
        publicationId: "pub/id",
        versionNumber: 2,
      }),
    ).toBe("/api/dashboard/finance/publications/pub%2Fid/versions/2/pdf");
  });
});

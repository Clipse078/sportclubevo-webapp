import { describe, expect, it, vi, beforeEach } from "vitest";
import { createRequire } from "node:module";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildFinancePublicationPdfLabels } from "@/lib/finance/presentation/load-finance-publication-pdf-labels";
import { derivePublicationVarianceDriversFromSemantic } from "@/lib/finance/presentation/derive-publication-variance-drivers-from-semantic";
import { generateFinancePublicationPdf } from "@/lib/finance/artifacts/finance-publication-pdf/generate-finance-publication-pdf";
import { buildFinancePublishedManagementPnlInspectionReadModel } from "@/lib/finance/presentation/build-finance-published-management-pnl-read-model";
import { buildFinancePublicationSnapshotV1 } from "@/lib/finance/publishing/build-finance-publication-snapshot-v1";
import {
  FINANCE_06C_R2_IMPLEMENTATION,
  FINANCE_06C_R3_IMPLEMENTATION,
} from "@/lib/finance/publishing/finance-publication-artifact-contract";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  createPublicationMockStore,
  makePublicationMockPrisma,
} from "@/lib/finance/__tests__/finance-06b-publication-mock-db";
import {
  publishFinanceManagementPnlSnapshot,
  loadFinancePublicationVersionSnapshot,
} from "@/lib/finance/services/finance-publication-service";
import { generateFinancePublicationPdfArtifactForTenant } from "@/lib/finance/services/finance-publication-artifact-service";
import * as managementReporting from "@/lib/finance/services/finance-management-reporting-query-service";
import {
  buildPoBaselineManagementPnlReadModel,
  R5_LIVE_AFTER_MUTATION,
  R5_V1_BASELINE,
} from "@/lib/finance/uat/sce-finance-06b-r5-immutability-uat";
import { formatFinanceManagementMoneyMinor } from "@/lib/finance/presentation/finance-money-presentation";
import { financePublicationPdfContentDisposition } from "@/lib/finance/artifacts/finance-publication-pdf/sanitize-finance-publication-pdf-filename";
import type { FinanceManagementPnlReadModel } from "@/lib/finance/reporting/finance-management-pnl-read-model";
import type { SerializedManagementPnlTreeNode } from "@/lib/finance/presentation/serialize-management-pnl-read-model";

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
  if (parser.destroy) await parser.destroy();
  return result.text;
}

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

const deLabels = buildFinancePublicationPdfLabels({
  overview: (k) =>
    ({ reportingIncome: "Einnahmen", reportingExpense: "Ausgaben", reportingResult: "Ergebnis" })[
      k as "reportingIncome"
    ] ?? k,
  publication: (k, v) => {
    const map: Record<string, string> = {
      pdfFinancialReportHeading: "Finanzbericht {year}",
      pdfReportTypeSubtitle: "Management-Erfolgsrechnung",
      pdfOfficialPublicationLine: "Offizielle Veröffentlichung · Version {version}",
      publishedAtLabel: "Veröffentlicht",
      pdfGeneratedAtLabel: "PDF erzeugt",
      pdfHeroVarianceVsBudget: "gegenüber Budget",
      pdfPublicationInfoTitle: "Publikationsinformationen",
      versionLabel: "Version {version}",
      pdfForecastSupportingLabel: "Prognose",
      pdfManagementAssessmentTitle: "Management-Einschätzung",
      pdfStatementSectionTitle: "Erfolgsrechnung",
      pdfAmountsInCurrency: "Beträge in {currency}",
      pdfColumnVarianceVsBudget: "Abw. Budget",
      pdfExpectedResultLabel: "Erwartetes Ergebnis (Prognose)",
      pdfBudgetResultLabel: "Budgetiertes Ergebnis",
      pdfActualToDateLabel: "Ist (bisher)",
      pdfPositiveDriverLabel: "Positiver Treiber",
      pdfNegativeDriverLabel: "Negativer Treiber",
      pdfMajorDeviationsTitle: "Wesentliche Abweichungen",
      pdfDeviationCommentFavorable: "Günstige Abweichung gegenüber Budget",
      pdfDeviationCommentUnfavorable: "Ungünstige Abweichung gegenüber Budget",
      pdfMetadataOrganisationLabel: "Organisation",
      pdfMetadataFinanceYearLabel: "Finanzjahr",
      pdfMetadataReportTypeLabel: "Berichtstyp",
      pdfMetadataVersionLabel: "Version",
      pdfMetadataPublishedAtLabel: "Veröffentlicht am",
      pdfMetadataPdfGeneratedAtLabel: "PDF erstellt am",
      pdfSnapshotImmutabilityNotice: "Snapshot-Hinweis",
      pdfColumnPosition: "Position",
      pdfColumnDeviation: "Abweichung",
      pdfColumnComment: "Kommentar",
      pdfCreatedWithSportClubEvo: "Erstellt mit SportClubEvo",
      pdfPageOf: "Seite {page} / {total}",
    };
    let out = map[k] ?? k;
    if (v) {
      for (const [key, val] of Object.entries(v)) {
        out = out.replace(`{${key}}`, String(val));
      }
    }
    return out;
  },
  pnl: (k, v) => {
    const map: Record<string, string> = {
      expectedResult: "Erwartetes Jahresergebnis",
      budgetedResult: "Budget",
      columnActual: "Ist",
      columnBudget: "Budget",
      columnForecast: "Prognose",
      incomeSectionTotal: "Summe Einnahmen",
      expenseSectionTotal: "Summe Ausgaben",
      unassignedGroup: "Nicht zugeordnet",
      favorabilityFavorable: "Günstig",
      favorabilityUnfavorable: "Ungünstig",
      favorabilityOnPlan: "Im Plan",
      attentionResultFavorableTitle: "Ergebnis besser als geplant",
      attentionResultUnfavorableTitle: "Ergebnis unter Plan",
      attentionResultOnPlanTitle: "Im Plan",
      attentionResultFavorableDetail: "Die aktuelle Prognose liegt {amount} über dem genehmigten Budget.",
      attentionResultUnfavorableDetail: "Die aktuelle Prognose liegt {amount} unter dem genehmigten Budget.",
      attentionDriverExpenseSuffix: "Ausgaben",
    };
    let out = map[k] ?? k;
    if (v) {
      for (const [key, val] of Object.entries(v)) {
        out = out.replace(`{${key}}`, String(val));
      }
    }
    return out;
  },
  actuals: (k) =>
    ({
      favorabilityFavorable: "Günstig",
      favorabilityUnfavorable: "Ungünstig",
      favorabilityOnPlan: "Im Plan",
    })[k as "favorabilityFavorable"] ?? k,
});

const enLabels = buildFinancePublicationPdfLabels({
  overview: (k) =>
    ({
      reportingIncome: "Income",
      reportingExpense: "Expenses",
      reportingResult: "Result",
    })[k as "reportingIncome"] ?? k,
  publication: (k) =>
    ({
      pdfFinancialReportHeading: "Financial report {year}",
      pdfReportTypeSubtitle: "Management income statement",
      pdfOfficialPublicationLine: "Official publication · Version {version}",
      publishedAtLabel: "Published",
      pdfGeneratedAtLabel: "PDF generated",
      pdfHeroVarianceVsBudget: "vs. budget",
      pdfPublicationInfoTitle: "Publication information",
      versionLabel: "Version {version}",
      pdfForecastSupportingLabel: "Forecast",
      pdfManagementAssessmentTitle: "Management assessment",
      pdfStatementSectionTitle: "Income statement",
      pdfAmountsInCurrency: "Amounts in {currency}",
      pdfColumnVarianceVsBudget: "Var. Budget",
      pdfExpectedResultLabel: "Expected result (forecast)",
      pdfBudgetResultLabel: "Budgeted result",
      pdfActualToDateLabel: "Actual (YTD)",
      pdfPositiveDriverLabel: "Positive driver",
      pdfNegativeDriverLabel: "Negative driver",
      pdfMajorDeviationsTitle: "Material variances",
      pdfDeviationCommentFavorable: "Favorable variance vs budget",
      pdfDeviationCommentUnfavorable: "Unfavorable variance vs budget",
      pdfMetadataOrganisationLabel: "Organisation",
      pdfMetadataFinanceYearLabel: "Financial year",
      pdfMetadataReportTypeLabel: "Report type",
      pdfMetadataVersionLabel: "Version",
      pdfMetadataPublishedAtLabel: "Published on",
      pdfMetadataPdfGeneratedAtLabel: "PDF generated on",
      pdfSnapshotImmutabilityNotice: "Snapshot notice",
      pdfColumnPosition: "Position",
      pdfColumnDeviation: "Variance",
      pdfColumnComment: "Comment",
      pdfCreatedWithSportClubEvo: "Created with SportClubEvo",
      pdfPageOf: "Page {page} / {total}",
    })[k as "pdfFinancialReportHeading"] ?? k,
  pnl: (k) =>
    ({
      expectedResult: "Expected result",
      varianceVsBudget: "vs budget",
      budgetedResult: "Budget",
      columnActual: "Actual",
      columnBudget: "Budget",
      columnForecast: "Forecast",
      incomeSectionTotal: "Total income",
      expenseSectionTotal: "Total expenses",
      unassignedGroup: "Unassigned",
      attentionResultFavorableTitle: "Result better than plan",
      attentionResultUnfavorableTitle: "Result below plan",
      attentionResultOnPlanTitle: "On plan",
      attentionResultFavorableDetail: "Forecast is {amount} above budget.",
      attentionResultUnfavorableDetail: "Forecast is {amount} below budget.",
      attentionDriverExpenseSuffix: "expense",
    })[k as "expectedResult"] ?? k,
  actuals: (k) =>
    ({
      favorabilityFavorable: "Favorable",
      favorabilityUnfavorable: "Unfavorable",
      favorabilityOnPlan: "On plan",
    })[k as "favorabilityFavorable"] ?? k,
});

function setupMockDb() {
  const store = createPublicationMockStore();
  store.financeYear.push({ id: yearId, tenantId: tenantA, name: "FY 2026" });
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
  return { v1, v2 };
}

function buildLargeSyntheticPnl(): FinanceManagementPnlReadModel {
  const base = buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId });
  const extraAccounts: SerializedManagementPnlTreeNode[] = [];
  for (let i = 0; i < 45; i += 1) {
    extraAccounts.push({
      kind: "account",
      accountId: `acc-extra-${i}`,
      name: `Zusatzkonto ${i} — lange Bezeichnung für Drucktest`,
      reportingGroupId: "g-income",
      sortOrder: 100 + i,
      lifecycle: "ACTIVE",
      archivedAt: null,
      canonicalSemantic: "INCOME",
      approvedBudget: { availability: "AVAILABLE", amountMinor: 1_000_00 },
      actual: { availability: "AVAILABLE", amountMinor: 500_00 },
      currentForecast: { availability: "AVAILABLE", amountMinor: 1_200_00 },
      forecastVsBudget: {
        availability: "AVAILABLE",
        baselineMinor: 1_000_00,
        comparisonMinor: 1_200_00,
        rawDeltaMinor: 200_00,
        variancePercent: 20,
        favorability: "FAVORABLE",
        absoluteVarianceMagnitudeMinor: 200_00,
      },
    });
  }
  return {
    ...base,
    incomeSection: {
      ...base.incomeSection,
      nodes: [...base.incomeSection.nodes, ...extraAccounts],
    },
  };
}

describe("FIN-06C-R2 publication PDF design contract", () => {
  it("records R2 implementation status", () => {
    expect(FINANCE_06C_R2_IMPLEMENTATION.status).toBe("IMPLEMENTED");
    expect(FINANCE_06C_R2_IMPLEMENTATION.predecessor).toBe("FIN-06C-R1");
    expect(FINANCE_06C_R3_IMPLEMENTATION.status).toBe("IMPLEMENTED_PO_VISUAL_UAT_REFINEMENT_REQUIRED");
  });
});

describe("FIN-06C-R2 PDF semantic output", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("V1/V2 differentiation, drivers, German masthead, and no live loader", async () => {
    const { prisma } = setupMockDb();
    const { v1, v2 } = await publishV1AndV2(prisma);

    const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");

    const pdf1 = await generateFinancePublicationPdfArtifactForTenant(
      prisma,
      ctx(tenantA, viewPerms),
      {
        publicationId: v1.publicationId,
        versionNumber: 1,
        labels: deLabels,
        reportTypeContentLabel: "Management-Erfolgsrechnung",
      },
    );
    expect(pdf1.ok).toBe(true);
    if (!pdf1.ok) return;
    expect(loader).not.toHaveBeenCalled();

    const text1 = (await extractPdfText(pdf1.pdfBytes)).replace(/\u00a0/g, " ");
    expect(text1).toContain("FC ALLSCHWIL");
    expect(text1).toContain("Finanzbericht 2026");
    expect(text1).toContain("Management-Erfolgsrechnung");
    expect(text1).toContain("Management-Einschätzung");
    expect(text1).toContain("Mitgliedsbeitr");
    expect(text1).toContain("Positiver Treiber");
    expect(text1).toContain("Negativer Treiber");
    expect(text1).toContain("Beträge in CHF");
    expect(text1).toContain("Abw. Budget");
    expect(text1).toContain("Publikationsinformationen");
    expect(text1).toContain("Erstellt mit SportClubEvo");

    const v1Amount = formatFinanceManagementMoneyMinor(
      R5_V1_BASELINE.forecastResultMinor,
      "CHF",
      "de-CH",
    ).replace(/\u00a0/g, " ");
    expect(text1).toContain(v1Amount);

    const pdf2 = await generateFinancePublicationPdfArtifactForTenant(
      prisma,
      ctx(tenantA, viewPerms),
      {
        publicationId: v2.publicationId,
        versionNumber: 2,
        labels: deLabels,
        reportTypeContentLabel: "Management-Erfolgsrechnung",
      },
    );
    expect(pdf2.ok).toBe(true);
    if (!pdf2.ok) return;
    const text2 = (await extractPdfText(pdf2.pdfBytes)).replace(/\u00a0/g, " ");
    const v2Amount = formatFinanceManagementMoneyMinor(
      R5_LIVE_AFTER_MUTATION.forecastResultMinor,
      "CHF",
      "de-CH",
    ).replace(/\u00a0/g, " ");
    expect(text2).toContain(v2Amount);
    expect(text1).not.toContain(v2Amount);
    expect(text2).toContain("Version 2");
  });

  it("English labels and dynamic EUR currency in masthead amounts line", async () => {
    const model = buildPoBaselineManagementPnlReadModel({
      tenantId: tenantA,
      financeYearId: yearId,
    });
    const snapshot = buildFinancePublicationSnapshotV1({
      publicationId: "pub-eur",
      publicationVersion: 1,
      title: "FY 2026 - Management P&L",
      reportingScope: { kind: "MANAGEMENT_PNL", financeYearId: yearId },
      audienceClass: "INTERNAL_MANAGEMENT",
      publisherUserId: "u1",
      publishedAt: new Date("2026-10-25T19:47:00.000Z"),
      pnlReadModel: { ...model, baseCurrency: "EUR" },
    });
    const presentation = buildFinancePublishedManagementPnlInspectionReadModel({
      snapshot,
      lifecycleStatus: "PUBLISHED",
      contentLabel: "Management income statement",
    });
    const pdf = await generateFinancePublicationPdf({
      organisationName: "Test Club München",
      formattingLocale: "en-GB",
      translationLocale: "en-GB",
      documentLanguage: "en-GB",
      generatedAt: new Date("2026-10-25T20:21:00.000Z"),
      presentation,
      labels: enLabels,
      organisationLogoBytes: null,
      organisationLogoMime: null,
    });
    const text = await extractPdfText(pdf.pdfBytes);
    expect(text).toContain("Management income statement");
    expect(text).toContain("Amounts in EUR");
    expect(text).toContain("Management assessment");
  });

  it("multi-page synthetic hierarchy paginates with page x / y", async () => {
    const model = buildLargeSyntheticPnl();
    const snapshot = buildFinancePublicationSnapshotV1({
      publicationId: "pub-large",
      publicationVersion: 1,
      title: "FY 2026 - Management P&L",
      reportingScope: { kind: "MANAGEMENT_PNL", financeYearId: yearId },
      audienceClass: "INTERNAL_MANAGEMENT",
      publisherUserId: "u1",
      publishedAt: new Date("2026-10-25T19:47:00.000Z"),
      pnlReadModel: model,
    });
    const presentation = buildFinancePublishedManagementPnlInspectionReadModel({
      snapshot,
      lifecycleStatus: "PUBLISHED",
      contentLabel: "Management-Erfolgsrechnung",
    });
    const pdf = await generateFinancePublicationPdf({
      organisationName: "FC Allschwil",
      formattingLocale: "de-CH",
      translationLocale: "de-CH",
      documentLanguage: "de-CH",
      generatedAt: new Date("2026-10-25T20:21:00.000Z"),
      presentation,
      labels: deLabels,
      organisationLogoBytes: null,
      organisationLogoMime: null,
    });
    expect(pdf.pageCount).toBeGreaterThan(1);
    const text = await extractPdfText(pdf.pdfBytes);
    expect(text).toMatch(/Seite 1 \/ \d+/);
    expect(text).toMatch(/Seite 2 \/ \d+/);
  });

  it("derives material drivers from snapshot semantic only", async () => {
    const { prisma } = setupMockDb();
    const { v1 } = await publishV1AndV2(prisma);
    const read = await loadFinancePublicationVersionSnapshot(prisma, ctx(tenantA, viewPerms), {
      publicationId: v1.publicationId,
      versionNumber: 1,
    });
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    const presentation = buildFinancePublishedManagementPnlInspectionReadModel({
      snapshot: read.snapshot,
      lifecycleStatus: read.lifecycleStatus,
      contentLabel: "Management-Erfolgsrechnung",
    });
    expect(presentation.pnl.topFavourableDrivers.length).toBeGreaterThan(0);
    expect(presentation.pnl.topUnfavourableDrivers.length).toBeGreaterThan(0);
    expect(presentation.pnl.comparativeIntelligence.attentionInsights.some((i) => i.kind === "FAVORABLE_DRIVER")).toBe(
      true,
    );
  });

  it("PDF response headers and filename sanitation", async () => {
    const { prisma } = setupMockDb();
    const { v1 } = await publishV1AndV2(prisma);
    const pdf = await generateFinancePublicationPdfArtifactForTenant(
      prisma,
      ctx(tenantA, viewPerms),
      { publicationId: v1.publicationId, versionNumber: 1, labels: deLabels, reportTypeContentLabel: "x" },
    );
    expect(pdf.ok).toBe(true);
    if (!pdf.ok) return;
    expect(Buffer.from(pdf.pdfBytes).subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(pdf.filename).toMatch(/Version-1\.pdf$/);
    expect(financePublicationPdfContentDisposition(pdf.filename)).toContain("attachment");
  });
});

describe("derivePublicationVarianceDriversFromSemantic", () => {
  it("matches FIN-05B ranking semantics on PO baseline tree", () => {
    const model = buildPoBaselineManagementPnlReadModel();
    const snapshot = buildFinancePublicationSnapshotV1({
      publicationId: "p",
      publicationVersion: 1,
      title: "t",
      reportingScope: { kind: "MANAGEMENT_PNL", financeYearId: yearId },
      audienceClass: "INTERNAL_MANAGEMENT",
      publisherUserId: "u",
      publishedAt: new Date(),
      pnlReadModel: model,
    });
    const semantic = snapshot.renderedReportingSemanticPayload as {
      incomeSection: { nodes: SerializedManagementPnlTreeNode[] };
      expenseSection: { nodes: SerializedManagementPnlTreeNode[] };
    };
    const drivers = derivePublicationVarianceDriversFromSemantic({
      incomeNodes: semantic.incomeSection.nodes,
      expenseNodes: semantic.expenseSection.nodes,
    });
    expect(drivers.topFavourableDrivers[0]?.name).toMatch(/Mitgliedsbeitr/i);
    expect(drivers.topUnfavourableDrivers[0]?.name).toMatch(/Personal/i);
  });
});

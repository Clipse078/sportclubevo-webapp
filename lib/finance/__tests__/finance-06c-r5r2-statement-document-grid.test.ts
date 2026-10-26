import { describe, expect, it, vi, beforeEach } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildFinancePublicationPdfLabels } from "@/lib/finance/presentation/load-finance-publication-pdf-labels";
import { FINANCE_06C_R5R2_IMPLEMENTATION } from "@/lib/finance/publishing/finance-publication-artifact-contract";
import { publicationPdfResultRowLayout } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-result-band-layout";
import {
  analyzePublicationPdfEvidenceHierarchyGeometry,
  analyzePublicationPdfPageComposition,
  analyzePublicationPdfResultBlockGeometry,
  analyzePublicationPdfStatementTransitionGeometry,
  extractPublicationPdfSemanticGeometry,
  publicationPdfEvidenceHierarchyInvariants,
  publicationPdfEvidenceTypographyContract,
  publicationPdfPageCompositionInvariants,
  publicationPdfResultBlockGeometryInvariants,
  publicationPdfStatementTransitionInvariants,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-semantic-geometry";
import { computePublicationPdfAmountColumnRights } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-table-layout";
import { generateFinancePublicationPdfArtifactForTenant } from "@/lib/finance/services/finance-publication-artifact-service";
import * as managementReporting from "@/lib/finance/services/finance-management-reporting-query-service";
import {
  createPublicationMockStore,
  makePublicationMockPrisma,
} from "@/lib/finance/__tests__/finance-06b-publication-mock-db";
import { publishFinanceManagementPnlSnapshot } from "@/lib/finance/services/finance-publication-service";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  buildPoBaselineManagementPnlReadModel,
  R5_LIVE_AFTER_MUTATION,
} from "@/lib/finance/uat/sce-finance-06b-r5-immutability-uat";

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

const dePublicationKeys: Record<string, string> = {
  pdfFinancialReportHeading: "Finanzbericht {year}",
  pdfReportTypeSubtitle: "Management-Erfolgsrechnung",
  pdfOfficialPublicationLine: "Offizielle Veröffentlichung · Version {version}",
  publishedAtLabel: "Veröffentlicht",
  pdfGeneratedAtLabel: "PDF erstellt",
  pdfPublicationInfoTitle: "Publikationsinformationen",
  versionLabel: "Version {version}",
  pdfHeroVarianceVsBudget: "gegenüber Budget",
  pdfManagementAssessmentTitle: "Management-Einschätzung",
  pdfStatementSectionTitle: "Erfolgsrechnung",
  pdfAmountsInCurrency: "Beträge in {currency}",
  pdfColumnVarianceVsBudget: "Abw. Budget",
  pdfColumnPosition: "Position",
  pdfExpectedResultLabel: "Erwartetes Ergebnis (Prognose)",
  pdfBudgetResultLabel: "Budgetiertes Ergebnis",
  pdfActualToDateLabel: "Ist (bisher)",
  pdfPositiveDriverLabel: "Positiver Treiber",
  pdfNegativeDriverLabel: "Negativer Treiber",
  pdfSnapshotImmutabilityNotice:
    "Diese Veröffentlichung basiert auf einem unveränderlichen Stand der Finanzdaten zum Zeitpunkt der Veröffentlichung. Historische Versionen bleiben unverändert.",
  pdfCreatedWithSportClubEvo: "Erstellt mit SportClubEvo",
  pdfPageOf: "Seite {page} / {total}",
};

const deLabels = buildFinancePublicationPdfLabels({
  overview: (k) =>
    ({ reportingIncome: "Einnahmen", reportingExpense: "Ausgaben", reportingResult: "Ergebnis" })[
      k as "reportingIncome"
    ] ?? k,
  publication: (k, v) => {
    let out = dePublicationKeys[k] ?? k;
    if (v) {
      for (const [key, val] of Object.entries(v)) {
        out = out.replace(`{${key}}`, String(val));
      }
    }
    return out;
  },
  pnl: (k, v) => {
    const map: Record<string, string> = {
      columnActual: "Ist",
      columnBudget: "Budget",
      columnForecast: "Prognose",
      incomeSectionTotal: "Summe Einnahmen",
      expenseSectionTotal: "Summe Ausgaben",
      unassignedGroup: "Nicht zugeordnet",
      favorabilityFavorable: "Günstig",
      attentionResultFavorableTitle: "Ergebnis besser als geplant",
      attentionResultFavorableDetail: "Die aktuelle Prognose liegt {amount} über dem genehmigten Budget.",
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
  actuals: (k) => k,
});

function setupMockDb() {
  const store = createPublicationMockStore();
  store.financeYear.push({ id: yearId, tenantId: tenantA, name: "FY 2026" });
  return { store, prisma: makePublicationMockPrisma(store) };
}

async function publishV2(prisma: ReturnType<typeof makePublicationMockPrisma>) {
  const loader = vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel");
  loader.mockResolvedValueOnce(
    buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
  );
  await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
    financeYearId: yearId,
  });
  loader.mockResolvedValueOnce(
    buildPoBaselineManagementPnlReadModel({
      tenantId: tenantA,
      financeYearId: yearId,
      mitgliedsForecastMinor: R5_LIVE_AFTER_MUTATION.mitgliedsForecastMinor,
    }),
  );
  const v2 = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
    financeYearId: yearId,
  });
  loader.mockRestore();
  return v2;
}

async function generateFcaV2Pdf() {
  const { prisma } = setupMockDb();
  const v2 = await publishV2(prisma);
  const pdf = await generateFinancePublicationPdfArtifactForTenant(
    prisma,
    ctx(tenantA, viewPerms),
    {
      publicationId: v2.publicationId,
      versionNumber: 2,
      labels: deLabels,
      reportTypeContentLabel: "Management-Erfolgsrechnung",
    },
  );
  expect(pdf.ok).toBe(true);
  if (!pdf.ok) throw new Error("PDF generation failed");
  return pdf;
}

describe("FIN-06C-R5R2 statement document grid & vertical rhythm", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("records R5R2 implementation lineage", () => {
    expect(FINANCE_06C_R5R2_IMPLEMENTATION.predecessor).toBe("FIN-06C-R5R1");
    expect(FINANCE_06C_R5R2_IMPLEMENTATION.focus).toContain("vertical_rhythm");
  });

  it("FCA V2 one-page statement integrates Ergebnis as terminal table row", async () => {
    const pdf = await generateFcaV2Pdf();
    expect(pdf.pageCount).toBe(1);

    const pages = await extractPublicationPdfSemanticGeometry(pdf.pdfBytes);
    expect(pages).toHaveLength(1);
    const page = pages[0]!;

    const resultBlock = analyzePublicationPdfResultBlockGeometry(page, {
      resultLabel: deLabels.managementResult,
      publicationInfoTitle: deLabels.publicationInfoTitle,
    });
    const resultInv = publicationPdfResultBlockGeometryInvariants(resultBlock);
    expect(resultInv.resultTextInsideSurface).toBe(true);
    expect(resultInv.publicationHeadingBelowResultBand).toBe(true);
    expect(resultInv.separatorAboveResultText).toBe(true);
    expect(resultInv.resultPublicationMinGapPt).toBeGreaterThanOrEqual(
      publicationPdfResultRowLayout().minResultEvidenceClearancePt,
    );

    const transition = analyzePublicationPdfStatementTransitionGeometry(page, {
      expenseSectionTotal: deLabels.expenseSectionTotal,
      resultLabel: deLabels.managementResult,
    });
    const transitionInv = publicationPdfStatementTransitionInvariants(transition);
    expect(transition.dividerCountBetweenExpenseSubtotalAndResult).toBe(1);
    expect(transitionInv.singleDividerBeforeResult).toBe(true);
    expect(transitionInv.resultColumnAlignedWithStatement).toBe(true);
    expect(transitionInv.resultBandCompact).toBe(true);
    expect(transitionInv.resultTextVerticallyCentered).toBe(true);
    expect(transitionInv.expenseSubtotalAboveResult).toBe(true);

    const canonicalCols = computePublicationPdfAmountColumnRights();
    expect(transition.resultColumnVarianceRight).not.toBeNull();
    expect(Math.abs(transition.resultColumnVarianceRight! - canonicalCols.variance)).toBeLessThan(3);

    const hierarchy = analyzePublicationPdfEvidenceHierarchyGeometry(page, {
      statementSectionTitle: deLabels.statementSectionTitle,
      publicationInfoTitle: deLabels.publicationInfoTitle,
    });
    expect(publicationPdfEvidenceHierarchyInvariants(hierarchy).publicationHeadingSmallerThanStatement).toBe(
      true,
    );

    const typo = publicationPdfEvidenceTypographyContract();
    expect(typo.evidenceHeadingSizePt).toBeLessThan(typo.statementHeadingSizePt);

    const blocks = analyzePublicationPdfPageComposition(page, {
      reportTitle: "Finanzbericht",
      heroForecastLabel: deLabels.expectedResultLabel.toUpperCase(),
      managementTitle: deLabels.managementAssessmentTitle,
      statementTitle: deLabels.statementSectionTitle,
      publicationInfoTitle: deLabels.publicationInfoTitle,
      footerPageLabel: "Seite",
    });
    for (const name of [
      "masthead",
      "hero",
      "management",
      "statement",
      "publicationEvidence",
      "footer",
    ] as const) {
      expect(blocks.some((b) => b.name === name)).toBe(true);
    }
    const compositionInv = publicationPdfPageCompositionInvariants(blocks);
    expect(compositionInv.statementAbovePublicationEvidence).toBe(true);
    expect(compositionInv.resultToEvidenceGapWithinBounds).toBe(true);
    expect(blocks.length).toBeGreaterThanOrEqual(4);
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildFinancePublicationPdfLabels } from "@/lib/finance/presentation/load-finance-publication-pdf-labels";
import {
  publicationPdfResultBandLayout,
  publicationPdfResultBandBottomYFromBaseline,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-result-band-layout";
import {
  analyzePublicationPdfResultBlockGeometry,
  extractPublicationPdfSemanticGeometry,
  publicationPdfResultBlockGeometryInvariants,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-semantic-geometry";
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
  pdfSnapshotImmutabilityNotice: "unveränderlichen Stand",
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
      mitgliedsForecastMinor: R5_LIVE_AFTER_MUTATION.mitgliedsForecastMinor,
    }),
  );
  const v2 = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
    financeYearId: yearId,
  });
  loader.mockRestore();
  return { v1, v2 };
}

async function generateFcaV2Pdf() {
  const { prisma } = setupMockDb();
  const { v2 } = await publishV1AndV2(prisma);
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

describe("FIN-06C-R5R1 result row vertical layout", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("reserves result band height before publication information on FCA V2", async () => {
    const pdf = await generateFcaV2Pdf();
    expect(pdf.pageCount).toBe(1);

    const pages = await extractPublicationPdfSemanticGeometry(pdf.pdfBytes);
    expect(pages).toHaveLength(1);
    const block = analyzePublicationPdfResultBlockGeometry(pages[0]!, {
      resultLabel: deLabels.managementResult,
      publicationInfoTitle: deLabels.publicationInfoTitle,
    });
    const inv = publicationPdfResultBlockGeometryInvariants(block);
    const layout = publicationPdfResultBandLayout();

    expect(inv.resultTextInsideSurface).toBe(true);
    expect(inv.publicationHeadingBelowResultBand).toBe(true);
    expect(inv.resultPublicationMinGapPt).toBeGreaterThanOrEqual(layout.minPublicationClearancePt);
    expect(inv.separatorAboveResultText).toBe(true);

    expect(block.publicationHeadingTopY).toBeLessThan(block.resultBandBottomY);
    expect(block.resultBandBottomY - block.publicationHeadingTopY).toBeGreaterThanOrEqual(
      layout.minPublicationClearancePt,
    );
    expect(block.publicationHeadingTopY).toBeLessThanOrEqual(
      publicationPdfResultBandBottomYFromBaseline(block.resultLabel.y) - layout.minPublicationClearancePt,
    );
  });

});

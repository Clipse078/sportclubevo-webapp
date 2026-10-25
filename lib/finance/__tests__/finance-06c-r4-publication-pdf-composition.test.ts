import { describe, expect, it, vi, beforeEach } from "vitest";
import { createRequire } from "node:module";
import { PDFDocument } from "pdf-lib";
import { mmToPt } from "@/lib/billing/invoice-pdf/mm";
import { A4_WIDTH_MM } from "@/lib/billing/invoice-pdf/constants";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildFinancePublicationPdfLabels } from "@/lib/finance/presentation/load-finance-publication-pdf-labels";
import { generateFinancePublicationPdf } from "@/lib/finance/artifacts/finance-publication-pdf/generate-finance-publication-pdf";
import {
  FINANCE_06C_R3_IMPLEMENTATION,
  FINANCE_06C_R4_IMPLEMENTATION,
} from "@/lib/finance/publishing/finance-publication-artifact-contract";
import {
  buildCompactPublicationInfoLines,
  buildPublicationPdfFooterLeftLine,
  publicationPdfShouldRenderMajorDeviationsDetail,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-composition";
import {
  computePublicationPdfFooterZones,
  publicationPdfFooterTextWidthsFitZones,
  truncateTextToMaxWidth,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-footer-layout";
import { buildFinancePublishedManagementPnlInspectionReadModel } from "@/lib/finance/presentation/build-finance-published-management-pnl-read-model";
import { buildFinancePublicationSnapshotV1 } from "@/lib/finance/publishing/build-finance-publication-snapshot-v1";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  createPublicationMockStore,
  makePublicationMockPrisma,
} from "@/lib/finance/__tests__/finance-06b-publication-mock-db";
import { publishFinanceManagementPnlSnapshot } from "@/lib/finance/services/finance-publication-service";
import { generateFinancePublicationPdfArtifactForTenant } from "@/lib/finance/services/finance-publication-artifact-service";
import * as managementReporting from "@/lib/finance/services/finance-management-reporting-query-service";
import {
  buildPoBaselineManagementPnlReadModel,
  R5_LIVE_AFTER_MUTATION,
  R5_V1_BASELINE,
} from "@/lib/finance/uat/sce-finance-06b-r5-immutability-uat";
import { formatFinanceManagementMoneyMinor } from "@/lib/finance/presentation/finance-money-presentation";
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

const dePublicationKeys: Record<string, string> = {
  pdfFinancialReportHeading: "Finanzbericht {year}",
  pdfReportTypeSubtitle: "Management-Erfolgsrechnung",
  pdfOfficialPublicationLine: "Offizielle Veröffentlichung · Version {version}",
  publishedAtLabel: "Veröffentlicht",
  pdfGeneratedAtLabel: "PDF erstellt",
  pdfPublicationInfoTitle: "Publikationsinformationen",
  versionLabel: "Version {version}",
  pdfHeroVarianceVsBudget: "gegenüber Budget",
  pdfForecastSupportingLabel: "Prognose",
  pdfManagementAssessmentTitle: "Management-Einschätzung",
  pdfStatementSectionTitle: "Erfolgsrechnung",
  pdfAmountsInCurrency: "Beträge in {currency}",
  pdfColumnVarianceVsBudget: "Abw. Budget",
  pdfColumnPosition: "Position",
  pdfColumnDeviation: "Abweichung",
  pdfColumnComment: "Kommentar / Einordnung",
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

describe("FIN-06C-R4 publication PDF composition contract", () => {
  it("records R3/R4 implementation status", () => {
    expect(FINANCE_06C_R3_IMPLEMENTATION.status).toBe("IMPLEMENTED_PO_VISUAL_UAT_REFINEMENT_REQUIRED");
    expect(FINANCE_06C_R4_IMPLEMENTATION.status).toBe("IMPLEMENTED_PO_UAT_PENDING");
    expect(FINANCE_06C_R4_IMPLEMENTATION.predecessor).toBe("FIN-06C-R3");
  });

  it("skips duplicate major-deviations detail for headline drivers only", () => {
    expect(
      publicationPdfShouldRenderMajorDeviationsDetail([
        { kind: "OVERALL_RESULT", favorability: "FAVORABLE", rawDeltaMinor: 1 },
        {
          kind: "FAVORABLE_DRIVER",
          driver: {
            name: "Mitgliedsbeiträge",
            comparison: { availability: "AVAILABLE", rawDeltaMinor: 1, favorability: "FAVORABLE" },
          },
        },
      ] as never),
    ).toBe(false);
  });

  it("builds compact publication info lines", () => {
    const lines = buildCompactPublicationInfoLines({
      versionLabel: "Version {version}",
      publicationVersion: 2,
      publishedAtLabel: "Veröffentlicht",
      publishedAtFormatted: "25.10.2026, 21:47",
      pdfGeneratedAtLabel: "PDF erstellt",
      pdfGeneratedAtFormatted: "25.10.2026, 22:52",
    });
    expect(lines.versionPublishedLine).toBe("Version 2 · Veröffentlicht 25.10.2026, 21:47");
    expect(lines.pdfGeneratedLine).toBe("PDF erstellt 25.10.2026, 22:52");
  });

  it("reserves non-overlapping footer zones including long left labels", async () => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont("Helvetica");
    const pageWidth = mmToPt(A4_WIDTH_MM);
    const marginX = mmToPt(18);
    const zones = computePublicationPdfFooterZones(pageWidth, marginX);
    const leftLine = buildPublicationPdfFooterLeftLine({
      organisationName: "FC Allschwil Very Long Club Name That Could Collide",
      financialReportHeading: "Finanzbericht {year}",
      yearLabel: "2026",
      publicationVersion: 2,
    });
    const leftText = truncateTextToMaxWidth(leftLine, font, 7, zones.left.maxWidth);
    const centerText = "Seite 1 / 1";
    const rightText = "Erstellt mit SportClubEvo";
    expect(
      publicationPdfFooterTextWidthsFitZones({
        zones,
        leftTextWidth: font.widthOfTextAtSize(leftText, 7),
        centerTextWidth: font.widthOfTextAtSize(centerText, 7),
        rightTextWidth: font.widthOfTextAtSize(rightText, 6.5) + mmToPt(16),
      }),
    ).toBe(true);
  });
});

describe("FIN-06C-R4 FCA one-page composition output", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("FCA PO baseline fits on one page without duplicate deviation section", async () => {
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
    if (!pdf.ok) return;
    expect(pdf.pageCount).toBe(1);

    const text = (await extractPdfText(pdf.pdfBytes)).replace(/\u00a0/g, " ");
    expect(text).toContain("gegenüber Budget");
    expect(text).not.toMatch(/Snapshot/i);
    expect(text).not.toContain("Wesentliche Abweichungen");
    expect(text).not.toContain("Finanzjahr");
    expect(text).toContain("Publikationsinformationen");
    expect(text).toMatch(/Version 2 · Veröffentlicht/);
    expect(text).toMatch(/PDF erstellt/);
    expect(text).toMatch(/Seite 1 \/ 1/);
    expect(text).toContain("Erstellt mit SportClubEvo");
    expect(text).toContain("Positiver Treiber");
    expect(text).toContain("Management-Einschätzung");
    expect(text).toContain("unveränderlichen Stand");
  });

  it("large synthetic hierarchy still paginates beyond one page", async () => {
    const model = buildLargeSyntheticPnl();
    const snapshot = buildFinancePublicationSnapshotV1({
      publicationId: "pub-large-r4",
      publicationVersion: 1,
      title: "FY 2026",
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
      generatedAt: new Date("2026-10-25T20:52:00.000Z"),
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

  it("V1/V2 immutable financial values remain correct", async () => {
    const { prisma } = setupMockDb();
    const { v1, v2 } = await publishV1AndV2(prisma);
    const pdf1 = await generateFinancePublicationPdfArtifactForTenant(
      prisma,
      ctx(tenantA, viewPerms),
      { publicationId: v1.publicationId, versionNumber: 1, labels: deLabels, reportTypeContentLabel: "x" },
    );
    const pdf2 = await generateFinancePublicationPdfArtifactForTenant(
      prisma,
      ctx(tenantA, viewPerms),
      { publicationId: v2.publicationId, versionNumber: 2, labels: deLabels, reportTypeContentLabel: "x" },
    );
    expect(pdf1.ok && pdf2.ok).toBe(true);
    if (!pdf1.ok || !pdf2.ok) return;
    const t1 = await extractPdfText(pdf1.pdfBytes);
    const t2 = await extractPdfText(pdf2.pdfBytes);
    const v1Forecast = formatFinanceManagementMoneyMinor(
      R5_V1_BASELINE.forecastResultMinor,
      "CHF",
      "de-CH",
    ).replace(/\u00a0/g, " ");
    const v2Forecast = formatFinanceManagementMoneyMinor(
      R5_LIVE_AFTER_MUTATION.forecastResultMinor,
      "CHF",
      "de-CH",
    ).replace(/\u00a0/g, " ");
    expect(t1).toContain(v1Forecast);
    expect(t2).toContain(v2Forecast);
    expect(t1).not.toContain(v2Forecast);
    expect(t1).toContain("212'694");
    expect(t2).toContain("213'694");
    expect(t1).toContain("+11'533");
    expect(t2).toContain("+12'533");
  });
});

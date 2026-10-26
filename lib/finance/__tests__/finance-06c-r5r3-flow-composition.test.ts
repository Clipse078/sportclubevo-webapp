import { describe, expect, it, vi, beforeEach } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildFinancePublicationPdfLabels } from "@/lib/finance/presentation/load-finance-publication-pdf-labels";
import { FINANCE_06C_R5R3_IMPLEMENTATION } from "@/lib/finance/publishing/finance-publication-artifact-contract";
import { publicationPdfContentBottomYPt } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-page-layout";
import {
  publicationPdfRecordedTextDraws,
  type PublicationPdfRecordedTextDraw,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-draw-recorder";
import {
  analyzePublicationPdfResultBlockGeometry,
  analyzePublicationPdfStatementTransitionGeometry,
  extractPublicationPdfSemanticGeometry,
  publicationPdfResultBlockGeometryInvariants,
  publicationPdfStatementTransitionInvariants,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-semantic-geometry";
import { publicationPdfResultRowLayout } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-statement-layout";
import { computePublicationPdfAmountColumnRights } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-table-layout";
import {
  assertPublicationPdfEvidenceMetadataOrdering,
  assertPublicationPdfNoSequentialBlockTextCollisions,
  assertPublicationPdfWrappedLinesDoNotOverlap,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-text-collision";
import { buildPublicationPdfR5R2DefectiveEvidenceDraws } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-r5r2-overlap-fixture";
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
  R5_V1_BASELINE,
} from "@/lib/finance/uat/sce-finance-06b-r5-immutability-uat";
import { formatFinanceManagementMoneyMinor } from "@/lib/finance/presentation/finance-money-presentation";
import { createRequire } from "node:module";

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

async function generateFcaV2PdfWithDrawLog() {
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
      generatedAt: new Date("2026-10-26T07:39:00.000Z"),
      recordDrawOperations: true,
    },
  );
  expect(pdf.ok).toBe(true);
  if (!pdf.ok) throw new Error("PDF generation failed");
  return pdf;
}

function lowestContentInkY(textDraws: PublicationPdfRecordedTextDraw[]): number {
  return Math.min(...textDraws.map((d) => d.bottomY));
}

describe("FIN-06C-R5R3 publication PDF flow composition reset", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("records R5R3 implementation lineage", () => {
    expect(FINANCE_06C_R5R3_IMPLEMENTATION.predecessor).toBe("FIN-06C-R5R2");
    expect(FINANCE_06C_R5R3_IMPLEMENTATION.focus).toContain("flow_cursor");
  });

  it("OLD_R5R2 overlap fixture fails collision guard; current FCA V2 layout passes", async () => {
    const defective = buildPublicationPdfR5R2DefectiveEvidenceDraws();
    const defectiveCollision = assertPublicationPdfNoSequentialBlockTextCollisions(defective);
    expect(defectiveCollision.ok).toBe(false);

    const pdf = await generateFcaV2PdfWithDrawLog();
    const textDraws = publicationPdfRecordedTextDraws({
      pageIndex: 0,
      operations: pdf.drawOperations!,
    });
    const currentCollision = assertPublicationPdfNoSequentialBlockTextCollisions(textDraws, {
      horizontalTableBlockIds: ["statement.row", "statement.result"],
    });
    expect(currentCollision.ok).toBe(true);
  });

  it("FCA V2 visual contract via actual draw geometry and collision guards", async () => {
    const pdf = await generateFcaV2PdfWithDrawLog();
    expect(pdf.pageCount).toBe(1);
    expect(pdf.drawOperations).toBeDefined();

    const textDraws = publicationPdfRecordedTextDraws({
      pageIndex: 0,
      operations: pdf.drawOperations!,
    });

    const collision = assertPublicationPdfNoSequentialBlockTextCollisions(textDraws, {
      horizontalTableBlockIds: ["statement.row", "statement.result"],
    });
    expect(collision.ok, collision.ok ? "" : JSON.stringify(collision)).toBe(true);

    const evidenceOrder = assertPublicationPdfEvidenceMetadataOrdering(textDraws);
    expect(evidenceOrder.ok).toBe(true);
    expect(evidenceOrder.gaps.headingToVersion).toBeGreaterThan(0.25);
    expect(evidenceOrder.gaps.versionToPdfCreated).toBeGreaterThan(0.25);
    expect(evidenceOrder.gaps.pdfCreatedToNotice).toBeGreaterThan(0.25);

    expect(
      assertPublicationPdfWrappedLinesDoNotOverlap(textDraws, "publicationEvidence.immutabilityNotice"),
    ).toBe(true);

    expect(lowestContentInkY(textDraws)).toBeGreaterThan(publicationPdfContentBottomYPt());

    const resultRect = pdf.drawOperations!.find(
      (op) => op.kind === "rect" && op.blockId === "statement.result",
    );
    expect(resultRect).toBeDefined();
    const resultLabel = textDraws.find(
      (d) => d.blockId === "statement.result" && d.text === deLabels.managementResult,
    );
    expect(resultLabel).toBeDefined();
    if (resultRect && resultRect.kind === "rect" && resultLabel) {
      expect(resultLabel.y).toBeGreaterThanOrEqual(resultRect.y - 0.5);
      expect(resultLabel.y).toBeLessThanOrEqual(resultRect.y + resultRect.height + 0.5);
    }

    const statementBottom = Math.min(
      ...textDraws.filter((d) => d.blockId.startsWith("statement.")).map((d) => d.bottomY),
    );
    const evidenceTop = Math.max(
      ...textDraws.filter((d) => d.blockId.startsWith("publicationEvidence.")).map((d) => d.topY),
    );
    expect(statementBottom).toBeGreaterThan(evidenceTop + 0.5);

    const pages = await extractPublicationPdfSemanticGeometry(pdf.pdfBytes);
    const page = pages[0]!;
    const transition = analyzePublicationPdfStatementTransitionGeometry(page, {
      expenseSectionTotal: deLabels.expenseSectionTotal,
      resultLabel: deLabels.managementResult,
    });
    expect(publicationPdfStatementTransitionInvariants(transition).singleDividerBeforeResult).toBe(true);

    const resultBlock = analyzePublicationPdfResultBlockGeometry(page, {
      resultLabel: deLabels.managementResult,
      publicationInfoTitle: deLabels.publicationInfoTitle,
    });
    const resultInv = publicationPdfResultBlockGeometryInvariants(resultBlock);
    expect(resultInv.publicationHeadingBelowResultBand).toBe(true);
    expect(resultInv.resultPublicationMinGapPt).toBeGreaterThanOrEqual(
      publicationPdfResultRowLayout().minResultEvidenceClearancePt,
    );

    const canonicalCols = computePublicationPdfAmountColumnRights();
    expect(transition.resultColumnVarianceRight).not.toBeNull();
    expect(Math.abs(transition.resultColumnVarianceRight! - canonicalCols.variance)).toBeLessThan(3);
  });

  it("preserves FIN-06B R5 immutability numerics on artifact path", async () => {
    const { prisma } = setupMockDb();
    const { v1, v2 } = await publishV1AndV2(prisma);
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
    expect(pdf1.ok && pdf2.ok).toBe(true);
    if (!pdf1.ok || !pdf2.ok) return;

    const t1 = (await extractPdfText(pdf1.pdfBytes)).replace(/\u00a0/g, " ");
    const t2 = (await extractPdfText(pdf2.pdfBytes)).replace(/\u00a0/g, " ");
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
    expect(t1).toContain("212'694");
    expect(t2).toContain("213'694");
    expect(t1).toContain("+11'533");
    expect(t2).toContain("+12'533");
  });
});

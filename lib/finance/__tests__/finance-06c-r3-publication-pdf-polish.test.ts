import { describe, expect, it, vi, beforeEach } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildFinancePublicationPdfLabels } from "@/lib/finance/presentation/load-finance-publication-pdf-labels";
import { generateFinancePublicationPdf } from "@/lib/finance/artifacts/finance-publication-pdf/generate-finance-publication-pdf";
import { FINANCE_06C_R3_IMPLEMENTATION } from "@/lib/finance/publishing/finance-publication-artifact-contract";
import {
  computePublicationPdfHeroLayoutBands,
  publicationPdfHeroBandsNonOverlapping,
  publicationPdfHeroHeightPt,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-hero-layout";
import {
  fitImageWithinBounds,
  loadTenantPublicationLogo,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-images";
import { getSportClubEvoFooterLogoAssetAbsolutePath } from "@/lib/billing/invoice-pdf/sportclubevo-footer-logo-asset";
import { buildFinancePublishedManagementPnlInspectionReadModel } from "@/lib/finance/presentation/build-finance-published-management-pnl-read-model";
import { buildFinancePublicationSnapshotV1 } from "@/lib/finance/publishing/build-finance-publication-snapshot-v1";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  createPublicationMockStore,
  makePublicationMockPrisma,
} from "@/lib/finance/__tests__/finance-06b-publication-mock-db";
import {
  publishFinanceManagementPnlSnapshot,
} from "@/lib/finance/services/finance-publication-service";
import { generateFinancePublicationPdfArtifactForTenant } from "@/lib/finance/services/finance-publication-artifact-service";
import * as managementReporting from "@/lib/finance/services/finance-management-reporting-query-service";
import {
  buildPoBaselineManagementPnlReadModel,
  R5_LIVE_AFTER_MUTATION,
  R5_V1_BASELINE,
} from "@/lib/finance/uat/sce-finance-06b-r5-immutability-uat";
import { formatFinanceManagementMoneyMinor } from "@/lib/finance/presentation/finance-money-presentation";
import { pdfSafeText } from "@/lib/finance/artifacts/finance-publication-pdf/pdf-safe-text";

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
  pdfGeneratedAtLabel: "PDF erzeugt",
  pdfPublicationInfoTitle: "Publikationsinformationen",
  versionLabel: "Version {version}",
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
  pdfHeroVarianceVsBudget: "gegenüber Budget",
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

describe("FIN-06C-R3 publication PDF polish contract", () => {
  it("records R3 implementation status", () => {
    expect(FINANCE_06C_R3_IMPLEMENTATION.status).toBe("IMPLEMENTED_PO_VISUAL_UAT_REFINEMENT_REQUIRED");
    expect(FINANCE_06C_R3_IMPLEMENTATION.predecessor).toBe("FIN-06C-R2");
  });

  it("hero layout reserves non-overlapping vertical bands", () => {
    const heroTop = 700;
    const bands = computePublicationPdfHeroLayoutBands(heroTop);
    expect(publicationPdfHeroBandsNonOverlapping(bands)).toBe(true);
    expect(heroTop - publicationPdfHeroHeightPt()).toBeLessThan(bands.supporting.yBottom);
  });

  it("pdfSafeText preserves German glyphs and removes delta", () => {
    const sample = "Abw. Budget äöü ÄÖÜ ß · Günstig";
    expect(pdfSafeText(sample)).toContain("Abw. Budget");
    expect(pdfSafeText("Δ Budget")).not.toContain("Δ");
    expect(pdfSafeText("Δ Budget")).toContain("?");
  });
});

describe("FIN-06C-R3 PDF branding and layout output", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders PO baseline with Abw. Budget, drivers, and management section (R4 owns one-page composition)", async () => {
    const { prisma } = setupMockDb();
    const { v1 } = await publishV1AndV2(prisma);
    const pdf = await generateFinancePublicationPdfArtifactForTenant(
      prisma,
      ctx(tenantA, viewPerms),
      {
        publicationId: v1.publicationId,
        versionNumber: 1,
        labels: deLabels,
        reportTypeContentLabel: "Management-Erfolgsrechnung",
      },
    );
    expect(pdf.ok).toBe(true);
    if (!pdf.ok) return;

    const text = (await extractPdfText(pdf.pdfBytes)).replace(/\u00a0/g, " ");
    expect(text).toContain("Abw. Budget");
    expect(text).not.toMatch(/\?\s*Budget/);
    expect(text).not.toContain("Δ");
    expect(text).toContain("Positiver Treiber");
    expect(text).toContain("Negativer Treiber");
    expect(text).toContain("Publikationsinformationen");
    expect(text).toContain("Erstellt mit SportClubEvo");
    expect(text).toContain("Management-Einschätzung");
    expect(text).not.toContain("Grösste positive Abweichung");
  });

  it("V1/V2 remain financially distinct", async () => {
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
    const v1Amount = formatFinanceManagementMoneyMinor(R5_V1_BASELINE.forecastResultMinor, "CHF", "de-CH");
    const v2Amount = formatFinanceManagementMoneyMinor(
      R5_LIVE_AFTER_MUTATION.forecastResultMinor,
      "CHF",
      "de-CH",
    );
    expect(t1).toContain(v1Amount.replace(/\u00a0/g, " "));
    expect(t2).toContain(v2Amount.replace(/\u00a0/g, " "));
    expect(t1).not.toContain(v2Amount.replace(/\u00a0/g, " "));
  });

  it("embeds tenant logo when bytes provided and skips unsafe URLs", async () => {
    const model = buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId });
    const snapshot = buildFinancePublicationSnapshotV1({
      publicationId: "pub-logo",
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
    const logoBytes = readFileSync(getSportClubEvoFooterLogoAssetAbsolutePath());
    const wideFit = fitImageWithinBounds(400, 100, 50, 30);
    expect(wideFit.widthPt).toBe(50);
    expect(wideFit.heightPt).toBe(12.5);

    const pdf = await generateFinancePublicationPdf({
      organisationName: "FC Allschwil",
      formattingLocale: "de-CH",
      translationLocale: "de-CH",
      documentLanguage: "de-CH",
      generatedAt: new Date("2026-10-25T20:21:00.000Z"),
      presentation,
      labels: deLabels,
      organisationLogoBytes: new Uint8Array(logoBytes),
      organisationLogoMime: "image/png",
    });
    expect(pdf.pageCount).toBeGreaterThanOrEqual(1);
    expect(await loadTenantPublicationLogo("https://evil.example/logo.png")).toBeNull();
    expect(await loadTenantPublicationLogo(null)).toBeNull();
  });
});

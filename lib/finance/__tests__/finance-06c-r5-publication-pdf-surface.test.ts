import { readFileSync } from "node:fs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createRequire } from "node:module";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildFinancePublicationPdfLabels } from "@/lib/finance/presentation/load-finance-publication-pdf-labels";
import {
  FINANCE_06C_R4_IMPLEMENTATION,
  FINANCE_06C_R5_IMPLEMENTATION,
} from "@/lib/finance/publishing/finance-publication-artifact-contract";
import {
  publicationPdfColors,
  publicationPdfSurfaceHierarchyInvariants,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-colors";
import {
  computePublicationPdfAmountColumnRights,
  publicationPdfAmountColumnRightsMonotonic,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-table-layout";
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
      mitgliedsForecastMinor: R5_LIVE_AFTER_MUTATION.mitgliedsbeitraegeForecastMinor,
    }),
  );
  const v2 = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
    financeYearId: yearId,
  });
  loader.mockRestore();
  return { v1, v2 };
}

describe("FIN-06C-R5 publication PDF surface & numeric contract", () => {
  it("records R5 implementation lineage", () => {
    expect(FINANCE_06C_R4_IMPLEMENTATION.status).toBe("IMPLEMENTED_PO_UAT_PENDING");
    expect(FINANCE_06C_R5_IMPLEMENTATION.status).toBe("IMPLEMENTED_PO_UAT_PENDING");
    expect(FINANCE_06C_R5_IMPLEMENTATION.predecessor).toBe("FIN-06C-R4");
  });

  it("centralizes publication palette tokens with hierarchy invariants", () => {
    const inv = publicationPdfSurfaceHierarchyInvariants();
    expect(inv.heroStrongerThanDrivers).toBe(true);
    expect(inv.heroDistinctFromDriverSemantics).toBe(true);
    expect(inv.resultDistinctFromHero).toBe(true);
    expect(inv.driverSemanticsDistinct).toBe(true);
    expect(publicationPdfColors.heroSurface).not.toEqual(publicationPdfColors.favorableSurface);
    expect(publicationPdfColors.resultSurface).not.toEqual(publicationPdfColors.tableHeaderSurface);
  });

  it("keeps stable monotonic numeric column right edges", () => {
    const cols = computePublicationPdfAmountColumnRights();
    expect(publicationPdfAmountColumnRightsMonotonic(cols)).toBe(true);
  });

  it("does not scatter inline rgb() in the PDF generator", () => {
    const src = readFileSync(
      "lib/finance/artifacts/finance-publication-pdf/generate-finance-publication-pdf.ts",
      "utf8",
    );
    expect(src.includes("rgb(")).toBe(false);
    expect(src.includes("publicationPdfColors")).toBe(true);
  });
});

describe("FIN-06C-R5 FCA one-page output", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("FCA PO baseline remains one page with controlled fixture labels", async () => {
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
    expect(text).toContain("Beispiel X");
    expect(text).not.toContain("Beispeil");
    expect(text).toContain("Management-Einschätzung");
    expect(text).toContain("Positiver Treiber");
    expect(text).toContain("Abw. Budget");
  });

  it("V1/V2 immutable financial values remain unchanged", async () => {
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
    expect(t1).toContain("212'694");
    expect(t2).toContain("213'694");
    expect(t1).toContain("+11'533");
    expect(t2).toContain("+12'533");
  });
});

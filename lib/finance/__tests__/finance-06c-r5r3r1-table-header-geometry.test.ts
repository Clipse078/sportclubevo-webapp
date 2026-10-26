import { describe, expect, it, vi, beforeEach } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildFinancePublicationPdfLabels } from "@/lib/finance/presentation/load-finance-publication-pdf-labels";
import { FINANCE_06C_R5R3R1_IMPLEMENTATION } from "@/lib/finance/publishing/finance-publication-artifact-contract";
import {
  publicationPdfRecordedTextDraws,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-draw-recorder";
import { buildPublicationPdfR5R3DefectiveTableHeaderDraws } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-r5r3-table-header-fixture";
import {
  assertPublicationPdfAllTableHeaderSectionsClearFirstRow,
  publicationPdfTableHeaderSectionsFromDraws,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-table-header-geometry";
import { TABLE_HEADER_TO_FIRST_ROW_MIN_GAP_PT } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-table-header-layout";
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

const deLabels = buildFinancePublicationPdfLabels({
  overview: (k) =>
    ({ reportingIncome: "Einnahmen", reportingExpense: "Ausgaben", reportingResult: "Ergebnis" })[
      k as "reportingIncome"
    ] ?? k,
  publication: (k) => k,
  pnl: (k) =>
    ({
      columnActual: "Ist",
      columnBudget: "Budget",
      columnForecast: "Prognose",
      incomeSectionTotal: "Summe Einnahmen",
      expenseSectionTotal: "Summe Ausgaben",
      unassignedGroup: "Nicht zugeordnet",
    })[k as "columnActual"] ?? k,
  actuals: (k) => k,
});

async function generateFcaV2PdfWithDrawLog() {
  const store = createPublicationMockStore();
  store.financeYear.push({ id: yearId, tenantId: tenantA, name: "FY 2026" });
  const prisma = makePublicationMockPrisma(store);
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
      mitgliedsForecastMinor: R5_LIVE_AFTER_MUTATION.mitgliedsbeitraegeForecastMinor,
    }),
  );
  const v2 = await publishFinanceManagementPnlSnapshot(prisma, ctx(tenantA, publishPerms), {
    financeYearId: yearId,
  });
  loader.mockRestore();

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

describe("FIN-06C-R5R3R1 table header → first row actual-draw geometry", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("records R5R3R1 implementation lineage", () => {
    expect(FINANCE_06C_R5R3R1_IMPLEMENTATION.predecessor).toBe("FIN-06C-R5R3");
    expect(FINANCE_06C_R5R3R1_IMPLEMENTATION.focus).toContain("table_header");
  });

  it("OLD_R5R3_TABLE_HEADER_GEOMETRY fails; CURRENT_R5R3R1 passes", async () => {
    const defective = buildPublicationPdfR5R3DefectiveTableHeaderDraws();
    const oldGuard = assertPublicationPdfAllTableHeaderSectionsClearFirstRow(defective);
    expect(oldGuard.ok).toBe(false);
    if (!oldGuard.ok) {
      expect(oldGuard.visualGapPt).toBeLessThan(TABLE_HEADER_TO_FIRST_ROW_MIN_GAP_PT);
    }

    const pdf = await generateFcaV2PdfWithDrawLog();
    const currentGuard = assertPublicationPdfAllTableHeaderSectionsClearFirstRow(pdf.drawOperations!);
    expect(currentGuard.ok, currentGuard.ok ? "" : JSON.stringify(currentGuard)).toBe(true);
  });

  it("Einnahmen and Ausgaben table headers clear Mitgliedsbeiträge and Personal rows", async () => {
    const pdf = await generateFcaV2PdfWithDrawLog();
    const sections = publicationPdfTableHeaderSectionsFromDraws(pdf.drawOperations!);
    expect(sections.length).toBe(2);

    const textDraws = publicationPdfRecordedTextDraws({
      pageIndex: 0,
      operations: pdf.drawOperations!,
    });
    const mitglieds = textDraws.find((d) => d.text.includes("Mitgliedsbeitr"));
    const personal = textDraws.find((d) => d.text === "Personal");
    expect(mitglieds).toBeDefined();
    expect(personal).toBeDefined();

    expect(sections[0]!.firstRowTexts[0]?.text).toContain("Mitgliedsbeitr");
    expect(sections[1]!.firstRowTexts[0]?.text).toBe("Personal");

    for (const section of sections) {
      expect(section.visualGapPt).toBeGreaterThanOrEqual(TABLE_HEADER_TO_FIRST_ROW_MIN_GAP_PT - 0.05);
    }
  });
});

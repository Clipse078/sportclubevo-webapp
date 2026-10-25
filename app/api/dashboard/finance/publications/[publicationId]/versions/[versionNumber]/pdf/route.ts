import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db/prisma";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { generateFinancePublicationPdfArtifactForTenant } from "@/lib/finance/services/finance-publication-artifact-service";
import { financePublicationPdfContentDisposition } from "@/lib/finance/artifacts/finance-publication-pdf/sanitize-finance-publication-pdf-filename";
import type { FinancePublicationPdfLabels } from "@/lib/finance/artifacts/finance-publication-pdf/finance-publication-pdf-types";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ publicationId: string; versionNumber: string }>;
};

function parseVersionNumber(raw: string): number | null {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return parsed;
}

async function loadPdfLabels(): Promise<FinancePublicationPdfLabels> {
  const overview = await getTranslations("Finance.overview");
  const pub = await getTranslations("Finance.reporting.publication");
  const pnl = await getTranslations("Finance.reporting.pnl");
  const actuals = await getTranslations("Finance.actuals");
  return {
    reportTypeLabel: pub("dialogContentValue"),
    publishedVersionLabel: pub("versionLabel"),
    financialYearLabel: pnl("contextYear"),
    executiveSummaryTitle: pnl("interpretationTitle"),
    expectedResultLabel: pnl("expectedResult"),
    budgetResultLabel: pnl("budgetedResult"),
    actualResultLabel: pnl("columnActual"),
    varianceVsBudgetLabel: pnl("varianceVsBudget"),
    favorabilityFavorable: actuals("favorabilityFavorable"),
    favorabilityUnfavorable: actuals("favorabilityUnfavorable"),
    favorabilityOnPlan: actuals("favorabilityOnPlan"),
    incomeSection: overview("reportingIncome"),
    expenseSection: overview("reportingExpense"),
    incomeSectionTotal: pnl("incomeSectionTotal"),
    expenseSectionTotal: pnl("expenseSectionTotal"),
    managementResult: overview("reportingResult"),
    columnBudget: pnl("columnBudget"),
    columnActual: pnl("columnActual"),
    columnForecast: pnl("columnForecast"),
    columnVariance: pnl("columnVariance"),
    unassignedGroup: pnl("unassignedGroup"),
    publishedAtLabel: pub("publishedAtLabel"),
    pdfGeneratedAtLabel: pub("pdfGeneratedAtLabel"),
    publicationReferenceLabel: pub("pdfPublicationReferenceLabel"),
    sportClubEvoDocumentMark: pub("pdfSportClubEvoMark"),
    pageLabel: pub("pdfPageLabel"),
  };
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const access = await requireApiAnyPermission([
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_PUBLICATION_VIEW,
  ]);
  if (!access.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: access.status });
  }

  const tenantId = access.session!.user!.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = access.session!.user!.effectiveUserId ?? access.session!.user!.id;
  const { platform, tenant: tenantPerms } = await getRequestEffectivePermissions(userId, tenantId);
  const permissionKeys = new Set<string>([...platform, ...tenantPerms]);

  const ctx: FinanceAuthContext = {
    tenantId,
    userId,
    permissionKeys,
  };

  const { publicationId, versionNumber: versionRaw } = await context.params;
  const versionNumber = parseVersionNumber(versionRaw);
  if (!versionNumber) {
    return NextResponse.json({ error: "Publication not found." }, { status: 404 });
  }

  const labels = await loadPdfLabels();
  const pub = await getTranslations("Finance.reporting.publication");

  const result = await generateFinancePublicationPdfArtifactForTenant(prisma, ctx, {
    publicationId: publicationId.trim(),
    versionNumber,
    labels,
    reportTypeContentLabel: pub("dialogContentValue"),
  });

  if (!result.ok) {
    if ("forbidden" in result && result.forbidden) {
      return NextResponse.json(
        { error: pub("pdfDownloadForbidden") },
        { status: 403 },
      );
    }
    if ("notFound" in result && result.notFound) {
      return NextResponse.json({ error: pub("pdfDownloadNotFound") }, { status: 404 });
    }
    return NextResponse.json(
      { error: pub("pdfDownloadGenerationFailed") },
      { status: 500 },
    );
  }

  return new NextResponse(Buffer.from(result.pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": financePublicationPdfContentDisposition(result.filename),
      "Cache-Control": "private, no-store",
      "X-Finance-Publication-Version": String(versionNumber),
    },
  });
}

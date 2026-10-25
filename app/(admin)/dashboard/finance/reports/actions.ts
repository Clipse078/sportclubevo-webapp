"use server";

import { prisma } from "@/lib/db/prisma";
import { FinanceDomainError, financeErrorMessage } from "@/lib/finance/errors";
import { loadFinanceWorkspaceContext } from "@/lib/finance/server/finance-page-context";
import { serializeFinanceManagementReportingDetailReadModel } from "@/lib/finance/presentation/serialize-management-reporting-detail-read-model";
import type { SerializedFinanceManagementReportingDetailReadModel } from "@/lib/finance/presentation/serialize-management-reporting-detail-read-model";
import { loadFinanceManagementReportingDetailReadModel } from "@/lib/finance/services/finance-management-reporting-query-service";

export type FinanceReportingDetailActionResult =
  | { ok: true; detail: SerializedFinanceManagementReportingDetailReadModel }
  | { ok: false; error: string };

export async function loadFinanceReportingDetailAction(input: {
  financeYearId: string;
  accountId?: string | null;
  groupId?: string | null;
  actualGrain?: "ANNUAL_FULL_YEAR" | "YTD";
}): Promise<FinanceReportingDetailActionResult> {
  try {
    const workspace = await loadFinanceWorkspaceContext();
    const accountId = input.accountId?.trim() || null;
    const groupId = input.groupId?.trim() || null;

    const model = await loadFinanceManagementReportingDetailReadModel(prisma, workspace.ctx, {
      financeYearId: input.financeYearId,
      accountId,
      groupId,
      actualGrain: input.actualGrain,
      timingNavEnabled: workspace.showForecastNav,
    });

    return { ok: true, detail: serializeFinanceManagementReportingDetailReadModel(model) };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof FinanceDomainError ? error.message : financeErrorMessage(error),
    };
  }
}

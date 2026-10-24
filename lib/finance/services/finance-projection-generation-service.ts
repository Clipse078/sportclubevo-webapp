import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceForecastManage,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { calculateProjectionForAccount } from "@/lib/finance/projection/projection-account-calculator";
import { SCE_PROJECTION_ENGINE_VERSION } from "@/lib/finance/projection/projection-engine-version";
import type { ProjectionAccountCalculationResult } from "@/lib/finance/projection/projection-calculation-types";
import type { GenerateProjectionSnapshotResult } from "@/lib/finance/projection/projection-generation-types";
import type { ProjectionDataSufficiencyReason } from "@/lib/finance/projection/projection-architecture-contract";
import {
  rollupVersionConfidence,
  rollupVersionDataSufficiency,
  rollupVersionMethodologyFamily,
} from "@/lib/finance/projection/projection-version-rollup";
import { getProjectionEvidenceContextForFinanceYearAccounts } from "@/lib/finance/services/finance-projection-evidence-service";
import { generateProjectionSnapshot } from "@/lib/finance/services/finance-projection-service";

type Db = Pick<
  PrismaClient,
  | "financeConfiguration"
  | "financeYear"
  | "financialAccount"
  | "financeActualEntry"
  | "financeBudget"
  | "financeBudgetVersion"
  | "financeBudgetLine"
  | "financeForecast"
  | "financeForecastVersion"
  | "financeForecastLine"
  | "financeProjection"
  | "financeProjectionVersion"
  | "financeProjectionLine"
  | "financeProjectionEvidence"
  | "financeProjectionReasonCode"
  | "$transaction"
>;

const PLANNING_ACCOUNT_SEMANTICS = ["INCOME", "EXPENSE"] as const;

function formatUtcToday(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildEvidenceRows(
  results: readonly ProjectionAccountCalculationResult[],
  financeYearId: string,
  actualsThroughDate: string,
) {
  const rows: Array<{
    kind: "HISTORICAL_ACTUALS" | "CURRENT_YEAR_ACTUALS";
    financeYearId?: string;
    financialAccountId?: string;
    observationsCount?: number;
    throughDate?: string;
    sourceReference?: string;
  }> = [];

  for (const result of results) {
    rows.push({
      kind: "CURRENT_YEAR_ACTUALS",
      financeYearId,
      financialAccountId: result.financialAccountId,
      observationsCount: result.completedCurrentPeriodCount,
      throughDate: actualsThroughDate,
      sourceReference: result.methodologyFamily,
    });
    for (const histId of result.historicalFinanceYearIdsUsed) {
      rows.push({
        kind: "HISTORICAL_ACTUALS",
        financeYearId: histId,
        financialAccountId: result.financialAccountId,
        sourceReference: result.methodologyFamily,
      });
    }
  }
  return rows;
}

function aggregateReasonCodes(results: readonly ProjectionAccountCalculationResult[]) {
  const sufficiency = new Set<ProjectionDataSufficiencyReason>();
  const confidence = new Set<string>();
  for (const row of results) {
    for (const code of row.sufficiencyReasons) sufficiency.add(code);
    for (const code of row.confidenceRationaleCodes) confidence.add(code);
  }
  return {
    sufficiencyReasons: [...sufficiency],
    confidenceRationaleCodes: [...confidence],
  };
}

export type GenerateFinanceYearProjectionInput = {
  financeYearId: string;
  /** ISO calendar date (UTC). Defaults to today (UTC) when omitted. */
  actualsThroughDate?: string;
  /** When omitted, all active income/expense accounts for the tenant are included. */
  financialAccountIds?: readonly string[];
  generationActorType?: "USER" | "SYSTEM";
};

export type GenerateFinanceYearProjectionResult = GenerateProjectionSnapshotResult & {
  accountResults: readonly ProjectionAccountCalculationResult[];
  engineVersion: string;
};

/**
 * FIN-04B-04 — canonical SCE projection generation orchestrator.
 * Does not mutate forecast, budget, or actuals.
 */
export async function generateFinanceYearProjection(
  db: Db,
  ctx: FinanceAuthContext,
  input: GenerateFinanceYearProjectionInput,
): Promise<GenerateFinanceYearProjectionResult> {
  requireFinanceForecastManage(ctx);

  const actualsThroughDate = input.actualsThroughDate?.trim() || formatUtcToday();

  const accounts = await db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId },
    select: {
      id: true,
      canonicalSemantic: true,
      lifecycle: true,
    },
  });

  const eligibleIds = accounts
    .filter(
      (a) =>
        a.lifecycle === "ACTIVE" &&
        (PLANNING_ACCOUNT_SEMANTICS as readonly string[]).includes(a.canonicalSemantic),
    )
    .map((a) => a.id);

  const requested = input.financialAccountIds?.length
    ? [...input.financialAccountIds]
    : eligibleIds;

  for (const id of requested) {
    if (!eligibleIds.includes(id)) {
      throw new FinanceDomainError(
        "FINANCE_PROJECTION_INVALID_ACCOUNT",
        "Projection generation account must be an active income or expense account.",
      );
    }
  }

  const currencyConfig = await db.financeConfiguration.findUnique({
    where: { tenantId: ctx.tenantId },
    select: { baseCurrency: true },
  });
  const currency = currencyConfig?.baseCurrency?.trim().toUpperCase();
  if (!currency) {
    throw new FinanceDomainError(
      "FINANCE_INVALID_CURRENCY",
      "Organisation base currency must be configured before generating projections.",
      409,
    );
  }

  const contexts = await getProjectionEvidenceContextForFinanceYearAccounts(db, ctx, {
    financeYearId: input.financeYearId,
    actualsThroughDate,
    financialAccountIds: requested,
  });

  const accountResults: ProjectionAccountCalculationResult[] = [];
  for (const accountId of requested) {
    const context = contexts.get(accountId);
    if (!context) continue;
    accountResults.push(calculateProjectionForAccount(context));
  }

  const versionMethodology = rollupVersionMethodologyFamily(accountResults);
  const versionSufficiency = rollupVersionDataSufficiency(accountResults);
  const versionConfidence = rollupVersionConfidence(accountResults);
  const reasonRollup = aggregateReasonCodes(accountResults);

  const combinedFingerprint = accountResults
    .map((r) => contexts.get(r.financialAccountId)?.evidenceFingerprint ?? "")
    .sort()
    .join("|");

  const snapshot = await generateProjectionSnapshot(db, ctx, {
    financeYearId: input.financeYearId,
    currency,
    actualsThroughDate,
    methodologyFamily: versionMethodology,
    engineVersion: SCE_PROJECTION_ENGINE_VERSION,
    dataSufficiency: versionSufficiency,
    confidence: versionConfidence,
    generationActorType: input.generationActorType ?? "USER",
    evidenceFingerprint: combinedFingerprint || null,
    sufficiencyReasons: reasonRollup.sufficiencyReasons,
    confidenceRationaleCodes: reasonRollup.confidenceRationaleCodes,
    evidence: buildEvidenceRows(accountResults, input.financeYearId, actualsThroughDate),
    lines: accountResults.map((row) => ({
      financialAccountId: row.financialAccountId,
      projectedAmountMinor: row.projectedAmountMinor,
      lowerBoundMinor: row.lowerBoundMinor,
      upperBoundMinor: row.upperBoundMinor,
      methodologyFamily: row.methodologyFamily,
      dataSufficiency: row.dataSufficiency,
      confidence: row.confidenceLevel,
    })),
  });

  return {
    ...snapshot,
    accountResults,
    engineVersion: SCE_PROJECTION_ENGINE_VERSION,
  };
}

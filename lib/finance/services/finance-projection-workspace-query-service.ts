import type { PrismaClient } from "@prisma/client";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { requireFinanceForecastView } from "@/lib/finance/finance-authorization";
import { calculateProjectionForAccount } from "@/lib/finance/projection/projection-account-calculator";
import { evaluateProjectionEvidenceStaleness } from "@/lib/finance/projection/projection-evidence-staleness";
import {
  buildProjectionAccountExplainability,
  buildProjectionWorkspaceViewModel,
  type ProjectionWorkspaceViewModel,
} from "@/lib/finance/projection/projection-workspace-presentation";
import type { ProjectionCoverageAccountInput } from "@/lib/finance/projection/projection-workspace-coverage";
import { resolveCurrentProjectionVersionForYear } from "@/lib/finance/services/finance-projection-service";
import {
  getProjectionEvidenceContextForFinanceYearAccounts,
  loadProjectionEvidenceLoaderBundle,
} from "@/lib/finance/services/finance-projection-evidence-service";

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

function formatUtcToday(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatUtcDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function loadProjectionWorkspaceViewModel(
  db: Db,
  ctx: FinanceAuthContext,
  input: { financeYearId: string; forecastAmountByAccountId: ReadonlyMap<string, number | null> },
): Promise<ProjectionWorkspaceViewModel | null> {
  requireFinanceForecastView(ctx);

  const year = await db.financeYear.findUnique({
    where: { id: input.financeYearId },
    select: { id: true, name: true, tenantId: true },
  });
  if (!year || year.tenantId !== ctx.tenantId) return null;

  const accounts = await db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId },
    select: {
      id: true,
      canonicalSemantic: true,
      lifecycle: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const coverageAccounts: ProjectionCoverageAccountInput[] = accounts
    .filter((a) => a.canonicalSemantic === "INCOME" || a.canonicalSemantic === "EXPENSE")
    .map((a) => ({
      accountId: a.id,
      semantic: a.canonicalSemantic as "INCOME" | "EXPENSE",
      lifecycle: a.lifecycle,
      projectedAmountMinor: null,
    }));

  const currentVersion = await resolveCurrentProjectionVersionForYear(db, ctx, input.financeYearId);

  if (!currentVersion) {
    return buildProjectionWorkspaceViewModel({
      financeYearId: year.id,
      financeYearName: year.name,
      version: null,
      staleness: null,
      lines: [],
      forecastAmountByAccountId: input.forecastAmountByAccountId,
      coverageAccounts,
      explainabilityByAccountId: new Map(),
    });
  }

  const actualsThroughDate = formatUtcDateOnly(currentVersion.actualsThroughDate);
  const accountIds = coverageAccounts.map((row) => row.accountId);

  const evidenceContexts = await getProjectionEvidenceContextForFinanceYearAccounts(db, ctx, {
    financeYearId: input.financeYearId,
    actualsThroughDate,
    financialAccountIds: accountIds,
  });

  const bundle = await loadProjectionEvidenceLoaderBundle(db, ctx, {
    financeYearId: input.financeYearId,
    actualsThroughDate: formatUtcToday(),
  });
  const yearNameById = new Map(bundle.years.map((y) => [y.id, y.name]));

  const todayCutoff = formatUtcToday();
  const currentEvidenceContexts = await getProjectionEvidenceContextForFinanceYearAccounts(
    db,
    ctx,
    {
      financeYearId: input.financeYearId,
      actualsThroughDate: todayCutoff,
      financialAccountIds: accountIds,
    },
  );
  const combinedCurrentFingerprint = [...currentEvidenceContexts.values()]
    .map((ctxRow) => ctxRow.evidenceFingerprint)
    .sort()
    .join("|");

  const staleness = evaluateProjectionEvidenceStaleness(
    {
      evidenceFingerprint: currentVersion.evidenceFingerprint,
      actualsThroughDate,
    },
    {
      evidenceFingerprint: combinedCurrentFingerprint,
      actualsThroughDate: todayCutoff,
    },
  );

  const explainabilityByAccountId = new Map<
    string,
    ReturnType<typeof buildProjectionAccountExplainability>
  >();

  for (const accountId of accountIds) {
    const context = evidenceContexts.get(accountId);
    if (!context) continue;
    const calculation = calculateProjectionForAccount(context);
    const historicalNames = calculation.historicalFinanceYearIdsUsed
      .map((id) => yearNameById.get(id))
      .filter((name): name is string => Boolean(name));
    explainabilityByAccountId.set(
      accountId,
      buildProjectionAccountExplainability(calculation, {
        actualsThroughDate,
        historicalFinanceYearNames: historicalNames,
      }),
    );
  }

  for (const row of coverageAccounts) {
    const line = currentVersion.lines.find((l) => l.financialAccountId === row.accountId);
    if (line) row.projectedAmountMinor = line.projectedAmountMinor;
  }

  return buildProjectionWorkspaceViewModel({
    financeYearId: year.id,
    financeYearName: year.name,
    version: {
      versionNumber: currentVersion.versionNumber,
      actualsThroughDate,
      generatedAt: currentVersion.generatedAt,
      dataSufficiency: currentVersion.dataSufficiency,
      evidenceFingerprint: currentVersion.evidenceFingerprint,
    },
    staleness,
    lines: currentVersion.lines,
    forecastAmountByAccountId: input.forecastAmountByAccountId,
    coverageAccounts,
    explainabilityByAccountId,
  });
}

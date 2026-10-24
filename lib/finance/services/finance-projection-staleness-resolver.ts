import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { evaluateProjectionEvidenceStaleness } from "@/lib/finance/projection/projection-evidence-staleness";
import type { ProjectionEvidenceStaleness } from "@/lib/finance/projection/projection-evidence-types";
import { getProjectionEvidenceContextForFinanceYearAccounts } from "@/lib/finance/services/finance-projection-evidence-service";

type Db = Parameters<typeof getProjectionEvidenceContextForFinanceYearAccounts>[0];

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

/** Shared FIN-04B-03 staleness semantics for workspace read and adoption guard. */
export async function resolveProjectionVersionStaleness(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    financeYearId: string;
    projectionVersion: {
      actualsThroughDate: Date;
      evidenceFingerprint: string | null;
    };
    financialAccountIds: readonly string[];
  },
): Promise<ProjectionEvidenceStaleness> {
  const actualsThroughDate = formatUtcDateOnly(input.projectionVersion.actualsThroughDate);
  const todayCutoff = formatUtcToday();
  const currentEvidenceContexts = await getProjectionEvidenceContextForFinanceYearAccounts(
    db,
    ctx,
    {
      financeYearId: input.financeYearId,
      actualsThroughDate: todayCutoff,
      financialAccountIds: [...input.financialAccountIds],
    },
  );
  const combinedCurrentFingerprint = [...currentEvidenceContexts.values()]
    .map((ctxRow) => ctxRow.evidenceFingerprint)
    .sort()
    .join("|");

  return evaluateProjectionEvidenceStaleness(
    {
      evidenceFingerprint: input.projectionVersion.evidenceFingerprint,
      actualsThroughDate,
    },
    {
      evidenceFingerprint: combinedCurrentFingerprint,
      actualsThroughDate: todayCutoff,
    },
  );
}

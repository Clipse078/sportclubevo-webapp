import type { PrismaClient } from "@prisma/client";
import { aggregateActualTotalsByAccount } from "@/lib/finance/actual/aggregate-actuals";
import { formatFinanceCalendarDateIso } from "@/lib/finance/dates/finance-calendar-date";
import { FinanceDomainError } from "@/lib/finance/errors";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { mapExpectedFinancialEventToReconciliationShape } from "@/lib/finance/forecast/expected-financial-event-row-mapper";
import type { ScenarioAccountTemporalEvidence } from "@/lib/finance/forecast/merge-effective-dated-scenario-calculation";
import { assertSameTenant } from "@/lib/finance/tenant-scope";

type Db = Pick<
  PrismaClient,
  "financeScenario" | "financeActualEntry" | "financeExpectedFinancialEvent"
>;

export async function loadScenarioTemporalEvidenceByAccountId(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    scenarioId: string;
    financeYearId: string;
    financialAccountIds: readonly string[];
    actualsThroughDateIso: string;
  },
): Promise<Map<string, ScenarioAccountTemporalEvidence>> {
  const scenario = await db.financeScenario.findUnique({
    where: { id: input.scenarioId },
    select: { id: true, tenantId: true, financeYearId: true },
  });
  if (!scenario || scenario.financeYearId !== input.financeYearId) {
    throw new FinanceDomainError("FINANCE_SCENARIO_NOT_FOUND", "Scenario not found.", 404);
  }
  assertSameTenant(scenario.tenantId, ctx.tenantId, "Scenario");

  const uniqueAccountIds = [...new Set(input.financialAccountIds)];
  if (uniqueAccountIds.length === 0) {
    return new Map();
  }

  const actualEntries = await db.financeActualEntry.findMany({
    where: {
      tenantId: ctx.tenantId,
      financeYearId: input.financeYearId,
      financialAccountId: { in: uniqueAccountIds },
    },
    select: {
      financialAccountId: true,
      effectiveDate: true,
      amountMinor: true,
    },
  });

  const throughCutoff = actualEntries.filter((entry) => {
    const effectiveIso = formatFinanceCalendarDateIso(entry.effectiveDate);
    return effectiveIso <= input.actualsThroughDateIso;
  });
  const actualThroughCutoffByAccountId = aggregateActualTotalsByAccount(throughCutoff);

  const events = await db.financeExpectedFinancialEvent.findMany({
    where: {
      tenantId: ctx.tenantId,
      financeYearId: input.financeYearId,
      financialAccountId: { in: uniqueAccountIds },
    },
    select: {
      financialAccountId: true,
      expectedAmountMinor: true,
      timingPrecision: true,
      expectedDate: true,
      expectedMonthStart: true,
      rangeStartDate: true,
      rangeEndDate: true,
      updatedAt: true,
    },
  });

  const eventsByAccount = new Map<string, typeof events>();
  let latestTimingEvidenceUpdatedAt: Date | null = null;
  for (const event of events) {
    const bucket = eventsByAccount.get(event.financialAccountId) ?? [];
    bucket.push(event);
    eventsByAccount.set(event.financialAccountId, bucket);
    if (!latestTimingEvidenceUpdatedAt || event.updatedAt > latestTimingEvidenceUpdatedAt) {
      latestTimingEvidenceUpdatedAt = event.updatedAt;
    }
  }

  const timingEvidenceUpdatedAtIso = latestTimingEvidenceUpdatedAt
    ? latestTimingEvidenceUpdatedAt.toISOString()
    : null;

  const result = new Map<string, ScenarioAccountTemporalEvidence>();
  for (const accountId of uniqueAccountIds) {
    const accountEvents = eventsByAccount.get(accountId) ?? [];
    result.set(accountId, {
      actualsThroughDateIso: input.actualsThroughDateIso,
      actualThroughCutoffMinor: actualThroughCutoffByAccountId.get(accountId) ?? 0,
      expectedEvents: accountEvents.map((row) =>
        mapExpectedFinancialEventToReconciliationShape(row),
      ),
      timingEvidenceUpdatedAtIso,
    });
  }

  return result;
}

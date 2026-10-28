/**
 * FIN-07B/C — align commitment workspace year selection with finance configuration.
 */

export function resolveFinanceCommitmentSelectedYearId(input: {
  requestedYearId?: string | null;
  years: ReadonlyArray<{ id: string }>;
  currentFinanceYearId?: string | null;
}): string | null {
  const requested = input.requestedYearId?.trim() || null;
  if (requested && input.years.some((year) => year.id === requested)) {
    return requested;
  }
  if (
    input.currentFinanceYearId &&
    input.years.some((year) => year.id === input.currentFinanceYearId)
  ) {
    return input.currentFinanceYearId;
  }
  return input.years[0]?.id ?? null;
}

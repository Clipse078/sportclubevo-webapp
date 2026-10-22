import type { FinanceConfiguration, FinanceSetupStatus, FinanceYear } from "@prisma/client";

export type FinanceOverviewState =
  | "NOT_CONFIGURED"
  | "SETUP_INCOMPLETE"
  | "CONFIGURED_NO_DATA"
  | "CONFIGURED_WITH_CAPABILITIES";

export type FinanceSetupSnapshot = {
  configuration: FinanceConfiguration | null;
  financeYearCount: number;
  enabledCapabilityCount: number;
};

export function resolveFinanceOverviewState(
  snapshot: FinanceSetupSnapshot,
): FinanceOverviewState {
  const config = snapshot.configuration;
  if (!config || config.setupStatus === "NOT_STARTED") {
    if (!config?.baseCurrency && snapshot.financeYearCount === 0) {
      return "NOT_CONFIGURED";
    }
  }

  if (
    !config ||
    config.setupStatus !== "CONFIGURED" ||
    !config.baseCurrency ||
    snapshot.financeYearCount === 0
  ) {
    return "SETUP_INCOMPLETE";
  }

  if (snapshot.enabledCapabilityCount > 0) {
    return "CONFIGURED_WITH_CAPABILITIES";
  }

  return "CONFIGURED_NO_DATA";
}

export function deriveSetupStatusAfterMutation(input: {
  baseCurrency: string | null;
  financeYearCount: number;
  previous: FinanceSetupStatus;
}): FinanceSetupStatus {
  if (input.baseCurrency && input.financeYearCount > 0) {
    return input.previous === "CONFIGURED" ? "CONFIGURED" : "IN_PROGRESS";
  }
  if (input.baseCurrency || input.financeYearCount > 0) {
    return "IN_PROGRESS";
  }
  return "NOT_STARTED";
}

export function assertValidFinanceYearRange(startDate: Date, endDate: Date): void {
  if (!(startDate.getTime() < endDate.getTime())) {
    throw new Error("FINANCE_INVALID_YEAR");
  }
}

export function financeYearOverlaps(
  a: Pick<FinanceYear, "startDate" | "endDate">,
  b: Pick<FinanceYear, "startDate" | "endDate">,
): boolean {
  return a.startDate < b.endDate && b.startDate < a.endDate;
}

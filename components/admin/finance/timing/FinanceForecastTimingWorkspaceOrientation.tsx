"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { formatFinanceManagementPlanningMinor } from "@/lib/finance/budget/budget-amount-presentation";
import {
  formatFinanceDirectionalMovementMinor,
  financeMovementDirectionFromAccountType,
} from "@/lib/finance/presentation/finance-directional-movement-presentation";
import { FINANCE_SECTION_SURFACE_CLASS } from "@/lib/finance/finance-workspace-surfaces";
import type { FinanceForecastTimingVisualModel } from "@/lib/finance/forecast/finance-forecast-timing-visual-types";

type FinanceForecastTimingWorkspaceOrientationProps = {
  variant: "ZERO_TIMING" | "PARTIAL_UNTIMED" | "FULL_COMPLETION";
  visual: FinanceForecastTimingVisualModel | null;
  untimedTotalMinor: number;
  untimedIncomeMinor: number;
  untimedExpenseMinor: number;
  baseCurrency: string | null;
  formattingLocale: string;
};

function movementAmountClassName(accountType: "INCOME" | "EXPENSE"): string {
  return accountType === "INCOME"
    ? "text-[var(--sce-success)]"
    : "text-[var(--sce-danger)]";
}

export function FinanceForecastTimingWorkspaceOrientation({
  variant,
  visual,
  untimedTotalMinor,
  untimedIncomeMinor,
  untimedExpenseMinor,
  baseCurrency,
  formattingLocale,
}: FinanceForecastTimingWorkspaceOrientationProps) {
  const t = useTranslations("Finance.forecast.timing");
  const tVisual = useTranslations("Finance.forecast.timing.visual");

  if (variant === "ZERO_TIMING" && visual) {
    const formattedUntimed = formatFinanceManagementPlanningMinor(
      visual.untimed.totalMinor,
      baseCurrency,
      formattingLocale,
    );
    return (
      <section
        className={cn(FINANCE_SECTION_SURFACE_CLASS, "px-4 py-4 sm:px-5")}
        data-finance-timing-compact-interpretation
        data-finance-timing-presentation-state="ZERO_TIMING"
      >
        <div className="space-y-2" data-finance-timing-compact-empty>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {tVisual("compactEmptyTitle")}
          </p>
          <p className="text-sm text-[var(--text-2)]" data-finance-timing-compact-empty-amount>
            {tVisual("compactEmptyStatement", { amount: formattedUntimed })}
          </p>
          <p className="text-sm text-[var(--muted)]">{tVisual("compactEmptyActionHint")}</p>
        </div>
      </section>
    );
  }

  if (variant === "PARTIAL_UNTIMED" && untimedTotalMinor > 0) {
    return (
      <section
        className={cn(FINANCE_SECTION_SURFACE_CLASS, "px-4 py-4 sm:px-5")}
        data-finance-timing-untimed-orientation
        data-finance-timing-presentation-state="PARTIAL_TIMING"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          {t("untimedLabel")}
        </p>
        <p
          className="mt-1 text-xl font-semibold tabular-nums text-[var(--foreground)]"
          data-finance-timing-untimed-gross
        >
          {formatFinanceManagementPlanningMinor(untimedTotalMinor, baseCurrency, formattingLocale)}
        </p>
        <p className="mt-2 text-sm tabular-nums text-[var(--text-2)]" data-finance-timing-untimed-breakdown>
          {t("compositionIncome")}{" "}
          <span className={cn("font-medium", movementAmountClassName("INCOME"))}>
            {formatFinanceDirectionalMovementMinor({
              amountMinor: untimedIncomeMinor,
              direction: financeMovementDirectionFromAccountType("INCOME"),
              currency: baseCurrency,
              formattingLocale,
            })}
          </span>
          {" · "}
          {t("compositionExpense")}{" "}
          <span className={cn("font-medium", movementAmountClassName("EXPENSE"))}>
            {formatFinanceDirectionalMovementMinor({
              amountMinor: untimedExpenseMinor,
              direction: financeMovementDirectionFromAccountType("EXPENSE"),
              currency: baseCurrency,
              formattingLocale,
            })}
          </span>
        </p>
      </section>
    );
  }

  if (variant === "FULL_COMPLETION") {
    return (
      <section
        className={cn(FINANCE_SECTION_SURFACE_CLASS, "px-4 py-4 sm:px-5")}
        data-finance-timing-full-completion
        data-finance-timing-presentation-state="FULL_TIMING"
      >
        <p className="text-sm font-semibold text-[var(--foreground)]">{t("fullCompletionTitle")}</p>
        <p className="mt-1 text-sm text-[var(--text-2)]">{t("fullCompletionBody")}</p>
      </section>
    );
  }

  return null;
}

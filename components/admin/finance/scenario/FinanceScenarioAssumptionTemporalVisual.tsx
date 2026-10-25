"use client";

import { useTranslations } from "next-intl";
import { formatFinanceManagementPlanningMinor } from "@/lib/finance/budget/budget-amount-presentation";
import type { ScenarioAssumptionTemporalVisualModel } from "@/lib/finance/forecast/build-scenario-assumption-temporal-visual-model";

type FinanceScenarioAssumptionTemporalVisualProps = {
  model: ScenarioAssumptionTemporalVisualModel;
  baseCurrency: string | null;
  formattingLocale: string;
};

const SEGMENT_ORDER = ["BEFORE", "AFTER", "AMBIGUOUS", "UNSCHEDULED"] as const;

export function FinanceScenarioAssumptionTemporalVisual({
  model,
  baseCurrency,
  formattingLocale,
}: FinanceScenarioAssumptionTemporalVisualProps) {
  const t = useTranslations("Finance.forecast.scenarios.temporalVisual");
  const max = Math.max(
    1,
    ...model.segments.map((segment) => segment.amountMinor),
  );

  return (
    <div
      className="mt-2 space-y-2 rounded-md border border-[var(--sce-surface-border-subtle)] bg-[var(--surface-1)]/50 px-3 py-2"
      data-finance-scenario-temporal-visual
    >
      <p className="text-xs text-[var(--muted)]">
        {t("effectiveFrom")}{" "}
        <span className="font-medium text-[var(--foreground)]">{model.effectiveFromDateIso}</span>
      </p>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="absolute inset-y-0 w-px bg-[var(--sce-primary)]"
          style={{ left: "42%" }}
          aria-hidden
          title={t("effectiveMarker")}
        />
      </div>
      <ul className="grid gap-1 text-xs text-[var(--text-2)] sm:grid-cols-2">
        {SEGMENT_ORDER.map((key) => {
          const segment = model.segments.find((s) => s.key === key);
          const amount = segment?.amountMinor ?? 0;
          if (amount <= 0 && key !== "UNSCHEDULED") return null;
          const widthPct = Math.max(4, (amount / max) * 100);
          return (
            <li key={key} className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span>{t(`segment.${key}`)}</span>
                <span className="tabular-nums text-[var(--foreground)]">
                  {formatFinanceManagementPlanningMinor(amount, baseCurrency, formattingLocale)}
                </span>
              </div>
              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-sm bg-[var(--surface-2)]">
                <div
                  className="h-full rounded-sm bg-[var(--muted)] opacity-70"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-[var(--muted)]">
        {t("knownImpact")}{" "}
        <span className="tabular-nums text-[var(--foreground)]">
          {formatFinanceManagementPlanningMinor(
            model.knownScenarioImpactMinor,
            baseCurrency,
            formattingLocale,
          )}
        </span>
        {model.undeterminedBaseAmountMinor > 0 ? (
          <>
            {" · "}
            {t("undetermined")}{" "}
            {formatFinanceManagementPlanningMinor(
              model.undeterminedBaseAmountMinor,
              baseCurrency,
              formattingLocale,
            )}
          </>
        ) : null}
      </p>
    </div>
  );
}

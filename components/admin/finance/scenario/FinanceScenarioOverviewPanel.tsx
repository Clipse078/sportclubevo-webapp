"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import { FinanceForecastSubContextTabs } from "@/components/admin/finance/FinanceForecastSubContextTabs";
import SceToolbarSelect from "@/components/ui/SceToolbarSelect";
import { cn } from "@/lib/cn";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";
import {
  formatFinanceManagementPlanningMinor,
  formatFinanceManagementPlanningSignedMinor,
} from "@/lib/finance/budget/budget-amount-presentation";
import {
  FINANCE_CONTEXT_STRIP_CLASS,
  FINANCE_FUNCTIONAL_SURFACE_CLASS,
  FINANCE_WORKSPACE_STACK_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";
import type { FinanceScenarioListReadModel } from "@/lib/finance/forecast/finance-scenario-read-model";
import { financeResultSemanticTextClass } from "@/lib/finance/presentation/finance-result-presentation";
import { createFinanceScenarioAction } from "@/app/(admin)/dashboard/finance/forecast/scenarios/actions";

type YearOption = { id: string; name: string };

type ListFilter = "active" | "archived";

type FinanceScenarioOverviewPanelProps = {
  years: YearOption[];
  selectedYearId: string | null;
  list: FinanceScenarioListReadModel | null;
  archivedList: FinanceScenarioListReadModel | null;
  baseCurrency: string | null;
  formattingLocale: string;
  canMutate: boolean;
  hasAccounts: boolean;
  expectedCurrentForecastVersionId: string | null;
};

export function FinanceScenarioOverviewPanel({
  years,
  selectedYearId,
  list,
  archivedList,
  baseCurrency,
  formattingLocale,
  canMutate,
  hasAccounts,
  expectedCurrentForecastVersionId,
}: FinanceScenarioOverviewPanelProps) {
  const t = useTranslations("Finance.forecast.scenarios");
  const tForecast = useTranslations("Finance.forecast");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [listFilter, setListFilter] = useState<ListFilter>("active");
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const selectedYearName =
    years.find((y) => y.id === selectedYearId)?.name ?? tForecast("yearPlaceholder");

  const items = listFilter === "archived" ? (archivedList?.items ?? []) : (list?.items ?? []);

  const yearHref = (yearId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("yearId", yearId);
    return `/dashboard/finance/forecast/scenarios?${params.toString()}`;
  };

  const listFilterOptions = useMemo(
    () => [
      { value: "active" as const, label: t("filterActive") },
      { value: "archived" as const, label: t("filterArchived") },
    ],
    [t],
  );

  function runCreate() {
    if (!selectedYearId) return;
    setCreateError(null);
    startTransition(async () => {
      const result = await createFinanceScenarioAction({
        financeYearId: selectedYearId,
        name: createName,
        description: createDescription.trim() ? createDescription.trim() : null,
        expectedCurrentForecastVersionId,
      });
      if (!result.ok) {
        setCreateError(
          result.errorCode === "FINANCE_SCENARIO_NAME_CONFLICT"
            ? t("errors.nameConflict")
            : result.errorCode === "FINANCE_SCENARIO_STALE_CURRENT_FORECAST"
              ? t("errors.staleCurrentForecast")
              : result.errorCode === "FINANCE_SCENARIO_NO_CURRENT_FORECAST"
                ? t("errors.noCurrentForecast")
                : result.error,
        );
        return;
      }
      setCreateOpen(false);
      setCreateName("");
      setCreateDescription("");
      if (result.scenarioId) {
        router.push(
          `/dashboard/finance/forecast/scenarios/${result.scenarioId}?yearId=${selectedYearId}`,
        );
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className={cn(FINANCE_WORKSPACE_STACK_CLASS, "min-w-0")} data-finance-scenario-overview>
      <FinanceForecastSubContextTabs
        labels={{
          current: tForecast("subNav.current"),
          scenarios: tForecast("subNav.scenarios"),
        }}
        ariaLabel={tForecast("subNav.aria")}
      />

      <div className={FINANCE_CONTEXT_STRIP_CLASS}>
        <SceToolbarSelect
          aria-label={tForecast("yearLabel")}
          value={selectedYearId ?? ""}
          disabled={years.length === 0}
          onChange={(event) => {
            const next = event.target.value;
            if (next) router.push(yearHref(next));
          }}
        >
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </SceToolbarSelect>
        {baseCurrency ? (
          <span className="text-xs text-[var(--muted)]">
            {tForecast("currencyLabel")}: {baseCurrency}
          </span>
        ) : null}
        {!canMutate ? (
          <span className="text-xs text-[var(--muted)]">{tForecast("viewOnlyHint")}</span>
        ) : null}
      </div>

      {!selectedYearId ? (
        <div className={FINANCE_FUNCTIONAL_SURFACE_CLASS}>
          <h2 className="text-base font-semibold">{tForecast("noYearTitle")}</h2>
          <p className="text-sm text-[var(--muted)]">{tForecast("noYearBody")}</p>
        </div>
      ) : !hasAccounts ? (
        <div className={FINANCE_FUNCTIONAL_SURFACE_CLASS}>
          <h2 className="text-base font-semibold">{tForecast("noAccountsTitle")}</h2>
          <p className="text-sm text-[var(--muted)]">{tForecast("noAccountsBody")}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SceSegmentedControl
              aria-label={t("listFilterAria")}
              value={listFilter}
              onChange={setListFilter}
              options={listFilterOptions}
            />
            {canMutate && listFilter === "active" ? (
              <Button onClick={() => setCreateOpen(true)} disabled={pending}>
                {t("createCta")}
              </Button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <div className={FINANCE_FUNCTIONAL_SURFACE_CLASS} data-finance-scenario-empty>
              <h2 className="text-base font-semibold">{t("emptyTitle")}</h2>
              <p className="text-sm text-[var(--muted)]">{t("emptyBody")}</p>
              {canMutate && listFilter === "active" ? (
                <Button className="mt-3" onClick={() => setCreateOpen(true)} disabled={pending}>
                  {t("createCta")}
                </Button>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
              {items.map((item) => {
                const href = `/dashboard/finance/forecast/scenarios/${item.scenarioId}?yearId=${selectedYearId}`;
                const resultClass = financeResultSemanticTextClass(item.scenarioResultMinor);
                const outdated = item.baselineFreshness.status === "OUTDATED";
                return (
                  <li key={item.scenarioId}>
                    <Link
                      href={href}
                      className="flex min-w-0 flex-col gap-2 px-4 py-3 transition hover:bg-[var(--surface-2)] sm:flex-row sm:items-center sm:justify-between"
                      data-finance-scenario-list-item={item.scenarioId}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="truncate text-sm font-semibold text-[var(--foreground)]">
                          {item.name}
                        </div>
                        {item.description ? (
                          <p className="line-clamp-2 text-xs text-[var(--muted)]">
                            {item.description}
                          </p>
                        ) : null}
                        <p className="text-xs text-[var(--muted)]">
                          {t("assumptionCount", { count: item.assumptionCount })}
                          {" · "}
                          {t("updatedAt", {
                            date: new Date(item.updatedAt).toLocaleDateString(formattingLocale),
                          })}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-start gap-0.5 sm:items-end">
                        <span className={cn("text-sm font-semibold tabular-nums", resultClass)}>
                          {formatFinanceManagementPlanningMinor(
                            item.scenarioResultMinor,
                            baseCurrency,
                            formattingLocale,
                          )}
                        </span>
                        <span className="text-xs text-[var(--muted)] tabular-nums">
                          {t("primaryDeltaShort", {
                            amount: formatFinanceManagementPlanningSignedMinor(
                              item.resultDeltaMinor,
                              baseCurrency,
                              formattingLocale,
                            ),
                          })}
                        </span>
                        {outdated ? (
                          <span
                            className="text-xs text-[var(--warning)]"
                            data-finance-scenario-freshness="outdated"
                          >
                            {t("freshnessOutdatedShort")}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("createDialogTitle")}
        description={t("createDialogDescription", { year: selectedYearName })}
        footer={
          <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              {tForecast("cancel")}
            </Button>
            <Button disabled={pending || createName.trim().length === 0} onClick={runCreate}>
              {t("createConfirm")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <SceFormField label={t("createNameLabel")} required>
            <input
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              autoComplete="off"
            />
          </SceFormField>
          <SceFormField label={t("createDescriptionLabel")}>
            <textarea
              className="min-h-[4rem] w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
            />
          </SceFormField>
          <p className="text-xs text-[var(--muted)]">{t("createBasedOnCurrent")}</p>
          {createError ? (
            <p className="text-sm text-[var(--destructive)]" role="alert">
              {createError}
            </p>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}

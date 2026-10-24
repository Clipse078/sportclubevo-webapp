"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FinanceForecastSubContextTabs } from "@/components/admin/finance/FinanceForecastSubContextTabs";
import { FinanceWorkspaceDisclosure } from "@/components/admin/finance/FinanceWorkspaceDisclosure";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import { cn } from "@/lib/cn";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";
import {
  formatFinanceManagementPlanningMinor,
  formatFinanceManagementPlanningSignedMinor,
} from "@/lib/finance/budget/budget-amount-presentation";
import {
  FINANCE_FUNCTIONAL_SURFACE_CLASS,
  FINANCE_SECTION_HEADER_CLASS,
  FINANCE_SECTION_SURFACE_CLASS,
  FINANCE_SUMMARY_RESULT_VALUE_CLASS,
  FINANCE_SUMMARY_STRIP_SURFACE_CLASS,
  FINANCE_WORKSPACE_STACK_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";
import type { FinanceScenarioDetailReadModel } from "@/lib/finance/forecast/finance-scenario-read-model";
import { formatScenarioAssumptionChangeLabel } from "@/lib/finance/forecast/scenario-assumption-presentation";
import { financeResultSemanticTextClass } from "@/lib/finance/presentation/finance-result-presentation";
import {
  archiveFinanceScenarioAction,
  deleteFinanceScenarioAction,
  duplicateFinanceScenarioAction,
  removeFinanceScenarioAssumptionAction,
  restoreFinanceScenarioAction,
  updateFinanceScenarioMetadataAction,
} from "@/app/(admin)/dashboard/finance/forecast/scenarios/actions";
import {
  FinanceScenarioAssumptionDialog,
  type ScenarioAssumptionAccountOption,
} from "@/components/admin/finance/scenario/FinanceScenarioAssumptionDialog";
import { FinanceScenarioGovernanceDialogs } from "@/components/admin/finance/scenario/FinanceScenarioGovernanceDialogs";

type FinanceScenarioDetailPanelProps = {
  detail: FinanceScenarioDetailReadModel;
  financeYearId: string;
  baseCurrency: string | null;
  formattingLocale: string;
  canMutate: boolean;
};

export function FinanceScenarioDetailPanel({
  detail,
  financeYearId,
  baseCurrency,
  formattingLocale,
  canMutate,
}: FinanceScenarioDetailPanelProps) {
  const t = useTranslations("Finance.forecast.scenarios");
  const tForecast = useTranslations("Finance.forecast");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [assumptionDialogOpen, setAssumptionDialogOpen] = useState(false);
  const [editingAssumptionId, setEditingAssumptionId] = useState<string | null>(null);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [adoptOpen, setAdoptOpen] = useState(false);
  const [rebaseOpen, setRebaseOpen] = useState(false);
  const [metaName, setMetaName] = useState(detail.name);
  const [metaDescription, setMetaDescription] = useState(detail.description ?? "");
  const [duplicateName, setDuplicateName] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const comparison = detail.comparison;
  const primary = comparison.primary;
  const resultClass = financeResultSemanticTextClass(primary.scenarioResultMinor);
  const deltaIsNeutral = primary.resultDeltaMinor === 0;
  const deltaClass = deltaIsNeutral
    ? "text-[var(--muted)]"
    : financeResultSemanticTextClass(primary.resultDeltaMinor);

  const accountOptions: ScenarioAssumptionAccountOption[] = useMemo(
    () =>
      detail.accountEffects.map((row) => ({
        financialAccountId: row.financialAccountId,
        name: row.account.name,
        accountType: row.accountType,
        lifecycle: row.account.lifecycle,
      })),
    [detail.accountEffects],
  );

  const editingAssumption = detail.assumptions.find((a) => a.assumptionId === editingAssumptionId);

  const assumptionLabels = {
    exclude: t("assumptions.changeExclude"),
    percentSuffix: t("assumptions.percentSuffix"),
  };

  function refreshAfterMutation(scenarioId?: string) {
    if (scenarioId && scenarioId !== detail.scenarioId) {
      router.push(`/dashboard/finance/forecast/scenarios/${scenarioId}?yearId=${financeYearId}`);
    } else {
      router.refresh();
    }
  }

  function mapActionError(code: string | undefined, fallback: string): string {
    if (code === "FINANCE_SCENARIO_STALE") return t("errors.staleScenario");
    if (code === "FINANCE_SCENARIO_NAME_CONFLICT") return t("errors.nameConflict");
    if (code === "FINANCE_SCENARIO_DELETE_BLOCKED_ADOPTION") {
      return t("governance.deleteBlockedAdoption");
    }
    if (code === "FINANCE_SCENARIO_STALE_CURRENT_FORECAST") return t("errors.staleCurrentForecast");
    return fallback;
  }

  function runArchive() {
    setMenuOpen(false);
    startTransition(async () => {
      const result = await archiveFinanceScenarioAction({
        scenarioId: detail.scenarioId,
        financeYearId,
        expectedUpdatedAt: detail.updatedAt,
      });
      if (!result.ok) {
        setActionError(mapActionError(result.errorCode, result.error));
        return;
      }
      router.push(`/dashboard/finance/forecast/scenarios?yearId=${financeYearId}`);
    });
  }

  function runRestore() {
    startTransition(async () => {
      const result = await restoreFinanceScenarioAction({
        scenarioId: detail.scenarioId,
        financeYearId,
        expectedUpdatedAt: detail.updatedAt,
      });
      if (!result.ok) {
        setActionError(mapActionError(result.errorCode, result.error));
        return;
      }
      refreshAfterMutation();
    });
  }

  function runDelete() {
    startTransition(async () => {
      const result = await deleteFinanceScenarioAction({
        scenarioId: detail.scenarioId,
        financeYearId,
        expectedUpdatedAt: detail.updatedAt,
      });
      if (!result.ok) {
        setActionError(mapActionError(result.errorCode, result.error));
        return;
      }
      setDeleteOpen(false);
      router.push(`/dashboard/finance/forecast/scenarios?yearId=${financeYearId}`);
    });
  }

  function runDuplicate() {
    startTransition(async () => {
      const result = await duplicateFinanceScenarioAction({
        sourceScenarioId: detail.scenarioId,
        financeYearId,
        name: duplicateName,
        description: detail.description,
      });
      if (!result.ok) {
        setActionError(mapActionError(result.errorCode, result.error));
        return;
      }
      setDuplicateOpen(false);
      refreshAfterMutation(result.scenarioId);
    });
  }

  function runMetadataSave() {
    startTransition(async () => {
      const result = await updateFinanceScenarioMetadataAction({
        scenarioId: detail.scenarioId,
        financeYearId,
        expectedUpdatedAt: detail.updatedAt,
        name: metaName,
        description: metaDescription.trim() ? metaDescription.trim() : null,
      });
      if (!result.ok) {
        setActionError(mapActionError(result.errorCode, result.error));
        return;
      }
      setMetadataOpen(false);
      refreshAfterMutation();
    });
  }

  function runRemoveAssumption(financialAccountId: string) {
    startTransition(async () => {
      const result = await removeFinanceScenarioAssumptionAction({
        scenarioId: detail.scenarioId,
        financeYearId,
        expectedUpdatedAt: detail.updatedAt,
        financialAccountId,
      });
      if (!result.ok) {
        setActionError(mapActionError(result.errorCode, result.error));
        return;
      }
      refreshAfterMutation();
    });
  }

  const showLiveCurrent =
    comparison.baselineFreshness.status === "OUTDATED" &&
    comparison.liveCurrentForecast.kind === "AVAILABLE";

  const showLiveUnavailable =
    comparison.baselineFreshness.status === "OUTDATED" &&
    comparison.liveCurrentForecast.kind === "UNAVAILABLE";

  const offsetting =
    comparison.summaryState === "NO_RESULT_CHANGE" &&
    comparison.changeFlags.hasCompositionChange &&
    detail.assumptionCount > 0;

  const accountEvidenceCount = detail.accountEffects.length;

  const approvedBudgetRowSummary =
    comparison.approvedBudget.kind === "NO_APPROVED_BUDGET"
      ? t("noApprovedBudgetQuiet")
      : t("approvedBudgetRowSummary", {
          result: formatFinanceManagementPlanningMinor(
            primary.scenarioResultMinor,
            baseCurrency,
            formattingLocale,
          ),
          delta: formatFinanceManagementPlanningSignedMinor(
            comparison.approvedBudget.scenarioVsApprovedBudgetResultDeltaMinor,
            baseCurrency,
            formattingLocale,
          ),
        });

  const provenanceSummary = comparison.sourceForecast.presentation.displaySubtitle
    ? `${comparison.sourceForecast.presentation.displayTitle} · ${comparison.sourceForecast.presentation.displaySubtitle}`
    : comparison.sourceForecast.presentation.displayTitle;

  return (
    <div className={cn(FINANCE_WORKSPACE_STACK_CLASS, "min-w-0")} data-finance-scenario-detail>
      <FinanceForecastSubContextTabs
        labels={{
          current: tForecast("subNav.current"),
          scenarios: tForecast("subNav.scenarios"),
          timing: tForecast("subNav.timing"),
        }}
        ariaLabel={tForecast("subNav.aria")}
      />

      <nav className="text-xs text-[var(--muted)]" aria-label={t("breadcrumbAria")}>
        <Link
          href={`/dashboard/finance/forecast/scenarios?yearId=${financeYearId}`}
          className="hover:text-[var(--foreground)]"
        >
          {t("breadcrumbScenarios")}
        </Link>
        <ChevronRight className="mx-1 inline h-3 w-3" aria-hidden />
        <span className="text-[var(--foreground)]">{detail.name}</span>
      </nav>

      {detail.isArchived ? (
        <p className="text-sm text-[var(--muted)]" data-finance-scenario-archived>
          {t("archivedBanner")}
        </p>
      ) : null}

      <div className={FINANCE_SUMMARY_STRIP_SURFACE_CLASS} data-finance-scenario-decision-summary>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-base font-semibold text-[var(--foreground)]">{detail.name}</p>
            {detail.description ? (
              <p className="text-sm text-[var(--muted)]">{detail.description}</p>
            ) : null}
            {comparison.baselineFreshness.status === "CURRENT" ? (
              <p className="text-xs text-[var(--muted)]">{t("freshnessCurrentQuiet")}</p>
            ) : null}
            {comparison.baselineFreshness.status === "OUTDATED" ? (
              <div className="space-y-2" data-finance-scenario-freshness="outdated">
                <p className="text-sm text-[var(--warning)]">{t("freshnessOutdatedTitle")}</p>
                <span className="block text-xs font-normal text-[var(--muted)]">
                  {t("freshnessOutdatedBody")}
                </span>
                {canMutate && detail.governance.canUpdateSourceForecast ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-[var(--foreground)] underline-offset-2 hover:underline"
                    data-finance-scenario-rebase-contextual
                    onClick={() => setRebaseOpen(true)}
                  >
                    {t("governance.rebaseAction")}
                  </button>
                ) : null}
              </div>
            ) : null}
            {comparison.baselineFreshness.status === "CURRENT_FORECAST_UNAVAILABLE" ? (
              <p className="text-xs text-[var(--muted)]">{t("currentForecastUnavailable")}</p>
            ) : null}
          </div>
          {canMutate ? (
            <div className="relative">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-2)]"
                aria-label={t("actionsMenuAria")}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen ? (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-9 z-20 min-w-[12rem] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
                    {!detail.isArchived ? (
                      <>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                          onClick={() => {
                            setMenuOpen(false);
                            setMetaName(detail.name);
                            setMetaDescription(detail.description ?? "");
                            setMetadataOpen(true);
                          }}
                        >
                          {t("actions.editMetadata")}
                        </button>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                          onClick={() => {
                            setMenuOpen(false);
                            setDuplicateName("");
                            setDuplicateOpen(true);
                          }}
                        >
                          {t("actions.duplicate")}
                        </button>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                          onClick={runArchive}
                        >
                          {t("actions.archive")}
                        </button>
                        {detail.governance.canAdoptToCurrentForecast ? (
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                            data-finance-scenario-adopt-menu
                            onClick={() => {
                              setMenuOpen(false);
                              setAdoptOpen(true);
                            }}
                          >
                            {t("governance.adoptAction")}
                          </button>
                        ) : null}
                        {detail.governance.canUpdateSourceForecast ? (
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                            data-finance-scenario-rebase-menu
                            onClick={() => {
                              setMenuOpen(false);
                              setRebaseOpen(true);
                            }}
                          >
                            {t("governance.rebaseAction")}
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                        onClick={() => {
                          setMenuOpen(false);
                          runRestore();
                        }}
                      >
                        {t("actions.restore")}
                      </button>
                    )}
                    {detail.governance.canDelete ? (
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm text-[var(--destructive)] hover:bg-[var(--surface-2)]"
                        onClick={() => {
                          setMenuOpen(false);
                          setDeleteOpen(true);
                        }}
                      >
                        {t("actions.delete")}
                      </button>
                    ) : (
                      <p className="px-3 py-2 text-xs text-[var(--muted)]">
                        {t("governance.deleteBlockedAdoption")}
                      </p>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-x-10 gap-y-4">
          <div className="min-w-[10rem]">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              {t("expectedResultLabel")}
            </p>
            <p
              className={cn(FINANCE_SUMMARY_RESULT_VALUE_CLASS, resultClass, "tabular-nums")}
              data-finance-scenario-result
            >
              {formatFinanceManagementPlanningMinor(
                primary.scenarioResultMinor,
                baseCurrency,
                formattingLocale,
              )}
            </p>
          </div>
          <div className="min-w-[10rem]">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              {t("primaryDeltaLabel")}
            </p>
            <p
              className={cn(
                deltaIsNeutral ? "mt-1 text-base font-medium tabular-nums" : "mt-1 text-lg font-semibold tabular-nums",
                deltaClass,
              )}
              data-finance-scenario-primary-delta
            >
              {formatFinanceManagementPlanningSignedMinor(
                primary.resultDeltaMinor,
                baseCurrency,
                formattingLocale,
              )}
            </p>
          </div>
        </div>
      </div>

      {actionError ? (
        <p className="text-sm text-[var(--destructive)]" role="alert">
          {actionError}
        </p>
      ) : null}

      <div
        className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
        data-finance-scenario-decision-explanation
      >
        <section className={FINANCE_SECTION_SURFACE_CLASS} data-finance-scenario-drivers>
          <h2 className={cn(FINANCE_SECTION_HEADER_CLASS, "break-words")}>{t("driversTitle")}</h2>
          <div className="min-h-[7.5rem] px-4 py-4">
            {detail.assumptionCount === 0 ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-[var(--foreground)]">{t("driversEmptyTitle")}</p>
                <p className="text-sm text-[var(--muted)]">{t("driversEmptyBody")}</p>
                <p className="text-xs text-[var(--muted)]">{t("driversEmptyHint")}</p>
              </div>
            ) : (
              <>
                {offsetting ? (
                  <p className="mb-3 text-sm text-[var(--muted)]">{t("offsettingDriversIntro")}</p>
                ) : comparison.summaryState === "NO_RESULT_CHANGE" ? (
                  <p className="mb-3 text-sm text-[var(--muted)]">{t("noResultChange")}</p>
                ) : null}
                {detail.topDrivers.length > 0 ? (
                  <ul className="space-y-3">
                    {detail.topDrivers.map((driver) => (
                      <li
                        key={driver.financialAccountId}
                        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm"
                      >
                        <div className="min-w-0">
                          <span className="font-medium">{driver.account.name}</span>
                          <span className="ml-2 text-xs text-[var(--muted)]">
                            {formatScenarioAssumptionChangeLabel({
                              kind: driver.assumptionKind,
                              percentBasisPoints:
                                detail.assumptions.find(
                                  (a) => a.financialAccountId === driver.financialAccountId,
                                )?.percentBasisPoints ?? null,
                              amountMinorDelta:
                                detail.assumptions.find(
                                  (a) => a.financialAccountId === driver.financialAccountId,
                                )?.amountMinorDelta ?? null,
                              absoluteAmountMinor:
                                detail.assumptions.find(
                                  (a) => a.financialAccountId === driver.financialAccountId,
                                )?.absoluteAmountMinor ?? null,
                              currency: baseCurrency,
                              formattingLocale,
                              labels: assumptionLabels,
                            })}
                          </span>
                        </div>
                        <span className="shrink-0 tabular-nums text-[var(--muted)]">
                          {t("driverImpact", {
                            amount: formatFinanceManagementPlanningSignedMinor(
                              driver.resultContributionMinor,
                              baseCurrency,
                              formattingLocale,
                            ),
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </div>
        </section>

        <section className={FINANCE_SECTION_SURFACE_CLASS} data-finance-scenario-assumptions>
          <div
            className={cn(
              FINANCE_SECTION_HEADER_CLASS,
              "flex flex-wrap items-center justify-between gap-2 py-2.5",
            )}
          >
            <h2 className="text-sm font-semibold">{t("assumptions.sectionTitle")}</h2>
            {canMutate && !detail.isArchived && detail.assumptionCount > 0 ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingAssumptionId(null);
                  setAssumptionDialogOpen(true);
                }}
              >
                {t("assumptions.addCta")}
              </Button>
            ) : null}
          </div>
          {detail.assumptionCount === 0 ? (
            <div className="flex min-h-[7.5rem] flex-col justify-center gap-3 px-4 py-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {t("assumptions.emptyTitle")}
                </p>
                <p className="text-sm text-[var(--muted)]">{t("assumptions.emptyBody")}</p>
              </div>
              {canMutate && !detail.isArchived ? (
                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingAssumptionId(null);
                      setAssumptionDialogOpen(true);
                    }}
                  >
                    {t("assumptions.addCta")}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-[var(--sce-surface-border-subtle)]">
              {detail.assumptions.map((assumption) => {
                const account = detail.accountEffects.find(
                  (a) => a.financialAccountId === assumption.financialAccountId,
                )?.account;
                const effectRow = detail.accountEffects.find(
                  (a) => a.financialAccountId === assumption.financialAccountId,
                );
                return (
                  <li
                    key={assumption.assumptionId}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <span className="font-medium">{account?.name ?? "—"}</span>
                      <span className="ml-2 text-[var(--muted)]">
                        {formatScenarioAssumptionChangeLabel({
                          kind: assumption.kind,
                          percentBasisPoints: assumption.percentBasisPoints,
                          amountMinorDelta: assumption.amountMinorDelta,
                          absoluteAmountMinor: assumption.absoluteAmountMinor,
                          currency: baseCurrency,
                          formattingLocale,
                          labels: assumptionLabels,
                        })}
                      </span>
                      {effectRow && effectRow.deltaMinor !== 0 ? (
                        <span className="ml-2 text-xs tabular-nums text-[var(--muted)]">
                          {formatFinanceManagementPlanningSignedMinor(
                            effectRow.deltaMinor,
                            baseCurrency,
                            formattingLocale,
                          )}
                        </span>
                      ) : null}
                    </div>
                    {canMutate && !detail.isArchived ? (
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          className="text-xs font-medium text-[var(--foreground)] hover:underline"
                          onClick={() => {
                            setEditingAssumptionId(assumption.assumptionId);
                            setAssumptionDialogOpen(true);
                          }}
                        >
                          {t("assumptions.edit")}
                        </button>
                        <button
                          type="button"
                          className="text-xs font-medium text-[var(--destructive)] hover:underline"
                          onClick={() => runRemoveAssumption(assumption.financialAccountId)}
                        >
                          {t("assumptions.remove")}
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {showLiveCurrent && comparison.liveCurrentForecast.kind === "AVAILABLE" ? (
        <section className={FINANCE_FUNCTIONAL_SURFACE_CLASS} data-finance-scenario-live-current>
          <h2 className="text-sm font-semibold">{t("liveCurrentTitle")}</h2>
          <p className="text-xs text-[var(--muted)]">{t("liveCurrentHint")}</p>
          <p className="mt-2 text-sm tabular-nums">
            {formatFinanceManagementPlanningSignedMinor(
              comparison.liveCurrentForecast.scenarioVsCurrentResultDeltaMinor,
              baseCurrency,
              formattingLocale,
            )}
          </p>
        </section>
      ) : null}

      {showLiveUnavailable ? (
        <p className="text-xs text-[var(--muted)]">{t("liveCurrentUnavailable")}</p>
      ) : null}

      <section className={FINANCE_SECTION_SURFACE_CLASS} data-finance-scenario-investigation>
        <h2 className={cn(FINANCE_SECTION_HEADER_CLASS, "break-words")}>
          {t("investigationSectionTitle")}
        </h2>
        <div className="divide-y divide-[var(--sce-surface-border-subtle)]">
          <FinanceWorkspaceDisclosure
            variant="row"
            title={t("approvedBudgetTitle")}
            summary={approvedBudgetRowSummary}
            expandLabel={t("disclosureShow")}
            collapseLabel={t("disclosureHide")}
            data-finance-disclosure="approved-budget"
          >
            {comparison.approvedBudget.kind === "NO_APPROVED_BUDGET" ? (
              <p className="text-sm text-[var(--muted)]">{t("noApprovedBudget")}</p>
            ) : (
              <div className="space-y-1 text-sm tabular-nums">
                <p>
                  {t("approvedBudgetScenario")}:{" "}
                  {formatFinanceManagementPlanningMinor(
                    primary.scenarioResultMinor,
                    baseCurrency,
                    formattingLocale,
                  )}
                </p>
                <p>
                  {t("approvedBudgetReference")}:{" "}
                  {formatFinanceManagementPlanningMinor(
                    comparison.approvedBudget.approvedBudgetResultMinor,
                    baseCurrency,
                    formattingLocale,
                  )}
                </p>
                <p>
                  {t("approvedBudgetDelta")}:{" "}
                  {formatFinanceManagementPlanningSignedMinor(
                    comparison.approvedBudget.scenarioVsApprovedBudgetResultDeltaMinor,
                    baseCurrency,
                    formattingLocale,
                  )}
                </p>
              </div>
            )}
          </FinanceWorkspaceDisclosure>

          <FinanceWorkspaceDisclosure
            variant="row"
            title={t("accountEvidenceTitle")}
            summary={t("accountEvidenceSummary", { count: accountEvidenceCount })}
            expandLabel={t("disclosureShow")}
            collapseLabel={t("disclosureHide")}
            data-finance-disclosure="account-evidence"
          >
            <div className="min-w-0 overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-xs text-[var(--muted)]">
                    <th className="py-2 pr-3 font-medium">{t("accountColumn")}</th>
                    <th className="py-2 pr-3 font-medium text-right">{t("baselineColumn")}</th>
                    <th className="py-2 pr-3 font-medium text-right">{t("scenarioColumn")}</th>
                    <th className="py-2 font-medium text-right">{t("deltaColumn")}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.accountEffects.map((row) => (
                    <tr key={row.financialAccountId} className="border-b border-[var(--border)]/60">
                      <td className="py-2 pr-3">{row.account.name}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatFinanceManagementPlanningMinor(
                          row.baselineAmountMinor,
                          baseCurrency,
                          formattingLocale,
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatFinanceManagementPlanningMinor(
                          row.scenarioAmountMinor,
                          baseCurrency,
                          formattingLocale,
                        )}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatFinanceManagementPlanningSignedMinor(
                          row.deltaMinor,
                          baseCurrency,
                          formattingLocale,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FinanceWorkspaceDisclosure>

          <FinanceWorkspaceDisclosure
            variant="row"
            title={t("metadataTitle")}
            summary={provenanceSummary}
            expandLabel={t("disclosureShow")}
            collapseLabel={t("disclosureHide")}
            data-finance-disclosure="metadata"
          >
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[var(--muted)]">{t("metadataCreated")}</dt>
                <dd>
                  {new Date(detail.createdAt).toLocaleString(formattingLocale)}
                  {detail.createdBy ? ` · ${detail.createdBy.displayName}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">{t("metadataUpdated")}</dt>
                <dd>
                  {new Date(detail.updatedAt).toLocaleString(formattingLocale)}
                  {detail.updatedBy ? ` · ${detail.updatedBy.displayName}` : ""}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-[var(--muted)]">{t("metadataSourceForecast")}</dt>
                <dd>
                  {comparison.sourceForecast.presentation.displayTitle}
                  {comparison.sourceForecast.presentation.displaySubtitle
                    ? ` · ${comparison.sourceForecast.presentation.displaySubtitle}`
                    : ""}
                </dd>
              </div>
            </dl>
          </FinanceWorkspaceDisclosure>
        </div>
      </section>

      <FinanceScenarioAssumptionDialog
        open={assumptionDialogOpen}
        onClose={() => setAssumptionDialogOpen(false)}
        onSaved={() => refreshAfterMutation()}
        scenarioId={detail.scenarioId}
        financeYearId={financeYearId}
        expectedUpdatedAt={detail.updatedAt}
        accounts={accountOptions}
        existing={editingAssumption ?? null}
      />

      <Dialog
        open={metadataOpen}
        onClose={() => setMetadataOpen(false)}
        title={t("actions.editMetadata")}
        footer={
          <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
            <Button variant="secondary" onClick={() => setMetadataOpen(false)}>
              {tForecast("cancel")}
            </Button>
            <Button disabled={pending} onClick={runMetadataSave}>
              {t("save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <SceFormField label={t("createNameLabel")} required>
            <input
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              value={metaName}
              onChange={(e) => setMetaName(e.target.value)}
            />
          </SceFormField>
          <SceFormField label={t("createDescriptionLabel")}>
            <textarea
              className="min-h-[4rem] w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
            />
          </SceFormField>
        </div>
      </Dialog>

      <Dialog
        open={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        title={t("actions.duplicate")}
        description={t("duplicateDescription")}
        footer={
          <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
            <Button variant="secondary" onClick={() => setDuplicateOpen(false)}>
              {tForecast("cancel")}
            </Button>
            <Button disabled={pending || !duplicateName.trim()} onClick={runDuplicate}>
              {t("duplicateConfirm")}
            </Button>
          </div>
        }
      >
        <SceFormField label={t("createNameLabel")} required>
          <input
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
          />
        </SceFormField>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        footer={
          <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              {tForecast("cancel")}
            </Button>
            <Button variant="danger" disabled={pending} onClick={runDelete}>
              {t("deleteConfirm")}
            </Button>
          </div>
        }
      />

      <FinanceScenarioGovernanceDialogs
        detail={detail}
        financeYearId={financeYearId}
        baseCurrency={baseCurrency}
        formattingLocale={formattingLocale}
        adoptOpen={adoptOpen}
        rebaseOpen={rebaseOpen}
        onAdoptClose={() => setAdoptOpen(false)}
        onRebaseClose={() => setRebaseOpen(false)}
        onError={setActionError}
      />
    </div>
  );
}

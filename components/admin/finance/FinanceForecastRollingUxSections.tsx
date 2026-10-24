"use client";

import { useCallback, useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import { cn } from "@/lib/cn";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";
import {
  formatBudgetPlanningMinor,
  formatBudgetPlanningSignedMinor,
} from "@/lib/finance/budget/budget-amount-presentation";
import type { ForecastWorkspaceSnapshot } from "@/lib/finance/forecast/forecast-presentation";
import type {
  CurrentForecastVsApprovedBudgetResult,
  CurrentForecastVsPreviousResult,
  FinanceForecastHistoryReadModel,
} from "@/lib/finance/forecast/forecast-history-read-model";
import type { FormalReforecastOutcome } from "@/lib/finance/forecast/formal-reforecast-contract";
import { financeResultSemanticTextClass } from "@/lib/finance/presentation/finance-result-presentation";
import {
  FINANCE_FUNCTIONAL_SURFACE_CLASS,
  FINANCE_SECTION_HEADER_CLASS,
  FINANCE_SUMMARY_LABEL_CLASS,
  FINANCE_SUMMARY_STRIP_GRID_CLASS,
  FINANCE_SUMMARY_STRIP_RESULT_VALUE_CLASS,
  FINANCE_SUMMARY_STRIP_SURFACE_CLASS,
  FINANCE_SUMMARY_STRIP_VALUE_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";
import {
  formalizeCurrentForecastAction,
  previewFormalReforecastAction,
} from "@/app/(admin)/dashboard/finance/forecast/actions";
import type { FormalReforecastPreviewResult } from "@/lib/finance/forecast/formal-reforecast-contract";

function formatCalendarDateDisplay(iso: string, locale: string): string {
  const [year, month, day] = iso.split("-").map((part) => Number(part));
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

type RollingUxSectionsProps = {
  snapshot: ForecastWorkspaceSnapshot;
  rollingUx: {
    history: FinanceForecastHistoryReadModel | null;
    vsPrevious: CurrentForecastVsPreviousResult;
    vsApprovedBudget: CurrentForecastVsApprovedBudgetResult;
  };
  currency: string | null;
  formattingLocale: string;
  canFormalize: boolean;
  onFormalizeSuccess: (message: string) => void;
  onFormalizeError: (message: string) => void;
};

export function FinanceForecastCurrentHeader(props: {
  snapshot: ForecastWorkspaceSnapshot;
  canFormalize: boolean;
  onOpenFormalize: () => void;
  formattingLocale: string;
  t: ReturnType<typeof useTranslations<"Finance.forecast">>;
}) {
  const revision = props.snapshot.currentRevision;
  const title = revision?.presentation.displayTitle ?? props.t("currentForecastSectionTitle");
  return (
    <div
      className="flex flex-wrap items-start justify-between gap-3"
      data-finance-surface="current-forecast-header"
    >
      <div className="min-w-0 space-y-1">
        <h2 className={FINANCE_SECTION_HEADER_CLASS}>{props.t("currentForecastSectionTitle")}</h2>
        <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--muted)]">
          {revision?.asOfDate ? (
            <span>
              {props.t("currentAsOfLabel", {
                date: formatCalendarDateDisplay(revision.asOfDate, props.formattingLocale),
              })}
            </span>
          ) : null}
          {revision?.revisionLabel ? (
            <span>{revision.revisionLabel}</span>
          ) : null}
          {props.snapshot.versionNumber ? (
            <span>{props.t("versionMeta", { version: props.snapshot.versionNumber })}</span>
          ) : null}
          {revision?.presentation.revisionSourceLabel &&
          !revision.revisionLabel &&
          revision.revisionSource ? (
            <span>{revision.presentation.revisionSourceLabel}</span>
          ) : null}
        </div>
      </div>
      {props.canFormalize ? (
        <Button
          className="h-8 shrink-0 px-3 text-sm"
          onClick={props.onOpenFormalize}
          data-finance-formal-reforecast-action="open"
        >
          {props.t("formalReforecast.action")}
        </Button>
      ) : null}
    </div>
  );
}

export function FinanceForecastRollingUxSections({
  snapshot,
  rollingUx,
  currency,
  formattingLocale,
  canFormalize,
  onFormalizeSuccess,
  onFormalizeError,
}: RollingUxSectionsProps) {
  const t = useTranslations("Finance.forecast");
  const [formalizeOpen, setFormalizeOpen] = useState(false);

  return (
    <div className="space-y-4" data-finance-rolling-forecast-ux>
      <FinanceForecastCurrentHeader
        snapshot={snapshot}
        canFormalize={canFormalize}
        onOpenFormalize={() => setFormalizeOpen(true)}
        formattingLocale={formattingLocale}
        t={t}
      />

      <FinanceForecastRevisionComparisonSection
        vsPrevious={rollingUx.vsPrevious}
        vsApprovedBudget={rollingUx.vsApprovedBudget}
        currency={currency}
        formattingLocale={formattingLocale}
        t={t}
      />

      <FinanceForecastHistorySection
        history={rollingUx.history}
        currency={currency}
        formattingLocale={formattingLocale}
        t={t}
      />

      {canFormalize ? (
        <FinanceFormalReforecastDialog
          open={formalizeOpen}
          onClose={() => setFormalizeOpen(false)}
          financeYearId={snapshot.financeYearId}
          expectedVersionId={snapshot.versionId!}
          defaultAsOfDate={
            snapshot.recommendedFormalReforecastAsOfDate ??
            snapshot.currentRevision?.asOfDate ??
            ""
          }
          currency={currency}
          formattingLocale={formattingLocale}
          onSuccess={(msg) => {
            setFormalizeOpen(false);
            onFormalizeSuccess(msg);
          }}
          onError={onFormalizeError}
          t={t}
        />
      ) : null}
    </div>
  );
}

function ComparisonTotalsStrip(props: {
  title: string;
  currency: string | null;
  formattingLocale: string;
  incomeMinor: number;
  expenseMinor: number;
  resultMinor: number;
  incomeDeltaMinor: number;
  expenseDeltaMinor: number;
  resultDeltaMinor: number;
  labels: {
    income: string;
    expense: string;
    result: string;
  };
  "data-finance-surface"?: string;
}) {
  const resultClass = financeResultSemanticTextClass(props.resultMinor);
  return (
    <section
      className={FINANCE_SUMMARY_STRIP_SURFACE_CLASS}
      data-finance-surface={props["data-finance-surface"]}
    >
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {props.title}
      </h3>
      <dl className={FINANCE_SUMMARY_STRIP_GRID_CLASS}>
        {(
          [
            ["income", props.incomeMinor, props.incomeDeltaMinor],
            ["expense", props.expenseMinor, props.expenseDeltaMinor],
            ["result", props.resultMinor, props.resultDeltaMinor],
          ] as const
        ).map(([key, amount, delta]) => (
          <div key={key} className="sm:px-4 sm:first:ps-0">
            <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{props.labels[key]}</dt>
            <dd
              className={cn(
                key === "result"
                  ? FINANCE_SUMMARY_STRIP_RESULT_VALUE_CLASS
                  : FINANCE_SUMMARY_STRIP_VALUE_CLASS,
                key === "result" ? financeResultSemanticTextClass(amount) : undefined,
              )}
            >
              {formatBudgetPlanningMinor(amount, props.currency, props.formattingLocale)}
            </dd>
            <dd className="mt-0.5 text-xs text-[var(--muted)] tabular-nums">
              {formatBudgetPlanningSignedMinor(delta, props.currency, props.formattingLocale)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function FinanceForecastRevisionComparisonSection(props: {
  vsPrevious: CurrentForecastVsPreviousResult;
  vsApprovedBudget: CurrentForecastVsApprovedBudgetResult;
  currency: string | null;
  formattingLocale: string;
  t: ReturnType<typeof useTranslations<"Finance.forecast">>;
}) {
  const { t } = props;
  const showPrevious = props.vsPrevious.kind === "COMPARISON";
  const showBudget = props.vsApprovedBudget.kind === "COMPARISON";

  if (!showPrevious && !showBudget) {
    if (props.vsPrevious.kind === "NO_PREVIOUS_FORECAST") {
      return (
        <p className="text-sm text-[var(--muted)]" data-finance-no-previous-forecast>
          {t("comparison.noPreviousForecast")}
        </p>
      );
    }
    return null;
  }

  const largest =
    showPrevious && props.vsPrevious.comparison.largestChanges.length > 0
      ? props.vsPrevious.comparison.largestChanges
          .filter((row) => row.deltaMinor !== 0)
          .slice(0, 5)
      : [];

  return (
    <div className="space-y-3" data-finance-revision-comparisons>
      {showPrevious ? (
        <ComparisonTotalsStrip
          title={t("comparison.vsPreviousTitle")}
          currency={props.currency}
          formattingLocale={props.formattingLocale}
          incomeMinor={props.vsPrevious.comparison.summary.comparisonIncomeMinor}
          expenseMinor={props.vsPrevious.comparison.summary.comparisonExpenseMinor}
          resultMinor={props.vsPrevious.comparison.summary.comparisonResultMinor}
          incomeDeltaMinor={props.vsPrevious.comparison.summary.incomeDeltaMinor}
          expenseDeltaMinor={props.vsPrevious.comparison.summary.expenseDeltaMinor}
          resultDeltaMinor={props.vsPrevious.comparison.summary.resultDeltaMinor}
          labels={{
            income: t("totalIncome"),
            expense: t("totalExpense"),
            result: t("plannedResult"),
          }}
          data-finance-surface="current-vs-previous"
        />
      ) : null}

      {largest.length > 0 ? (
        <section
          className={cn(FINANCE_FUNCTIONAL_SURFACE_CLASS, "py-3")}
          data-finance-surface="largest-changes"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t("comparison.largestChangesTitle")}
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {largest.map((row) => (
              <li
                key={row.financialAccountId}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--sce-surface-border-subtle)] pb-1.5 last:border-0"
              >
                <span className="min-w-0 font-medium">{row.accountName}</span>
                <span className="text-end text-xs text-[var(--muted)] tabular-nums">
                  {row.baseAmountMinor !== null
                    ? formatBudgetPlanningMinor(
                        row.baseAmountMinor,
                        props.currency,
                        props.formattingLocale,
                      )
                    : "—"}{" "}
                  →{" "}
                  {row.comparisonAmountMinor !== null
                    ? formatBudgetPlanningMinor(
                        row.comparisonAmountMinor,
                        props.currency,
                        props.formattingLocale,
                      )
                    : "—"}{" "}
                  <span className="text-[var(--foreground)]">
                    (
                    {formatBudgetPlanningSignedMinor(
                      row.deltaMinor,
                      props.currency,
                      props.formattingLocale,
                    )}
                    )
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showBudget ? (
        <ComparisonTotalsStrip
          title={t("comparison.vsBudgetTitle")}
          currency={props.currency}
          formattingLocale={props.formattingLocale}
          incomeMinor={props.vsApprovedBudget.comparison.summary.comparisonIncomeMinor}
          expenseMinor={props.vsApprovedBudget.comparison.summary.comparisonExpenseMinor}
          resultMinor={props.vsApprovedBudget.comparison.summary.comparisonResultMinor}
          incomeDeltaMinor={props.vsApprovedBudget.comparison.summary.incomeDeltaMinor}
          expenseDeltaMinor={props.vsApprovedBudget.comparison.summary.expenseDeltaMinor}
          resultDeltaMinor={props.vsApprovedBudget.comparison.summary.resultDeltaMinor}
          labels={{
            income: t("totalIncome"),
            expense: t("totalExpense"),
            result: t("plannedResult"),
          }}
          data-finance-surface="current-vs-budget"
        />
      ) : props.vsApprovedBudget.kind === "NO_APPROVED_BUDGET" ? (
        <p className="text-xs text-[var(--muted)]" data-finance-no-approved-budget>
          {t("comparison.noApprovedBudget")}
        </p>
      ) : null}
    </div>
  );
}

function FinanceForecastHistorySection(props: {
  history: FinanceForecastHistoryReadModel | null;
  currency: string | null;
  formattingLocale: string;
  t: ReturnType<typeof useTranslations<"Finance.forecast">>;
}) {
  const entries = props.history?.entries ?? [];
  if (entries.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(FINANCE_FUNCTIONAL_SURFACE_CLASS, "py-3")}
      data-finance-surface="prognoseverlauf"
      aria-labelledby="finance-prognoseverlauf-heading"
    >
      <h3
        id="finance-prognoseverlauf-heading"
        className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
      >
        {props.t("history.sectionTitle")}
      </h3>
      <ul className="mt-2 space-y-0 text-sm">
        {entries.map((entry) => (
          <li
            key={entry.forecastVersionId}
            className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--sce-surface-border-subtle)] py-2 last:border-0"
            data-finance-history-entry={entry.isCurrent ? "current" : "historical"}
          >
            <div className="min-w-0">
              <p className="font-medium">{entry.presentation.displayTitle}</p>
              <p className="text-xs text-[var(--muted)]">
                {entry.asOfDate
                  ? `${props.t("history.asOfLine", {
                      date: formatCalendarDateDisplay(entry.asOfDate, props.formattingLocale),
                    })} · ${props.t("versionMeta", { version: entry.versionNumber })}`
                  : (entry.presentation.displaySubtitle ?? null)}
                {entry.revisionSource && !entry.revisionLabel ? (
                  <span className="ms-1">· {entry.presentation.revisionSourceLabel}</span>
                ) : null}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5 text-end">
              <span className="tabular-nums text-[var(--foreground)]">
                {props.t("history.resultLine", {
                  amount: formatBudgetPlanningMinor(
                    entry.resultMinor,
                    props.currency,
                    props.formattingLocale,
                  ),
                })}
              </span>
              {entry.isCurrent ? (
                <span
                  className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]"
                  data-finance-current-revision-marker
                >
                  {props.t("history.currentBadge")}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function mapFormalOutcomeMessage(
  outcome: FormalReforecastOutcome,
  t: ReturnType<typeof useTranslations<"Finance.forecast">>,
  serverMessage: string,
): string {
  const key = `formalReforecast.errors.${outcome}` as const;
  if (outcome === "UNEXPECTED_ERROR") {
    return serverMessage || t("formalReforecast.errors.UNEXPECTED_ERROR");
  }
  try {
    return t(key);
  } catch {
    return serverMessage;
  }
}

function FinanceFormalReforecastDialog(props: {
  open: boolean;
  onClose: () => void;
  financeYearId: string;
  expectedVersionId: string;
  defaultAsOfDate: string;
  currency: string | null;
  formattingLocale: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  t: ReturnType<typeof useTranslations<"Finance.forecast">>;
}) {
  const router = useRouter();
  const asOfId = useId();
  const labelId = useId();
  const [asOfDate, setAsOfDate] = useState(props.defaultAsOfDate);
  const [revisionLabel, setRevisionLabel] = useState("");
  const [preview, setPreview] = useState<FormalReforecastPreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewPending, startPreviewTransition] = useTransition();
  const [submitPending, startSubmitTransition] = useTransition();

  const loadPreview = useCallback(() => {
    if (!props.open) return;
    startPreviewTransition(async () => {
      const result = await previewFormalReforecastAction({
        financeYearId: props.financeYearId,
        asOfDate: asOfDate || undefined,
        revisionLabel: revisionLabel.trim() ? revisionLabel : null,
      });
      if (!result.ok) {
        setPreview(null);
        setPreviewError(mapFormalOutcomeMessage(result.outcome, props.t, result.error));
        return;
      }
      setPreviewError(null);
      setPreview(result.preview);
      if (!asOfDate && result.preview.asOfDate) {
        setAsOfDate(result.preview.asOfDate);
      }
    });
  }, [asOfDate, props.financeYearId, props.open, props.t, revisionLabel]);

  useEffect(() => {
    if (props.open) {
      setAsOfDate(props.defaultAsOfDate);
      setRevisionLabel("");
      setSubmitError(null);
      setPreviewError(null);
    }
  }, [props.defaultAsOfDate, props.open]);

  useEffect(() => {
    if (props.open) {
      loadPreview();
    }
  }, [loadPreview, props.open]);

  function submit() {
    if (!preview) return;
    startSubmitTransition(async () => {
      const result = await formalizeCurrentForecastAction({
        financeYearId: props.financeYearId,
        expectedCurrentForecastVersionId: preview.currentForecastVersionId,
        asOfDate: preview.asOfDate,
        revisionLabel: revisionLabel.trim() ? revisionLabel : null,
      });
      if (!result.ok) {
        const message = mapFormalOutcomeMessage(result.outcome, props.t, result.error);
        setSubmitError(message);
        props.onError(message);
        if (result.outcome === "STALE_CURRENT") {
          router.refresh();
        }
        return;
      }
      setSubmitError(null);
      props.onSuccess(props.t("formalReforecast.success"));
      router.refresh();
    });
  }

  const resultClass = preview
    ? financeResultSemanticTextClass(preview.resultMinor)
    : undefined;

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={props.t("formalReforecast.dialogTitle")}
      description={props.t("formalReforecast.dialogDescription")}
      footer={
        <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
          <Button variant="secondary" onClick={props.onClose} disabled={submitPending}>
            {props.t("cancel")}
          </Button>
          <Button
            disabled={submitPending || previewPending || !preview || Boolean(previewError)}
            onClick={submit}
            data-finance-formal-reforecast-action="confirm"
          >
            {props.t("formalReforecast.confirm")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <SceFormField label={props.t("formalReforecast.asOfLabel")} htmlFor={asOfId} required>
          <input
            id={asOfId}
            type="date"
            className="fca-input w-full max-w-xs"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            onBlur={loadPreview}
            disabled={submitPending}
          />
        </SceFormField>

        <SceFormField
          label={props.t("formalReforecast.labelField")}
          htmlFor={labelId}
          optional
          description={props.t("formalReforecast.labelHint")}
        >
          <input
            id={labelId}
            type="text"
            className="fca-input w-full"
            value={revisionLabel}
            placeholder={props.t("formalReforecast.labelPlaceholder")}
            maxLength={120}
            onChange={(e) => setRevisionLabel(e.target.value)}
            onBlur={loadPreview}
            disabled={submitPending}
          />
        </SceFormField>

        {previewPending ? (
          <p className="text-sm text-[var(--muted)]" role="status">
            {props.t("formalReforecast.previewLoading")}
          </p>
        ) : null}

        {previewError ? (
          <p className="text-sm text-[var(--destructive)]" role="alert">
            {previewError}
          </p>
        ) : null}

        {submitError ? (
          <p className="text-sm text-[var(--destructive)]" role="alert">
            {submitError}
          </p>
        ) : null}

        {preview ? (
          <div
            className={cn(FINANCE_SUMMARY_STRIP_SURFACE_CLASS, "mt-2")}
            data-finance-formal-reforecast-preview
          >
            <p className="mb-2 text-xs text-[var(--muted)]">
              {props.t("formalReforecast.amountsUnchangedHint")}
            </p>
            <dl className={FINANCE_SUMMARY_STRIP_GRID_CLASS}>
              <div className="sm:px-4 sm:first:ps-0">
                <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{props.t("totalIncome")}</dt>
                <dd className={FINANCE_SUMMARY_STRIP_VALUE_CLASS}>
                  {formatBudgetPlanningMinor(
                    preview.incomeMinor,
                    props.currency,
                    props.formattingLocale,
                  )}
                </dd>
              </div>
              <div className="sm:px-4">
                <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{props.t("totalExpense")}</dt>
                <dd className={FINANCE_SUMMARY_STRIP_VALUE_CLASS}>
                  {formatBudgetPlanningMinor(
                    preview.expenseMinor,
                    props.currency,
                    props.formattingLocale,
                  )}
                </dd>
              </div>
              <div className="sm:px-4 sm:last:pe-0">
                <dt className={FINANCE_SUMMARY_LABEL_CLASS}>{props.t("plannedResult")}</dt>
                <dd className={cn(FINANCE_SUMMARY_STRIP_RESULT_VALUE_CLASS, resultClass)}>
                  {formatBudgetPlanningMinor(
                    preview.resultMinor,
                    props.currency,
                    props.formattingLocale,
                  )}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-[var(--muted)]">
              {props.t("formalReforecast.nextVersionMeta", {
                version: preview.nextVersionNumber,
                count: preview.lineCount,
              })}
            </p>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

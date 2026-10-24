"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";
import {
  formatFinanceManagementPlanningMinor,
  formatFinanceManagementPlanningSignedMinor,
} from "@/lib/finance/budget/budget-amount-presentation";
import type { FinanceScenarioDetailReadModel } from "@/lib/finance/forecast/finance-scenario-read-model";
import {
  adoptFinanceScenarioAction,
  previewFinanceScenarioAdoptionAction,
  previewFinanceScenarioRebaseAction,
  rebaseFinanceScenarioAction,
} from "@/app/(admin)/dashboard/finance/forecast/scenarios/actions";
import type { ScenarioAdoptionPreviewContext } from "@/lib/finance/services/finance-scenario-adoption-service";
import type { ScenarioRebasePreviewContext } from "@/lib/finance/services/finance-scenario-rebase-service";

type AdoptionPreview = ScenarioAdoptionPreviewContext;
type RebasePreview = ScenarioRebasePreviewContext;

type FinanceScenarioGovernanceDialogsProps = {
  detail: FinanceScenarioDetailReadModel;
  financeYearId: string;
  baseCurrency: string | null;
  formattingLocale: string;
  adoptOpen: boolean;
  rebaseOpen: boolean;
  onAdoptClose: () => void;
  onRebaseClose: () => void;
  onError: (message: string) => void;
};

export function FinanceScenarioGovernanceDialogs({
  detail,
  financeYearId,
  baseCurrency,
  formattingLocale,
  adoptOpen,
  rebaseOpen,
  onAdoptClose,
  onRebaseClose,
  onError,
}: FinanceScenarioGovernanceDialogsProps) {
  const t = useTranslations("Finance.forecast.scenarios");
  const tForecast = useTranslations("Finance.forecast");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adoptPreview, setAdoptPreview] = useState<AdoptionPreview | null>(null);
  const [rebasePreview, setRebasePreview] = useState<RebasePreview | null>(null);

  function closeAdoptDialog() {
    setAdoptPreview(null);
    onAdoptClose();
  }

  function closeRebaseDialog() {
    setRebasePreview(null);
    onRebaseClose();
  }

  useEffect(() => {
    if (!adoptOpen) return;
    let cancelled = false;
    startTransition(async () => {
      const result = await previewFinanceScenarioAdoptionAction({
        scenarioId: detail.scenarioId,
        financeYearId,
      });
      if (cancelled) return;
      if (!result.ok) {
        onError(result.error);
        closeAdoptDialog();
        return;
      }
      setAdoptPreview(result.preview);
    });
    return () => {
      cancelled = true;
    };
  }, [adoptOpen, detail.scenarioId, financeYearId, onError]);

  useEffect(() => {
    if (!rebaseOpen) return;
    let cancelled = false;
    startTransition(async () => {
      const result = await previewFinanceScenarioRebaseAction({
        scenarioId: detail.scenarioId,
        financeYearId,
      });
      if (cancelled) return;
      if (!result.ok) {
        onError(result.error);
        closeRebaseDialog();
        return;
      }
      setRebasePreview(result.preview);
    });
    return () => {
      cancelled = true;
    };
  }, [rebaseOpen, detail.scenarioId, financeYearId, onError]);

  function mapStaleError(code: string | undefined, fallback: string) {
    if (code === "FINANCE_SCENARIO_STALE") return t("errors.staleScenario");
    if (code === "FINANCE_SCENARIO_STALE_CURRENT_FORECAST") return t("errors.staleCurrentForecast");
    if (code === "FINANCE_SCENARIO_REBASE_UNMAPPED_ASSUMPTIONS") {
      return t("governance.rebaseUnmappedAssumptions");
    }
    return fallback;
  }

  function runAdopt() {
    if (!adoptPreview) return;
    startTransition(async () => {
      const result = await adoptFinanceScenarioAction({
        scenarioId: detail.scenarioId,
        financeYearId,
        expectedScenarioUpdatedAt: adoptPreview.expectedScenarioUpdatedAt,
        expectedCurrentForecastVersionId: adoptPreview.expectedCurrentForecastVersionId,
      });
      if (!result.ok) {
        onError(mapStaleError(result.errorCode, result.error));
        return;
      }
      closeAdoptDialog();
      router.refresh();
    });
  }

  function runRebase() {
    if (!rebasePreview) return;
    startTransition(async () => {
      const result = await rebaseFinanceScenarioAction({
        scenarioId: detail.scenarioId,
        financeYearId,
        expectedScenarioUpdatedAt: rebasePreview.expectedScenarioUpdatedAt,
        expectedCurrentForecastVersionId: rebasePreview.expectedCurrentForecastVersionId,
      });
      if (!result.ok) {
        onError(mapStaleError(result.errorCode, result.error));
        return;
      }
      closeRebaseDialog();
      router.refresh();
    });
  }

  const liveCurrent =
    detail.comparison.liveCurrentForecast.kind === "AVAILABLE"
      ? detail.comparison.liveCurrentForecast
      : null;

  return (
    <>
      <div data-finance-scenario-adopt-dialog={adoptOpen ? "open" : undefined}>
        <Dialog
          open={adoptOpen}
          onClose={closeAdoptDialog}
          title={t("governance.adoptDialogTitle")}
          description={t("governance.adoptDialogDescription")}
          footer={
            adoptPreview ? (
              <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
                <Button type="button" variant="secondary" onClick={closeAdoptDialog}>
                  {tForecast("cancel")}
                </Button>
                <Button type="button" disabled={pending} onClick={runAdopt}>
                  {t("governance.adoptConfirm")}
                </Button>
              </div>
            ) : undefined
          }
        >
          {adoptPreview ? (
            <div className="space-y-4 text-sm">
              <p>{t("governance.adoptWillDo")}</p>
              <ul className="list-disc space-y-1 pl-5 text-[var(--muted)]">
                <li>{t("governance.adoptWillRevision")}</li>
                <li>{t("governance.adoptWillHistory")}</li>
              </ul>
              <p>{t("governance.adoptWillNotDo")}</p>
              <ul className="list-disc space-y-1 pl-5 text-[var(--muted)]">
                <li>{t("governance.adoptBudgetUnchanged")}</li>
                <li>{t("governance.adoptScenarioRemains")}</li>
              </ul>
              {adoptPreview.baselineOutdated ? (
                <p className="text-[var(--warning)]" data-finance-scenario-adopt-outdated-warning>
                  {t("governance.adoptOutdatedWarning")}
                </p>
              ) : null}
              <dl className="grid gap-2 rounded-md border border-[var(--border)] p-3">
                <div className="flex justify-between gap-4">
                  <dt>{t("governance.adoptScenarioResult")}</dt>
                  <dd className="font-medium tabular-nums">
                    {formatFinanceManagementPlanningMinor(
                      adoptPreview.scenarioResultMinor,
                      baseCurrency,
                      formattingLocale,
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>{t("governance.adoptCurrentResult")}</dt>
                  <dd className="font-medium tabular-nums">
                    {formatFinanceManagementPlanningMinor(
                      adoptPreview.currentResultMinor,
                      baseCurrency,
                      formattingLocale,
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>{t("governance.adoptDifference")}</dt>
                  <dd className="font-medium tabular-nums">
                    {formatFinanceManagementPlanningSignedMinor(
                      adoptPreview.resultDeltaMinor,
                      baseCurrency,
                      formattingLocale,
                    )}
                  </dd>
                </div>
                {liveCurrent ? (
                  <div className="flex justify-between gap-4 text-xs text-[var(--muted)]">
                    <dt>{t("liveCurrentTitle")}</dt>
                    <dd className="tabular-nums">
                      {formatFinanceManagementPlanningSignedMinor(
                        liveCurrent.scenarioVsCurrentResultDeltaMinor,
                        baseCurrency,
                        formattingLocale,
                      )}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">{t("governance.previewLoading")}</p>
          )}
        </Dialog>
      </div>

      <div data-finance-scenario-rebase-dialog={rebaseOpen ? "open" : undefined}>
        <Dialog
          open={rebaseOpen}
          onClose={closeRebaseDialog}
          title={t("governance.rebaseDialogTitle")}
          description={t("governance.rebaseDialogDescription")}
          footer={
            rebasePreview ? (
              <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
                <Button type="button" variant="secondary" onClick={closeRebaseDialog}>
                  {tForecast("cancel")}
                </Button>
                <Button
                  type="button"
                  disabled={pending || !rebasePreview.canRebase}
                  onClick={runRebase}
                >
                  {t("governance.rebaseConfirm")}
                </Button>
              </div>
            ) : undefined
          }
        >
          {rebasePreview ? (
            <div className="space-y-4 text-sm">
              <p>{t("governance.rebaseExplain")}</p>
              {rebasePreview.unmappedAssumptions.length > 0 ? (
                <p className="text-[var(--destructive)]" role="alert">
                  {t("governance.rebaseUnmappedAssumptions")}
                </p>
              ) : null}
              <dl className="grid gap-2 rounded-md border border-[var(--border)] p-3">
                <div className="flex justify-between gap-4">
                  <dt>{t("governance.rebaseCurrentResult")}</dt>
                  <dd className="font-medium tabular-nums">
                    {formatFinanceManagementPlanningMinor(
                      rebasePreview.currentScenarioResultMinor,
                      baseCurrency,
                      formattingLocale,
                    )}
                  </dd>
                </div>
                {rebasePreview.canRebase ? (
                  <div className="flex justify-between gap-4">
                    <dt>{t("governance.rebaseAfterResult")}</dt>
                    <dd className="font-medium tabular-nums">
                      {formatFinanceManagementPlanningMinor(
                        rebasePreview.prospectiveScenarioResultMinor,
                        baseCurrency,
                        formattingLocale,
                      )}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4 text-[var(--muted)]">
                  <dt>{t("governance.rebaseAssumptionCount")}</dt>
                  <dd>{rebasePreview.assumptionCount}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">{t("governance.previewLoading")}</p>
          )}
        </Dialog>
      </div>
    </>
  );
}

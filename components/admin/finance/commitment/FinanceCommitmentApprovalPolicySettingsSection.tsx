"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import { Button } from "@/components/ui/Button";
import { saveFinanceCommitmentApprovalPolicyAction } from "@/app/(admin)/dashboard/finance/actions";
import {
  budgetDraftInputFromMinor,
  parseBudgetInputToMinor,
} from "@/lib/finance/budget/budget-amount-presentation";
import { formatBudgetPlanningMinor } from "@/lib/finance/budget/budget-amount-presentation";
import {
  FINANCE_FIELD_CONTROL_CLASS,
  FINANCE_SETTINGS_SECTION_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";
import { formatIso4217CurrencyOptionLabel } from "@/lib/finance/currency/iso4217-currency";

export type FinanceCommitmentApprovalPolicySettingsProps = {
  enabled: boolean;
  thresholdAmountMinor: number;
  thresholdCurrency: string;
  baseCurrency: string | null;
  canManage: boolean;
};

export function FinanceCommitmentApprovalPolicySettingsSection({
  enabled: initialEnabled,
  thresholdAmountMinor,
  thresholdCurrency,
  baseCurrency,
  canManage,
}: FinanceCommitmentApprovalPolicySettingsProps) {
  const t = useTranslations("Finance.settings.approvalPolicy");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [thresholdInput, setThresholdInput] = useState(
    budgetDraftInputFromMinor(thresholdAmountMinor),
  );
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(
    null,
  );

  const displayCurrency = baseCurrency ?? thresholdCurrency;
  const currencyLabel = displayCurrency
    ? formatIso4217CurrencyOptionLabel(displayCurrency, locale)
    : null;

  const thresholdPreview =
    displayCurrency && thresholdAmountMinor >= 0
      ? formatBudgetPlanningMinor(thresholdAmountMinor, displayCurrency, locale)
      : null;

  return (
    <section
      className={FINANCE_SETTINGS_SECTION_CLASS}
      data-finance-surface="settings-commitment-approval-policy"
    >
      <h2 className="text-sm font-semibold">{t("title")}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{t("help")}</p>

      {!baseCurrency ? (
        <p className="mt-4 text-sm text-[var(--muted)]" data-finance-approval-policy-no-currency>
          {t("baseCurrencyRequired")}
        </p>
      ) : (
        <div className="mt-4 min-w-0 space-y-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--foreground)]">{t("toggleLabel")}</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{t("toggleHelp")}</p>
            </div>
            <SwitchThumb
              id="finance-commitment-approval-policy-enabled"
              checked={enabled}
              disabled={!canManage || pending || !baseCurrency}
              aria-label={t("toggleLabel")}
              onChange={(checked) => {
                setEnabled(checked);
                setFeedback(null);
              }}
            />
          </div>

          <div className="min-w-0 space-y-2">
            <p className="text-sm text-[var(--foreground)]">
              {enabled ? t("thresholdIntroEnabled") : t("thresholdIntroDisabled")}
            </p>
            <div className="flex min-w-0 flex-wrap items-end gap-2">
              <label className="flex min-w-0 flex-col gap-1 text-xs font-medium">
                {t("thresholdAmountLabel")}
                <input
                  id="finance-commitment-approval-policy-threshold"
                  name="threshold"
                  inputMode="numeric"
                  autoComplete="off"
                  disabled={!canManage || pending || !enabled}
                  value={thresholdInput}
                  onChange={(event) => {
                    setThresholdInput(event.target.value.replace(/[^\d]/g, ""));
                    setFeedback(null);
                  }}
                  className={FINANCE_FIELD_CONTROL_CLASS}
                  aria-describedby="finance-commitment-approval-policy-threshold-hint"
                />
              </label>
              {currencyLabel ? (
                <span
                  className="pb-2 text-sm font-medium tabular-nums text-[var(--foreground)]"
                  data-finance-approval-policy-currency
                >
                  {currencyLabel}
                </span>
              ) : null}
            </div>
            <p
              id="finance-commitment-approval-policy-threshold-hint"
              className="text-xs text-[var(--muted)]"
            >
              {enabled ? t("thresholdHintEnabled") : t("thresholdHintDisabled")}
            </p>
          </div>

          {thresholdPreview && enabled ? (
            <p className="text-xs text-[var(--muted)]">
              {t("summaryLine", { amount: thresholdPreview })}
            </p>
          ) : null}

          {canManage ? (
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                size="sm"
                disabled={pending || !baseCurrency}
                data-finance-approval-policy-save
                onClick={() => {
                  const parsed = parseBudgetInputToMinor(thresholdInput);
                  if (parsed === null) {
                    setFeedback({ kind: "error", message: t("invalidThreshold") });
                    return;
                  }
                  startTransition(async () => {
                    const result = await saveFinanceCommitmentApprovalPolicyAction({
                      enabled,
                      thresholdAmountMinor: parsed,
                    });
                    if (result.ok) {
                      setFeedback({ kind: "success", message: t("saveSuccess") });
                      router.refresh();
                    } else {
                      setFeedback({ kind: "error", message: result.error });
                    }
                  });
                }}
              >
                {t("saveAction")}
              </Button>
              {feedback ? (
                <p
                  className={
                    feedback.kind === "success"
                      ? "text-xs font-medium text-[var(--success)]"
                      : "text-xs font-medium text-[var(--danger)]"
                  }
                  data-finance-approval-policy-feedback
                  role="status"
                >
                  {feedback.message}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-[var(--muted)]">{t("readOnlyHint")}</p>
          )}
        </div>
      )}
    </section>
  );
}

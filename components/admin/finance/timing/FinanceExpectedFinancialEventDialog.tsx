"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import StaticOptionSearchablePicker from "@/components/admin/shared/StaticOptionSearchablePicker";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";
import {
  budgetDraftInputFromMinor,
  parseBudgetInputToMinor,
} from "@/lib/finance/budget/budget-amount-presentation";
import type { ExpectedFinancialEventRecord } from "@/lib/finance/forecast/expected-financial-event-row-mapper";
import {
  expectedMonthStartIsoFromMonthInput,
  monthInputValueFromIso,
  type ExpectedEventTimingUiKind,
} from "@/lib/finance/forecast/expected-financial-event-timing-presentation";
import { FinanceExpectedMonthPicker } from "@/components/admin/finance/timing/FinanceExpectedMonthPicker";
import {
  createFinanceExpectedEventAction,
  loadAccountTimingContextAction,
  updateFinanceExpectedEventAction,
} from "@/app/(admin)/dashboard/finance/forecast/timing/actions";

export type ExpectedEventAccountOption = {
  financialAccountId: string;
  name: string;
  accountType: "INCOME" | "EXPENSE";
  lifecycle: "ACTIVE" | "ARCHIVED";
};

type FinanceExpectedFinancialEventDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  financeYearId: string;
  actualsThroughDateIso: string;
  accounts: ExpectedEventAccountOption[];
  existing?: ExpectedFinancialEventRecord | null;
  presetAccountId?: string | null;
  formattingLocale: string;
};

function mapErrorCodeToMessage(
  t: ReturnType<typeof useTranslations>,
  errorCode: string | undefined,
  fallback: string,
): string {
  switch (errorCode) {
    case "FINANCE_EXPECTED_EVENT_STALE":
      return t("errors.stale");
    case "FINANCE_EXPECTED_EVENT_INVALID_ACCOUNT":
    case "FINANCE_FORECAST_ARCHIVED_ACCOUNT":
      return t("errors.invalidAccount");
    case "FINANCE_EXPECTED_EVENT_INVALID_AMOUNT":
      return t("errors.invalidAmount");
    case "FINANCE_EXPECTED_EVENT_INVALID_TIMING":
      return t("errors.invalidTiming");
    case "FINANCE_EXPECTED_EVENT_SOURCE_MUTATION_FORBIDDEN":
      return t("errors.sourceOwned");
    case "FINANCE_FORBIDDEN":
      return t("errors.forbidden");
    default:
      return fallback;
  }
}

type FormProps = Omit<FinanceExpectedFinancialEventDialogProps, "open"> & {
  existing?: ExpectedFinancialEventRecord | null;
};

function FinanceExpectedFinancialEventDialogForm({
  onClose,
  onSaved,
  financeYearId,
  actualsThroughDateIso,
  accounts,
  existing,
  presetAccountId,
  formattingLocale,
}: FormProps) {
  const t = useTranslations("Finance.forecast.timing.eventDialog");
  const [pending, startTransition] = useTransition();
  const [accountId, setAccountId] = useState(
    () => existing?.financialAccountId ?? presetAccountId ?? "",
  );
  const [amountInput, setAmountInput] = useState(() =>
    existing ? budgetDraftInputFromMinor(existing.expectedAmountMinor) : "",
  );
  const [timingKind, setTimingKind] = useState<ExpectedEventTimingUiKind>(
    () => existing?.timingPrecision ?? "EXACT_DATE",
  );
  const [exactDate, setExactDate] = useState(() => existing?.expectedDateIso ?? "");
  const [monthValue, setMonthValue] = useState(() =>
    existing?.expectedMonthStartIso ? monthInputValueFromIso(existing.expectedMonthStartIso) : "",
  );
  const [rangeStart, setRangeStart] = useState(() => existing?.rangeStartDateIso ?? "");
  const [rangeEnd, setRangeEnd] = useState(() => existing?.rangeEndDateIso ?? "");
  const [description, setDescription] = useState(() => existing?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [contextHint, setContextHint] = useState<string | null>(null);

  const isEdit = Boolean(existing);
  const accountLocked = isEdit;

  useEffect(() => {
    if (isEdit || !accountId) return;
    let cancelled = false;
    void loadAccountTimingContextAction({
      financeYearId,
      financialAccountId: accountId,
      actualsThroughDateIso,
    }).then((result) => {
      if (cancelled || !result.ok) return;
      if ((result.unscheduledRemainderMinor ?? 0) > 0) {
        setContextHint(
          t("contextUnscheduled", {
            amount: String(Math.trunc((result.unscheduledRemainderMinor ?? 0) / 100)),
          }),
        );
      } else if ((result.overallocatedAmountMinor ?? 0) > 0) {
        setContextHint(
          t("contextOverallocated", {
            amount: String(Math.trunc((result.overallocatedAmountMinor ?? 0) / 100)),
          }),
        );
      } else {
        setContextHint(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isEdit, accountId, financeYearId, actualsThroughDateIso, t]);

  const accountOptions = useMemo(
    () =>
      accounts
        .filter((a) => a.lifecycle === "ACTIVE" || a.financialAccountId === accountId)
        .map((a) => ({
          value: a.financialAccountId,
          label: a.name,
          searchText: a.accountType,
          disabled: a.lifecycle === "ARCHIVED" && !existing,
        })),
    [accounts, accountId, existing],
  );

  const timingOptions = useMemo(
    () => [
      { value: "EXACT_DATE" as const, label: t("timingExact") },
      { value: "MONTH" as const, label: t("timingMonth") },
      { value: "DATE_RANGE" as const, label: t("timingRange") },
    ],
    [t],
  );

  function buildTimingPayload():
    | {
        timingPrecision: ExpectedEventTimingUiKind;
        expectedDateIso?: string | null;
        expectedMonthStartIso?: string | null;
        rangeStartDateIso?: string | null;
        rangeEndDateIso?: string | null;
      }
    | { error: string } {
    if (timingKind === "EXACT_DATE") {
      if (!exactDate.trim()) return { error: t("errors.invalidTiming") };
      return { timingPrecision: "EXACT_DATE", expectedDateIso: exactDate.trim() };
    }
    if (timingKind === "MONTH") {
      const monthIso = expectedMonthStartIsoFromMonthInput(monthValue);
      if (!monthIso) return { error: t("errors.invalidTiming") };
      return { timingPrecision: "MONTH", expectedMonthStartIso: monthIso };
    }
    if (!rangeStart.trim() || !rangeEnd.trim()) {
      return { error: t("errors.invalidTiming") };
    }
    if (rangeEnd < rangeStart) {
      return { error: t("errors.rangeOrder") };
    }
    return {
      timingPrecision: "DATE_RANGE",
      rangeStartDateIso: rangeStart.trim(),
      rangeEndDateIso: rangeEnd.trim(),
    };
  }

  function handleAccountChange(nextAccountId: string) {
    setAccountId(nextAccountId);
    setContextHint(null);
  }

  function handleSubmit() {
    setError(null);
    const amountMinor = parseBudgetInputToMinor(amountInput);
    if (amountMinor === null || amountMinor <= 0) {
      setError(t("errors.invalidAmount"));
      return;
    }
    if (!accountId) {
      setError(t("errors.invalidAccount"));
      return;
    }
    const timing = buildTimingPayload();
    if ("error" in timing) {
      setError(timing.error);
      return;
    }

    startTransition(async () => {
      if (existing) {
        const result = await updateFinanceExpectedEventAction({
          eventId: existing.id,
          financeYearId,
          expectedAmountMinor: amountMinor,
          ...timing,
          description: description.trim() || null,
          expectedUpdatedAt: existing.updatedAt,
        });
        if (!result.ok) {
          setError(mapErrorCodeToMessage(t, result.errorCode, result.error));
          if (result.errorCode === "FINANCE_EXPECTED_EVENT_STALE") {
            onSaved();
          }
          return;
        }
      } else {
        const result = await createFinanceExpectedEventAction({
          financeYearId,
          financialAccountId: accountId,
          expectedAmountMinor: amountMinor,
          ...timing,
          description: description.trim() || null,
        });
        if (!result.ok) {
          setError(mapErrorCodeToMessage(t, result.errorCode, result.error));
          return;
        }
      }
      onSaved();
      onClose();
    });
  }

  return (
    <>
      <div className="space-y-4 px-5 py-3 text-sm">
        <p className="text-[var(--text-2)]">{isEdit ? t("editDescription") : t("createDescription")}</p>
        {!accountLocked ? (
          <SceFormField label={t("accountLabel")} htmlFor="expected-event-account">
            <StaticOptionSearchablePicker
              value={accountId}
              onChange={handleAccountChange}
              options={accountOptions}
              placeholder={t("accountPlaceholder")}
              ariaLabel={t("accountLabel")}
            />
          </SceFormField>
        ) : (
          <SceFormField label={t("accountLabel")}>
            <p className="text-[var(--foreground)]">
              {accounts.find((a) => a.financialAccountId === accountId)?.name ?? accountId}
            </p>
          </SceFormField>
        )}
        <SceFormField label={t("amountLabel")} htmlFor="expected-event-amount">
          <input
            id="expected-event-amount"
            type="text"
            inputMode="numeric"
            className="fca-input w-full"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value.replace(/[^\d]/g, ""))}
          />
        </SceFormField>
        <SceFormField label={t("timingLabel")}>
          <SceSegmentedControl<ExpectedEventTimingUiKind>
            value={timingKind}
            onChange={setTimingKind}
            options={timingOptions}
            aria-label={t("timingLabel")}
          />
        </SceFormField>
        {timingKind === "EXACT_DATE" ? (
          <SceFormField label={t("exactDateLabel")} htmlFor="expected-event-exact-date">
            <input
              id="expected-event-exact-date"
              type="date"
              className="fca-input w-full"
              value={exactDate}
              onChange={(e) => setExactDate(e.target.value)}
            />
          </SceFormField>
        ) : null}
        {timingKind === "MONTH" ? (
          <SceFormField label={t("monthLabel")} htmlFor="expected-event-month">
            <FinanceExpectedMonthPicker
              id="expected-event-month"
              value={monthValue}
              onChange={setMonthValue}
              formattingLocale={formattingLocale}
              placeholder={t("monthPlaceholder")}
              ariaLabel={t("monthLabel")}
              yearDecreaseLabel={t("monthYearDecrease")}
              yearIncreaseLabel={t("monthYearIncrease")}
            />
          </SceFormField>
        ) : null}
        {timingKind === "DATE_RANGE" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <SceFormField label={t("rangeStartLabel")} htmlFor="expected-event-range-start">
              <input
                id="expected-event-range-start"
                type="date"
                className="fca-input w-full"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
              />
            </SceFormField>
            <SceFormField label={t("rangeEndLabel")} htmlFor="expected-event-range-end">
              <input
                id="expected-event-range-end"
                type="date"
                className="fca-input w-full"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
              />
            </SceFormField>
          </div>
        ) : null}
        <SceFormField label={t("descriptionLabel")} htmlFor="expected-event-description">
          <input
            id="expected-event-description"
            type="text"
            className="fca-input w-full"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("descriptionPlaceholder")}
          />
        </SceFormField>
        {contextHint ? (
          <p className="text-xs text-[var(--text-2)]" data-finance-timing-context-hint>
            {contextHint}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
          {t("cancel")}
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
      </div>
    </>
  );
}

export function FinanceExpectedFinancialEventDialog({
  open,
  onClose,
  onSaved,
  financeYearId,
  actualsThroughDateIso,
  accounts,
  existing,
  presetAccountId,
  formattingLocale,
}: FinanceExpectedFinancialEventDialogProps) {
  const t = useTranslations("Finance.forecast.timing.eventDialog");
  const isEdit = Boolean(existing);
  const formKey = existing?.id ?? `create-${presetAccountId ?? "none"}`;

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? t("editTitle") : t("createTitle")}>
      {open ? (
        <FinanceExpectedFinancialEventDialogForm
          key={formKey}
          onClose={onClose}
          onSaved={onSaved}
          financeYearId={financeYearId}
          actualsThroughDateIso={actualsThroughDateIso}
          accounts={accounts}
          existing={existing}
          presetAccountId={presetAccountId}
          formattingLocale={formattingLocale}
        />
      ) : null}
    </Dialog>
  );
}

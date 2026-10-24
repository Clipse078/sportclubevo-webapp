"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import StaticOptionSearchablePicker from "@/components/admin/shared/StaticOptionSearchablePicker";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";
import type { ScenarioAssumptionKindV1 } from "@/lib/finance/forecast/scenario-architecture-contract";
import {
  formatScenarioPercentFromBasisPoints,
  parseScenarioAssumptionAmountInputToMinor,
  parseScenarioPercentInputToBasisPoints,
  scenarioAssumptionAmountDraftFromMinor,
} from "@/lib/finance/forecast/scenario-assumption-presentation";
import type { FinanceScenarioAssumptionReadModel } from "@/lib/finance/forecast/finance-scenario-read-model";
import { upsertFinanceScenarioAssumptionAction } from "@/app/(admin)/dashboard/finance/forecast/scenarios/actions";

export type ScenarioAssumptionAccountOption = {
  financialAccountId: string;
  name: string;
  accountType: "INCOME" | "EXPENSE";
  lifecycle: "ACTIVE" | "ARCHIVED";
};

type AssumptionUiKind = ScenarioAssumptionKindV1;

type FinanceScenarioAssumptionDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  scenarioId: string;
  financeYearId: string;
  expectedUpdatedAt: string;
  accounts: ScenarioAssumptionAccountOption[];
  existing?: FinanceScenarioAssumptionReadModel | null;
};

export function FinanceScenarioAssumptionDialog({
  open,
  onClose,
  onSaved,
  scenarioId,
  financeYearId,
  expectedUpdatedAt,
  accounts,
  existing,
}: FinanceScenarioAssumptionDialogProps) {
  const t = useTranslations("Finance.forecast.scenarios.assumptions");
  const [pending, startTransition] = useTransition();
  const [accountId, setAccountId] = useState("");
  const [kind, setKind] = useState<AssumptionUiKind>("PERCENT_CHANGE");
  const [percentInput, setPercentInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (existing) {
      setAccountId(existing.financialAccountId);
      setKind(existing.kind);
      if (existing.kind === "PERCENT_CHANGE" && existing.percentBasisPoints !== null) {
        setPercentInput(formatScenarioPercentFromBasisPoints(existing.percentBasisPoints));
      } else {
        setPercentInput("");
      }
      if (existing.kind === "DELTA_AMOUNT" && existing.amountMinorDelta !== null) {
        setAmountInput(scenarioAssumptionAmountDraftFromMinor(existing.amountMinorDelta));
      } else if (existing.kind === "ABSOLUTE_AMOUNT" && existing.absoluteAmountMinor !== null) {
        setAmountInput(scenarioAssumptionAmountDraftFromMinor(existing.absoluteAmountMinor));
      } else {
        setAmountInput("");
      }
    } else {
      setAccountId("");
      setKind("PERCENT_CHANGE");
      setPercentInput("");
      setAmountInput("");
    }
  }, [open, existing]);

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

  const kindOptions = useMemo(
    () => [
      { value: "PERCENT_CHANGE" as const, label: t("kindPercent") },
      { value: "DELTA_AMOUNT" as const, label: t("kindDelta") },
      { value: "ABSOLUTE_AMOUNT" as const, label: t("kindAbsolute") },
      { value: "EXCLUDE_ACCOUNT" as const, label: t("kindExclude") },
    ],
    [t],
  );

  function buildPayload():
    | {
        kind: ScenarioAssumptionKindV1;
        percentBasisPoints?: number | null;
        amountMinorDelta?: number | null;
        absoluteAmountMinor?: number | null;
      }
    | null {
    if (!accountId) return null;
    if (kind === "EXCLUDE_ACCOUNT") {
      return { kind };
    }
    if (kind === "PERCENT_CHANGE") {
      const basisPoints = parseScenarioPercentInputToBasisPoints(percentInput);
      if (basisPoints === null) return null;
      return { kind, percentBasisPoints: basisPoints };
    }
    const amountMinor = parseScenarioAssumptionAmountInputToMinor(amountInput);
    if (amountMinor === null) return null;
    if (kind === "DELTA_AMOUNT") {
      return { kind, amountMinorDelta: amountMinor };
    }
    return { kind, absoluteAmountMinor: amountMinor };
  }

  function save() {
    const payload = buildPayload();
    if (!payload) {
      setError(t("errors.invalidInput"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await upsertFinanceScenarioAssumptionAction({
        scenarioId,
        financeYearId,
        expectedUpdatedAt,
        financialAccountId: accountId,
        assumption: payload,
      });
      if (!result.ok) {
        setError(
          result.errorCode === "FINANCE_SCENARIO_STALE"
            ? t("errors.staleScenario")
            : result.errorCode === "FINANCE_SCENARIO_ACCOUNT_NOT_AVAILABLE"
              ? t("errors.accountUnavailable")
              : result.error,
        );
        return;
      }
      onSaved();
      onClose();
    });
  }

  const showAmount = kind === "DELTA_AMOUNT" || kind === "ABSOLUTE_AMOUNT";
  const showPercent = kind === "PERCENT_CHANGE";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={existing ? t("editTitle") : t("addTitle")}
      description={existing ? t("editDescription") : t("addDescription")}
      footer={
        <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
          <Button variant="secondary" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button disabled={pending || !accountId} onClick={save}>
            {t("save")}
          </Button>
        </div>
      }
    >
      <div className="space-y-3" data-finance-scenario-assumption-dialog>
        <SceFormField label={t("accountLabel")} required>
          <StaticOptionSearchablePicker
            options={accountOptions}
            value={accountId}
            onChange={setAccountId}
            placeholder={t("accountPlaceholder")}
            disabled={Boolean(existing) || pending}
            ariaLabel={t("accountLabel")}
          />
        </SceFormField>
        <SceFormField label={t("kindLabel")}>
          <SceSegmentedControl
            aria-label={t("kindLabel")}
            value={kind}
            onChange={setKind}
            options={kindOptions}
            disabled={pending}
          />
        </SceFormField>
        {showPercent ? (
          <SceFormField label={t("percentLabel")} description={t("percentHint")}>
            <input
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm tabular-nums"
              inputMode="decimal"
              value={percentInput}
              onChange={(e) => setPercentInput(e.target.value)}
            />
          </SceFormField>
        ) : null}
        {showAmount ? (
          <SceFormField
            label={kind === "DELTA_AMOUNT" ? t("deltaAmountLabel") : t("absoluteAmountLabel")}
          >
            <input
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm tabular-nums"
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
          </SceFormField>
        ) : null}
        {error ? (
          <p className="text-sm text-[var(--destructive)]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}

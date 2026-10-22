"use client";

import { useMemo, useState, useTransition, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import { cn } from "@/lib/cn";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";
import type { BudgetWorkspaceSnapshot } from "@/lib/finance/budget/budget-presentation";
import {
  approveBudgetAction,
  ensureDraftBudgetAction,
  saveBudgetLineAction,
} from "@/app/(admin)/dashboard/finance/budget/actions";

type FinanceYearOption = { id: string; name: string };

type FinanceBudgetWorkspacePanelProps = {
  years: FinanceYearOption[];
  snapshot: BudgetWorkspaceSnapshot | null;
  hasAccounts: boolean;
  canMutate: boolean;
  canApprove: boolean;
  selectedYearId: string | null;
};

function majorUnitsFromMinor(amountMinor: number | null): string {
  if (amountMinor === null) return "";
  return (amountMinor / 100).toFixed(2);
}

function minorUnitsFromMajorInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

function formatMinor(amountMinor: number, currency: string | null): string {
  const major = amountMinor / 100;
  return `${major.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${currency ? ` ${currency}` : ""}`;
}

export function FinanceBudgetWorkspacePanel({
  years,
  snapshot,
  hasAccounts,
  canMutate,
  canApprove,
  selectedYearId,
}: FinanceBudgetWorkspacePanelProps) {
  const t = useTranslations("Finance.budget");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const yearSelectId = useId();

  const isApproved = snapshot?.status === "APPROVED";
  const isDraft = snapshot?.status === "DRAFT";
  const readOnly = !canMutate || isApproved;

  const incomeRows = useMemo(
    () => snapshot?.rows.filter((row) => row.semantic === "INCOME") ?? [],
    [snapshot?.rows],
  );
  const expenseRows = useMemo(
    () => snapshot?.rows.filter((row) => row.semantic === "EXPENSE") ?? [],
    [snapshot?.rows],
  );

  function onYearChange(yearId: string) {
    router.push(`/dashboard/finance/budget?yearId=${encodeURIComponent(yearId)}`);
  }

  function runAction(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        setFeedback(null);
        router.refresh();
      } else {
        setFeedback(result.error);
      }
    });
  }

  if (years.length === 0) {
    return (
      <section className="rounded-xl border border-[var(--sce-color-border-standard)] bg-[var(--surface)] px-5 py-6">
        <h2 className="text-base font-semibold">{t("noYearTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{t("noYearBody")}</p>
        <div className="mt-4">
          <Link
            href="/dashboard/finance/settings"
            className="inline-flex h-8 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]"
          >
            {t("openSetup")}
          </Link>
        </div>
      </section>
    );
  }

  if (!hasAccounts) {
    return (
      <section className="rounded-xl border border-[var(--sce-color-border-standard)] bg-[var(--surface)] px-5 py-6">
        <h2 className="text-base font-semibold">{t("noAccountsTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{t("noAccountsBody")}</p>
        <div className="mt-4">
          <Link
            href="/dashboard/finance/structure"
            className="inline-flex h-8 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]"
          >
            {t("openStructure")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SceFormField label={t("yearLabel")} htmlFor={yearSelectId}>
          <select
            id={yearSelectId}
            className="min-w-[12rem] rounded-md border border-[var(--sce-color-border-standard)] px-3 py-2 text-sm"
            value={selectedYearId ?? snapshot?.financeYearId ?? ""}
            onChange={(e) => onYearChange(e.target.value)}
          >
            {years.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </SceFormField>

        {isApproved ? (
          <p className="text-sm text-[var(--muted)]" data-budget-status="approved">
            {t("approvedBaselineHint", {
              date: snapshot?.approvedAt
                ? new Date(snapshot.approvedAt).toLocaleDateString()
                : "—",
              approver: snapshot?.approvedByLabel ?? "—",
            })}
          </p>
        ) : null}
      </div>

      {!canMutate && !isApproved ? (
        <p className="text-sm text-[var(--muted)]">{t("viewOnlyHint")}</p>
      ) : null}

      {feedback ? (
        <p className="text-sm text-[var(--destructive)]" role="alert">
          {feedback}
        </p>
      ) : null}

      {!snapshot?.versionId && canMutate && selectedYearId ? (
        <div className="rounded-xl border border-dashed border-[var(--sce-color-border-standard)] px-5 py-6">
          <h2 className="text-base font-semibold">{t("emptyTitle")}</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{t("emptyBody")}</p>
          <Button
            className="mt-4"
            disabled={pending}
            onClick={() => runAction(() => ensureDraftBudgetAction(selectedYearId))}
          >
            {t("startDraft")}
          </Button>
        </div>
      ) : null}

      {snapshot?.versionId ? (
        <>
          <BudgetSection
            title={t("incomeSection")}
            rows={incomeRows}
            currency={snapshot.currency}
            readOnly={readOnly}
            pending={pending}
            versionId={snapshot.versionId}
            onSave={(accountId, amountMinor) =>
              runAction(() =>
                saveBudgetLineAction({
                  budgetVersionId: snapshot.versionId!,
                  financialAccountId: accountId,
                  amountMinor,
                }),
              )
            }
          />
          <BudgetSection
            title={t("expenseSection")}
            rows={expenseRows}
            currency={snapshot.currency}
            readOnly={readOnly}
            pending={pending}
            versionId={snapshot.versionId}
            onSave={(accountId, amountMinor) =>
              runAction(() =>
                saveBudgetLineAction({
                  budgetVersionId: snapshot.versionId!,
                  financialAccountId: accountId,
                  amountMinor,
                }),
              )
            }
          />

          <section className="rounded-xl border border-[var(--sce-color-border-standard)] bg-[var(--surface-2)] px-4 py-3 text-sm">
            <dl className="grid gap-2 sm:grid-cols-3">
              <div>
                <dt className="text-[var(--muted)]">{t("totalIncome")}</dt>
                <dd className="font-medium">{formatMinor(snapshot.totals.totalIncomeMinor, snapshot.currency)}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">{t("totalExpense")}</dt>
                <dd className="font-medium">{formatMinor(snapshot.totals.totalExpenseMinor, snapshot.currency)}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">{t("plannedResult")}</dt>
                <dd className="font-medium">{formatMinor(snapshot.totals.resultMinor, snapshot.currency)}</dd>
              </div>
            </dl>
          </section>

          {isDraft && canApprove ? (
            <div className="flex justify-end">
              <Button disabled={pending} onClick={() => setApproveOpen(true)}>
                {t("approveAction")}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}

      <Dialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title={t("approveDialogTitle")}
        description={t("approveDialogBody")}
        footer={
          <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
            <Button variant="secondary" onClick={() => setApproveOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                setApproveOpen(false);
                if (!snapshot?.versionId) return;
                runAction(() => approveBudgetAction(snapshot.versionId!));
              }}
            >
              {t("approveConfirm")}
            </Button>
          </div>
        }
      />
    </div>
  );
}

function BudgetSection(props: {
  title: string;
  rows: BudgetWorkspaceSnapshot["rows"];
  currency: string | null;
  readOnly: boolean;
  pending: boolean;
  versionId: string;
  onSave: (accountId: string, amountMinor: number) => void;
}) {
  const t = useTranslations("Finance.budget");

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--sce-color-border-standard)]">
      <h2 className="border-b border-[var(--sce-color-border-standard)] bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold">
        {props.title}
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--sce-color-border-standard)] text-left text-[var(--muted)]">
            <th className="px-4 py-2 font-medium">{t("accountColumn")}</th>
            <th className="hidden px-4 py-2 font-medium sm:table-cell">{t("groupColumn")}</th>
            <th className="px-4 py-2 font-medium">{t("plannedColumn")}</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <BudgetAmountRow
              key={row.accountId}
              row={row}
              currency={props.currency}
              readOnly={props.readOnly}
              pending={props.pending}
              onSave={props.onSave}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function BudgetAmountRow(props: {
  row: BudgetWorkspaceSnapshot["rows"][number];
  currency: string | null;
  readOnly: boolean;
  pending: boolean;
  onSave: (accountId: string, amountMinor: number) => void;
}) {
  const t = useTranslations("Finance.budget");
  const inputId = useId();
  const [localValue, setLocalValue] = useState(majorUnitsFromMinor(props.row.amountMinor));

  return (
    <tr className={cn("border-b border-[var(--border)]/60 last:border-0", props.row.lifecycle === "ARCHIVED" && "opacity-75")}>
      <td className="px-4 py-2">
        <span className="font-medium">{props.row.accountName}</span>
        {props.row.lifecycle === "ARCHIVED" ? (
          <span className="ms-2 text-xs text-[var(--muted)]">({t("archivedAccount")})</span>
        ) : null}
      </td>
      <td className="hidden px-4 py-2 text-[var(--muted)] sm:table-cell">{props.row.reportingGroupName}</td>
      <td className="px-4 py-2">
        {props.readOnly ? (
          <span>{props.row.amountMinor !== null ? formatMinor(props.row.amountMinor, props.currency) : "—"}</span>
        ) : (
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            aria-label={t("plannedAmountLabel", { account: props.row.accountName })}
            className="w-full max-w-[10rem] rounded-md border border-[var(--sce-color-border-standard)] px-2 py-1.5 text-sm"
            value={localValue}
            disabled={props.pending}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={() => {
              const minor = minorUnitsFromMajorInput(localValue);
              if (minor === null) return;
              props.onSave(props.row.accountId, minor);
            }}
          />
        )}
      </td>
    </tr>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import {
  completeFinanceSetupAction,
  createFinanceYearAction,
  saveFinanceBaseCurrencyAction,
  setFinanceCapabilityAction,
  updateFinanceYearAction,
} from "@/app/(admin)/dashboard/finance/actions";
import type { FinanceCapabilityKey } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";
import { FINANCE_CAPABILITY_PRESENTATION_ORDER } from "@/lib/finance/capability-presentation";
import { cn } from "@/lib/cn";
import {
  FINANCE_FIELD_CONTROL_CLASS,
  FINANCE_SETTINGS_SECTION_CLASS,
  FINANCE_WORKSPACE_STACK_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";
import { FinanceBaseCurrencySelector } from "@/components/admin/finance/FinanceBaseCurrencySelector";
import { formatIso4217CurrencyOptionLabel } from "@/lib/finance/currency/iso4217-currency";
import { formatFinanceYearPeriodLabel } from "@/lib/finance/setup/finance-year-period-display";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";

type FinanceYearSettingsRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  periodEditable: boolean;
};

type FinanceSettingsPanelProps = {
  baseCurrency: string | null;
  canCompleteSetup: boolean;
  capabilityRows: { capability: FinanceCapabilityKey; enabled: boolean; configurable: boolean }[];
  existingYears: FinanceYearSettingsRow[];
  newYearDraftDefaults: { startDate: string; endDate: string };
};

type FinanceYearFormValues = {
  name: string;
  startDate: string;
  endDate: string;
};

function FinanceYearFormFields({
  values,
  periodEditable,
  nameInputId,
  startInputId,
  endInputId,
}: {
  values: FinanceYearFormValues;
  periodEditable: boolean;
  nameInputId: string;
  startInputId: string;
  endInputId: string;
}) {
  const t = useTranslations("Finance");

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs font-medium sm:col-span-2" htmlFor={nameInputId}>
        {t("settings.financeYearName")}
        <input
          id={nameInputId}
          name="name"
          required
          defaultValue={values.name}
          placeholder={t("settings.financeYearNamePlaceholder")}
          className={FINANCE_FIELD_CONTROL_CLASS}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium" htmlFor={startInputId}>
        {t("settings.financeYearStart")}
        <input
          id={startInputId}
          type="date"
          name="startDate"
          required
          readOnly={!periodEditable}
          defaultValue={values.startDate}
          className={FINANCE_FIELD_CONTROL_CLASS}
          aria-describedby={!periodEditable ? `${startInputId}-locked-hint` : undefined}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium" htmlFor={endInputId}>
        {t("settings.financeYearEnd")}
        <input
          id={endInputId}
          type="date"
          name="endDate"
          required
          readOnly={!periodEditable}
          defaultValue={values.endDate}
          className={FINANCE_FIELD_CONTROL_CLASS}
          aria-describedby={!periodEditable ? `${startInputId}-locked-hint` : undefined}
        />
      </label>
      {!periodEditable ? (
        <p
          id={`${startInputId}-locked-hint`}
          className="text-xs text-[var(--muted)] sm:col-span-2"
        >
          {t("settings.financeYearPeriodLocked")}
        </p>
      ) : null}
    </div>
  );
}

function FinanceYearEditDialog({
  row,
  open,
  onClose,
}: {
  row: FinanceYearSettingsRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("Finance");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nameInputId = "finance-year-edit-name";
  const startInputId = "finance-year-edit-start";
  const endInputId = "finance-year-edit-end";

  if (!row) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("settings.editFinanceYearDialogTitle")}
      size="md"
      footer={
        <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={pending}>
            {t("budget.cancel")}
          </Button>
          <Button type="submit" form="finance-year-edit-form" size="sm" disabled={pending}>
            {t("settings.saveFinanceYear")}
          </Button>
        </div>
      }
    >
      <form
        id="finance-year-edit-form"
        className="space-y-3"
        data-finance-year-edit-form
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          const data = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await updateFinanceYearAction({
              id: row.id,
              name: String(data.get("name") ?? ""),
              startDate: String(data.get("startDate") ?? ""),
              endDate: String(data.get("endDate") ?? ""),
            });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            onClose();
            router.refresh();
          });
        }}
      >
        <FinanceYearFormFields
          values={{
            name: row.name,
            startDate: row.startDate,
            endDate: row.endDate,
          }}
          periodEditable={row.periodEditable}
          nameInputId={nameInputId}
          startInputId={startInputId}
          endInputId={endInputId}
        />
        {error ? (
          <p className="text-sm text-[var(--destructive)]" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}

function FinanceYearCreateDialog({
  open,
  onClose,
  draftDefaults,
}: {
  open: boolean;
  onClose: () => void;
  draftDefaults: { startDate: string; endDate: string };
}) {
  const t = useTranslations("Finance");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formKey = `${open}-${draftDefaults.startDate}-${draftDefaults.endDate}`;
  const nameInputId = "finance-year-create-name";
  const startInputId = "finance-year-create-start";
  const endInputId = "finance-year-create-end";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("settings.createFinanceYearDialogTitle")}
      size="md"
      footer={
        <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={pending}>
            {t("budget.cancel")}
          </Button>
          <Button type="submit" form="finance-year-create-form" size="sm" disabled={pending}>
            {t("settings.createFinanceYearConfirm")}
          </Button>
        </div>
      }
    >
      <form
        key={formKey}
        id="finance-year-create-form"
        className="space-y-3"
        data-finance-year-create-form
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          const data = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await createFinanceYearAction({
              name: String(data.get("name") ?? ""),
              startDate: String(data.get("startDate") ?? ""),
              endDate: String(data.get("endDate") ?? ""),
            });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            onClose();
            router.refresh();
          });
        }}
      >
        <FinanceYearFormFields
          values={{ name: "", startDate: draftDefaults.startDate, endDate: draftDefaults.endDate }}
          periodEditable
          nameInputId={nameInputId}
          startInputId={startInputId}
          endInputId={endInputId}
        />
        {error ? (
          <p className="text-sm text-[var(--destructive)]" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}

function FinanceBaseCurrencySettingsSection({ baseCurrency }: { baseCurrency: string | null }) {
  const t = useTranslations("Finance");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [currencyDraft, setCurrencyDraft] = useState(baseCurrency ?? "");
  const [currencyError, setCurrencyError] = useState<string | null>(null);

  const configuredLabel =
    baseCurrency != null && baseCurrency.length > 0
      ? formatIso4217CurrencyOptionLabel(baseCurrency, locale)
      : null;

  return (
    <section className={FINANCE_SETTINGS_SECTION_CLASS} data-finance-surface="settings-currency">
      <h2 className="text-sm font-semibold">{t("settings.baseCurrencyTitle")}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{t("settings.baseCurrencyHelp")}</p>
      {configuredLabel ? (
        <p
          className="mt-2 text-sm font-medium text-[var(--foreground)]"
          data-finance-base-currency-state="configured"
        >
          {t("settings.baseCurrencyConfiguredStatus", { currency: configuredLabel })}
        </p>
      ) : (
        <p
          className="mt-2 text-sm font-medium text-[var(--destructive)]"
          data-finance-base-currency-state="required"
        >
          {t("settings.baseCurrencyRequiredStatus")}
        </p>
      )}
      <form
        className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          setCurrencyError(null);
          const currency = currencyDraft.trim();
          if (!currency) {
            setCurrencyError(t("settings.baseCurrencyRequiredStatus"));
            return;
          }
          startTransition(async () => {
            const result = await saveFinanceBaseCurrencyAction(currency);
            if (!result.ok) {
              setCurrencyError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium sm:max-w-md">
          {t("settings.baseCurrencyLabel")}
          <FinanceBaseCurrencySelector
            value={currencyDraft}
            onChange={setCurrencyDraft}
            disabled={pending}
            ariaLabel={t("settings.baseCurrencyLabel")}
            placeholder={t("settings.baseCurrencyPlaceholder")}
          />
        </label>
        <Button type="submit" size="sm" disabled={pending || !currencyDraft.trim()}>
          {t("settings.saveCurrency")}
        </Button>
      </form>
      {currencyError ? (
        <p className="mt-2 text-sm text-[var(--destructive)]" role="alert">
          {currencyError}
        </p>
      ) : null}
    </section>
  );
}

export function FinanceSettingsPanel({
  baseCurrency,
  canCompleteSetup,
  capabilityRows,
  existingYears,
  newYearDraftDefaults,
}: FinanceSettingsPanelProps) {
  const t = useTranslations("Finance");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<FinanceYearSettingsRow | null>(null);

  const capabilityState = new Map(
    capabilityRows.map((row) => [row.capability, row] as const),
  );

  return (
    <div className={cn(FINANCE_WORKSPACE_STACK_CLASS, "gap-8")}>
      <FinanceBaseCurrencySettingsSection
        key={baseCurrency ?? "finance-base-currency-unset"}
        baseCurrency={baseCurrency}
      />

      <section className={FINANCE_SETTINGS_SECTION_CLASS} data-finance-surface="settings-years">
        <h2 className="text-sm font-semibold">{t("settings.financeYearTitle")}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("settings.financeYearHelp")}</p>

        {existingYears.length > 0 ? (
          <ul className="mt-4 min-w-0 divide-y divide-[var(--sce-color-border-subtle)]" data-finance-year-list>
            {existingYears.map((row) => (
              <li
                key={row.id}
                className="flex min-w-0 flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                data-finance-year-row
                data-finance-year-id={row.id}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-medium text-[var(--foreground)]"
                    data-finance-year-name
                  >
                    {row.name}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted)] tabular-nums" data-finance-year-period>
                    {formatFinanceYearPeriodLabel(row.startDate, row.endDate, locale)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="self-start sm:shrink-0"
                  data-finance-year-edit
                  onClick={() => setEditRow(row)}
                >
                  {t("settings.editFinanceYear")}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">{t("settings.financeYearEmptyHint")}</p>
        )}

        <div className="mt-4">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="inline-flex items-center gap-1.5"
            data-finance-year-create-trigger
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden />
            {t("settings.addFinanceYear")}
          </Button>
        </div>
      </section>

      <section
        className={FINANCE_SETTINGS_SECTION_CLASS}
        data-finance-surface="settings-capabilities"
        data-finance-capabilities-tenant-scope="true"
      >
        <h2 className="text-sm font-semibold">{t("settings.capabilitiesTitle")}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("settings.capabilitiesHelp")}</p>
        <div
          className="mt-4 rounded-lg border border-[var(--sce-color-border-subtle)] bg-[var(--surface-2)] px-3 py-2.5"
          role="note"
        >
          <p className="text-xs font-medium text-[var(--foreground)]">
            {t("settings.starterNudgeTitle")}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{t("settings.starterNudgeBody")}</p>
        </div>
        <ul className="mt-4 space-y-3">
          {FINANCE_CAPABILITY_PRESENTATION_ORDER.map((presentation) => {
            const row = capabilityState.get(presentation.key);
            if (!row) {
              return null;
            }
            const label = t(presentation.labelKey);
            const description = t(presentation.descriptionKey);
            const titleId = `finance-cap-title-${presentation.key}`;
            const statusId = `finance-cap-status-${presentation.key}`;
            const available = row.configurable;

            return (
              <li
                key={presentation.key}
                className="flex flex-col gap-3 rounded-lg border border-[var(--sce-color-border-subtle)] px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p id={titleId} className="text-sm font-medium text-[var(--foreground)]">
                    {label}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{description}</p>
                  {!available ? (
                    <p
                      id={statusId}
                      className="mt-1.5 text-xs font-medium text-[var(--foreground)]"
                    >
                      {t("settings.capabilityNotAvailable")}
                    </p>
                  ) : null}
                </div>
                <div
                  className={[
                    "flex shrink-0 items-center self-start sm:pt-0.5",
                    !available ? "opacity-35" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-hidden={!available ? true : undefined}
                >
                  <SwitchThumb
                    id={`finance-cap-${presentation.key}`}
                    checked={row.enabled}
                    disabled={!available || pending}
                    aria-label={available ? label : `${label} — ${t("settings.capabilityNotAvailable")}`}
                    aria-describedby={!available ? statusId : titleId}
                    onChange={(checked) => {
                      if (!available) {
                        return;
                      }
                      startTransition(async () => {
                        await setFinanceCapabilityAction(presentation.key, checked);
                        router.refresh();
                      });
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {canCompleteSetup ? (
        <div>
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await completeFinanceSetupAction();
                router.refresh();
              });
            }}
          >
            {t("settings.completeSetup")}
          </Button>
        </div>
      ) : null}

      <FinanceYearCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        draftDefaults={newYearDraftDefaults}
      />
      <FinanceYearEditDialog
        row={editRow}
        open={editRow != null}
        onClose={() => setEditRow(null)}
      />
    </div>
  );
}

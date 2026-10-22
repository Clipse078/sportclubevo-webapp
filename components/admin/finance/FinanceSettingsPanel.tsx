"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import { Button } from "@/components/ui/Button";
import {
  completeFinanceSetupAction,
  createFinanceYearAction,
  saveFinanceBaseCurrencyAction,
  setFinanceCapabilityAction,
} from "@/app/(admin)/dashboard/finance/actions";
import type { FinanceCapabilityKey } from "@prisma/client";
import { useTranslations } from "next-intl";
import { FINANCE_CAPABILITY_PRESENTATION_ORDER } from "@/lib/finance/capability-presentation";
import { cn } from "@/lib/cn";
import {
  FINANCE_FIELD_CONTROL_CLASS,
  FINANCE_SETTINGS_SECTION_CLASS,
  FINANCE_WORKSPACE_STACK_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";
import { FinanceBaseCurrencySelector } from "@/components/admin/finance/FinanceBaseCurrencySelector";
import { formatIso4217CurrencyOptionLabel } from "@/lib/finance/currency/iso4217-currency";
import { useLocale } from "next-intl";

type FinanceSettingsPanelProps = {
  baseCurrency: string | null;
  canCompleteSetup: boolean;
  capabilityRows: { capability: FinanceCapabilityKey; enabled: boolean; configurable: boolean }[];
  yearDraftDefaults: { name: string; startDate: string; endDate: string };
};

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
  yearDraftDefaults,
}: FinanceSettingsPanelProps) {
  const t = useTranslations("Finance");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const capabilityState = new Map(
    capabilityRows.map((row) => [row.capability, row] as const),
  );

  return (
    <div className={cn(FINANCE_WORKSPACE_STACK_CLASS, "gap-8")}>
      <FinanceBaseCurrencySettingsSection
        key={baseCurrency ?? "finance-base-currency-unset"}
        baseCurrency={baseCurrency}
      />

      <section className={FINANCE_SETTINGS_SECTION_CLASS} data-finance-surface="settings-year">
        <h2 className="text-sm font-semibold">{t("settings.financeYearTitle")}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("settings.financeYearHelp")}</p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            startTransition(async () => {
              await createFinanceYearAction({
                name: String(data.get("name") ?? ""),
                startDate: String(data.get("startDate") ?? ""),
                endDate: String(data.get("endDate") ?? ""),
              });
              router.refresh();
            });
          }}
        >
          <label className="flex flex-col gap-1 text-xs font-medium sm:col-span-2">
            {t("settings.financeYearName")}
            <input
              name="name"
              required
              defaultValue={yearDraftDefaults.name}
              className={FINANCE_FIELD_CONTROL_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            {t("settings.financeYearStart")}
            <input
              type="date"
              name="startDate"
              required
              defaultValue={yearDraftDefaults.startDate}
              className={FINANCE_FIELD_CONTROL_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            {t("settings.financeYearEnd")}
            <input
              type="date"
              name="endDate"
              required
              defaultValue={yearDraftDefaults.endDate}
              className={FINANCE_FIELD_CONTROL_CLASS}
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={pending}>
              {t("settings.addFinanceYear")}
            </Button>
          </div>
        </form>
      </section>

      <section className={FINANCE_SETTINGS_SECTION_CLASS} data-finance-surface="settings-capabilities">
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
    </div>
  );
}

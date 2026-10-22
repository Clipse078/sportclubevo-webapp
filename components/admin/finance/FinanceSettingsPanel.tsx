"use client";

import { useTransition } from "react";
import { SwitchToggle } from "@/components/ui/SwitchToggle";
import { Button } from "@/components/ui/Button";
import {
  completeFinanceSetupAction,
  createFinanceYearAction,
  saveFinanceBaseCurrencyAction,
  setFinanceCapabilityAction,
} from "@/app/(admin)/dashboard/finance/actions";
import type { FinanceCapabilityKey } from "@prisma/client";
import { useTranslations } from "next-intl";

type FinanceSettingsPanelProps = {
  baseCurrency: string | null;
  canCompleteSetup: boolean;
  capabilityRows: { capability: FinanceCapabilityKey; enabled: boolean; configurable: boolean }[];
  yearDraftDefaults: { name: string; startDate: string; endDate: string };
};

export function FinanceSettingsPanel({
  baseCurrency,
  canCompleteSetup,
  capabilityRows,
  yearDraftDefaults,
}: FinanceSettingsPanelProps) {
  const t = useTranslations("Finance");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-[var(--sce-color-border-standard)] p-5">
        <h2 className="text-sm font-semibold">{t("settings.baseCurrencyTitle")}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("settings.baseCurrencyHelp")}</p>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const currency = String(data.get("baseCurrency") ?? "").trim();
            startTransition(async () => {
              await saveFinanceBaseCurrencyAction(currency);
            });
          }}
        >
          <label className="flex min-w-[8rem] flex-col gap-1 text-xs font-medium">
            {t("settings.baseCurrencyLabel")}
            <input
              name="baseCurrency"
              defaultValue={baseCurrency ?? ""}
              maxLength={3}
              className="rounded-md border border-[var(--sce-color-border-standard)] px-3 py-2 text-sm uppercase"
              aria-label={t("settings.baseCurrencyLabel")}
              placeholder="EUR"
            />
          </label>
          <Button type="submit" size="sm" disabled={pending}>
            {t("settings.saveCurrency")}
          </Button>
        </form>
      </section>

      <section className="rounded-xl border border-[var(--sce-color-border-standard)] p-5">
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
            });
          }}
        >
          <label className="flex flex-col gap-1 text-xs font-medium sm:col-span-2">
            {t("settings.financeYearName")}
            <input
              name="name"
              required
              defaultValue={yearDraftDefaults.name}
              className="rounded-md border border-[var(--sce-color-border-standard)] px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            {t("settings.financeYearStart")}
            <input
              type="date"
              name="startDate"
              required
              defaultValue={yearDraftDefaults.startDate}
              className="rounded-md border border-[var(--sce-color-border-standard)] px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            {t("settings.financeYearEnd")}
            <input
              type="date"
              name="endDate"
              required
              defaultValue={yearDraftDefaults.endDate}
              className="rounded-md border border-[var(--sce-color-border-standard)] px-3 py-2 text-sm"
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={pending}>
              {t("settings.addFinanceYear")}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-[var(--sce-color-border-standard)] p-5">
        <h2 className="text-sm font-semibold">{t("settings.capabilitiesTitle")}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("settings.capabilitiesHelp")}</p>
        <ul className="mt-4 space-y-3">
          {capabilityRows.map((row) => (
            <li
              key={row.capability}
              className="flex items-center justify-between gap-4 rounded-lg border border-[var(--sce-color-border-subtle)] px-3 py-2"
            >
              <span className="text-sm">{t(`capabilities.${row.capability}` as "capabilities.OVERVIEW")}</span>
              <SwitchToggle
                id={`finance-cap-${row.capability}`}
                label={t(`capabilities.${row.capability}` as "capabilities.OVERVIEW")}
                checked={row.enabled}
                disabled={!row.configurable || pending}
                onChange={(checked) => {
                  startTransition(async () => {
                    await setFinanceCapabilityAction(row.capability, checked);
                  });
                }}
              />
            </li>
          ))}
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

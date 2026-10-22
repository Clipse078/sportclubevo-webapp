"use client";

import { useTransition } from "react";
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

  const capabilityState = new Map(
    capabilityRows.map((row) => [row.capability, row] as const),
  );

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

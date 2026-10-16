"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays } from "lucide-react";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import { buildProgrammeFeedGroups } from "@/lib/personal-agenda/programme-feed-groups";
import { PersonalProgrammeCanonicalAgendaRow } from "@/components/ui/dashboard/PersonalProgrammeCanonicalAgendaRow";
import { DashboardEmptyState } from "@/components/ui/dashboard/DashboardEmptyState";
import { cn } from "@/lib/cn";

type Props = {
  items: PersonalProgrammeItem[];
  timeZone: string;
  locale: string;
  supported: boolean;
  filtersActive?: boolean;
  fmtCfg: TenantFormatConfig;
};

export default function PersonalProgrammeListeView({
  items,
  timeZone,
  locale,
  supported,
  filtersActive = false,
  fmtCfg,
}: Props) {
  const t = useTranslations("PersonalDashboard.programme");

  const groups = useMemo(
    () =>
      buildProgrammeFeedGroups({
        items,
        timeZone,
        locale,
      }),
    [items, timeZone, locale],
  );

  if (!supported) {
    return (
      <p className="text-sm text-[var(--text-2)]" data-testid="personal-programme-unsupported">
        {t("unsupported")}
      </p>
    );
  }

  if (groups.length === 0) {
    return (
      <div data-testid="personal-programme-liste-empty">
        <DashboardEmptyState
          icon={<CalendarDays className="h-5 w-5" />}
          title={filtersActive ? "Keine Aktivitäten für diese Auswahl" : t("emptyTitle")}
          description={filtersActive ? undefined : t("emptyDescription")}
          variant="default"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="personal-programme-liste">
      {groups.map((group) => {
        const label =
          group.labelKind === "today"
            ? t("groupToday")
            : group.labelKind === "tomorrow"
              ? t("groupTomorrow")
              : group.dateLabel ?? group.dayKey;

        return (
          <section
            key={group.dayKey}
            aria-labelledby={`mein-programm-day-${group.dayKey}`}
            data-day-key={group.dayKey}
          >
            <h2
              id={`mein-programm-day-${group.dayKey}`}
              className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
            >
              {label}
            </h2>
            <ol className="space-y-1 divide-y divide-[color-mix(in_srgb,var(--border)_70%,transparent)] rounded-lg border border-[var(--border)]/80 bg-[var(--surface)]">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className={cn("list-none px-2 sm:px-3")}
                  data-testid={`personal-programme-liste-row-${item.id}`}
                >
                  <PersonalProgrammeCanonicalAgendaRow
                    item={item}
                    fmtCfg={fmtCfg}
                    density="STANDARD"
                  />
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

"use client";

import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useTranslations } from "next-intl";
import PersonalCalendarEventBlock from "./PersonalCalendarEventBlock";
import { sortNormalizedCalendarItems } from "@/lib/personal-agenda/calendar-item-sort";
import type { NormalizedCalendarItem } from "@/lib/personal-agenda/normalized-calendar-item-types";

type Props = {
  dayKey: string;
  items: NormalizedCalendarItem[];
  timeLabelById: Record<string, string>;
  tenantDisplayNames?: string[];
};

export default function PersonalKalenderMobileDayAgenda({
  dayKey,
  items,
  timeLabelById,
  tenantDisplayNames,
}: Props) {
  const t = useTranslations("PersonalDashboard.calendar");
  const sorted = sortNormalizedCalendarItems(items);
  const heading = format(new Date(`${dayKey}T12:00:00.000Z`), "EEEE, d. MMMM yyyy", { locale: de });

  return (
    <section
      data-testid="personal-kalender-mobile-day-agenda"
      aria-label={t("mobileSelectedDayAgendaAria")}
      className="border-t border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-3 py-3"
    >
      <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">{heading}</h3>
      {sorted.length === 0 ? (
        <p className="text-sm text-[var(--text-2)]" data-testid="personal-kalender-mobile-empty-day">
          {t("mobileEmptyDay")}
        </p>
      ) : (
        <ul className="space-y-2" aria-label={heading}>
          {sorted.map((item) => (
            <li key={item.id} className="list-none">
              <PersonalCalendarEventBlock
                item={item}
                timeLabel={timeLabelById[item.id] ?? ""}
                tenantDisplayNames={tenantDisplayNames}
                className="py-1.5"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

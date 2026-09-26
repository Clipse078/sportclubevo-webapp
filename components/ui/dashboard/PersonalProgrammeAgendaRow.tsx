"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import { ActivitySceIcon } from "@/components/planning/ActivitySceIcon";
import { getProgrammeSourcePresentation } from "@/lib/personal-agenda/programme-source-presentation";
import { getProgrammeSourceActivitySceIconName } from "@/lib/planning/activity-sce-icon";
import { cn } from "@/lib/cn";

export type PersonalProgrammeAgendaRowProps = {
  item: PersonalProgrammeItem;
  timeLabel: string;
  highlighted?: boolean;
  className?: string;
};

/**
 * Compact programme row (time, semantic marker, title, type, venue).
 * Dashboard surfaces omit relationship context lines (DASHBOARD-07R1E).
 */
export function PersonalProgrammeAgendaRow({
  item,
  timeLabel,
  highlighted = false,
  className,
}: PersonalProgrammeAgendaRowProps) {
  const t = useTranslations("PersonalDashboard.programme");
  const statusLabel =
    item.status === "cancelled"
      ? t("statusCancelled")
      : item.status === "postponed"
        ? t("statusPostponed")
        : null;

  const markerPresentation = getProgrammeSourcePresentation(item.sourceType);
  const activitySceIconName = getProgrammeSourceActivitySceIconName(item.sourceType);

  const row = (
    <div
      className={cn(
        "grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-x-2 py-2",
        highlighted &&
          "rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--sce-primary)_8%,transparent)] px-1",
        className,
      )}
    >
      <span className="pt-0.5 text-right font-mono text-[0.8125rem] font-semibold tabular-nums text-[var(--text-2)]">
        {item.allDay ? t("allDay") : timeLabel}
      </span>
      <div className="flex min-w-0 items-start gap-2">
        <div className="flex shrink-0 items-center gap-1 self-start pt-1">
          <span
            className={cn("h-2 w-2 shrink-0 rounded-full", markerPresentation.markerAccentClass)}
            data-programme-palette={markerPresentation.paletteKey}
            data-programme-source={item.sourceType}
            aria-hidden
          />
          {activitySceIconName ? (
            <ActivitySceIcon activityKind={item.sourceType} size={16} className="shrink-0" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[0.9375rem] font-semibold leading-snug text-[var(--foreground)]">
                {item.title}
              </p>
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                {item.typeLabel}
              </p>
            </div>
            {item.deepLink ? (
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
            ) : null}
          </div>
          {item.venue ? (
            <p className="mt-0.5 truncate text-[0.6875rem] text-[var(--muted)]">{item.venue}</p>
          ) : null}
          {statusLabel ? (
            <span className="mt-1 inline-block rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-[var(--text-2)]">
              {statusLabel}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (item.deepLink) {
    return (
      <Link
        href={item.deepLink}
        className="block rounded-[var(--radius-md)] no-underline motion-safe:transition-colors motion-safe:hover:bg-[color-mix(in_srgb,var(--surface-2)_45%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        aria-label={item.ariaLabel}
      >
        {row}
      </Link>
    );
  }

  return (
    <div aria-label={item.ariaLabel} className="block">
      {row}
    </div>
  );
}

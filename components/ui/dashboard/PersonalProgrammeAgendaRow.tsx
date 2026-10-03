"use client";

import { SportingActivityDetailLink } from "@/components/sporting-activity/detail/SportingActivityDetailLink";
import { SportingActivityMetaRail } from "@/components/sporting-activity/SportingActivityMetaRail";
import { SportingActivityIdentity } from "@/components/sporting-activity/SportingActivityIdentity";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import { getProgrammeSourcePresentation } from "@/lib/personal-agenda/programme-source-presentation";
import { cn } from "@/lib/cn";
import { formatSportingActivityCompactPrimaryText } from "@/lib/sporting-activity-presentation/compact";
import {
  resolveSportingActivityTypePillVariant,
  sportingActivityTypePillClassName,
} from "@/lib/sporting-activity-presentation/activity-type-pill";
import { formatTodayEventTypeBadge } from "@/lib/dashboard/today-event-card-presentation";
import type { SportingActivityKind } from "@/lib/sporting-activity-presentation/types";
import { resolveSportingActivityCompactAgendaTypeLine } from "@/lib/sporting-activity-presentation/compact";

export type PersonalProgrammeAgendaRowProps = {
  item: PersonalProgrammeItem;
  timeLabel: string;
  endTimeLabel?: string;
  highlighted?: boolean;
  className?: string;
};

const MEIN_PROGRAMM_CONTRACT = { meinProgrammContract: true as const };

function resolveEndTimeLabel(item: PersonalProgrammeItem, endTimeLabel?: string): string | undefined {
  if (endTimeLabel?.trim()) return endTimeLabel.trim();
  const endRaw = item.endsAt ?? item.activityPresentation?.schedule.endAt;
  if (!endRaw) return undefined;
  const end = endRaw instanceof Date ? endRaw : new Date(endRaw);
  if (Number.isNaN(end.getTime())) return undefined;
  return new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit" }).format(end);
}

function resolveTypeLabelForItem(item: PersonalProgrammeItem): string | undefined {
  if (item.activityPresentation) {
    return resolveSportingActivityCompactAgendaTypeLine(
      item.activityPresentation,
      MEIN_PROGRAMM_CONTRACT,
    )?.typeLabel;
  }
  if (item.typeLabel) {
    return formatTodayEventTypeBadge(item.typeLabel);
  }
  return undefined;
}

/**
 * Compact programme row — left meta rail (type + time), canonical activity identity body.
 */
export function PersonalProgrammeAgendaRow({
  item,
  timeLabel,
  endTimeLabel,
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

  const displayTitle = item.activityPresentation
    ? formatSportingActivityCompactPrimaryText(item.activityPresentation)
    : item.title;

  const operationalSourceKinds = new Set<SportingActivityKind>([
    "TRAINING",
    "MATCH",
    "TOURNAMENT",
  ]);
  const activityKindForTypePill: SportingActivityKind | undefined =
    item.activityPresentation?.identity.activityKind ??
    (operationalSourceKinds.has(item.sourceType as SportingActivityKind)
      ? (item.sourceType as SportingActivityKind)
      : undefined);
  const typePillVariant = resolveSportingActivityTypePillVariant(activityKindForTypePill);
  const typeLabel = resolveTypeLabelForItem(item);
  const resolvedEnd = resolveEndTimeLabel(item, endTimeLabel);

  const row = (
    <div
      className={cn(
        "grid grid-cols-[4.25rem_minmax(0,1fr)] items-start gap-x-2.5 py-2",
        highlighted &&
          "rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--sce-primary)_8%,transparent)] px-1",
        className,
      )}
    >
      <SportingActivityMetaRail
        activityKind={activityKindForTypePill}
        typeLabel={typeLabel}
        startTimeLabel={item.allDay ? t("allDay") : timeLabel}
        endTimeLabel={item.allDay ? undefined : resolvedEnd}
        allDay={item.allDay}
        allDayLabel={t("allDay")}
        density="compact"
      />
      <div className="flex min-w-0 items-start gap-2">
        {!item.activityPresentation ? (
          <span
            className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", markerPresentation.markerAccentClass)}
            data-programme-palette={markerPresentation.paletteKey}
            data-programme-source={item.sourceType}
            aria-hidden
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {item.activityPresentation ? (
                <SportingActivityIdentity
                  presentation={item.activityPresentation}
                  mode="compact"
                  showTypeLine={false}
                />
              ) : (
                <>
                  <p className="line-clamp-2 text-[0.9375rem] font-semibold leading-snug text-[var(--foreground)]">
                    {displayTitle}
                  </p>
                  {typeLabel && !activityKindForTypePill ? (
                    <p className="mt-0.5">
                      <span
                        className={
                          typePillVariant
                            ? sportingActivityTypePillClassName(typePillVariant)
                            : "inline-block text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[var(--muted)]"
                        }
                        data-activity-type-pill={typePillVariant ?? undefined}
                      >
                        {typeLabel}
                      </span>
                    </p>
                  ) : null}
                </>
              )}
            </div>
            {item.deepLink ? (
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
            ) : null}
          </div>
          {statusLabel ? (
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              <span className="inline-block rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-[var(--text-2)]">
                {statusLabel}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (item.deepLink) {
    return (
      <SportingActivityDetailLink
        href={item.deepLink}
        className="block rounded-[var(--radius-md)] no-underline motion-safe:transition-colors motion-safe:hover:bg-[color-mix(in_srgb,var(--surface-2)_45%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        aria-label={item.ariaLabel}
      >
        {row}
      </SportingActivityDetailLink>
    );
  }

  return (
    <div aria-label={item.ariaLabel} className="block">
      {row}
    </div>
  );
}

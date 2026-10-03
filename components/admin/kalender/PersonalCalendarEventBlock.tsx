"use client";

import { SportingActivityDetailLink } from "@/components/sporting-activity/detail/SportingActivityDetailLink";
import { useTranslations } from "next-intl";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { ActivitySceIcon } from "@/components/planning/ActivitySceIcon";
import { buildCalendarEventBlockLines } from "@/lib/personal-agenda/calendar-event-block-lines";
import { getCalendarItemPresentation } from "@/lib/personal-agenda/calendar-item-presentation";
import type { NormalizedCalendarItem } from "@/lib/personal-agenda/normalized-calendar-item-types";
import { cn } from "@/lib/cn";

export type PersonalCalendarEventBlockProps = {
  item: NormalizedCalendarItem;
  timeLabel: string;
  className?: string;
  tenantDisplayNames?: string[];
};

export default function PersonalCalendarEventBlock({
  item,
  timeLabel,
  className,
  tenantDisplayNames,
}: PersonalCalendarEventBlockProps) {
  const tCalendar = useTranslations("PersonalDashboard.calendar");
  const tProgramme = useTranslations("PersonalDashboard.programme");
  const presentation = getCalendarItemPresentation(item.semanticType);
  const lines = buildCalendarEventBlockLines(item, { tenantDisplayNames });

  const statusLabel =
    item.status === "cancelled"
      ? tProgramme("statusCancelled")
      : item.status === "postponed"
        ? tProgramme("statusPostponed")
        : null;

  const muted = item.status === "cancelled" || item.status === "postponed";
  const timeDisplay = item.allDay
    ? lines.useDueTimePrefix
      ? tCalendar("dueShort")
      : tProgramme("allDay")
    : timeLabel || "—";

  const content = (
    <div
      className={cn(
        "flex min-w-0 gap-0.5 rounded-md border px-1.5 py-1 text-left",
        presentation.chipTintClass,
        presentation.chipBorderClass,
        muted && "opacity-70",
        className,
      )}
      data-calendar-semantic={item.semanticType}
      data-testid={`personal-calendar-event-${item.id}`}
    >
      <span
        className={cn("mt-1 h-2 w-0.5 shrink-0 rounded-full", presentation.markerAccentClass)}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-1">
          <span className="shrink-0 font-mono text-[0.625rem] font-semibold tabular-nums text-[var(--text-2)]">
            {timeDisplay}
          </span>
          <span
            className={cn(
              "min-w-0 truncate text-[0.6875rem] font-semibold leading-normal",
              presentation.chipTextClass,
              muted && "line-through decoration-[var(--muted)]",
            )}
          >
            {lines.primary}
          </span>
        </div>
        {lines.secondary ? (
          <p className="mt-0.5 truncate text-[0.625rem] leading-normal text-[var(--text-2)]">
            {lines.secondary}
          </p>
        ) : null}
        {statusLabel ? (
          <p className="text-[0.5625rem] font-medium uppercase tracking-wide text-[var(--muted)]">
            {statusLabel}
          </p>
        ) : null}
      </div>
      <span className="mt-0.5 shrink-0 text-[var(--muted)]" aria-hidden>
        {item.semanticType === "TASK" || item.iconKey === "tasks" ? (
          <ProductDomainSceIcon name="tasks" size={12} className="h-2.5 w-2.5" />
        ) : item.iconKey === "event" ? (
          <ProductDomainSceIcon name="event" size={12} className="h-2.5 w-2.5" />
        ) : (
          <ActivitySceIcon activityKind={item.semanticType} size={12} className="h-2.5 w-2.5" />
        )}
      </span>
    </div>
  );

  if (item.deepLink) {
    return (
      <SportingActivityDetailLink
        href={item.deepLink}
        className="block min-w-0 no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--primary)]"
        aria-label={item.ariaLabel || `${lines.primary}, ${timeDisplay}`}
      >
        {content}
      </SportingActivityDetailLink>
    );
  }

  return (
    <div aria-label={item.ariaLabel || `${lines.primary}, ${timeDisplay}`} role="group">
      {content}
    </div>
  );
}

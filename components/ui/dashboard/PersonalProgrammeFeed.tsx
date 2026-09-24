"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { CalendarDays } from "lucide-react";
import type { ProgrammeFeedGroup } from "@/lib/personal-agenda/programme-feed-groups";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import { cn } from "@/lib/cn";
import { getProgrammeSourcePresentation } from "@/lib/personal-agenda/programme-source-presentation";
import { DashboardEmptyState } from "./DashboardEmptyState";

export type PersonalProgrammeFeedProps = {
  groups: ProgrammeFeedGroup[];
  supported: boolean;
  highlightedDayKey?: string | null;
  timeLabelById: Record<string, string>;
  className?: string;
};

function ProgrammeTimelineRow({
  item,
  timeLabel,
  highlighted,
}: {
  item: PersonalProgrammeItem;
  timeLabel: string;
  highlighted: boolean;
}) {
  const t = useTranslations("PersonalDashboard.programme");
  const statusLabel =
    item.status === "cancelled"
      ? t("statusCancelled")
      : item.status === "postponed"
        ? t("statusPostponed")
        : null;

  const metaLine = [item.contextLabel, item.subtitle].filter(Boolean).join(" · ");
  const markerPresentation = getProgrammeSourcePresentation(item.sourceType);

  const row = (
    <div
      className={cn(
        "grid grid-cols-[3.5rem_1rem_minmax(0,1fr)] items-start gap-x-2 py-2",
        highlighted && "rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--sce-primary)_8%,transparent)] px-1",
      )}
    >
      <span className="pt-0.5 text-right font-mono text-[0.8125rem] font-semibold tabular-nums text-[var(--text-2)]">
        {item.allDay ? t("allDay") : timeLabel}
      </span>
      <span
        className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", markerPresentation.markerAccentClass)}
        data-programme-palette={markerPresentation.paletteKey}
        data-programme-source={item.sourceType}
        aria-hidden
      />
      <div className="min-w-0">
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
        {metaLine ? (
          <p className="mt-0.5 truncate text-[0.75rem] text-[var(--text-2)]">{metaLine}</p>
        ) : null}
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
  );

  if (item.deepLink) {
    return (
      <li key={item.id} data-programme-day-row={highlighted ? "highlighted" : undefined}>
        <Link
          href={item.deepLink}
          className="block rounded-[var(--radius-md)] no-underline motion-safe:transition-colors motion-safe:hover:bg-[color-mix(in_srgb,var(--surface-2)_45%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          aria-label={item.ariaLabel}
        >
          {row}
        </Link>
      </li>
    );
  }

  return (
    <li key={item.id} className="list-none" aria-label={item.ariaLabel}>
      {row}
    </li>
  );
}

export function PersonalProgrammeFeed({
  groups,
  supported,
  highlightedDayKey,
  timeLabelById,
  className,
}: PersonalProgrammeFeedProps) {
  const t = useTranslations("PersonalDashboard.programme");

  return (
    <section
      aria-labelledby="personal-programme-heading"
      className={cn("min-w-0", className)}
      data-testid="personal-programme-feed"
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-2)] text-[var(--sce-primary)]"
          aria-hidden
        >
          <CalendarDays className="h-4 w-4" />
        </span>
        <h2 id="personal-programme-heading" className="text-sm font-semibold tracking-tight">
          {t("title")}
        </h2>
      </div>

      {!supported ? (
        <p className="text-sm text-[var(--text-2)]">{t("unsupported")}</p>
      ) : groups.length === 0 ? (
        <DashboardEmptyState
          icon={<CalendarDays className="h-5 w-5" />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          variant="compact"
        />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const label =
              group.labelKind === "today"
                ? t("groupToday")
                : group.labelKind === "tomorrow"
                  ? t("groupTomorrow")
                  : group.dateLabel ?? group.dayKey;

            const highlighted = highlightedDayKey === group.dayKey;

            return (
              <div
                key={group.dayKey}
                data-day-key={group.dayKey}
                className={cn("scroll-mt-28", highlighted && "rounded-[var(--radius-md)] ring-1 ring-[color-mix(in_srgb,var(--sce-primary)_30%,transparent)]")}
              >
                <p className="mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                  {label}
                </p>
                <ol className="divide-y divide-[color-mix(in_srgb,var(--border)_70%,transparent)] border-l border-[color-mix(in_srgb,var(--border)_55%,transparent)] pl-2">
                  {group.items.map((item) => (
                    <ProgrammeTimelineRow
                      key={item.id}
                      item={item}
                      timeLabel={timeLabelById[item.id] ?? "—"}
                      highlighted={highlighted}
                    />
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CalendarDays } from "lucide-react";
import type { ProgrammeFeedGroup } from "@/lib/personal-agenda/programme-feed-groups";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import { cn } from "@/lib/cn";
import { DashboardEmptyState } from "./DashboardEmptyState";

export type PersonalProgrammeFeedProps = {
  groups: ProgrammeFeedGroup[];
  supported: boolean;
  highlightedDayKey?: string | null;
  timeLabelById: Record<string, string>;
  className?: string;
};

function ProgrammeRow({
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

  const row = (
    <>
      <span className="w-[3.25rem] shrink-0 text-right font-mono text-[0.8125rem] font-semibold tabular-nums text-[var(--text-2)]">
        {item.allDay ? t("allDay") : timeLabel}
      </span>
      <span className="w-[4.75rem] shrink-0 truncate text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
        {item.typeLabel}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.8125rem] font-medium text-[var(--foreground)]">
          {item.title}
        </span>
        {(item.contextLabel || item.venue) && (
          <span className="mt-0.5 block truncate text-[0.6875rem] text-[var(--text-2)]">
            {[item.contextLabel, item.venue].filter(Boolean).join(" · ")}
          </span>
        )}
        {statusLabel ? (
          <span className="mt-0.5 inline-block rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-[var(--text-2)]">
            {statusLabel}
          </span>
        ) : null}
      </span>
    </>
  );

  const className = cn(
    "grid grid-cols-[3.25rem_4.75rem_minmax(0,1fr)] items-start gap-x-2 rounded-[var(--radius-md)] px-1 py-1.5 motion-safe:transition-colors",
    highlighted && "bg-[color-mix(in_srgb,var(--sce-primary)_10%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--sce-primary)_35%,transparent)]",
    item.deepLink &&
      "hover:bg-[color-mix(in_srgb,var(--surface-2)_55%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
  );

  if (item.deepLink) {
    return (
      <li key={item.id} data-programme-day-row={highlighted ? "highlighted" : undefined}>
        <Link href={item.deepLink} className={cn(className, "no-underline")} aria-label={item.ariaLabel}>
          {row}
        </Link>
      </li>
    );
  }

  return (
    <li key={item.id} className={className} aria-label={item.ariaLabel}>
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
        <div className="space-y-3">
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
                className={cn(highlighted && "scroll-mt-24")}
              >
                <p className="mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
                  {label}
                </p>
                <ol className="space-y-0">
                  {group.items.map((item) => (
                    <ProgrammeRow
                      key={item.id}
                      item={item}
                      timeLabel={timeLabelById[item.id] ?? "—"}
                      highlighted={highlightedDayKey === group.dayKey}
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

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CalendarDays } from "lucide-react";
import type { ProgrammeFeedGroup } from "@/lib/personal-agenda/programme-feed-groups";
import { cn } from "@/lib/cn";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { PersonalProgrammeAgendaRow } from "./PersonalProgrammeAgendaRow";

export type PersonalProgrammeFeedProps = {
  groups: ProgrammeFeedGroup[];
  supported: boolean;
  highlightedDayKey?: string | null;
  timeLabelById: Record<string, string>;
  viewAllHref?: string;
  /** When true, header/actions are omitted (cockpit card provides them). */
  embedded?: boolean;
  className?: string;
};

export function PersonalProgrammeFeed({
  groups,
  supported,
  highlightedDayKey,
  timeLabelById,
  viewAllHref,
  embedded = false,
  className,
}: PersonalProgrammeFeedProps) {
  const t = useTranslations("PersonalDashboard.programme");

  const body = (
    <>
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
                    <li
                      key={item.id}
                      className="list-none"
                      data-programme-day-row={highlighted ? "highlighted" : undefined}
                    >
                      <PersonalProgrammeAgendaRow
                        item={item}
                        timeLabel={timeLabelById[item.id] ?? "—"}
                        highlighted={highlighted}
                      />
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className={cn("min-w-0", className)} data-testid="personal-programme-feed">
        {body}
      </div>
    );
  }

  return (
    <section
      aria-labelledby="personal-programme-heading"
      className={cn("min-w-0", className)}
      data-testid="personal-programme-feed"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
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
        {viewAllHref && supported ? (
          <Link
            href={viewAllHref}
            className="sce-link-primary shrink-0 text-[0.8125rem] font-medium"
            data-testid="personal-programme-view-all"
          >
            {t("viewAll")} →
          </Link>
        ) : null}
      </div>
      {body}
    </section>
  );
}

import Link from "next/link";
import { cn } from "@/lib/cn";
import type { TrainingSessionRowViewModel } from "@/lib/training/view-model";
import type { TrainingActionFilter } from "@/lib/training/view-model";
import type { TrainingMonthWindow } from "@/lib/training/date-range";
import { monthEntryTone } from "./training-center-ui";

const WEEKDAY_HEADERS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MAX_VISIBLE_PER_DAY = 3;

type Props = {
  monthWindow: TrainingMonthWindow;
  rowsByDate: Map<string, TrainingSessionRowViewModel[]>;
  actionFilter: TrainingActionFilter;
  basePath?: string;
  timezone?: string;
};

function dayHref(basePath: string, date: string, actionFilter: TrainingActionFilter): string {
  const search = new URLSearchParams();
  search.set("tab", "kalender");
  search.set("view", "day");
  search.set("day", date);
  search.set("filter", actionFilter.toLowerCase());
  return `${basePath}?${search.toString()}`;
}

function formatTime(startAt: string, timezone: string): string {
  return new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(
    new Date(startAt),
  );
}

export default function TrainingMonthCalendar({
  monthWindow,
  rowsByDate,
  actionFilter,
  basePath = "/dashboard/training",
  timezone = "Europe/Zurich",
}: Props) {
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());

  return (
    <div
      className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
      data-testid="training-month-calendar"
    >
      <div className="grid grid-cols-7 border-b border-[var(--border)]">
        {WEEKDAY_HEADERS.map((label, index) => (
          <div
            key={label}
            className={cn(
              "px-2 py-2 text-center text-[0.68rem] font-medium text-[var(--muted)]",
              index >= 5 && "bg-[var(--surface-2)]/30",
            )}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {monthWindow.weeks.flat().map((cell) => {
          const rows = rowsByDate.get(cell.date) ?? [];
          const visible = rows.slice(0, MAX_VISIBLE_PER_DAY);
          const overflow = rows.length - visible.length;
          const dayNumber = Number(cell.date.slice(-2));
          const isToday = cell.date === todayKey;
          const dayOfWeek = new Date(`${cell.date}T12:00:00.000Z`).getUTCDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          return (
            <Link
              key={cell.date}
              href={dayHref(basePath, cell.date, actionFilter)}
              className={cn(
                "flex min-h-[6.75rem] flex-col gap-1 border-b border-r border-[var(--border)]/80 p-2 transition hover:bg-[var(--surface-2)]/60",
                !cell.inMonth && "bg-[var(--surface-2)]/25",
                isWeekend && cell.inMonth && "bg-[var(--surface-2)]/20",
              )}
              data-testid={`training-month-day-${cell.date}`}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[0.72rem] font-semibold",
                  isToday
                    ? "bg-[var(--sce-primary)] text-white ring-2 ring-[color-mix(in_srgb,var(--sce-primary)_35%,transparent)]"
                    : cell.inMonth
                      ? "text-[var(--foreground)]"
                      : "text-[var(--muted)]",
                )}
              >
                {dayNumber}
              </span>

              <div className="flex flex-col gap-0.5">
                {visible.map((row) => (
                  <span
                    key={row.session.id}
                    className={cn(
                      "truncate rounded-md border px-1.5 py-0.5 text-[0.62rem] font-medium transition",
                      monthEntryTone(row.assessment.status),
                    )}
                    title={`${row.session.teamName} · ${formatTime(row.session.startAt, timezone)}`}
                  >
                    <span className="tabular-nums opacity-80">{formatTime(row.session.startAt, timezone)}</span>{" "}
                    {row.session.teamName}
                  </span>
                ))}
                {overflow > 0 && (
                  <span className="text-[0.62rem] font-medium text-[var(--muted)]">+{overflow} mehr</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

import Link from "next/link";
import type { TaskSeriesManagementRow } from "@/lib/tasks/management-service";
import { presentTaskDeadline } from "@/lib/tasks/management-deadline";
import { TASK_SERIES_STATUS_LABELS } from "@/lib/tasks/management-labels";
import { Repeat2 } from "lucide-react";

type Props = {
  rows: TaskSeriesManagementRow[];
  locale: string;
  timeZone: string;
  canManage?: boolean;
};

export default function AufgabenSeriesList({ rows, locale, timeZone, canManage = false }: Props) {
  return (
    <div data-testid="aufgaben-series-list">
      <div className="hidden border-b border-[var(--border)]/60 bg-[var(--surface-2)]/25 px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)] md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(5rem,0.4fr)_minmax(6rem,0.5fr)_minmax(5rem,0.45fr)] md:gap-3">
        <span>Serie</span>
        <span>Rhythmus</span>
        <span>Status</span>
        <span>Nächster Termin</span>
        <span>Offen</span>
      </div>

      {rows.map((row) => {
        const nextLabel = row.nextDueAt
          ? presentTaskDeadline({
              dueAt: row.nextDueAt,
              status: "OPEN",
              locale,
              timeZone,
            }).label
          : "—";

        return (
          <article
            key={row.id}
            className="grid grid-cols-1 gap-2 border-b border-[var(--border)]/70 px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(5rem,0.4fr)_minmax(6rem,0.5fr)_minmax(5rem,0.45fr)] md:items-center md:gap-3"
            data-testid={`aufgaben-series-${row.id}`}
          >
            <div className="min-w-0">
              <Link
                href={`/dashboard/aufgaben/serien/${row.id}`}
                className="truncate text-[0.9375rem] font-semibold text-[var(--foreground)] hover:text-[var(--sce-primary)]"
              >
                {row.title}
              </Link>
              {row.assigneeNames.length > 0 ? (
                <p className="truncate text-[0.75rem] text-[var(--muted)]">
                  {row.assigneeNames.join(", ")}
                </p>
              ) : null}
            </div>
            <p className="inline-flex items-center gap-1 text-[0.8125rem] text-[var(--text-2)]">
              <Repeat2 className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" aria-hidden="true" />
              {row.recurrenceLabel}
            </p>
            <span className="text-[0.8125rem] text-[var(--text-2)]">
              {TASK_SERIES_STATUS_LABELS[row.status as keyof typeof TASK_SERIES_STATUS_LABELS] ??
                row.status}
            </span>
            <span className="text-[0.8125rem] tabular-nums text-[var(--text-2)]">{nextLabel}</span>
            <span className="text-[0.8125rem] tabular-nums text-[var(--text-2)]">
              {row.openOccurrenceCount}
            </span>
          </article>
        );
      })}

      {canManage ? (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <Link
            href="/dashboard/aufgaben/serien/neu"
            className="text-sm font-medium text-[var(--sce-primary)] hover:underline"
            data-testid="aufgaben-series-create-link"
          >
            Wiederkehrende Aufgabe erstellen
          </Link>
        </div>
      ) : null}
    </div>
  );
}

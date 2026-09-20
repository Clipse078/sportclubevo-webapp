import Link from "next/link";
import { CalendarDays, ListChecks } from "lucide-react";
import {
  groupPersonalAgendaItems,
  type PersonalAgendaItem,
} from "@/lib/dashboard/personal-cockpit";
import { DashboardSection } from "./DashboardSection";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { cn } from "@/lib/cn";

export type MeineAgendaWidgetProps = {
  items: PersonalAgendaItem[];
  supported: boolean;
};

function AgendaGroup({
  label,
  items,
}: {
  label: string;
  items: PersonalAgendaItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
        {label}
      </p>
      <ol className="space-y-0">
        {items.map((item) => {
          const isTask = item.sourceType === "TASK";
          const row = (
            <>
              <span
                className={cn(
                  "w-[3.25rem] shrink-0 text-right font-mono text-[0.8125rem] font-semibold tabular-nums",
                  item.isOverdue && "text-[var(--destructive)]",
                )}
              >
                {item.timeLabel}
              </span>
              <span className="flex w-[4.5rem] shrink-0 items-center gap-0.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[var(--text-2)]">
                {isTask ? (
                  <ListChecks className="h-3 w-3 shrink-0" aria-hidden />
                ) : null}
                {item.typeLabel}
              </span>
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-[var(--foreground)]">
                {isTask ? `☑ ${item.title}` : item.title}
              </span>
            </>
          );

          const className = cn(
            "grid grid-cols-[3.25rem_4.5rem_minmax(0,1fr)] items-center gap-x-2 rounded-[var(--radius-md)] px-0.5 py-1.5",
            item.href &&
              "motion-safe:transition-colors motion-safe:hover:bg-[color-mix(in_srgb,var(--surface-2)_55%,transparent)]",
          );

          if (item.href) {
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={cn(className, "no-underline")}
                  aria-label={item.ariaLabel}
                >
                  {row}
                </Link>
              </li>
            );
          }

          return (
            <li key={item.key} className={className} aria-label={item.ariaLabel}>
              {row}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function MeineAgendaWidget({ items, supported }: MeineAgendaWidgetProps) {
  const grouped = groupPersonalAgendaItems(items);

  return (
    <DashboardSection
      title="Meine Agenda"
      icon={<CalendarDays className="h-4 w-4" />}
      iconAccent="primary"
      variant="card"
      bodyClassName="px-4 py-1.5 sm:px-5 sm:py-2"
      actions={
        <Link href="/dashboard/kalender" className="sce-link-primary text-[0.8125rem] font-medium">
          Kalender öffnen →
        </Link>
      }
    >
      {!supported ? (
        <DashboardEmptyState
          icon={<CalendarDays className="h-5 w-5" />}
          title="Keine persönliche Zuordnung"
          description="Verknüpfe dein Benutzerkonto mit einer Person und Teamfunktion, oder nutze Aufgaben mit Fälligkeit."
          variant="compact"
        />
      ) : items.length === 0 ? (
        <DashboardEmptyState
          icon={<CalendarDays className="h-4 w-4" />}
          title="Keine anstehenden Termine oder Aufgaben"
          variant="compact"
          compactLayout="inline"
        />
      ) : (
        <div className="space-y-3">
          <AgendaGroup label="Überfällig" items={grouped.overdue} />
          <AgendaGroup label="Heute" items={grouped.today} />
          <AgendaGroup label="Morgen" items={grouped.tomorrow} />
        </div>
      )}
    </DashboardSection>
  );
}

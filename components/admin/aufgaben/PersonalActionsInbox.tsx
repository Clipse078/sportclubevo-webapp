import Link from "next/link";
import { cn } from "@/lib/cn";
import PlanningManagementPageHeader from "@/components/admin/planning/PlanningManagementPageHeader";
import type { PersonalActionListItem } from "@/lib/personal-actions/presentation";
import type { PersonalInboxFilterParam } from "@/lib/personal-actions/aufgaben-scope";
import { buildPersonalInboxFilterHref } from "@/lib/personal-actions/aufgaben-scope";
import PersonalActionRow from "./PersonalActionRow";
import AufgabenScopeToggle from "./AufgabenScopeToggle";
import type { AufgabenBereich } from "@/lib/personal-actions/aufgaben-scope";

type Props = {
  items: PersonalActionListItem[];
  locale: string;
  timeZone: string;
  showManagementScope: boolean;
  bereich: AufgabenBereich;
  filter: PersonalInboxFilterParam;
  showSourceFilters: boolean;
  basePath?: string;
};

const FILTER_LABELS: Record<PersonalInboxFilterParam, string> = {
  all: "Alle",
  tasks: "Aufgaben",
  attendance: "Teilnahmen",
};

export default function PersonalActionsInbox({
  items,
  showManagementScope,
  bereich,
  filter,
  showSourceFilters,
  basePath = "/dashboard/aufgaben",
}: Props) {
  const hasItems = items.length > 0;

  return (
    <div className="space-y-4" data-testid="personal-actions-inbox">
      <PlanningManagementPageHeader
        breadcrumbLeaf="Aufgaben"
        title="Aufgaben"
        subtitle="Was du persönlich erledigen oder bestätigen musst."
        subtitleTestId="aufgaben-personal-subtitle"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AufgabenScopeToggle
          active={bereich}
          showManagement={showManagementScope}
          basePath={basePath}
        />
        {showSourceFilters ? (
          <div
            className="flex flex-wrap gap-1"
            role="tablist"
            aria-label="Persönliche Aufgaben filtern"
            data-testid="personal-inbox-filters"
          >
            {(Object.keys(FILTER_LABELS) as PersonalInboxFilterParam[]).map((key) => {
              const active = filter === key;
              return (
                <Link
                  key={key}
                  href={buildPersonalInboxFilterHref(key, basePath)}
                  role="tab"
                  aria-selected={active}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[0.8125rem] font-medium transition-colors",
                    active
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "text-[var(--text-2)] hover:bg-[var(--surface-2)]",
                  )}
                >
                  {FILTER_LABELS[key]}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>

      <section
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80"
        aria-label="Meine Aufgaben"
      >
        {hasItems ? (
          <ul className="divide-y divide-[var(--border)]" role="list">
            {items.map((item) => (
              <li key={item.id}>
                <PersonalActionRow item={item} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-10 text-center sm:px-6" data-testid="personal-inbox-empty">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Alles erledigt</h2>
            <p className="mt-1 text-sm text-[var(--text-2)]">
              Aktuell gibt es keine offenen Aufgaben oder Rückmeldungen.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

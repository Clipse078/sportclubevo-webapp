import Link from "next/link";
import { cn } from "@/lib/cn";
import PlanningManagementPageHeader from "@/components/admin/planning/PlanningManagementPageHeader";
import {
  formatPersonalInboxRangeSummary,
  type PersonalActionListItem,
} from "@/lib/personal-actions/presentation";
import type { PersonalInboxFilterParam } from "@/lib/personal-actions/aufgaben-scope";
import { buildPersonalInboxFilterHref } from "@/lib/personal-actions/aufgaben-scope";
import PersonalActionRow from "./PersonalActionRow";
import AufgabenScopeToggle from "./AufgabenScopeToggle";
import MeineAufgabenQuickCreateDialog, {
  type QuickCreateCurrentUser,
} from "./MeineAufgabenQuickCreateDialog";
import type { AufgabenBereich } from "@/lib/personal-actions/aufgaben-scope";

type Props = {
  items: PersonalActionListItem[];
  locale: string;
  timeZone: string;
  showManagementScope: boolean;
  showRequirementScope?: boolean;
  bereich: AufgabenBereich;
  filter: PersonalInboxFilterParam;
  showSourceFilters: boolean;
  /** Full actionable count (independent of inbox list limit). */
  totalActionableCount?: number | null;
  basePath?: string;
  quickCreate?: {
    canCreateSelf: boolean;
    canAssignOthers: boolean;
    canOpenFullCreate: boolean;
    currentUser: QuickCreateCurrentUser;
    timeZone: string;
  } | null;
};

const FILTER_LABELS: Record<PersonalInboxFilterParam, string> = {
  all: "Alle",
  tasks: "Aufgaben",
  attendance: "Teilnahmen",
  requirements: "Anforderungen",
};

export default function PersonalActionsInbox({
  items,
  showManagementScope,
  showRequirementScope = false,
  bereich,
  filter,
  showSourceFilters,
  totalActionableCount = null,
  basePath = "/dashboard/aufgaben",
  quickCreate = null,
}: Props) {
  const hasItems = items.length > 0;
  const rangeSummary =
    totalActionableCount != null
      ? formatPersonalInboxRangeSummary(items.length, totalActionableCount)
      : null;

  return (
    <div className="space-y-4" data-testid="personal-actions-inbox">
      <PlanningManagementPageHeader
        breadcrumbLeaf="Aufgaben"
        title="Aufgaben"
        subtitle="Was du persönlich erledigen oder bestätigen musst."
        subtitleTestId="aufgaben-personal-subtitle"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <AufgabenScopeToggle
            active={bereich}
            showManagement={showManagementScope}
            showRequirements={showRequirementScope}
            basePath={basePath}
          />
          {quickCreate?.canCreateSelf ? (
            <MeineAufgabenQuickCreateDialog
              canCreateSelf={quickCreate.canCreateSelf}
              canAssignOthers={quickCreate.canAssignOthers}
              currentUser={quickCreate.currentUser}
              timeZone={quickCreate.timeZone}
              canOpenFullCreate={quickCreate.canOpenFullCreate}
            />
          ) : null}
        </div>
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
          <>
            <ul className="divide-y divide-[var(--border)]" role="list">
              {items.map((item) => (
                <li key={item.id}>
                  <PersonalActionRow item={item} />
                </li>
              ))}
            </ul>
            {rangeSummary ? (
              <p
                className="border-t border-[var(--border)] px-4 py-2.5 text-center text-[0.8125rem] text-[var(--text-2)] sm:px-6"
                data-testid="personal-inbox-range-summary"
              >
                {rangeSummary}
              </p>
            ) : null}
          </>
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

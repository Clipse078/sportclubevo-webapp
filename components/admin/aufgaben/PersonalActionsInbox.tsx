import {
  formatPersonalInboxRangeSummary,
  type PersonalActionListItem,
} from "@/lib/personal-actions/presentation";
import type { PersonalInboxFilterParam } from "@/lib/personal-actions/aufgaben-scope";
import PersonalActionRow from "./PersonalActionRow";
import PersonalInboxFilterNav from "./PersonalInboxFilterNav";
import AufgabenPersonalActionTypeLegend from "./AufgabenPersonalActionTypeLegend";

type Props = {
  items: PersonalActionListItem[];
  locale: string;
  timeZone: string;
  filter: PersonalInboxFilterParam;
  /** When true, show secondary type filters (Alle / Aufgaben / …). Legend is always visible. */
  showSourceFilters: boolean;
  /** Full actionable count (independent of inbox list limit). */
  totalActionableCount?: number | null;
  basePath?: string;
};

export default function PersonalActionsInbox({
  items,
  filter,
  showSourceFilters,
  totalActionableCount = null,
  basePath = "/dashboard/aufgaben",
}: Props) {
  const hasItems = items.length > 0;
  const rangeSummary =
    totalActionableCount != null
      ? formatPersonalInboxRangeSummary(items.length, totalActionableCount)
      : null;

  return (
    <div className="space-y-4" data-testid="personal-actions-inbox">
      <AufgabenPersonalActionTypeLegend />
      {showSourceFilters ? (
        <div className="flex justify-end">
          <PersonalInboxFilterNav filter={filter} basePath={basePath} />
        </div>
      ) : null}

      <section
        className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
        aria-label="Meine Aufgaben"
        data-testid="personal-inbox-surface"
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

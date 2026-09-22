import Link from "next/link";
import { Plus } from "lucide-react";
import PlanningManagementPageHeader from "@/components/admin/planning/PlanningManagementPageHeader";
import type {
  RequirementManagementListItem,
  RequirementManagementSummary,
} from "@/lib/requirements/management-service";
import type { RequirementManagementQueryState } from "@/lib/requirements/management-navigation";
import {
  buildRequirementManagementHref,
  requirementCreateHref,
  requirementDetailHref,
} from "@/lib/requirements/management-navigation";
import {
  formatRequirementOpenLabel,
  formatRequirementProgressLabel,
  REQUIREMENT_STATUS_LABELS,
} from "@/lib/requirements/presentation";
import AufgabenScopeToggle from "./AufgabenScopeToggle";
import RequirementsManagementFilters from "./RequirementsManagementFilters";

type Props = {
  locale: string;
  timeZone: string;
  query: RequirementManagementQueryState;
  summary: RequirementManagementSummary;
  items: RequirementManagementListItem[];
  totalCount: number;
  page: number;
  pageCount: number;
  canCreate: boolean;
  showTaskManagementScope: boolean;
  loadError?: boolean;
};

function formatDue(iso: string | null, locale: string, timeZone: string): string {
  if (!iso) return "Kein Termin";
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export default function RequirementsManagementWorkspace({
  locale,
  timeZone,
  query,
  summary,
  items,
  totalCount,
  page,
  pageCount,
  canCreate,
  showTaskManagementScope,
  loadError = false,
}: Props) {
  const basePath = "/dashboard/aufgaben";

  return (
    <div className="space-y-4" data-testid="requirements-management-workspace">
      <PlanningManagementPageHeader
        breadcrumbLeaf="Aufgaben"
        title="Anforderungen"
        subtitle="Bestätigungen oder Handlungen, die mehrere Personen individuell erledigen müssen."
        subtitleTestId="requirements-management-subtitle"
        actions={
          canCreate ? (
            <Link
              href={requirementCreateHref()}
              className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
              data-testid="requirements-create-open"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Anforderung
            </Link>
          ) : null
        }
      />

      <AufgabenScopeToggle
        active="anforderungen"
        showManagement={showTaskManagementScope}
        showRequirements
        basePath={basePath}
      />

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4" data-testid="requirements-kpi-row">
        {[
          { label: "Aktiv", value: summary.active },
          { label: "Offen", value: summary.openRecipients },
          { label: "Überfällig", value: summary.overdue },
          { label: "Erledigt", value: summary.completed },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-[var(--border)]/80 px-3 py-2">
            <dt className="text-xs text-[var(--muted)]">{kpi.label}</dt>
            <dd className="text-lg font-semibold tabular-nums text-[var(--foreground)]">{kpi.value}</dd>
          </div>
        ))}
      </dl>

      <RequirementsManagementFilters query={query} basePath={basePath} />

      {loadError ? (
        <p className="text-sm text-red-600" role="alert">
          Anforderungen konnten nicht geladen werden.
        </p>
      ) : null}

      {!loadError && items.length === 0 ? (
        <div
          className="rounded-lg border border-dashed border-[var(--border)] px-4 py-10 text-center"
          data-testid="requirements-empty"
        >
          <p className="text-sm font-medium text-[var(--foreground)]">Noch keine Anforderungen</p>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            Erstelle eine Anforderung, wenn mehrere Personen etwas individuell bestätigen oder erledigen
            sollen.
          </p>
          {canCreate ? (
            <Link href={requirementCreateHref()} className="fca-button-primary mt-4 inline-flex text-sm">
              + Anforderung
            </Link>
          ) : null}
        </div>
      ) : null}

      {!loadError && items.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <table className="w-full text-left text-sm" data-testid="requirements-list">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]/40 text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Titel</th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">Status</th>
                <th className="hidden px-3 py-2 font-medium lg:table-cell">Fortschritt</th>
                <th className="px-3 py-2 font-medium">Fälligkeit</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const req = item.requirement;
                const progress = formatRequirementProgressLabel(
                  item.aggregate,
                  req.draftAudiencePersonIds.length,
                  req.status,
                );
                const openLabel = formatRequirementOpenLabel(item.aggregate);
                return (
                  <tr
                    key={req.id}
                    className="border-b border-[var(--border)]/70 last:border-0 hover:bg-[var(--surface-2)]/30"
                  >
                    <td className="px-3 py-2.5">
                      <Link
                        href={requirementDetailHref(req.id)}
                        className="font-medium text-[var(--foreground)] hover:text-[var(--link)]"
                        data-testid={`requirement-row-${req.id}`}
                      >
                        {req.title}
                      </Link>
                      {item.creatorLabel ? (
                        <p className="mt-0.5 text-xs text-[var(--muted)]">{item.creatorLabel}</p>
                      ) : null}
                    </td>
                    <td className="hidden px-3 py-2.5 md:table-cell">
                      <span className="inline-flex rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-2)]">
                        {REQUIREMENT_STATUS_LABELS[req.status]}
                      </span>
                      {item.isOverdue ? (
                        <span className="ml-2 text-xs text-amber-700">Überfällig</span>
                      ) : null}
                    </td>
                    <td className="hidden px-3 py-2.5 lg:table-cell">
                      <div className="space-y-1">
                        <p className="text-xs text-[var(--text-2)]">{progress}</p>
                        {openLabel ? <p className="text-xs text-[var(--muted)]">{openLabel}</p> : null}
                        {item.aggregate && req.status !== "DRAFT" ? (
                          <div
                            className="h-1.5 w-full max-w-[8rem] overflow-hidden rounded-full bg-[var(--surface-2)]"
                            role="progressbar"
                            aria-valuenow={item.aggregate.resolvedPercent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`Fortschritt ${item.aggregate.resolvedPercent} Prozent`}
                          >
                            <div
                              className="h-full rounded-full bg-[var(--accent)]"
                              style={{ width: `${item.aggregate.resolvedPercent}%` }}
                            />
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[var(--text-2)]">
                      Fällig {formatDue(req.dueAt, locale, timeZone)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {pageCount > 1 ? (
        <nav className="flex items-center justify-between text-sm" aria-label="Seiten">
          <span className="text-[var(--muted)]">
            {totalCount} Anforderung{totalCount === 1 ? "" : "en"}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={buildRequirementManagementHref(basePath, query, { page: page - 1 })}
                className="rounded border border-[var(--border)] px-2 py-1 hover:bg-[var(--surface-2)]"
              >
                Zurück
              </Link>
            ) : null}
            {page < pageCount ? (
              <Link
                href={buildRequirementManagementHref(basePath, query, { page: page + 1 })}
                className="rounded border border-[var(--border)] px-2 py-1 hover:bg-[var(--surface-2)]"
              >
                Weiter
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}

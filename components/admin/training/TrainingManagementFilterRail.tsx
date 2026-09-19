"use client";

import Link from "next/link";

type Props = {
  resetHref: string;
  teamValue: string | undefined;
  statusValue: string | undefined;
  teamOptions: { id: string; label: string }[];
  teamHrefByValue: Record<string, string>;
  statusHrefByValue: Record<string, string>;
};

function navigate(href: string) {
  if (typeof window !== "undefined") window.location.assign(href);
}

export default function TrainingManagementFilterRail({
  resetHref,
  teamValue,
  statusValue,
  teamOptions,
  teamHrefByValue,
  statusHrefByValue,
}: Props) {
  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3 sm:col-span-2 min-[105rem]:col-span-1"
      aria-label="Filter"
      data-testid="training-filter-rail"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Filter</h3>
        <Link
          href={resetHref}
          className="text-xs font-medium text-[var(--sce-primary)] hover:underline"
          data-testid="training-filter-reset"
        >
          Zurücksetzen
        </Link>
      </div>

      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Teams
          </span>
          <select
            className="fca-input w-full text-sm"
            value={teamValue ?? ""}
            onChange={(e) => navigate(teamHrefByValue[e.target.value] ?? teamHrefByValue[""]!)}
            aria-label="Team filtern"
            data-testid="training-team-filter"
          >
            <option value="">Alle Teams</option>
            {teamOptions.map((team) => (
              <option key={team.id} value={team.id}>
                {team.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Status
          </span>
          <select
            className="fca-input w-full text-sm"
            value={statusValue ?? ""}
            onChange={(e) => navigate(statusHrefByValue[e.target.value] ?? statusHrefByValue[""]!)}
            aria-label="Status filtern"
            data-testid="training-status-filter"
          >
            <option value="">Aktive Trainings</option>
            <option value="ALL">Alle Status</option>
            <option value="ACTIVE">Aktiv</option>
            <option value="INACTIVE">Inaktiv</option>
            <option value="ARCHIVED">Archiviert</option>
          </select>
        </label>
      </div>
    </section>
  );
}

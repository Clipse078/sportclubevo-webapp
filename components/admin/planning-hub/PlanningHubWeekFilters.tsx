"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  buildPlanningHubHref,
  type PlanningHubActivityFilter,
  type PlanningHubUrlState,
} from "@/lib/planning-hub/planner-url";

type Option = { value: string; label: string };

type PlanningHubWeekFiltersProps = {
  urlState: PlanningHubUrlState;
  teamOptions: Option[];
  facilityOptions: Option[];
  inline?: boolean;
};

const ACTIVITY_FILTERS: { key: PlanningHubActivityFilter; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "trainings", label: "Trainings" },
  { key: "spiele", label: "Spiele" },
  { key: "turniere", label: "Turniere" },
  { key: "veranstaltungen", label: "Veranstaltungen" },
];

export default function PlanningHubWeekFilters({
  urlState,
  teamOptions,
  facilityOptions,
  inline = false,
}: PlanningHubWeekFiltersProps) {
  return (
    <div
      className={inline ? "flex flex-wrap items-center gap-1.5" : "flex flex-wrap items-center gap-2 py-1.5"}
      data-testid="planning-hub-filters"
    >
      <div className="flex flex-wrap gap-1">
        {ACTIVITY_FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={buildPlanningHubHref(urlState, { activity: filter.key })}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
              urlState.activity === filter.key
                ? "border-[var(--sce-primary)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-2)]">
          <span className="font-medium">Team</span>
          <select
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
            value={urlState.team ?? ""}
            onChange={(event) => {
              const value = event.target.value || null;
              window.location.href = buildPlanningHubHref(urlState, { team: value });
            }}
          >
            <option value="">Alle</option>
            {teamOptions.map((team) => (
              <option key={team.value} value={team.value}>{team.label}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-xs text-[var(--text-2)]">
          <span className="font-medium">Anlage</span>
          <select
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
            value={urlState.facility ?? ""}
            onChange={(event) => {
              const value = event.target.value || null;
              window.location.href = buildPlanningHubHref(urlState, { facility: value });
            }}
          >
            <option value="">Alle</option>
            {facilityOptions.map((facility) => (
              <option key={facility.value} value={facility.value}>{facility.label}</option>
            ))}
          </select>
        </label>

        <Link
          href={buildPlanningHubHref(urlState, { conflictsOnly: !urlState.conflictsOnly })}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
            urlState.conflictsOnly
              ? "border-rose-300 bg-rose-50 text-rose-800"
              : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]",
          )}
          data-testid="planning-hub-conflicts-only"
        >
          Nur Konflikte
        </Link>
      </div>
    </div>
  );
}

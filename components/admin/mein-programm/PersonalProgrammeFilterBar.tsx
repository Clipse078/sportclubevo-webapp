"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/cn";
import type { ProgrammeActivityKind } from "@/lib/programme-engine/types";
import { PROGRAMME_ACTIVITY_KINDS } from "@/lib/programme-engine/types";
import {
  buildMeinProgrammHref,
  type MeinProgrammUrlState,
} from "@/lib/personal-agenda/mein-programm-url";

const ACTIVITY_KIND_LABELS: Record<ProgrammeActivityKind, string> = {
  TRAINING: "Training",
  MATCH: "Spiel",
  TOURNAMENT: "Turnier",
  CLUB_EVENT: "Veranstaltung",
};

type Props = {
  urlState: MeinProgrammUrlState;
  teamLabels: Record<string, string>;
};

export default function PersonalProgrammeFilterBar({ urlState, teamLabels }: Props) {
  const router = useRouter();
  const teamIds = Object.keys(teamLabels);

  const navigate = useCallback(
    (patch: Partial<MeinProgrammUrlState>) => {
      router.push(buildMeinProgrammHref(urlState, patch));
    },
    [router, urlState],
  );

  const filtersActive =
    urlState.teamIds.length > 0 || urlState.activityKinds.length > 0;

  const resetHref = buildMeinProgrammHref(urlState, {
    teamIds: [],
    activityKinds: [],
  });

  const toggleActivityKind = (kind: ProgrammeActivityKind) => {
    const set = new Set(urlState.activityKinds);
    if (set.has(kind)) set.delete(kind);
    else set.add(kind);
    navigate({ activityKinds: [...set] });
  };

  const toggleTeam = (teamId: string) => {
    const set = new Set(urlState.teamIds);
    if (set.has(teamId)) set.delete(teamId);
    else set.add(teamId);
    navigate({ teamIds: [...set] });
  };

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
      data-testid="personal-programme-filters"
    >
      {teamIds.length > 1 ? (
        <fieldset className="space-y-1">
          <legend className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Team
          </legend>
          <div className="flex flex-wrap gap-2">
            {teamIds.map((teamId) => {
              const active = urlState.teamIds.includes(teamId);
              return (
                <button
                  key={teamId}
                  type="button"
                  aria-pressed={active}
                  data-testid={`personal-programme-team-${teamId}`}
                  className={cn(
                    "rounded-md border px-2 py-1 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sce-primary)]",
                    active
                      ? "border-[var(--sce-primary)] bg-[color-mix(in_srgb,var(--sce-primary)_12%,var(--surface))] text-[var(--sce-primary)]"
                      : "border-[var(--border)] text-[var(--text-2)]",
                  )}
                  onClick={() => toggleTeam(teamId)}
                >
                  {teamLabels[teamId] ?? teamId}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <fieldset className="space-y-1">
        <legend className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Aktivitätstyp
        </legend>
        <div className="flex flex-wrap gap-2">
          {PROGRAMME_ACTIVITY_KINDS.map((kind) => {
            const active = urlState.activityKinds.includes(kind);
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={active}
                data-testid={`personal-programme-activity-type-${kind.toLowerCase()}`}
                className={cn(
                  "rounded-md border px-2 py-1 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sce-primary)]",
                  active
                    ? "border-[var(--sce-primary)] bg-[color-mix(in_srgb,var(--sce-primary)_12%,var(--surface))] text-[var(--sce-primary)]"
                    : "border-[var(--border)] text-[var(--text-2)]",
                )}
                onClick={() => toggleActivityKind(kind)}
              >
                {ACTIVITY_KIND_LABELS[kind]}
              </button>
            );
          })}
        </div>
      </fieldset>

      {filtersActive ? (
        <Link
          href={resetHref}
          className="text-sm font-semibold text-[var(--sce-primary)]"
          data-testid="personal-programme-filter-reset"
        >
          Filter zurücksetzen
        </Link>
      ) : null}
    </div>
  );
}

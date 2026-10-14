"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import {
  SceChipMultiSelectorField,
  type SceChipSelection,
} from "@/components/sce/list-selector/SceChipMultiSelectorField";
import type { SceSelectorPick } from "@/lib/sce/list-selector/types";
import { buildProgrammeHref, type ProgrammeUrlState } from "@/lib/programme-engine/programme-url";
import type { ProgrammeActivityKind } from "@/lib/programme-engine/types";
import { PROGRAMME_ACTIVITY_KINDS } from "@/lib/programme-engine/types";
import { cn } from "@/lib/cn";

const ACTIVITY_KIND_LABELS: Record<ProgrammeActivityKind, string> = {
  TRAINING: "Training",
  MATCH: "Spiel",
  TOURNAMENT: "Turnier",
  CLUB_EVENT: "Veranstaltung",
};

type Props = {
  basePath: string;
  urlState: ProgrammeUrlState;
  teamLabels: Record<string, string>;
  orgUnitLabels: Record<string, string>;
};

export default function ClubProgrammeFilterBar({
  basePath,
  urlState,
  teamLabels,
  orgUnitLabels,
}: Props) {
  const router = useRouter();

  const navigate = useCallback(
    (patch: Partial<ProgrammeUrlState>) => {
      router.push(buildProgrammeHref(basePath, urlState, patch));
    },
    [basePath, router, urlState],
  );

  const teamChips: SceChipSelection[] = urlState.teamIds.map((id) => ({
    id,
    label: teamLabels[id] ?? id,
  }));

  const orgChips: SceChipSelection[] = urlState.orgUnitIds.map((id) => ({
    id,
    label: orgUnitLabels[id] ?? id,
  }));

  const filtersActive =
    urlState.teamIds.length > 0 ||
    urlState.orgUnitIds.length > 0 ||
    urlState.activityKinds.length > 0;

  const resetHref = buildProgrammeHref(basePath, urlState, {
    teamIds: [],
    orgUnitIds: [],
    activityKinds: [],
  });

  const toggleActivityKind = (kind: ProgrammeActivityKind) => {
    const set = new Set(urlState.activityKinds);
    if (set.has(kind)) set.delete(kind);
    else set.add(kind);
    navigate({ activityKinds: [...set] });
  };

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
      data-testid="club-programme-filters"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Zeitraum
        </span>
        <Link
          href={buildProgrammeHref(basePath, urlState, { temporal: "upcoming" })}
          className={cn(
            "rounded-md border px-2 py-1 text-sm font-medium",
            urlState.temporal === "upcoming" && "border-[var(--sce-primary)] text-[var(--sce-primary)]",
          )}
          data-testid="programme-filter-upcoming"
        >
          Kommend
        </Link>
        <Link
          href={buildProgrammeHref(basePath, urlState, { temporal: "past" })}
          className={cn(
            "rounded-md border px-2 py-1 text-sm font-medium",
            urlState.temporal === "past" && "border-[var(--sce-primary)] text-[var(--sce-primary)]",
          )}
          data-testid="programme-filter-past"
        >
          Vergangen
        </Link>
      </div>

      <SceChipMultiSelectorField
        label="Teams"
        selected={teamChips}
        selectedIds={urlState.teamIds}
        onSelectedIdsChange={(teamIds) => navigate({ teamIds })}
        authContext="CLUB_EVENT_ORGANISATIONAL_AUDIENCE"
        sourceTypes={["TEAM"]}
        mapPickToId={(pick: SceSelectorPick) => (pick.type === "TEAM" ? pick.id : null)}
        mapPickToChip={(pick) => ({ id: pick.id, label: pick.label })}
        addButtonLabel="Team hinzufügen"
        dialogTitle="Teams filtern"
        testIdPrefix="club-programme-teams"
      />

      <SceChipMultiSelectorField
        label="Organisationseinheiten"
        selected={orgChips}
        selectedIds={urlState.orgUnitIds}
        onSelectedIdsChange={(orgUnitIds) => navigate({ orgUnitIds })}
        authContext="CLUB_EVENT_ORGANISATIONAL_AUDIENCE"
        sourceTypes={["ORG_UNIT"]}
        mapPickToId={(pick: SceSelectorPick) => (pick.type === "ORG_UNIT" ? pick.id : null)}
        mapPickToChip={(pick) => ({ id: pick.id, label: pick.label })}
        addButtonLabel="Organisationseinheit hinzufügen"
        dialogTitle="Organisationseinheiten filtern"
        testIdPrefix="club-programme-org"
      />

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
                data-testid={`club-programme-activity-type-${kind.toLowerCase()}`}
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
          data-testid="club-programme-filter-reset"
        >
          Filter zurücksetzen
        </Link>
      ) : null}
    </div>
  );
}

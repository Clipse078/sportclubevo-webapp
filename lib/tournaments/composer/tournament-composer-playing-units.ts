/**
 * SCE-TOURNAMENT-PLANNER-02D — tournament-local Spielteams in HOME creator drafts.
 * Mirrors canonical 02C persistence semantics without mutating source Team rows.
 */

export type TournamentComposerPlayingUnitMode = "FULL" | "SUBUNIT";

export type TournamentComposerPlayingUnitDraft = {
  localId: string;
  displayName: string;
  mode: TournamentComposerPlayingUnitMode;
  displayOrder: number;
};

export function usesImplicitComposerFullTeam(
  units: readonly TournamentComposerPlayingUnitDraft[] | undefined,
): boolean {
  return !units || units.length === 0;
}

export function resolveEffectiveComposerPlayingUnits(input: {
  participantLocalId: string;
  participantDisplayName: string;
  persistedUnits?: readonly TournamentComposerPlayingUnitDraft[];
}): TournamentComposerPlayingUnitDraft[] {
  const persisted = input.persistedUnits ?? [];
  if (persisted.length > 0) {
    return [...persisted].sort((a, b) => a.displayOrder - b.displayOrder || a.localId.localeCompare(b.localId));
  }
  return [
    {
      localId: `implicit-full:${input.participantLocalId}`,
      displayName: input.participantDisplayName,
      mode: "FULL",
      displayOrder: 0,
    },
  ];
}

export function splitComposerParticipantIntoDefaultSubunits(input: {
  participantLocalId: string;
  baseDisplayName: string;
  existingUnits?: readonly TournamentComposerPlayingUnitDraft[];
  nextLocalId: () => string;
}): TournamentComposerPlayingUnitDraft[] {
  if (input.existingUnits && input.existingUnits.length > 0) {
    return [...input.existingUnits];
  }
  const trimmed = input.baseDisplayName.trim() || "Team";
  return [
    {
      localId: input.nextLocalId(),
      displayName: `${trimmed}-1`,
      mode: "SUBUNIT",
      displayOrder: 0,
    },
    {
      localId: input.nextLocalId(),
      displayName: `${trimmed}-2`,
      mode: "SUBUNIT",
      displayOrder: 1,
    },
  ];
}

export function addComposerPlayingUnitSubunit(input: {
  units: readonly TournamentComposerPlayingUnitDraft[];
  baseDisplayName: string;
  nextLocalId: () => string;
}): TournamentComposerPlayingUnitDraft[] {
  const trimmed = input.baseDisplayName.trim() || "Team";
  const maxOrder = Math.max(-1, ...input.units.map((u) => u.displayOrder));
  return [
    ...input.units,
    {
      localId: input.nextLocalId(),
      displayName: `${trimmed}-neu`,
      mode: "SUBUNIT",
      displayOrder: maxOrder + 1,
    },
  ];
}

export function updateComposerPlayingUnitName(
  units: readonly TournamentComposerPlayingUnitDraft[],
  unitLocalId: string,
  displayName: string,
): TournamentComposerPlayingUnitDraft[] {
  const trimmed = displayName.trim();
  if (!trimmed) return [...units];
  return units.map((u) => (u.localId === unitLocalId ? { ...u, displayName: trimmed } : u));
}

export function removeComposerPlayingUnit(
  units: readonly TournamentComposerPlayingUnitDraft[],
  unitLocalId: string,
): TournamentComposerPlayingUnitDraft[] {
  return units.filter((u) => u.localId !== unitLocalId);
}

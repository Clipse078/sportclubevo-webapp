import {
  buildImplicitFullPlayingUnitId,
  createImplicitFullPlayingUnit,
  listTournamentParticipantUnits,
  resolveEffectivePlayingUnits,
  splitParticipantIntoDefaultSubunits,
  type TournamentParticipantUnitDefinition,
} from "../tournament-participant-unit-service";
import { formatTemplateSideRef } from "./template-side-ref";
import type { TemplateSideRef } from "./types";

export type TemplateUnitResolver = {
  resolve(ref: TemplateSideRef, participant: {
    id: string;
    tournamentId: string;
    displayName: string;
  }): Promise<TournamentParticipantUnitDefinition>;
};

/**
 * Ensures persisted Spielteams exist for template subunit references (A1/A2, …).
 * Full-slot references use implicit or explicit FULL units without mutating source teams.
 */
export async function createTemplateUnitResolver(input: {
  tenantId: string;
  tournamentId: string;
  participantsById: ReadonlyMap<
    string,
    { id: string; tournamentId: string; displayName: string }
  >;
}): Promise<TemplateUnitResolver> {
  const unitsByParticipant = new Map<string, TournamentParticipantUnitDefinition[]>();

  async function loadUnits(participantId: string): Promise<TournamentParticipantUnitDefinition[]> {
    const cached = unitsByParticipant.get(participantId);
    if (cached) return cached;
    const participant = input.participantsById.get(participantId);
    if (!participant) {
      throw new Error(`Unknown participant ${participantId}`);
    }
    const persisted = await listTournamentParticipantUnits(
      input.tenantId,
      input.tournamentId,
      participantId,
    );
    let effective = resolveEffectivePlayingUnits(participant, persisted);
    unitsByParticipant.set(participantId, effective);
    return effective;
  }

  async function resolve(
    ref: TemplateSideRef,
    participant: { id: string; tournamentId: string; displayName: string },
  ): Promise<TournamentParticipantUnitDefinition> {
    if (ref.subunitIndex === undefined) {
      const units = await loadUnits(participant.id);
      const explicitFull = units.find((u) => u.mode === "FULL" && u.isPersisted);
      if (explicitFull) return explicitFull;
      return (
        units.find((u) => u.id === buildImplicitFullPlayingUnitId(participant.id)) ??
        createImplicitFullPlayingUnit({
          participantId: participant.id,
          tournamentId: participant.tournamentId,
          displayName: participant.displayName,
        })
      );
    }

    let units = await loadUnits(participant.id);
    const persistedSubunits = units.filter((u) => u.mode === "SUBUNIT" && u.isPersisted);
    if (persistedSubunits.length >= ref.subunitIndex) {
      const ordered = [...persistedSubunits].sort(
        (a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id),
      );
      return ordered[ref.subunitIndex - 1]!;
    }

    if (persistedSubunits.length === 0 && units.every((u) => !u.isPersisted)) {
      await splitParticipantIntoDefaultSubunits(
        input.tenantId,
        input.tournamentId,
        participant.id,
        participant.displayName,
      );
      units = await listTournamentParticipantUnits(
        input.tenantId,
        input.tournamentId,
        participant.id,
      );
      unitsByParticipant.set(participant.id, units);
      const ordered = units
        .filter((u) => u.mode === "SUBUNIT")
        .sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id));
      const hit = ordered[ref.subunitIndex - 1];
      if (hit) return hit;
    }

    throw new Error(
      `Missing Spielteam ${formatTemplateSideRef(ref)} for participant ${participant.id}`,
    );
  }

  return { resolve };
}

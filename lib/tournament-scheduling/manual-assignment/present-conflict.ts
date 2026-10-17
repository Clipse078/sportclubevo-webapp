import type { ScheduleLockConflictCategory, ScheduleLockConflictDiagnostic } from "../schedule-lock/types";

export function primaryManualAssignmentUserMessage(
  diagnostics: readonly ScheduleLockConflictDiagnostic[],
  pitchLabels?: ReadonlyMap<string, string>,
): string {
  const primary = diagnostics[0];
  if (!primary) return "Diese Verschiebung ist nicht möglich.";
  return formatManualAssignmentConflictMessage(primary, pitchLabels);
}

export function formatManualAssignmentConflictMessage(
  diagnostic: ScheduleLockConflictDiagnostic,
  pitchLabels?: ReadonlyMap<string, string>,
): string {
  const pitchId = diagnostic.context?.tournamentPitchId as string | undefined;
  const pitchLabel =
    (pitchId && pitchLabels?.get(pitchId)) ||
    (pitchId ? `Feld ${pitchId}` : "Feld");

  switch (diagnostic.category) {
    case "PITCH_OVERLAP":
      return `${pitchLabel} ist zu diesem Zeitpunkt bereits belegt.`;
    case "PARTICIPANT_OVERLAP": {
      const name = diagnostic.context?.participantDisplayName as string | undefined;
      return name
        ? `${name} spielt zu diesem Zeitpunkt bereits.`
        : "Ein Teilnehmer spielt zu diesem Zeitpunkt bereits.";
    }
    case "MINIMUM_REST": {
      const name = diagnostic.context?.participantDisplayName as string | undefined;
      return name
        ? `${name} hat zu wenig Pause vor diesem Spiel.`
        : "Mindestpause zwischen Spielen ist nicht eingehalten.";
    }
    case "BREAK_CONFLICT":
      return "Dieser Termin liegt in einer Pause.";
    case "OUTSIDE_TOURNAMENT_WINDOW":
      return "Das Spiel würde ausserhalb des Turnierzeitfensters liegen.";
    case "INVALID_TOURNAMENT_PITCH":
      return "Das gewählte Turnierfeld gehört nicht zu diesem Turnier.";
    case "QUALIFICATION_DEPENDENCY":
      return "Dieses K.-o.-Spiel kann erst nach dem vorherigen Spiel stattfinden.";
    case "SCHEDULE_LOCK_VIOLATION":
      return diagnostic.message;
    default:
      return diagnostic.message || "Diese Verschiebung ist nicht möglich.";
  }
}

export function lockViolationMessage(
  dimension: ScheduleLockConflictCategory | "SCHEDULE_LOCK_VIOLATION",
  detail: string,
): string {
  void dimension;
  return detail;
}

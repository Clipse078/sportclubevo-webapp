import type { PersonalProgrammeSourceType } from "./personal-programme-types";
import type { ProgrammeActivityKind } from "@/lib/programme-engine/types";

/** User-facing German activity type labels (canonical enums stay unchanged). */
export const PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL = {
  TRAINING: "Training",
  MATCH: "Spiel",
  TOURNAMENT: "Turnier",
  MEETING: "Sitzung",
  CLUB_EVENT: "Veranstaltung",
  EVENT: "Veranstaltung",
  TASK: "Aufgabe",
} as const;

const ENUM_ALIAS_TO_GERMAN: Record<string, string> = {
  TRAINING: PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL.TRAINING,
  MATCH: PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL.MATCH,
  SPIEL: PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL.MATCH,
  TOURNAMENT: PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL.TOURNAMENT,
  TURNIER: PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL.TOURNAMENT,
  MEETING: PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL.MEETING,
  SITZUNG: PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL.MEETING,
  CLUB_EVENT: PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL.CLUB_EVENT,
  EVENT: PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL.EVENT,
  VERANSTALTUNG: PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL.CLUB_EVENT,
  TASK: PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL.TASK,
  AUFGABE: PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL.TASK,
};

export function programmeActivityKindGermanLabel(kind: ProgrammeActivityKind): string {
  if (kind === "CLUB_EVENT") return PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL.CLUB_EVENT;
  return PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL[kind];
}

export function personalProgrammeSourceGermanLabel(sourceType: PersonalProgrammeSourceType): string {
  if (sourceType === "EVENT") return PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL.EVENT;
  return PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL[sourceType];
}

export function resolveProgrammeActivityDisplayTypeLabel(input: {
  semanticType?: string | null;
  sourceType?: PersonalProgrammeSourceType | null;
  typeLabel?: string | null;
}): string {
  if (input.sourceType) {
    return personalProgrammeSourceGermanLabel(input.sourceType);
  }
  const semantic = input.semanticType?.trim().toUpperCase();
  if (semantic && semantic in PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL) {
    return PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL[
      semantic as keyof typeof PROGRAMME_ACTIVITY_GERMAN_TYPE_LABEL
    ];
  }
  const trimmed = input.typeLabel?.trim();
  if (trimmed) {
    const alias = ENUM_ALIAS_TO_GERMAN[trimmed.toUpperCase()];
    if (alias) return alias;
    return trimmed;
  }
  if (semantic) {
    const alias = ENUM_ALIAS_TO_GERMAN[semantic];
    if (alias) return alias;
  }
  return input.semanticType?.trim() || "Termin";
}

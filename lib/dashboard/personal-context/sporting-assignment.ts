import { PERSON_FUNCTION_GROUPS } from "@/lib/people/functions";
import type { PersonalTeamRelationship, PersonalTeamRelationshipKind } from "./types";

/** Maps PersonAssignment functionKey to sporting dashboard team kind when applicable. */
export function resolveSportingKindFromFunctionKey(
  functionKey: string,
): Extract<PersonalTeamRelationshipKind, "TRAINER" | "PLAYER"> | null {
  if ((PERSON_FUNCTION_GROUPS.SPIELER as readonly string[]).includes(functionKey)) {
    return "PLAYER";
  }
  if ((PERSON_FUNCTION_GROUPS.TRAINER_STAFF as readonly string[]).includes(functionKey)) {
    return "TRAINER";
  }
  return null;
}

export function isSportingPersonalTeamRelationship(
  relationship: PersonalTeamRelationship,
): boolean {
  return relationship.kinds.includes("TRAINER") || relationship.kinds.includes("PLAYER");
}

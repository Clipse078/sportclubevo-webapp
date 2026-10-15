import type { ProgrammeActivityKind } from "./types";

export function buildProgrammeItemId(
  kind: ProgrammeActivityKind,
  domainId: string,
): string {
  return `${kind}:${domainId}`;
}

export function buildProgrammeResourceKey(
  kind: ProgrammeActivityKind,
  domainId: string,
): string {
  switch (kind) {
    case "TRAINING":
      return `training-session:${domainId}`;
    case "MATCH":
    case "TOURNAMENT":
    case "CLUB_EVENT":
      return `event:${domainId}`;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

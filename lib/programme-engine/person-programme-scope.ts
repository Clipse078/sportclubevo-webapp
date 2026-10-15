import type { PersonalContext } from "@/lib/dashboard/personal-context/types";
import {
  getPersonallyRelevantTeamIds,
  getPersonallyRelevantTeamSeasonIds,
} from "@/lib/dashboard/personal-context/relevance";
import type { ProgrammeScope } from "./types";

export type PersonProgrammeScope = Extract<ProgrammeScope, { kind: "PERSON" }>;

export function buildPersonProgrammeScope(context: PersonalContext): PersonProgrammeScope {
  return {
    kind: "PERSON",
    personId: context.personId,
    relevantTeamIds: getPersonallyRelevantTeamIds(context),
    relevantTeamSeasonIds: getPersonallyRelevantTeamSeasonIds(context),
    orgUnitIds: context.orgUnits.map((row) => row.orgUnitId),
  };
}

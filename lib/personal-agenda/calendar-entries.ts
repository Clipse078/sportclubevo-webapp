import type { PersonalContext } from "@/lib/dashboard/personal-context";
import type { PersonalProgrammeAdapterContext } from "@/lib/dashboard/personal-context/programme-adapter-contract";
import { loadTeamEventProgrammeItems } from "./adapters/team-event-programme-adapter";
import { loadTrainingProgrammeItems } from "./adapters/training-programme-adapter";
import { loadMeetingProgrammeItems } from "./adapters/meeting-programme-adapter";
import { personalProgrammeItemsToCalendarItems } from "./programme-to-calendar";
import type { PersonalCalendarItem } from "./types";
import type { PersonalEventProjectionActor } from "./event-projection-access";
import { sortPersonalProgrammeItems } from "./programme-sort";
import type { PersonalProgrammeItem } from "./personal-programme-types";

export type LoadPersonalCalendarEntryProjectionsArgs = {
  tenantId: string;
  userId: string | null | undefined;
  personalContext: PersonalContext;
  actor: PersonalEventProjectionActor;
  timeZone: string;
  rangeStart: Date;
  rangeEnd: Date;
};

function dedupeProgrammeItems(items: PersonalProgrammeItem[]): PersonalProgrammeItem[] {
  const byKey = new Map<string, PersonalProgrammeItem>();
  for (const item of items) {
    if (!byKey.has(item.id)) {
      byKey.set(item.id, item);
    }
  }
  return [...byKey.values()];
}

export async function loadPersonalCalendarEntryProjections(
  args: LoadPersonalCalendarEntryProjectionsArgs,
): Promise<PersonalCalendarItem[]> {
  const teamIds = args.personalContext.teams.map((t) => t.teamId);
  const hasTeamScope = teamIds.length > 0;
  const hasMeetingScope = Boolean(args.userId);

  if (!hasTeamScope && !hasMeetingScope) {
    return [];
  }

  const adapterCtx: PersonalProgrammeAdapterContext = {
    personal: args.personalContext,
    permissionKeys: args.actor.permissionKeys,
    timeZone: args.timeZone,
    rangeStart: args.rangeStart,
    rangeEnd: args.rangeEnd,
  };

  const [teamEvents, trainings, meetings] = await Promise.all([
    hasTeamScope ? loadTeamEventProgrammeItems(adapterCtx) : Promise.resolve([]),
    hasTeamScope ? loadTrainingProgrammeItems(adapterCtx) : Promise.resolve([]),
    hasMeetingScope ? loadMeetingProgrammeItems(adapterCtx) : Promise.resolve([]),
  ]);

  const programmeItems = sortPersonalProgrammeItems(
    dedupeProgrammeItems([...teamEvents, ...trainings, ...meetings]),
  );
  return personalProgrammeItemsToCalendarItems(programmeItems);
}

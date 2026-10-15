import type { PersonalContext } from "@/lib/dashboard/personal-context";
import type { PersonalProgrammeAdapterContext } from "@/lib/dashboard/personal-context/programme-adapter-contract";
import { loadMeetingProgrammeItems } from "./adapters/meeting-programme-adapter";
import { personalProgrammeItemsToCalendarItems } from "./programme-to-calendar";
import type { PersonalCalendarItem } from "./types";
import type { PersonalEventProjectionActor } from "./event-projection-access";
import { sortPersonalProgrammeItems } from "./programme-sort";
import type { PersonalProgrammeItem } from "./personal-programme-types";
import { prisma } from "@/lib/db/prisma";
import { queryProgramme } from "@/lib/programme-engine/query-programme";
import { buildPersonProgrammeScope } from "@/lib/programme-engine/person-programme-scope";
import { programmeItemsToPersonalProgrammeItems } from "@/lib/programme-engine/programme-item-personal-adapter";
import { getTenantClubCrestUrlCached } from "@/lib/server/request-cache";

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
  const hasMeetingScope = Boolean(args.userId);
  const hasProgrammeScope =
    args.personalContext.hasActiveTenantMembership &&
    (args.personalContext.hasLinkedPerson ||
      args.personalContext.teams.length > 0 ||
      args.personalContext.orgUnits.length > 0);

  if (!hasProgrammeScope && !hasMeetingScope) {
    return [];
  }

  const adapterCtx: PersonalProgrammeAdapterContext = {
    personal: args.personalContext,
    permissionKeys: args.actor.permissionKeys,
    timeZone: args.timeZone,
    rangeStart: args.rangeStart,
    rangeEnd: args.rangeEnd,
  };

  const canQueryProgramme = hasProgrammeScope && Boolean(args.userId);

  const [sportingProgramme, meetings] = await Promise.all([
    canQueryProgramme
      ? (async () => {
          const [tenant, tenantLogoUrl] = await Promise.all([
            prisma.tenant.findUnique({
              where: { id: args.tenantId },
              select: { name: true },
            }),
            getTenantClubCrestUrlCached(args.tenantId),
          ]);
          const result = await queryProgramme({
            tenantId: args.tenantId,
            userId: args.userId!,
            timeZone: args.timeZone,
            from: args.rangeStart,
            to: args.rangeEnd,
            permissionKeys: args.actor.permissionKeys,
            tenantClubName: tenant?.name ?? null,
            tenantLogoUrl,
            scope: buildPersonProgrammeScope(args.personalContext),
          });
          return programmeItemsToPersonalProgrammeItems(result.items, args.personalContext);
        })()
      : Promise.resolve([]),
    hasMeetingScope ? loadMeetingProgrammeItems(adapterCtx) : Promise.resolve([]),
  ]);

  const programmeItems = sortPersonalProgrammeItems(
    dedupeProgrammeItems([...sportingProgramme, ...meetings]),
  );
  return personalProgrammeItemsToCalendarItems(programmeItems);
}

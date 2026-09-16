import { applyDressingRoomOccupancyToRefs } from "./apply-to-resources";
import { eventOverrideFromPersistence, resolveDressingRoomOccupancy } from "./resolver";
import type { DressingRoomOccupancyActivityType, TenantDressingRoomOccupancyPresets } from "./types";
import type {
  WeekplannerItem,
  WeekplannerItemBase,
  WeekplannerResourceRef,
  WeekplannerTournamentItem,
} from "@/lib/weekplanner/types";

type OccupancyPersistence = {
  mode: "DEFAULT" | "CUSTOM";
  beforeMinutes: number | null;
  afterMinutes: number | null;
};

export function enrichWeekplannerItemDressingRoomOccupancy<
  T extends WeekplannerItemBase & { awayDressingRoomAllocations?: WeekplannerResourceRef[] },
>(
  item: T,
  activityType: DressingRoomOccupancyActivityType,
  tenantPresets: TenantDressingRoomOccupancyPresets,
  persistence: OccupancyPersistence,
): T & Pick<WeekplannerItem, "dressingRoomOccupancyMode" | "dressingRoomOccupancyBeforeMinutes" | "dressingRoomOccupancyAfterMinutes" | "dressingRoomResolvedBeforeMinutes" | "dressingRoomResolvedAfterMinutes"> {
  const resolved = resolveDressingRoomOccupancy({
    activityType,
    activityStart: item.startAt,
    activityEnd: item.endAt,
    tenantPresets,
    eventOverride: eventOverrideFromPersistence(persistence),
  });

  const dressingRoomAllocations = applyDressingRoomOccupancyToRefs(
    item.dressingRoomAllocations,
    resolved,
  );
  const canonicalDressingRoomAllocations = applyDressingRoomOccupancyToRefs(
    item.canonicalDressingRoomAllocations,
    resolveDressingRoomOccupancy({
      activityType,
      activityStart: item.canonicalStartAt,
      activityEnd: item.canonicalEndAt,
      tenantPresets,
      eventOverride: eventOverrideFromPersistence(persistence),
    }),
  );

  const awayDressingRoomAllocations =
    "awayDressingRoomAllocations" in item && item.awayDressingRoomAllocations
      ? applyDressingRoomOccupancyToRefs(item.awayDressingRoomAllocations, resolved)
      : undefined;

  let participantAllocations: WeekplannerTournamentItem["participantAllocations"] | undefined;
  if (activityType === "TOURNAMENT" && "participantAllocations" in item) {
    const tournamentItem = item as unknown as WeekplannerTournamentItem;
    const canonicalResolved = resolveDressingRoomOccupancy({
      activityType: "TOURNAMENT",
      activityStart: item.canonicalStartAt,
      activityEnd: item.canonicalEndAt,
      tenantPresets,
      eventOverride: eventOverrideFromPersistence(persistence),
    });
    participantAllocations = tournamentItem.participantAllocations.map((participant) => ({
      ...participant,
      dressingRoomAllocations: applyDressingRoomOccupancyToRefs(
        participant.dressingRoomAllocations,
        resolved,
      ),
      canonicalDressingRoomAllocations: applyDressingRoomOccupancyToRefs(
        participant.canonicalDressingRoomAllocations,
        canonicalResolved,
      ),
    }));
  }

  return {
    ...item,
    dressingRoomAllocations,
    canonicalDressingRoomAllocations,
    ...(awayDressingRoomAllocations ? { awayDressingRoomAllocations } : {}),
    ...(participantAllocations ? { participantAllocations } : {}),
    dressingRoomOccupancyMode: persistence.mode,
    dressingRoomOccupancyBeforeMinutes: persistence.beforeMinutes,
    dressingRoomOccupancyAfterMinutes: persistence.afterMinutes,
    dressingRoomResolvedBeforeMinutes: resolved.beforeMinutes,
    dressingRoomResolvedAfterMinutes: resolved.afterMinutes,
  };
}

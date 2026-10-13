import type { WeekplannerTournamentItem } from "@/lib/weekplanner/types";
import { SCE_CANONICAL_TENANT_ORGANISER_CREST_URL } from "./sce-tournament-organiser-crest-fixtures";

/** Weekplanner preview item — same canonical tenant organiser + crest as tournament-card fixtures. */
export function createSceWeekplannerTournamentTenantPreviewItem(): WeekplannerTournamentItem {
  return {
    id: "preview-wp-tournament",
    tenantId: "preview-tenant",
    type: "TOURNAMENT",
    startAt: new Date("2026-10-10T07:30:00.000Z"),
    endAt: new Date("2026-10-10T09:30:00.000Z"),
    canonicalStartAt: new Date("2026-10-10T07:30:00.000Z"),
    canonicalEndAt: new Date("2026-10-10T09:30:00.000Z"),
    timeOverridden: false,
    title: "PlayMore Turnier",
    organizerName: "FC Allschwil",
    organizerLogoUrl: SCE_CANONICAL_TENANT_ORGANISER_CREST_URL,
    teamNames: ["FC Allschwil Junioren F3"],
    pitchAllocations: [
      {
        facilityResourceId: "r-preview",
        facilityId: "f-preview",
        code: "KR2",
        name: "Kunstrasen 2",
        facilityName: "Im Brüel",
        occupancyBeforeMinutes: 0,
        occupancyAfterMinutes: 0,
      },
    ],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    eventId: "tournament-preview",
    homeAway: "HOME",
    teamSeasonIds: ["ts-preview"],
    participantAllocations: [],
  };
}

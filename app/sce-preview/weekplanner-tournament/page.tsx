"use client";

import { ScePreviewPitchCanvas } from "@/components/sce/preview/ScePreviewPitchCanvas";
import { WeekplannerTournamentIdentityCard } from "@/components/admin/planner/WeekplannerTournamentIdentityCard";
import type { WeekplannerTournamentItem } from "@/lib/weekplanner/types";

const PREVIEW_TOURNAMENT: WeekplannerTournamentItem = {
  id: "preview-wp-tournament",
  tenantId: "preview-tenant",
  type: "TOURNAMENT",
  startAt: new Date("2026-10-10T07:30:00.000Z"),
  endAt: new Date("2026-10-10T09:30:00.000Z"),
  canonicalStartAt: new Date("2026-10-10T07:30:00.000Z"),
  canonicalEndAt: new Date("2026-10-10T09:30:00.000Z"),
  timeOverridden: false,
  title: "Junioren F Turnier",
  teamNames: ["Junioren F2"],
  pitchAllocations: [
    {
      facilityResourceId: "r-preview",
      facilityId: "f-preview",
      code: "P1",
      name: "Platz 1",
      facilityName: "Gemeindesportplatz",
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

export default function SceWeekplannerTournamentPreviewPage() {
  return (
    <ScePreviewPitchCanvas className="p-6" testId="sce-preview-weekplanner-tournament">
      <div className="mx-auto max-w-md space-y-6">
        <p className="text-sm text-[var(--muted)]">
          Wochenplaner tournament identity — COMPACT and MICRO densities.
        </p>
        <WeekplannerTournamentIdentityCard
          item={PREVIEW_TOURNAMENT}
          timezone="Europe/Zurich"
          tenantClubName="FC Allschwil"
          density="COMPACT"
        />
        <div className="max-w-[9rem]">
          <WeekplannerTournamentIdentityCard
            item={PREVIEW_TOURNAMENT}
            timezone="Europe/Zurich"
            tenantClubName="FC Allschwil"
            density="MICRO"
          />
        </div>
      </div>
    </ScePreviewPitchCanvas>
  );
}

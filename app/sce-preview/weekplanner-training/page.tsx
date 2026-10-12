"use client";

import { ScePreviewPitchCanvas } from "@/components/sce/preview/ScePreviewPitchCanvas";
import { WeekplannerTrainingIdentityCard } from "@/components/admin/planner/WeekplannerTrainingIdentityCard";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";

const PREVIEW_TRAINING: WeekplannerTrainingItem = {
  id: "preview-wp-training",
  tenantId: "preview-tenant",
  type: "TRAINING",
  startAt: new Date("2026-10-12T16:45:00.000Z"),
  endAt: new Date("2026-10-12T18:15:00.000Z"),
  canonicalStartAt: new Date("2026-10-12T16:45:00.000Z"),
  canonicalEndAt: new Date("2026-10-12T18:15:00.000Z"),
  timeOverridden: false,
  title: "Junioren B1 Training",
  teamNames: ["Junioren B1"],
  pitchAllocations: [
    {
      facilityResourceId: "r-preview",
      facilityId: "f-preview",
      code: "KR2",
      name: "KR2",
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
  trainingSeriesId: "series-preview",
  trainingSessionId: "session-preview",
  teamSeasonId: "ts-preview",
};

export default function SceWeekplannerTrainingPreviewPage() {
  return (
    <ScePreviewPitchCanvas className="p-6" testId="sce-preview-weekplanner-training">
      <div className="mx-auto max-w-md space-y-6">
        <p className="text-sm text-[var(--muted)]">
          Wochenplaner training identity — COMPACT and MICRO densities.
        </p>
        <WeekplannerTrainingIdentityCard
          item={PREVIEW_TRAINING}
          timezone="Europe/Zurich"
          tenantClubName="FC Allschwil"
          density="COMPACT"
        />
        <div className="max-w-[9rem]">
          <WeekplannerTrainingIdentityCard
            item={PREVIEW_TRAINING}
            timezone="Europe/Zurich"
            tenantClubName="FC Allschwil"
            density="MICRO"
          />
        </div>
      </div>
    </ScePreviewPitchCanvas>
  );
}

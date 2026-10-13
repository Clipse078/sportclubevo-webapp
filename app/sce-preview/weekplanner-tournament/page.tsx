"use client";

import { ScePreviewPitchCanvas } from "@/components/sce/preview/ScePreviewPitchCanvas";
import { WeekplannerTournamentIdentityCard } from "@/components/admin/planner/WeekplannerTournamentIdentityCard";
import { createSceWeekplannerTournamentTenantPreviewItem } from "@/lib/sporting-activity-presentation/canonical/__fixtures__/sce-weekplanner-tournament-preview-fixtures";

const PREVIEW_TOURNAMENT = createSceWeekplannerTournamentTenantPreviewItem();

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
          density="COMPACT"
        />
        <div className="max-w-[9rem]">
          <WeekplannerTournamentIdentityCard
            item={PREVIEW_TOURNAMENT}
            timezone="Europe/Zurich"
            density="MICRO"
          />
        </div>
      </div>
    </ScePreviewPitchCanvas>
  );
}

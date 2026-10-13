"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import type { TeamSeasonOption } from "@/components/admin/training/TrainingSeriesCreateForm";
import TrainingCreateForm from "./TrainingCreateForm";

type Props = {
  teamSeasons: TeamSeasonOption[];
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
  timeZone: string;
  defaultTrainingDurationMinutes: number;
  effectiveGovernance: SceActivityEffectiveGovernance;
};

export default function TrainingComposerCreateTrigger({
  teamSeasons,
  pitchHallFacilityGroups,
  dressingRoomFacilityGroups,
  timeZone,
  defaultTrainingDurationMinutes,
  effectiveGovernance,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
        data-testid="training-create-overlay-trigger"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Training erstellen
      </button>
      <Link
        href="/dashboard/training/new"
        className="sr-only"
        data-testid="training-create-page-fallback"
      >
        Training erstellen (Seite)
      </Link>
      {open ? (
        <TrainingCreateForm
          teamSeasons={teamSeasons}
          pitchHallFacilityGroups={pitchHallFacilityGroups}
          dressingRoomFacilityGroups={dressingRoomFacilityGroups}
          timeZone={timeZone}
          defaultTrainingDurationMinutes={defaultTrainingDurationMinutes}
          containerMode="overlay"
          effectiveGovernance={effectiveGovernance}
          open={open}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import type { MatchTeamOption } from "@/lib/matchcenter/composer/load-match-composer-create-surface-props.server";
import MatchCreateForm from "./MatchCreateForm";

type Props = {
  activeSeasonId: string;
  teamOptions: MatchTeamOption[];
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
  effectiveGovernance: SceActivityEffectiveGovernance;
  tenantClubName: string;
  tenantLogoUrl: string | null;
};

export default function MatchComposerCreateTrigger({
  activeSeasonId,
  teamOptions,
  pitchHallFacilityGroups,
  dressingRoomFacilityGroups,
  effectiveGovernance,
  tenantClubName,
  tenantLogoUrl,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
        data-testid="match-create-overlay-trigger"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4 text-[var(--sce-primary)]" aria-hidden="true" />
        Spiel erstellen
      </button>
      <Link
        href="/dashboard/matchcenter/new"
        className="sr-only"
        data-testid="match-create-page-fallback"
      >
        Spiel erstellen (Seite)
      </Link>
      {open ? (
        <MatchCreateForm
          activeSeasonId={activeSeasonId}
          teamOptions={teamOptions}
          pitchHallFacilityGroups={pitchHallFacilityGroups}
          dressingRoomFacilityGroups={dressingRoomFacilityGroups}
          tenantClubName={tenantClubName}
          tenantLogoUrl={tenantLogoUrl}
          containerMode="overlay"
          effectiveGovernance={effectiveGovernance}
          open={open}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

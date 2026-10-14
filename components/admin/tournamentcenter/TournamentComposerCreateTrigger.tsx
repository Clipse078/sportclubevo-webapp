"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import type {
  TournamentComposerCreateSurfaceProps,
  TournamentSeasonOption,
  TournamentTeamOption,
} from "@/lib/tournaments/composer/load-tournament-composer-create-surface-props.server";
import TournamentCreateForm from "./TournamentCreateForm";

type Props = {
  activeSeasonId: string;
  seasonOptions: TournamentSeasonOption[];
  teamOptions: TournamentTeamOption[];
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
  defaultTournamentDurationMinutes: number;
  effectiveGovernance: SceActivityEffectiveGovernance;
  tenantClubName: string;
  tenantLogoUrl: string | null;
};

export default function TournamentComposerCreateTrigger(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
        data-testid="tournament-create-overlay-trigger"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4 text-[var(--sce-primary)]" aria-hidden="true" />
        Turnier erstellen
      </button>
      <Link href="/dashboard/tournamentcenter/new" className="sr-only" data-testid="tournament-create-page-fallback">
        Turnier erstellen (Seite)
      </Link>
      {open ? (
        <TournamentCreateForm
          {...props}
          containerMode="overlay"
          open={open}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

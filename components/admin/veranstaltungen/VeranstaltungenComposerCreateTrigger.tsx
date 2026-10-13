"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import VeranstaltungCreateForm from "./VeranstaltungCreateForm";

type Props = {
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
  otherFacilityGroups: FacilityGroup[];
  timeZone: string;
  effectiveGovernance: SceActivityEffectiveGovernance;
};

export default function VeranstaltungenComposerCreateTrigger({
  pitchHallFacilityGroups,
  dressingRoomFacilityGroups,
  otherFacilityGroups,
  timeZone,
  effectiveGovernance,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
        data-testid="veranstaltungen-create-overlay-trigger"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Veranstaltung
      </button>
      <Link
        href="/dashboard/veranstaltungen/new"
        className="sr-only"
        data-testid="veranstaltungen-create-page-fallback"
      >
        Veranstaltung erstellen (Seite)
      </Link>
      {open ? (
        <VeranstaltungCreateForm
          pitchHallFacilityGroups={pitchHallFacilityGroups}
          dressingRoomFacilityGroups={dressingRoomFacilityGroups}
          otherFacilityGroups={otherFacilityGroups}
          timeZone={timeZone}
          containerMode="overlay"
          effectiveGovernance={effectiveGovernance}
          open={open}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

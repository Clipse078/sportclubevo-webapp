"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import TournamentParticipantsEditor from "@/components/admin/tournamentcenter/TournamentParticipantsEditor";
import TournamentResourceAllocationEditor from "@/components/admin/tournamentcenter/TournamentResourceAllocationEditor";
import TournamentParticipantDressingRoomPanel from "@/components/admin/tournamentcenter/TournamentParticipantDressingRoomPanel";
import TurniereTournamentRecordResourceSummary from "@/components/admin/tournamentcenter/record/TurniereTournamentRecordResourceSummary";
import { TournamentDressingRoomLabelIcon } from "@/components/admin/tournamentcenter/tournament-semantic-icons";
import PlanningEditorSection from "@/components/admin/shared/planning-editor/PlanningEditorSection";
import PlanningEditorSectionHeading from "@/components/admin/shared/planning-editor/PlanningEditorSectionHeading";
import { useFacilityAvailability } from "@/hooks/use-facility-availability";
import { isTenantHostedTournament } from "@/lib/tournaments/management-view";
import { resolveTurniereRecordResourcePresentation } from "@/lib/tournaments/turniere-record-presentation";
import type { TournamentDto, TournamentParticipantDto } from "@/lib/tournaments/types";

type Props = {
  tournament: TournamentDto;
  canManage: boolean;
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
  tenantLogoUrl?: string | null;
};

export default function PlannerTournamentCanonicalWorkspace({
  tournament,
  canManage,
  pitchHallFacilityGroups,
  dressingRoomFacilityGroups,
  tenantLogoUrl = null,
}: Props) {
  const [participants, setParticipants] = useState<TournamentParticipantDto[]>(tournament.participants);
  const [resourceAllocationError, setResourceAllocationError] = useState<string | null>(null);

  const isEditable =
    canManage && tournament.status !== "ARCHIVED" && tournament.status !== "COMPLETED";
  const isHosted = isTenantHostedTournament({ homeAway: tournament.homeAway });

  const resourcePresentation = useMemo(
    () => resolveTurniereRecordResourcePresentation(tournament),
    [tournament],
  );

  const { pitchAvailability, dressingRoomAvailability } = useFacilityAvailability({
    enabled: isHosted && !!tournament.startAt,
    startAt: tournament.startAt ?? "",
    endAt: tournament.endAt,
    excludeEventId: tournament.id,
  });

  return (
    <>
      {isHosted ? (
        <PlanningEditorSection
          testId="planner-tournament-resources-section"
          ariaLabelledBy="planner-tournament-resources-heading"
        >
          <PlanningEditorSectionHeading
            id="planner-tournament-resources-heading"
            title="Ressourcen"
            description="Spielfeld, Halle und Garderoben für dieses Turnier."
          />
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Spielfeld / Halle
              </p>
              <TurniereTournamentRecordResourceSummary presentation={resourcePresentation} />
              <TournamentResourceAllocationEditor
                tournamentId={tournament.id}
                canManage={isEditable}
                initialAllocations={tournament.resourceAllocations}
                facilityGroups={pitchHallFacilityGroups}
                availabilityByResourceId={pitchAvailability}
              />
            </div>

            <div className="space-y-3">
              <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                <TournamentDressingRoomLabelIcon />
                Garderoben
              </p>
              <TournamentParticipantDressingRoomPanel
                tournamentId={tournament.id}
                canManage={isEditable}
                participants={participants}
                dressingRoomFacilityGroups={dressingRoomFacilityGroups}
                dressingRoomAvailability={dressingRoomAvailability}
                onParticipantsChange={setParticipants}
                onError={setResourceAllocationError}
              />
            </div>

            {resourceAllocationError ? (
              <p className="text-sm text-[var(--sce-danger)]" role="alert">
                {resourceAllocationError}
              </p>
            ) : null}

            <p className="text-xs text-[var(--muted)]">
              <Link
                href={`/dashboard/tournamentcenter/${tournament.id}/edit`}
                className="font-semibold text-[var(--sce-primary)] hover:underline"
                data-testid="planner-tournament-open-turniercenter"
              >
                Im Turniercenter öffnen
              </Link>
              <span className="text-[var(--text-2)]"> — alternative Ansicht, gleicher Datensatz.</span>
            </p>
          </div>
        </PlanningEditorSection>
      ) : null}

      <PlanningEditorSection
        testId="turniere-canonical-participants-section"
        ariaLabelledBy="planner-tournament-participants-heading"
      >
        <PlanningEditorSectionHeading
          id="planner-tournament-participants-heading"
          title="Teilnehmer"
          description={
            participants.length > 0
              ? `${participants.length} ${participants.length === 1 ? "Team" : "Teams"}`
              : "Teams und externe Clubs mit Teilnahmestatus."
          }
        />
        <TournamentParticipantsEditor
          tournamentId={tournament.id}
          canManage={isEditable}
          homeAway={tournament.homeAway}
          initialParticipants={tournament.participants}
          dressingRoomFacilityGroups={dressingRoomFacilityGroups}
          dressingRoomAvailability={dressingRoomAvailability}
          tenantLogoUrl={tenantLogoUrl}
          hideDressingRoomAllocation={isHosted}
          onParticipantsChange={setParticipants}
        />
      </PlanningEditorSection>
    </>
  );
}

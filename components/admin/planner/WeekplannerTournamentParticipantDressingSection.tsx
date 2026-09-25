"use client";

import { useEffect, useState } from "react";
import TournamentParticipantDressingRoomPanel from "@/components/admin/tournamentcenter/TournamentParticipantDressingRoomPanel";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { ResourceAvailabilityAnnotation } from "@/components/admin/training/FacilityResourceSelector";
import type { TournamentParticipantDto } from "@/lib/tournaments/types";
import { WeekplannerSectionLabel } from "@/components/admin/planner/WeekplannerActivityEditorShell";

type Props = {
  tournamentId: string;
  facilityGroups: FacilityGroup[];
  dressingRoomAvailability?: Map<string, ResourceAvailabilityAnnotation>;
  onMutation: () => void;
};

export function WeekplannerTournamentParticipantDressingSection({
  tournamentId,
  facilityGroups,
  dressingRoomAvailability,
  onMutation,
}: Props) {
  const [participants, setParticipants] = useState<TournamentParticipantDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tournaments/${tournamentId}/participants`)
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as
          | { participants?: TournamentParticipantDto[]; error?: string }
          | null;
        if (!res.ok) {
          throw new Error(data?.error ?? "Teilnehmer konnten nicht geladen werden.");
        }
        if (!cancelled) setParticipants(data?.participants ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Teilnehmer konnten nicht geladen werden.");
          setParticipants([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  return (
    <div className="space-y-2" data-testid="weekplanner-tournament-dressing-section">
      <WeekplannerSectionLabel>Garderoben</WeekplannerSectionLabel>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {participants === null ? (
        <p className="text-sm text-[var(--muted)]">Garderoben werden geladen…</p>
      ) : (
        <TournamentParticipantDressingRoomPanel
          tournamentId={tournamentId}
          canManage
          participants={participants}
          dressingRoomFacilityGroups={facilityGroups}
          dressingRoomAvailability={dressingRoomAvailability}
          onParticipantsChange={(next) => {
            setParticipants(next);
            onMutation();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

"use client";

import { useMemo, useTransition } from "react";
import type { TournamentParticipantDto } from "@/lib/tournaments/types";
import {
  type FacilityGroup,
  type ResourceAvailabilityAnnotation,
} from "@/components/admin/training/FacilityResourceSelector";
import { TournamentTeamLogo } from "@/components/admin/tournamentcenter/tournament-semantic-icons";
import { PlanningSubjectDressingRoomAssignments } from "@/components/admin/shared/planning/PlanningSubjectDressingRoomAssignments";

type Props = {
  tournamentId: string;
  canManage: boolean;
  participants: TournamentParticipantDto[];
  dressingRoomFacilityGroups: FacilityGroup[];
  dressingRoomAvailability?: Map<string, ResourceAvailabilityAnnotation>;
  onParticipantsChange: (participants: TournamentParticipantDto[]) => void;
  onError: (message: string | null) => void;
};

export default function TournamentParticipantDressingRoomPanel({
  tournamentId,
  canManage,
  participants,
  dressingRoomFacilityGroups,
  dressingRoomAvailability,
  onParticipantsChange,
  onError,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const subjects = useMemo(
    () =>
      participants.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        crest: (
          <TournamentTeamLogo logoUrl={p.logoUrl} name={p.displayName} size="sm" />
        ),
        dressingRoomAllocations: p.dressingRoomAllocations.map((a) => ({
          facilityResourceId: a.facilityResourceId,
          facilityResourceName: a.facilityResourceName,
        })),
      })),
    [participants],
  );

  if (participants.length === 0) {
    return (
      <p className="text-sm text-[var(--text-2)]" data-testid="tournament-dressing-room-empty">
        Garderoben werden sichtbar, sobald Teams als Teilnehmer erfasst sind.
      </p>
    );
  }

  async function addDressingRoom(participantId: string, facilityResourceId: string) {
    const res = await fetch(
      `/api/tournaments/${tournamentId}/participants/${participantId}/dressing-room-allocations`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityResourceId }),
      },
    );
    const data = (await res.json().catch(() => null)) as
      | { allocation?: TournamentParticipantDto["dressingRoomAllocations"][number]; error?: string }
      | null;
    if (!res.ok || !data?.allocation) {
      throw new Error(data?.error ?? "Garderobe konnte nicht zugewiesen werden.");
    }
    onParticipantsChange(
      participants.map((p) =>
        p.id === participantId
          ? { ...p, dressingRoomAllocations: [...p.dressingRoomAllocations, data.allocation!] }
          : p,
      ),
    );
  }

  async function removeDressingRoom(participantId: string, allocationId: string) {
    const res = await fetch(
      `/api/tournaments/${tournamentId}/participants/${participantId}/dressing-room-allocations/${allocationId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Garderobe konnte nicht entfernt werden.");
    }
    onParticipantsChange(
      participants.map((p) =>
        p.id === participantId
          ? {
              ...p,
              dressingRoomAllocations: p.dressingRoomAllocations.filter((a) => a.id !== allocationId),
            }
          : p,
      ),
    );
  }

  return (
    <PlanningSubjectDressingRoomAssignments
      testId="tournament-dressing-room-per-team-panel"
      subjects={subjects}
      canManage={canManage}
      facilityGroups={dressingRoomFacilityGroups}
      dressingRoomAvailability={dressingRoomAvailability}
      disabled={isPending}
      showGlobalOverview
      onSelectResource={(participantId, resourceId) => {
        onError(null);
        const participant = participants.find((p) => p.id === participantId);
        const existing = participant?.dressingRoomAllocations ?? [];
        return new Promise<void>((resolve, reject) => {
          startTransition(async () => {
            try {
              for (const allocation of existing) {
                if (allocation.facilityResourceId !== resourceId) {
                  await removeDressingRoom(participantId, allocation.id);
                }
              }
              if (!existing.some((a) => a.facilityResourceId === resourceId)) {
                await addDressingRoom(participantId, resourceId);
              }
              resolve();
            } catch (err) {
              onError(err instanceof Error ? err.message : "Garderobe konnte nicht zugewiesen werden.");
              reject(err);
            }
          });
        });
      }}
      onDeselectResource={(participantId, resourceId) => {
        const allocation = participants
          .find((p) => p.id === participantId)
          ?.dressingRoomAllocations.find((a) => a.facilityResourceId === resourceId);
        if (!allocation) return;
        onError(null);
        return new Promise<void>((resolve, reject) => {
          startTransition(async () => {
            try {
              await removeDressingRoom(participantId, allocation.id);
              resolve();
            } catch (err) {
              onError(err instanceof Error ? err.message : "Garderobe konnte nicht entfernt werden.");
              reject(err);
            }
          });
        });
      }}
    />
  );
}

"use client";

import { useMemo, useTransition } from "react";
import { buildTournamentParticipantDressingRoomAvailabilityByParticipant } from "@/lib/planning/resource-occupancy-presentation";
import type { TournamentParticipantDto } from "@/lib/tournaments/types";
import {
  type FacilityGroup,
  type ResourceAvailabilityAnnotation,
} from "@/components/admin/training/FacilityResourceSelector";
import { CompactDressingRoomResourceSelector } from "@/components/admin/shared/planning/CompactOperationalResourceSelector";

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

  const dressingRoomAvailabilityByParticipant = useMemo(
    () =>
      buildTournamentParticipantDressingRoomAvailabilityByParticipant(
        dressingRoomAvailability,
        participants.map((p) => ({
          id: p.id,
          displayName: p.displayName,
          dressingRoomAllocations: p.dressingRoomAllocations,
        })),
      ),
    [dressingRoomAvailability, participants],
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
    <div className="space-y-4" data-testid="tournament-dressing-room-per-team-panel">
      {participants.map((participant) => (
        <div key={participant.id} className="space-y-2" data-testid={`tournament-dressing-room-team-${participant.id}`}>
          <p className="text-sm font-medium text-[var(--foreground)]">{participant.displayName}</p>
          {canManage ? (
            <CompactDressingRoomResourceSelector
              facilityGroups={dressingRoomFacilityGroups}
              selectedResourceIds={
                new Set(participant.dressingRoomAllocations.map((a) => a.facilityResourceId))
              }
              onSelect={(resourceId) => {
                onError(null);
                startTransition(async () => {
                  try {
                    await addDressingRoom(participant.id, resourceId);
                  } catch (err) {
                    onError(err instanceof Error ? err.message : "Garderobe konnte nicht zugewiesen werden.");
                  }
                });
              }}
              onDeselect={(resourceId) => {
                const allocation = participant.dressingRoomAllocations.find(
                  (a) => a.facilityResourceId === resourceId,
                );
                if (!allocation) return;
                onError(null);
                startTransition(async () => {
                  try {
                    await removeDressingRoom(participant.id, allocation.id);
                  } catch (err) {
                    onError(err instanceof Error ? err.message : "Garderobe konnte nicht entfernt werden.");
                  }
                });
              }}
              disabled={isPending}
              availabilityByResourceId={dressingRoomAvailabilityByParticipant.get(participant.id)}
              layout="aggregated"
              testId={`tournament-resources-dressing-room-${participant.id}`}
            />
          ) : (
            <p className="text-xs text-[var(--text-2)]">
              {participant.dressingRoomAllocations.map((a) => a.facilityResourceName).join(", ") ||
                "Keine Garderobe"}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

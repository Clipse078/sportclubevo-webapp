"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Pencil, Shirt, Trash2, UsersRound } from "lucide-react";
import type { TournamentHomeAway, TournamentParticipantDto } from "@/lib/tournaments/types";
import {
  FacilityResourceSelector,
  type FacilityGroup,
  type ResourceAvailabilityAnnotation,
} from "@/components/admin/training/FacilityResourceSelector";
import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";
import { cn } from "@/lib/cn";
import TournamentParticipantAddWorkflow from "./TournamentParticipantAddWorkflow";
import type { ExternalClubPickerResult } from "./ExternalClubPicker";

type TeamOption = {
  id: string;
  name: string;
  ageGroup: string | null;
  genderGroup: string | null;
  isActive: boolean;
};

type Props = {
  tournamentId: string;
  canManage: boolean;
  homeAway: TournamentHomeAway;
  initialParticipants: TournamentParticipantDto[];
  dressingRoomFacilityGroups: FacilityGroup[];
  dressingRoomAvailability?: Map<string, ResourceAvailabilityAnnotation>;
  tenantLogoUrl?: string | null;
};

function participantMainLabel(participant: TournamentParticipantDto): string {
  if (participant.kind === "EXTERNAL_CLUB" && participant.externalClub) {
    return participant.externalClub.club.name;
  }
  return participant.displayName;
}

function participantSubLabel(participant: TournamentParticipantDto): string | null {
  if (participant.kind === "TEAM" && participant.team) {
    const suffix = [participant.team.ageGroup, participant.team.genderGroup].filter(Boolean).join(" / ");
    return suffix || "FC Allschwil Team";
  }
  if (participant.kind === "EXTERNAL_CLUB" && participant.externalClub) {
    return participant.externalClub.rawDisplayName;
  }
  if (participant.kind === "EXTERNAL_TEAM" && participant.externalTeam) {
    const parts = [participant.externalTeam.club.name, participant.externalTeam.categoryLabel].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : null;
  }
  return "Manuell erfasst";
}

function participantLogoUrl(participant: TournamentParticipantDto, tenantLogoUrl: string | null): string | null {
  if (participant.logoUrl) return participant.logoUrl;
  if (participant.kind === "TEAM") return tenantLogoUrl;
  return null;
}

export default function TournamentParticipantsEditor({
  tournamentId,
  canManage,
  homeAway,
  initialParticipants,
  dressingRoomFacilityGroups,
  dressingRoomAvailability,
  tenantLogoUrl = null,
}: Props) {
  const [participants, setParticipants] = useState<TournamentParticipantDto[]>(initialParticipants);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const [displayNameEdits, setDisplayNameEdits] = useState<Record<string, string>>({});

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!canManage) return;
    let active = true;

    async function load() {
      setTeamsLoading(true);
      try {
        const teamsRes = await fetch("/api/teams", { cache: "no-store" });
        const teamsData = (await teamsRes.json().catch(() => null)) as TeamOption[] | null;
        if (!active) return;
        setTeams(Array.isArray(teamsData) ? teamsData.filter((t) => t.isActive) : []);
      } finally {
        if (active) setTeamsLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [canManage]);

  const assignedTeamIds = useMemo(
    () => new Set(participants.map((p) => p.team?.id).filter((id): id is string => !!id)),
    [participants],
  );

  const availableTeams = teams.filter((t) => !assignedTeamIds.has(t.id));

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addParticipant = useCallback(
    (body: { teamId?: string } | { externalClubId?: string; displayName?: string } | { manualLabel?: string }) => {
      setError(null);
      startTransition(async () => {
        try {
          const res = await fetch(`/api/tournaments/${tournamentId}/participants`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = (await res.json().catch(() => null)) as
            | { participant?: TournamentParticipantDto; error?: string }
            | null;
          if (!res.ok || !data?.participant) {
            throw new Error(data?.error ?? "Teilnehmer konnte nicht hinzugefügt werden.");
          }
          setParticipants((prev) => [...prev, data.participant as TournamentParticipantDto]);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Teilnehmer konnte nicht hinzugefügt werden.");
        }
      });
    },
    [tournamentId],
  );

  const saveDisplayName = useCallback(
    (participantId: string, value: string) => {
      setError(null);
      startTransition(async () => {
        try {
          const res = await fetch(`/api/tournaments/${tournamentId}/participants/${participantId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayName: value }),
          });
          const data = (await res.json().catch(() => null)) as
            | { participant?: TournamentParticipantDto; error?: string }
            | null;
          if (!res.ok || !data?.participant) {
            throw new Error(data?.error ?? "Anzeigename konnte nicht gespeichert werden.");
          }
          const updated = data.participant;
          setParticipants((prev) => prev.map((p) => (p.id === participantId ? updated : p)));
          setDisplayNameEdits((prev) => {
            const next = { ...prev };
            delete next[participantId];
            return next;
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Anzeigename konnte nicht gespeichert werden.");
        }
      });
    },
    [tournamentId],
  );

  const removeParticipant = useCallback(
    (participantId: string) => {
      setError(null);
      startTransition(async () => {
        try {
          const res = await fetch(`/api/tournaments/${tournamentId}/participants/${participantId}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => null)) as { error?: string } | null;
            throw new Error(data?.error ?? "Teilnehmer konnte nicht entfernt werden.");
          }
          setParticipants((prev) => prev.filter((p) => p.id !== participantId));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Teilnehmer konnte nicht entfernt werden.");
        }
      });
    },
    [tournamentId],
  );

  const addDressingRoom = useCallback(
    async (participantId: string, facilityResourceId: string) => {
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
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === participantId
            ? { ...p, dressingRoomAllocations: [...p.dressingRoomAllocations, data.allocation!] }
            : p,
        ),
      );
    },
    [tournamentId],
  );

  const removeDressingRoom = useCallback(
    async (participantId: string, allocationId: string) => {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/participants/${participantId}/dressing-room-allocations/${allocationId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Garderobe konnte nicht entfernt werden.");
      }
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === participantId
            ? {
                ...p,
                dressingRoomAllocations: p.dressingRoomAllocations.filter((a) => a.id !== allocationId),
              }
            : p,
        ),
      );
    },
    [tournamentId],
  );

  const dressingSummary = (participant: TournamentParticipantDto) => {
    if (homeAway !== "HOME") return null;
    if (participant.dressingRoomAllocations.length === 0) return "Keine Garderobe";
    return participant.dressingRoomAllocations.map((a) => a.facilityResourceName).join(", ");
  };

  return (
    <div className="space-y-4" data-testid="tournament-participants-editor">
      {participants.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-[var(--border)] py-8 text-center">
          <UsersRound className="mx-auto mb-2 h-6 w-6 text-[var(--muted)]" aria-hidden />
          <p className="text-sm text-[var(--text-2)]">Noch keine Teams zugeordnet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]" data-testid="tournament-participant-list">
          {participants.map((participant) => {
            const expanded = expandedIds.has(participant.id);
            const needsExpand =
              participant.kind === "EXTERNAL_CLUB" ||
              (homeAway === "HOME" && canManage) ||
              (homeAway === "HOME" && participant.dressingRoomAllocations.length > 0);
            const summary = dressingSummary(participant);

            return (
              <li
                key={participant.id}
                data-testid={`tournament-participant-row-${participant.id}`}
                className="bg-[var(--surface)]"
              >
                <div className="flex items-center gap-2 px-3 py-2.5">
                  {needsExpand ? (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(participant.id)}
                      className="shrink-0 rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)]"
                      aria-expanded={expanded}
                      aria-label={expanded ? "Details einklappen" : "Details bearbeiten"}
                    >
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  ) : (
                    <span className="w-6 shrink-0" aria-hidden />
                  )}

                  <ClubLogo
                    logoUrl={participantLogoUrl(participant, tenantLogoUrl)}
                    name={participantMainLabel(participant)}
                    size="sm"
                    bare
                    className="h-8 w-8 shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {participantMainLabel(participant)}
                    </p>
                    <p className="truncate text-xs text-[var(--text-2)]">
                      {participantSubLabel(participant)}
                      {summary ? ` · ${summary}` : null}
                    </p>
                  </div>

                  {canManage && needsExpand && !expanded ? (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(participant.id)}
                      className="shrink-0 rounded p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                      aria-label="Bearbeiten"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  ) : null}

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => removeParticipant(participant.id)}
                      disabled={isPending}
                      aria-label={`${participant.displayName} entfernen`}
                      data-testid={`tournament-participant-remove-${participant.id}`}
                      className="shrink-0 rounded p-1.5 text-[var(--muted)] transition hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {expanded && (
                  <div className="border-t border-[var(--border)] bg-[var(--surface-2)]/30 px-3 py-3">
                    {participant.kind === "EXTERNAL_CLUB" && (
                      <label className="block max-w-md space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                          Anzeigename
                        </span>
                        <input
                          type="text"
                          value={displayNameEdits[participant.id] ?? participant.externalClub?.rawDisplayName ?? ""}
                          onChange={(e) =>
                            setDisplayNameEdits((prev) => ({ ...prev, [participant.id]: e.target.value }))
                          }
                          onBlur={(e) => {
                            if (!canManage) return;
                            const current = participant.externalClub?.rawDisplayName ?? "";
                            if (e.target.value === current) return;
                            saveDisplayName(participant.id, e.target.value);
                          }}
                          disabled={!canManage || isPending}
                          placeholder={participant.externalClub?.club.name ?? "z. B. Gelb, E1"}
                          data-testid={`tournament-participant-${participant.id}-display-name`}
                          className="fca-input"
                        />
                      </label>
                    )}

                    {homeAway === "HOME" && (
                      <div className={cn(participant.kind === "EXTERNAL_CLUB" && "mt-3")}>
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                          <Shirt className="h-3.5 w-3.5" aria-hidden />
                          Garderobe
                        </p>

                        {participant.dressingRoomAllocations.length > 0 && (
                          <ul className="mb-2 flex flex-wrap gap-1.5">
                            {participant.dressingRoomAllocations.map((allocation) => (
                              <li
                                key={allocation.id}
                                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--text-2)]"
                              >
                                {allocation.facilityResourceName}
                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setError(null);
                                      startTransition(async () => {
                                        try {
                                          await removeDressingRoom(participant.id, allocation.id);
                                        } catch (err) {
                                          setError(
                                            err instanceof Error
                                              ? err.message
                                              : "Garderobe konnte nicht entfernt werden.",
                                          );
                                        }
                                      });
                                    }}
                                    disabled={isPending}
                                    aria-label={`Garderobe ${allocation.facilityResourceName} entfernen`}
                                    className="text-[var(--muted)] hover:text-rose-600"
                                  >
                                    ×
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}

                        {canManage && (
                          <FacilityResourceSelector
                            facilityGroups={dressingRoomFacilityGroups}
                            allocatedResourceIds={
                              new Set(participant.dressingRoomAllocations.map((a) => a.facilityResourceId))
                            }
                            onAdd={(resourceId) => addDressingRoom(participant.id, resourceId)}
                            placeholder="Garderobe auswählen…"
                            addButtonLabel="Zuweisen"
                            availabilityByResourceId={dressingRoomAvailability}
                            testId={`tournament-participant-${participant.id}-dressing-room`}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p className="text-sm text-[var(--sce-danger)]" role="alert">
          {error}
        </p>
      )}

      {canManage && (
        <TournamentParticipantAddWorkflow
          availableTeams={availableTeams}
          teamsLoading={teamsLoading}
          tenantLogoUrl={tenantLogoUrl}
          pending={isPending}
          onAddTeam={(teamId) => addParticipant({ teamId })}
          onAddExternalClub={(club: ExternalClubPickerResult) =>
            addParticipant({ externalClubId: club.id, displayName: "" })
          }
          onAddManual={(label) => addParticipant({ manualLabel: label })}
        />
      )}
    </div>
  );
}

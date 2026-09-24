"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Pencil, Trash2, UsersRound } from "lucide-react";
import {
  TournamentDressingRoomLabelIcon,
  TournamentTeamLogo,
} from "@/components/admin/tournamentcenter/tournament-semantic-icons";
import type { TournamentHomeAway, TournamentParticipantDto } from "@/lib/tournaments/types";
import { type FacilityGroup, type ResourceAvailabilityAnnotation } from "@/components/admin/training/FacilityResourceSelector";
import { CompactDressingRoomResourceSelector } from "@/components/admin/shared/planning/CompactOperationalResourceSelector";
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
  /** When true, dressing-room allocation UI lives in the Ressourcen section instead. */
  hideDressingRoomAllocation?: boolean;
  onParticipantsChange?: (participants: TournamentParticipantDto[]) => void;
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
  hideDressingRoomAllocation = false,
  onParticipantsChange,
}: Props) {
  const [participants, setParticipants] = useState<TournamentParticipantDto[]>(initialParticipants);

  const syncParticipants = useCallback(
    (next: TournamentParticipantDto[] | ((prev: TournamentParticipantDto[]) => TournamentParticipantDto[])) => {
      setParticipants((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        onParticipantsChange?.(resolved);
        return resolved;
      });
    },
    [onParticipantsChange],
  );

  useEffect(() => {
    onParticipantsChange?.(initialParticipants);
  }, [initialParticipants, onParticipantsChange]);
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
          syncParticipants((prev) => [...prev, data.participant as TournamentParticipantDto]);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Teilnehmer konnte nicht hinzugefügt werden.");
        }
      });
    },
    [tournamentId, syncParticipants],
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
          syncParticipants((prev) => prev.map((p) => (p.id === participantId ? updated : p)));
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
    [tournamentId, syncParticipants],
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
          syncParticipants((prev) => prev.filter((p) => p.id !== participantId));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Teilnehmer konnte nicht entfernt werden.");
        }
      });
    },
    [tournamentId, syncParticipants],
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
      syncParticipants((prev) =>
        prev.map((p) =>
          p.id === participantId
            ? { ...p, dressingRoomAllocations: [...p.dressingRoomAllocations, data.allocation!] }
            : p,
        ),
      );
    },
    [tournamentId, syncParticipants],
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
      syncParticipants((prev) =>
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
    [tournamentId, syncParticipants],
  );

  const dressingBadge = (participant: TournamentParticipantDto) => {
    if (homeAway !== "HOME") return null;
    if (participant.dressingRoomAllocations.length === 0) {
      return (
        <span className="shrink-0 rounded border border-dashed border-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">
          —
        </span>
      );
    }
    const label = participant.dressingRoomAllocations.map((a) => a.facilityResourceName).join(", ");
    return (
      <span
        className="max-w-[7rem] shrink-0 truncate rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--text-2)]"
        title={label}
      >
        {label}
      </span>
    );
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
              (!hideDressingRoomAllocation &&
                homeAway === "HOME" &&
                (canManage || participant.dressingRoomAllocations.length > 0));
            return (
              <li
                key={participant.id}
                data-testid={`tournament-participant-row-${participant.id}`}
                className="bg-[var(--surface)] transition-colors duration-150"
              >
                <div className="flex items-center gap-2 px-2.5 py-2">
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

                  <TournamentTeamLogo
                    logoUrl={participantLogoUrl(participant, tenantLogoUrl)}
                    name={participantMainLabel(participant)}
                    className="h-7 w-7 shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight text-[var(--foreground)]">
                      {participantMainLabel(participant)}
                    </p>
                    <p className="truncate text-[11px] leading-tight text-[var(--text-2)]">
                      {participantSubLabel(participant)}
                    </p>
                  </div>

                  {!hideDressingRoomAllocation ? dressingBadge(participant) : null}

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
                  <div className="border-t border-[var(--border)] bg-[var(--surface-2)]/40 px-2.5 py-2">
                    {participant.kind === "EXTERNAL_CLUB" && (
                      <label className="block max-w-sm space-y-1">
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

                    {!hideDressingRoomAllocation && homeAway === "HOME" && (
                      <div className={cn(participant.kind === "EXTERNAL_CLUB" && "mt-2")}>
                        <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                          <TournamentDressingRoomLabelIcon />
                          Garderobe
                        </p>

                        {canManage ? (
                          <CompactDressingRoomResourceSelector
                            facilityGroups={dressingRoomFacilityGroups}
                            selectedResourceIds={
                              new Set(participant.dressingRoomAllocations.map((a) => a.facilityResourceId))
                            }
                            onSelect={(resourceId) => {
                              setError(null);
                              startTransition(async () => {
                                try {
                                  await addDressingRoom(participant.id, resourceId);
                                } catch (err) {
                                  setError(
                                    err instanceof Error ? err.message : "Garderobe konnte nicht zugewiesen werden.",
                                  );
                                }
                              });
                            }}
                            onDeselect={(resourceId) => {
                              const allocation = participant.dressingRoomAllocations.find(
                                (a) => a.facilityResourceId === resourceId,
                              );
                              if (!allocation) return;
                              setError(null);
                              startTransition(async () => {
                                try {
                                  await removeDressingRoom(participant.id, allocation.id);
                                } catch (err) {
                                  setError(
                                    err instanceof Error ? err.message : "Garderobe konnte nicht entfernt werden.",
                                  );
                                }
                              });
                            }}
                            disabled={isPending}
                            availabilityByResourceId={dressingRoomAvailability}
                            layout="aggregated"
                            testId={`tournament-participant-${participant.id}-dressing-room`}
                          />
                        ) : (
                          <p className="text-xs text-[var(--text-2)]">
                            {participant.dressingRoomAllocations.map((a) => a.facilityResourceName).join(", ") ||
                              "Keine Garderobe"}
                          </p>
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

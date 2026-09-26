"use client";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";

/**
 * components/admin/tournamentcenter/TournamentCreateForm.tsx
 *
 * TOURNAMENTCENTER-01D — dedicated TournamentCenter creation workflow.
 *
 * Replaces the generic TournamentEventCreateForm on
 * /dashboard/tournamentcenter/new with a form that captures the canonical
 * multi-team participation, Spielfeld/Halle allocation, and per-team
 * Garderobe allocation (TOURNAMENTCENTER-01B architecture) directly during
 * creation — instead of forcing a second "edit tournament" trip.
 *
 * Participants / resources / dressing rooms are collected as local drafts
 * (no tournamentId exists yet). On submit, the drafts are sent through
 * lib/tournaments/create-tournament-orchestration.ts, which sequences the
 * EXISTING, already-reviewed API calls:
 *   1. POST /api/events (type=TOURNAMENT)
 *   2. POST /api/tournaments/:id/participants (per participant)
 *   3. POST /api/tournaments/:id/resource-allocations (HOME only)
 *   4. POST /api/tournaments/:id/participants/:id/dressing-room-allocations (HOME only)
 *
 * This is orchestration, not a new transaction/job framework — if a later
 * step fails, the Event and everything already created remain real and
 * editable via the existing TournamentCenter edit flow (see the inline
 * partial-failure banner below).
 */

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Loader2, Pencil, Trash2, UsersRound } from "lucide-react";
import TurniereRecordSection from "@/components/admin/tournamentcenter/record/TurniereRecordSection";
import TurniereRecordWorkspaceShell from "@/components/admin/tournamentcenter/record/TurniereRecordWorkspaceShell";
import { TURNIERE_RECORD_WORKSPACE_SURFACE_CLASS } from "@/components/admin/tournamentcenter/record/turniere-record-layout";
import TournamentStandardDurationHint from "@/components/admin/tournamentcenter/TournamentStandardDurationHint";
import {
  TournamentDressingRoomLabelIcon,
  TournamentTeamLogo,
} from "@/components/admin/tournamentcenter/tournament-semantic-icons";
import StaticOptionSearchablePicker from "@/components/admin/shared/StaticOptionSearchablePicker";
import { HomeAwaySegmentedControl } from "@/components/admin/shared/HomeAwaySegmentedControl";
import TournamentPublicationToggles from "@/components/admin/tournamentcenter/TournamentPublicationToggles";
import PlanningEditorOperationalWorkspace from "@/components/admin/shared/planning-editor/PlanningEditorOperationalWorkspace";
import PlanningPublicationPanel from "@/components/admin/shared/planning-editor/PlanningPublicationPanel";
import PlanningEditorWorkSection from "@/components/admin/shared/planning-editor/PlanningEditorWorkSection";
import PlanningEditorCollaborationSection from "@/components/admin/shared/planning-editor/PlanningEditorCollaborationSection";
import PlanningEditorZeitstandardLink from "@/components/admin/shared/planning-editor/PlanningEditorZeitstandardLink";
import TournamentParticipantAddWorkflow from "@/components/admin/tournamentcenter/TournamentParticipantAddWorkflow";
import { cn } from "@/lib/cn";
import {
  type FacilityGroup,
  type ResourceAvailabilityAnnotation,
} from "@/components/admin/training/FacilityResourceSelector";
import { PlanningSingleResourceAssignment } from "@/components/admin/shared/planning/PlanningSingleResourceAssignment";
import { PlanningSubjectDressingRoomAssignments } from "@/components/admin/shared/planning/PlanningSubjectDressingRoomAssignments";
import {
  orchestrateTournamentCreation,
  type TournamentCreationOrchestrationResult,
  type TournamentDressingRoomAllocationDraft,
  type TournamentParticipantDraft,
  type TournamentParticipantDraftKind,
  type TournamentResourceAllocationDraft,
} from "@/lib/tournaments/create-tournament-orchestration";
import type { ExternalClubPickerResult } from "./ExternalClubPicker";
import TournamentOrganizerClubField from "./TournamentOrganizerClubField";
import { organizerNameFromPickerSelection } from "@/lib/tournaments/organizer-picker-state";

// ── Types ──────────────────────────────────────────────────────────────────

type SeasonItem = {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
};

type TeamOption = {
  id: string;
  name: string;
  ageGroup: string | null;
  genderGroup: string | null;
  isActive: boolean;
};

/** TOURNAMENTCENTER-UX-03 — canonical external-participant club source, same eligible universe as /dashboard/vereine. */
type ExternalClubOption = ExternalClubPickerResult;

type ParticipantDraftRow = {
  localId: string;
  kind: TournamentParticipantDraftKind;
  teamId?: string;
  externalClubId?: string;
  /** Canonical club name — only set for kind === "EXTERNAL_CLUB" (fallback + subLabel source). */
  clubName?: string;
  /** Raw, editable "Anzeigename" input value — only meaningful for kind === "EXTERNAL_CLUB". */
  externalClubDisplayName?: string;
  /** Canonical club crest when kind === EXTERNAL_CLUB. */
  externalClubLogoUrl?: string | null;
  manualLabel?: string;
  displayName: string;
  subLabel: string | null;
  dressingRooms: Array<{ facilityResourceId: string; facilityResourceName: string; facilityName: string }>;
};

type ResourceDraftRow = {
  localId: string;
  facilityResourceId: string;
  facilityResourceName: string;
  facilityName: string;
};

/** Shape of one row in GET /api/facilities/availability's `availability` array. */
type ResourceAvailabilityRow = ResourceAvailabilityAnnotation & { resourceId: string };

type TournamentCreateFormProps = {
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
  tenantLogoUrl?: string | null;
  defaultTournamentDurationMinutes: number;
  canManageFacilitiesTimeStandards?: boolean;
};

function resolveResourceDisplay(
  facilityGroups: FacilityGroup[],
  facilityResourceId: string,
): { name: string; facilityName: string } {
  for (const group of facilityGroups) {
    const resource = group.resources.find((r) => r.id === facilityResourceId);
    if (resource) {
      return { name: resource.name, facilityName: group.facilityName };
    }
  }
  return { name: facilityResourceId, facilityName: "" };
}

let localIdCounter = 0;
function nextLocalId(prefix: string): string {
  localIdCounter += 1;
  return `${prefix}-${localIdCounter}`;
}

export default function TournamentCreateForm({
  pitchHallFacilityGroups,
  dressingRoomFacilityGroups,
  tenantLogoUrl = null,
  defaultTournamentDurationMinutes,
  canManageFacilitiesTimeStandards = false,
}: TournamentCreateFormProps) {
  const router = useRouter();
  const formId = useId();

  // ── Turnier fields ─────────────────────────────────────────────────────
  const [seasonId, setSeasonId] = useState("");
  const [title, setTitle] = useState("Turnier");
  const [organizerSelection, setOrganizerSelection] = useState<ExternalClubPickerResult | null>(null);
  const [competitionLabel, setCompetitionLabel] = useState("");
  const [location, setLocation] = useState("");
  const [homeAway, setHomeAway] = useState<"HOME" | "AWAY">("HOME");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [resultLabel, setResultLabel] = useState("");
  const [description, setDescription] = useState("");
  const [remarks, setRemarks] = useState("");

  // ── Sichtbarkeit ───────────────────────────────────────────────────────
  const [websiteVisible, setWebsiteVisible] = useState(true);
  const [infoboardVisible, setInfoboardVisible] = useState(true);
  const [homepageVisible, setHomepageVisible] = useState(true);
  const [wochenplanVisible, setWochenplanVisible] = useState(true);
  const [teamPageVisible, setTeamPageVisible] = useState(true);

  // ── Reference data ─────────────────────────────────────────────────────
  const [seasonOptions, setSeasonOptions] = useState<SeasonItem[]>([]);
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);

  // ── Teilnehmende Teams (draft, pre-creation) ──────────────────────────
  const [participants, setParticipants] = useState<ParticipantDraftRow[]>([]);
  const [expandedParticipantIds, setExpandedParticipantIds] = useState<Set<string>>(new Set());

  // ── Ressourcen · Spielfeld/Halle (draft, pre-creation) ────────────────
  const [resources, setResources] = useState<ResourceDraftRow[]>([]);

  // ── PLANNING-CREATION-UX-01A: live Spielfeld/Halle + Garderobe availability
  // for the currently selected date/time, sourced from
  // lib/facilities/availability-service.ts. HOME-only — AWAY tournaments
  // never touch FCA facilities, so no availability lookup runs for them.
  const [pitchAvailability, setPitchAvailability] = useState<Map<string, ResourceAvailabilityAnnotation>>(new Map());
  const [dressingRoomAvailability, setDressingRoomAvailability] = useState<Map<string, ResourceAvailabilityAnnotation>>(
    new Map(),
  );

  // ── Submission ─────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partialResult, setPartialResult] = useState<TournamentCreationOrchestrationResult | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSeasons() {
      setLoadingSeasons(true);
      try {
        const res = await fetch("/api/seasons", { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as { seasons?: SeasonItem[] } | null;
        if (!res.ok) throw new Error((data as { error?: string } | null)?.error ?? "Saisons konnten nicht geladen werden.");
        if (!active || !data) return;
        const seasons = Array.isArray(data.seasons) ? data.seasons : [];
        setSeasonOptions(seasons);
        setSeasonId((seasons.find((s) => s.isActive) ?? seasons[0])?.id ?? "");
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.");
      } finally {
        if (active) setLoadingSeasons(false);
      }
    }

    async function loadTeams() {
      setLoadingTeams(true);
      try {
        // ORG-ACCESS-03: use writable-teams endpoint so scoped users see only
        // teams within their OrgUnit write scope; coordinators get all teams.
        const res = await fetch("/api/planning/writable-teams?domain=tournament", { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as
          | { teams?: TeamOption[] }
          | { error?: string }
          | null;
        if (!res.ok) throw new Error((data as { error?: string } | null)?.error ?? "Teams konnten nicht geladen werden.");
        if (!active) return;
        setTeamOptions((data as { teams?: TeamOption[] } | null)?.teams ?? []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.");
      } finally {
        if (active) setLoadingTeams(false);
      }
    }

    // MASTERDATA-SELECTOR-CONSISTENCY-03 (BUG 2): the canonical ExternalClub
    // universe is deliberately NOT eagerly fetched here — see
    // ExternalClubPicker's module doc for why that was the root cause of
    // the truncated club list this replaces. ExternalClubPicker searches
    // GET /api/club-directory/clubs on demand instead.

    loadSeasons();
    loadTeams();

    return () => {
      active = false;
    };
  }, []);

  // PLANNING-CREATION-UX-01A: once Start (and optionally Ende) is known for
  // a HOME tournament, immediately show which Spielfeld/Halle and Garderobe
  // resources are Frei/Belegt for that exact interval — reusing the EXISTING
  // canonical booking sources (Training, Match, Tournament) via
  // GET /api/facilities/availability, never a new planning engine.
  useEffect(() => {
    if (homeAway !== "HOME" || !startAt) {
      setPitchAvailability(new Map());
      setDressingRoomAvailability(new Map());
      return;
    }

    let active = true;

    async function loadAvailability() {
      const params = new URLSearchParams({ startAt });
      if (endAt) params.set("endAt", endAt);

      async function fetchGroup(group: "PITCH_HALL" | "DRESSING_ROOM") {
        try {
          const res = await fetch(`/api/facilities/availability?${params.toString()}&group=${group}`, {
            cache: "no-store",
          });
          const data = (await res.json().catch(() => null)) as { availability?: ResourceAvailabilityRow[] } | null;
          if (!res.ok || !data?.availability) return new Map<string, ResourceAvailabilityAnnotation>();
          return new Map(data.availability.map((a) => [a.resourceId, a]));
        } catch {
          return new Map<string, ResourceAvailabilityAnnotation>();
        }
      }

      const [pitch, room] = await Promise.all([fetchGroup("PITCH_HALL"), fetchGroup("DRESSING_ROOM")]);
      if (!active) return;
      setPitchAvailability(pitch);
      setDressingRoomAvailability(room);
    }

    loadAvailability();

    return () => {
      active = false;
    };
  }, [homeAway, startAt, endAt]);

  const assignedTeamIds = useMemo(
    () => new Set(participants.map((p) => p.teamId).filter((id): id is string => !!id)),
    [participants],
  );

  const availableTeams = teamOptions.filter((t) => !assignedTeamIds.has(t.id));

  const addTeamParticipant = useCallback((teamId: string) => {
    const team = teamOptions.find((t) => t.id === teamId);
    if (!team) return;
    setParticipants((prev) => [
      ...prev,
      {
        localId: nextLocalId("participant"),
        kind: "TEAM",
        teamId: team.id,
        displayName: team.name,
        subLabel: [team.ageGroup, team.genderGroup].filter(Boolean).join(" / ") || null,
        dressingRooms: [],
      },
    ]);
  }, [teamOptions]);

  const addExternalClubParticipant = useCallback((selectedClub: ExternalClubOption) => {
    setParticipants((prev) => [
      ...prev,
      {
        localId: nextLocalId("participant"),
        kind: "EXTERNAL_CLUB",
        externalClubId: selectedClub.id,
        clubName: selectedClub.name,
        externalClubLogoUrl: selectedClub.logoUrl ?? null,
        externalClubDisplayName: "",
        displayName: selectedClub.name,
        subLabel: "Anzeigename noch nicht gesetzt — Klub wird angezeigt",
        dressingRooms: [],
      },
    ]);
  }, []);

  const updateExternalClubDisplayName = useCallback((localId: string, value: string) => {
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.localId !== localId) return p;
        const trimmed = value.trim();
        return {
          ...p,
          externalClubDisplayName: value,
          displayName: p.clubName ?? p.displayName,
          subLabel: trimmed ? trimmed : "Anzeigename noch nicht gesetzt — Klub wird angezeigt",
        };
      }),
    );
  }, []);

  const addManualParticipant = useCallback((trimmed: string) => {
    if (!trimmed) return;
    setParticipants((prev) => [
      ...prev,
      {
        localId: nextLocalId("participant"),
        kind: "MANUAL",
        manualLabel: trimmed,
        displayName: trimmed,
        subLabel: "Manuell erfasst — kein kanonisches Team verknüpft",
        dressingRooms: [],
      },
    ]);
  }, []);

  const toggleParticipantExpanded = (localId: string) => {
    setExpandedParticipantIds((prev) => {
      const next = new Set(prev);
      if (next.has(localId)) next.delete(localId);
      else next.add(localId);
      return next;
    });
  };

  function participantDraftLogo(participant: ParticipantDraftRow): string | null {
    if (participant.kind === "TEAM") return tenantLogoUrl;
    if (participant.kind === "EXTERNAL_CLUB") return participant.externalClubLogoUrl ?? null;
    return null;
  }

  const removeParticipant = useCallback((localId: string) => {
    setParticipants((prev) => prev.filter((p) => p.localId !== localId));
  }, []);

  const addDressingRoomDraft = useCallback((participantLocalId: string, facilityResourceId: string) => {
    const display = resolveResourceDisplay(dressingRoomFacilityGroups, facilityResourceId);
    setParticipants((prev) =>
      prev.map((p) =>
        p.localId === participantLocalId
          ? {
              ...p,
              dressingRooms: [
                { facilityResourceId, facilityResourceName: display.name, facilityName: display.facilityName },
              ],
            }
          : p,
      ),
    );
  }, [dressingRoomFacilityGroups]);

  const removeDressingRoomDraft = useCallback((participantLocalId: string, facilityResourceId: string) => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.localId === participantLocalId
          ? { ...p, dressingRooms: p.dressingRooms.filter((d) => d.facilityResourceId !== facilityResourceId) }
          : p,
      ),
    );
  }, []);

  const allocatedResourceIds = useMemo(() => new Set(resources.map((r) => r.facilityResourceId)), [resources]);

  const addResourceDraft = useCallback((facilityResourceId: string) => {
    const display = resolveResourceDisplay(pitchHallFacilityGroups, facilityResourceId);
    setResources((prev) => [
      ...prev,
      { localId: nextLocalId("resource"), facilityResourceId, facilityResourceName: display.name, facilityName: display.facilityName },
    ]);
  }, [pitchHallFacilityGroups]);

  const removeResourceDraft = useCallback((localId: string) => {
    setResources((prev) => prev.filter((r) => r.localId !== localId));
  }, []);

  // TOURNAMENTCENTER-01D-V: once a submission has partially failed, the
  // Event (and whatever else succeeded) already exists — resubmitting this
  // same form would call createEvent() again and re-add every draft
  // participant/resource, producing a second, duplicate Event instead of
  // "retrying" anything. The only safe way to finish an incomplete creation
  // is the existing TournamentCenter edit flow (see the banner below), so
  // the primary submit action is disabled until that partial result is
  // cleared (e.g. by editing a draft, which starts a fresh attempt).
  const hasUnresolvedPartialFailure =
    !!partialResult &&
    (partialResult.participantErrors.length > 0 ||
      partialResult.resourceAllocationErrors.length > 0 ||
      partialResult.dressingRoomAllocationErrors.length > 0);

  const canSubmit =
    !submitting &&
    !hasUnresolvedPartialFailure &&
    !!seasonId &&
    !!title.trim() &&
    !!startAt &&
    participants.length > 0;

  // PLANNING-CREATION-UX-01A: lightweight guided-creation nudge — a compact,
  // always-visible list of what's still missing before this tournament is
  // ready to submit. Not a wizard/gate — every section stays reachable and
  // editable regardless of this list; it only nudges.
  const missingItems = useMemo(() => {
    const items: string[] = [];
    if (!title.trim()) items.push("Titel angeben");
    if (!seasonId) items.push("Saison auswählen");
    if (!startAt) items.push("Start angeben");
    if (participants.length === 0) items.push("Mindestens ein teilnehmendes Team hinzufügen");

    if (homeAway === "HOME" && startAt) {
      if (resources.length === 0) items.push("Spielfeld / Halle zuweisen");
      for (const participant of participants) {
        if (participant.dressingRooms.length === 0) {
          items.push(`Garderobe für ${participant.displayName}`);
        }
      }
    }

    return items;
  }, [title, seasonId, startAt, participants, homeAway, resources.length]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (hasUnresolvedPartialFailure) {
      // Defense in depth — the button is disabled for this case, but a
      // native form submit (e.g. pressing Enter in a text field) still
      // calls this handler regardless of the button's disabled state.
      return;
    }

    setPartialResult(null);

    if (participants.length === 0) {
      setError("Mindestens ein teilnehmendes Team ist erforderlich.");
      return;
    }

    setSubmitting(true);

    // The legacy Event.teamId "Hauptteam" compatibility field is derived
    // from the first FCA Team participant (if any) — never a second,
    // parallel single-team model. See TOURNAMENTCENTER-01D task notes.
    const primaryTeamId = participants.find((p) => p.kind === "TEAM")?.teamId ?? null;

    try {
      const result = await orchestrateTournamentCreation(
        {
          homeAway,
          participants: participants.map<TournamentParticipantDraft>((p) => ({
            localId: p.localId,
            kind: p.kind,
            teamId: p.teamId,
            externalClubId: p.externalClubId,
            displayName: p.externalClubDisplayName,
            manualLabel: p.manualLabel,
          })),
          resourceAllocations: resources.map<TournamentResourceAllocationDraft>((r) => ({
            localId: r.localId,
            facilityResourceId: r.facilityResourceId,
          })),
          dressingRoomAllocations: participants.flatMap<TournamentDressingRoomAllocationDraft>((p) =>
            p.dressingRooms.map((d) => ({ participantLocalId: p.localId, facilityResourceId: d.facilityResourceId })),
          ),
        },
        {
          createEvent: async () => {
            const res = await fetch("/api/events", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "TOURNAMENT",
                source: "MANUAL",
                seasonId,
                teamId: primaryTeamId,
                title: title.trim(),
                description: description.trim() || null,
                location: location.trim() || null,
                startAt,
                endAt: endAt || null,
                meetingTime: meetingTime || null,
                organizerName: organizerNameFromPickerSelection(organizerSelection),
                competitionLabel: competitionLabel.trim() || null,
                homeAway,
                resultLabel: resultLabel.trim() || null,
                remarks: remarks.trim() || null,
                websiteVisible,
                infoboardVisible,
                homepageVisible,
                wochenplanVisible,
                trainingsplanVisible: false,
                teamPageVisible,
              }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
              throw new Error(data?.error ?? "Turnier konnte nicht erstellt werden.");
            }
            const tournamentId = data?.eventIds?.[0];
            if (!tournamentId) {
              throw new Error("Turnier wurde erstellt, aber es wurde keine ID zurückgegeben.");
            }
            return tournamentId as string;
          },
          addParticipant: async (tournamentId, draft) => {
            const body =
              draft.kind === "TEAM"
                ? { teamId: draft.teamId }
                : draft.kind === "EXTERNAL_CLUB"
                  ? { externalClubId: draft.externalClubId, displayName: draft.displayName ?? "" }
                  : draft.kind === "EXTERNAL_TEAM"
                    ? { externalTeamId: draft.externalTeamId }
                    : { manualLabel: draft.manualLabel };
            const res = await fetch(`/api/tournaments/${tournamentId}/participants`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            const data = (await res.json().catch(() => null)) as { participant?: { id: string }; error?: string } | null;
            if (!res.ok || !data?.participant) {
              throw new Error(data?.error ?? "Teilnehmer konnte nicht angelegt werden.");
            }
            return data.participant.id;
          },
          addResourceAllocation: async (tournamentId, draft) => {
            const res = await fetch(`/api/tournaments/${tournamentId}/resource-allocations`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ facilityResourceId: draft.facilityResourceId }),
            });
            const data = (await res.json().catch(() => null)) as { allocation?: unknown; error?: string } | null;
            if (!res.ok || !data?.allocation) {
              throw new Error(data?.error ?? "Ressource konnte nicht zugewiesen werden.");
            }
          },
          addDressingRoomAllocation: async (tournamentId, participantId, draft) => {
            const res = await fetch(
              `/api/tournaments/${tournamentId}/participants/${participantId}/dressing-room-allocations`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ facilityResourceId: draft.facilityResourceId }),
              },
            );
            const data = (await res.json().catch(() => null)) as { allocation?: unknown; error?: string } | null;
            if (!res.ok || !data?.allocation) {
              throw new Error(data?.error ?? "Garderobe konnte nicht zugewiesen werden.");
            }
          },
        },
      );

      if (result.ok) {
        router.push("/dashboard/tournamentcenter?submitted=1");
        router.refresh();
        return;
      }

      // The Event (and whatever succeeded) is real — keep the admin on this
      // page with a clear path to finish up, instead of pretending nothing
      // happened or silently dropping the failed pieces.
      setPartialResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Turnier konnte nicht erstellt werden.");
    } finally {
      setSubmitting(false);
    }
  }

  const totalStepErrors = partialResult
    ? partialResult.participantErrors.length +
      partialResult.resourceAllocationErrors.length +
      partialResult.dressingRoomAllocationErrors.length
    : 0;

  const seasonPickerOptions = useMemo(
    () =>
      seasonOptions.map((season) => ({
        value: season.id,
        label: `${season.name}${season.isActive ? " (aktuell)" : ""}`,
      })),
    [seasonOptions],
  );

  const publication = {
    websiteVisible,
    infoboardVisible,
    homepageVisible,
    wochenplanVisible,
    teamPageVisible,
  };

  const createHeader = (
    <div className="flex flex-col gap-4 pt-1 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Turnier erstellen</p>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">Neues Turnier</h1>
        <p className="text-sm text-[var(--text-2)]">
          Teilnehmende Teams, Spielfeld/Halle und Garderoben werden direkt bei der Erstellung erfasst.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => router.push("/dashboard/tournamentcenter")}
          className="fca-button-secondary"
          data-testid="tournament-create-cancel"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          data-testid="tournament-create-submit"
          title={
            hasUnresolvedPartialFailure
              ? 'Turnier wurde bereits angelegt — bitte über "Zum Turnier wechseln und korrigieren" fortsetzen.'
              : undefined
          }
          className="fca-button-primary"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Wird erstellt…
            </>
          ) : (
            "Turnier erstellen"
          )}
        </button>
      </div>
    </div>
  );

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4" data-testid="tournament-create-form">
      <TurniereRecordWorkspaceShell
        breadcrumbs={[
          { label: "Planung", href: "/dashboard/planner/week" },
          { label: "Turniere", href: "/dashboard/tournamentcenter" },
          { label: "Neues Turnier" },
        ]}
        header={createHeader}
        testId="turniere-tournament-create-workspace"
      >
      {missingItems.length > 0 ? (
        <div
          className="fca-status-box fca-status-box-muted text-sm"
          data-testid="tournament-create-guided-progress"
        >
          <p className="font-semibold">
            Noch {missingItems.length} {missingItems.length === 1 ? "Angabe fehlt" : "Angaben fehlen"}
          </p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5" data-testid="tournament-create-guided-progress-list">
            {missingItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div
          className="fca-status-box fca-status-box-success text-sm"
          data-testid="tournament-create-guided-progress"
        >
          Alle Angaben vollständig — bereit zum Einreichen.
        </div>
      )}

      <PlanningEditorOperationalWorkspace
        testId="tournament-create-operational-workspace"
        secondaryRail={
          <PlanningPublicationPanel testId="tournament-create-publication-panel">
            <TournamentPublicationToggles
              value={publication}
              onChange={(patch) => {
                if (patch.websiteVisible !== undefined) setWebsiteVisible(patch.websiteVisible);
                if (patch.infoboardVisible !== undefined) setInfoboardVisible(patch.infoboardVisible);
                if (patch.homepageVisible !== undefined) setHomepageVisible(patch.homepageVisible);
                if (patch.wochenplanVisible !== undefined) setWochenplanVisible(patch.wochenplanVisible);
                if (patch.teamPageVisible !== undefined) setTeamPageVisible(patch.teamPageVisible);
              }}
              testIdPrefix="tournament-create-publication"
              showHeading={false}
            />
          </PlanningPublicationPanel>
        }
        primary={
      <div className={`${TURNIERE_RECORD_WORKSPACE_SURFACE_CLASS} divide-y divide-[var(--border)]/80`}>
      <TurniereRecordSection title="Grunddaten" testId="turniere-create-section-grunddaten">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-2 sm:col-span-2">
            <span className="fca-label">Titel</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="fca-input"
              required
              data-testid="tournament-create-title"
            />
          </label>

          <label className="block space-y-2">
            <span className="fca-label">Saison</span>
            <StaticOptionSearchablePicker
              options={seasonPickerOptions}
              value={seasonId}
              onChange={setSeasonId}
              disabled={loadingSeasons}
              required
              testId="tournament-create-season"
              placeholder={loadingSeasons ? "Saisons laden…" : "Saison auswählen…"}
            />
          </label>

          <label className="block space-y-2">
            <span className="fca-label">Wettbewerb / Label</span>
            <input
              type="text"
              value={competitionLabel}
              onChange={(e) => setCompetitionLabel(e.target.value)}
              className="fca-input"
              placeholder="z. B. Hallenturnier / Playmore Turnier"
            />
          </label>

          <TournamentOrganizerClubField
            selected={organizerSelection}
            onChange={setOrganizerSelection}
            testId="tournament-create-organizer-club"
          />

          <label className="block space-y-2">
            <span className="fca-label">Ort</span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="fca-input"
              placeholder="z. B. Turnhalle Binningen"
            />
          </label>

          <label className="block space-y-2 sm:col-span-2">
            <span className="fca-label">Beschreibung</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="fca-textarea min-h-[88px]"
            />
          </label>

          <label className="block space-y-2 sm:col-span-2">
            <span className="fca-label">Bemerkungen</span>
            <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="fca-input" />
          </label>
        </div>
      </TurniereRecordSection>

      <TurniereRecordSection title="Termin" testId="turniere-create-section-termin">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="fca-label">Start</span>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="fca-input"
              required
              data-testid="tournament-create-start-at"
            />
          </label>

          <label className="block space-y-2">
            <span className="fca-label">Ende</span>
            <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="fca-input" />
          </label>

          <label className="block space-y-2">
            <span className="fca-label">Treffpunkt</span>
            <input
              type="datetime-local"
              value={meetingTime}
              onChange={(e) => setMeetingTime(e.target.value)}
              className="fca-input"
            />
          </label>

          <div className="sm:col-span-2">
            <TournamentStandardDurationHint
              defaultTournamentDurationMinutes={defaultTournamentDurationMinutes}
              canManageFacilitiesTimeStandards={canManageFacilitiesTimeStandards}
              testId="tournament-create-standard-duration"
            />
          </div>
        </div>
      </TurniereRecordSection>

      <TurniereRecordSection title="Format & Kategorie" testId="turniere-create-section-format">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="block space-y-2">
            <span className="fca-label" id="tournament-create-home-away-label">
              Heim / Auswärts
            </span>
            <HomeAwaySegmentedControl
              value={homeAway}
              onChange={setHomeAway}
              testId="tournament-create-home-away"
              aria-label="Heim / Auswärts"
            />
          </div>

          <label className="block space-y-2">
            <span className="fca-label">Resultat / Rang</span>
            <input
              type="text"
              value={resultLabel}
              onChange={(e) => setResultLabel(e.target.value)}
              className="fca-input"
              placeholder="z. B. 2. Platz"
            />
          </label>
        </div>
      </TurniereRecordSection>

      <TurniereRecordSection
        title="Teilnehmer"
        description="Mindestens ein Team — eigene Teams und Vereine aus dem Verzeichnis."
        testId="turniere-create-section-participants"
      >
        <div className="space-y-4">
          {participants.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-[var(--border)] py-8 text-center">
              <ProductDomainSceIcon name="member" size={24} className="mx-auto mb-2 h-6 w-6 text-[var(--muted)]" />
              <p className="text-sm text-[var(--text-2)]">Noch keine Teams zugeordnet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]" data-testid="tournament-create-participant-list">
              {participants.map((participant) => {
                const expanded = expandedParticipantIds.has(participant.localId);
                const needsExpand = participant.kind === "EXTERNAL_CLUB" || homeAway === "HOME";
                const dressingLabel =
                  homeAway === "HOME" && participant.dressingRooms.length > 0
                    ? participant.dressingRooms.map((d) => d.facilityResourceName).join(", ")
                    : null;

                return (
                  <li
                    key={participant.localId}
                    data-testid={`tournament-create-participant-row-${participant.localId}`}
                    className="bg-[var(--surface)] transition-colors duration-150"
                  >
                    <div className="flex items-center gap-2 px-2.5 py-2">
                      {needsExpand ? (
                        <button
                          type="button"
                          onClick={() => toggleParticipantExpanded(participant.localId)}
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
                        logoUrl={participantDraftLogo(participant)}
                        name={participant.displayName}
                        className="h-7 w-7 shrink-0"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold leading-tight text-[var(--foreground)]">
                          {participant.displayName}
                        </p>
                        <p className="truncate text-[11px] leading-tight text-[var(--text-2)]">{participant.subLabel}</p>
                      </div>

                      {homeAway === "HOME" ? (
                        dressingLabel ? (
                          <span
                            className="max-w-[7rem] shrink-0 truncate rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--text-2)]"
                            title={dressingLabel}
                          >
                            {dressingLabel}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded border border-dashed border-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">
                            —
                          </span>
                        )
                      ) : null}

                      {needsExpand && !expanded ? (
                        <button
                          type="button"
                          onClick={() => toggleParticipantExpanded(participant.localId)}
                          className="shrink-0 rounded p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)]"
                          aria-label="Bearbeiten"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => removeParticipant(participant.localId)}
                        aria-label={`${participant.displayName} entfernen`}
                        data-testid={`tournament-create-participant-remove-${participant.localId}`}
                        className="shrink-0 rounded p-1.5 text-[var(--muted)] hover:bg-rose-500/10 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
                              value={participant.externalClubDisplayName ?? ""}
                              onChange={(e) => updateExternalClubDisplayName(participant.localId, e.target.value)}
                              placeholder={participant.clubName ?? "z. B. Gelb, E1"}
                              data-testid={`tournament-create-participant-${participant.localId}-display-name`}
                              className="fca-input"
                            />
                          </label>
                        )}

                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <TournamentParticipantAddWorkflow
            availableTeams={availableTeams}
            teamsLoading={loadingTeams}
            tenantLogoUrl={tenantLogoUrl}
            onAddTeam={addTeamParticipant}
            onAddExternalClub={addExternalClubParticipant}
            onAddManual={addManualParticipant}
            teamSelectTestId="tournament-create-add-team"
            externalClubTestId="tournament-create-add-external-club-search"
            manualInputTestId="tournament-create-manual-input"
            manualButtonTestId="tournament-create-add-manual-button"
            noWritableTeamsMessage={
              !loadingTeams && teamOptions.length === 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                  Kein Team mit Schreibzugriff verfügbar. Bitte wenden Sie sich an die Koordination.
                </p>
              ) : null
            }
          />
        </div>
      </TurniereRecordSection>

      {homeAway === "HOME" && (
        <TurniereRecordSection title="Anlage & Ressourcen" testId="turniere-create-section-resources">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Spielfeld / Halle
              </p>
            <PlanningSingleResourceAssignment
              kind="pitch_hall"
              showSubjectLabel={false}
              subjectLabel="Spielfeld / Halle"
              resourceName={resources[0]?.facilityResourceName ?? null}
              unassignedLabel="Noch kein Spielfeld / keine Halle zugewiesen."
              facilityGroups={pitchHallFacilityGroups}
              selectedResourceIds={allocatedResourceIds}
              onSelect={addResourceDraft}
              onDeselect={(id) => {
                const row = resources.find((r) => r.facilityResourceId === id);
                if (row) removeResourceDraft(row.localId);
              }}
              availabilityByResourceId={pitchAvailability}
              canManage
              testId="tournament-create-resource"
            />
            </div>

            {participants.length > 0 ? (
              <div className="space-y-2">
                <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  <TournamentDressingRoomLabelIcon />
                  Garderoben
                </p>
                <PlanningSubjectDressingRoomAssignments
                  testId="tournament-create-dressing-room-assignments"
                  subjects={participants.map((p) => ({
                    id: p.localId,
                    displayName: p.displayName,
                    secondaryLabel: p.subLabel,
                    crest: (
                      <TournamentTeamLogo
                        logoUrl={participantDraftLogo(p)}
                        name={p.displayName}
                        size="sm"
                      />
                    ),
                    dressingRoomAllocations: p.dressingRooms.map((d) => ({
                      facilityResourceId: d.facilityResourceId,
                      facilityResourceName: d.facilityResourceName,
                    })),
                  }))}
                  canManage
                  facilityGroups={dressingRoomFacilityGroups}
                  dressingRoomAvailability={dressingRoomAvailability}
                  onSelectResource={(localId, resourceId) => addDressingRoomDraft(localId, resourceId)}
                  onDeselectResource={(localId, resourceId) => removeDressingRoomDraft(localId, resourceId)}
                />
              </div>
            ) : null}
          </div>
        </TurniereRecordSection>
      )}

      </div>
        }
      />

      <PlanningEditorWorkSection
        headingId="tournament-create-work-heading"
        testId="tournament-create-work-section"
        persisted={false}
        locale="de-CH"
        tasksPanel={null}
      />

      <PlanningEditorCollaborationSection
        headingId="tournament-create-collaboration-heading"
        testId="tournament-create-collaboration-section"
        persisted={false}
        tenantSlug=""
        canEdit={false}
        currentUserId={null}
        locale="de-CH"
        timezone="Europe/Zurich"
      />

      <div className="fca-status-box fca-status-box-muted text-xs">
        Neue Turniere werden vor der Veröffentlichung geprüft, sofern kein Freigabe-Recht vorliegt. Teams, Ressourcen
        und Garderoben aus diesem Formular werden dabei sofort mit dem Turnier angelegt.
      </div>

      {partialResult && totalStepErrors > 0 ? (
        <div className="fca-status-box fca-status-box-warn text-sm" data-testid="tournament-create-partial-warning">
          <p className="font-semibold">
            Turnier wurde erstellt, {totalStepErrors === 1 ? "aber ein Element" : `aber ${totalStepErrors} Elemente`}{" "}
            konnte{totalStepErrors === 1 ? "" : "n"} nicht angelegt werden.
          </p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5">
            {partialResult.participantErrors.map((e, i) => (
              <li key={`p-${i}`}>Team: {e.error}</li>
            ))}
            {partialResult.resourceAllocationErrors.map((e, i) => (
              <li key={`r-${i}`}>Spielfeld / Halle: {e.error}</li>
            ))}
            {partialResult.dressingRoomAllocationErrors.map((e, i) => (
              <li key={`d-${i}`}>Garderobe: {e.error}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--text-2)]">
            „Turnier erstellen“ ist deaktiviert, um ein doppeltes Turnier zu vermeiden — bitte die fehlenden
            Elemente direkt am bereits angelegten Turnier nachtragen.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/tournamentcenter/${partialResult.tournamentId}/edit`)}
            className="fca-button-secondary mt-3"
            data-testid="tournament-create-goto-edit"
          >
            Zum Turnier wechseln und korrigieren
          </button>
        </div>
      ) : null}

      {error ? <div className="fca-status-box fca-status-box-error">{error}</div> : null}

      <p className="sr-only" id={`${formId}-hint`}>
        Mindestens ein teilnehmendes Team ist erforderlich, um ein Turnier zu erstellen.
      </p>
      </TurniereRecordWorkspaceShell>
    </form>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";
import type { TournamentDto } from "@/lib/tournaments/types";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import TournamentParticipantsEditor from "@/components/admin/tournamentcenter/TournamentParticipantsEditor";
import TournamentResourceAllocationEditor from "@/components/admin/tournamentcenter/TournamentResourceAllocationEditor";
import TournamentPublicationToggles, {
  type TournamentPublicationState,
} from "@/components/admin/tournamentcenter/TournamentPublicationToggles";
import TournamentStandardDurationHint from "@/components/admin/tournamentcenter/TournamentStandardDurationHint";
import { HomeAwaySegmentedControl } from "@/components/admin/shared/HomeAwaySegmentedControl";
import TeamSearchablePicker from "@/components/admin/shared/TeamSearchablePicker";
import { useFacilityAvailability } from "@/hooks/use-facility-availability";
import { utcInstantToDateTimeLocalValue } from "@/lib/events/tenant-local-datetime";
import { assessTournamentOperationalState } from "@/lib/tournaments/operational-state";
import {
  buildTournamentWochenplanerHref,
  isTenantHostedTournament,
  resolveTournamentStatusPresentation,
} from "@/lib/tournaments/management-view";
import {
  formatTurniereRecordDateLine,
  formatTurniereRecordScheduleRailLine,
  formatTurniereRecordTimeOnly,
  resolveTurniereRecordIdentity,
  resolveTurniereRecordLastChangedLabel,
  resolveTurniereRecordResourcePresentation,
  resolveTurniereRecordVenueLine,
  shouldShowTurniereRecordReadinessPill,
} from "@/lib/tournaments/turniere-record-presentation";
import { cn } from "@/lib/cn";
import TurniereRecordWorkspaceShell from "./TurniereRecordWorkspaceShell";
import TurniereRecordSection from "./TurniereRecordSection";
import TurniereTournamentRecordContextRail from "./TurniereTournamentRecordContextRail";
import TurniereTournamentRecordContextMenu from "./TurniereTournamentRecordContextMenu";
import TurniereTournamentRecordDeleteDialog from "./TurniereTournamentRecordDeleteDialog";
import TurniereTournamentRecordReadinessPill from "./TurniereTournamentRecordReadinessPill";
import TurniereTournamentRecordResourceSummary from "./TurniereTournamentRecordResourceSummary";
import { TURNIERE_RECORD_WORKSPACE_SURFACE_CLASS } from "./turniere-record-layout";
import TournamentOrganizerClubField from "@/components/admin/tournamentcenter/TournamentOrganizerClubField";
import { ParticipationRequestConfigEditor } from "@/components/admin/participation/ParticipationRequestConfigEditor";
import type { ExternalClubPickerResult } from "@/components/admin/tournamentcenter/ExternalClubPicker";
import {
  organizerNameFromPickerSelection,
  organizerPickerSelectionFromTournament,
} from "@/lib/tournaments/organizer-picker-state";

type DeletionImpact = { key: string; label: string; count: number };

type TeamItem = {
  id: string;
  name: string;
  ageGroup: string | null;
  genderGroup: string | null;
  isActive: boolean;
};

type FormSnapshot = {
  title: string;
  organizerClubId: string | null;
  organizerClubName: string | null;
  competitionLabel: string;
  location: string;
  startAt: string;
  endAt: string;
  meetingTime: string;
  description: string;
  resultLabel: string;
  remarks: string;
  teamId: string;
  homeAway: TournamentDto["homeAway"];
  publication: TournamentPublicationState;
};

function toDateTimeLocalValue(iso: string | null, timezone: string): string {
  return utcInstantToDateTimeLocalValue(iso, timezone);
}

function buildFormSnapshot(input: {
  title: string;
  organizerSelection: ExternalClubPickerResult | null;
  competitionLabel: string;
  location: string;
  startAt: string;
  endAt: string;
  meetingTime: string;
  description: string;
  resultLabel: string;
  remarks: string;
  teamId: string;
  homeAway: TournamentDto["homeAway"];
  publication: TournamentPublicationState;
}): FormSnapshot {
  return {
    title: input.title.trim(),
    organizerClubId: input.organizerSelection?.id ?? null,
    organizerClubName: input.organizerSelection?.name.trim() ?? null,
    competitionLabel: input.competitionLabel.trim(),
    location: input.location.trim(),
    startAt: input.startAt,
    endAt: input.endAt,
    meetingTime: input.meetingTime,
    description: input.description.trim(),
    resultLabel: input.resultLabel.trim(),
    remarks: input.remarks.trim(),
    teamId: input.teamId,
    homeAway: input.homeAway,
    publication: { ...input.publication },
  };
}

function badgeVariantForStatusTone(
  tone: ReturnType<typeof resolveTournamentStatusPresentation>["tone"],
): BadgeVariant {
  switch (tone) {
    case "live":
    case "planned":
      return "success";
    case "preparation":
      return "info";
    case "danger":
      return "danger";
    case "warning":
      return "warning";
    default:
      return "default";
  }
}

export type TurniereTournamentRecordWorkspaceProps = {
  tournament: TournamentDto;
  canManage: boolean;
  canDelete?: boolean;
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
  timezone: string;
  tenantLogoUrl?: string | null;
  defaultTournamentDurationMinutes: number;
  canManageFacilitiesTimeStandards?: boolean;
  locale?: string;
};

export default function TurniereTournamentRecordWorkspace({
  tournament,
  canManage,
  canDelete = false,
  pitchHallFacilityGroups,
  dressingRoomFacilityGroups,
  timezone,
  tenantLogoUrl = null,
  defaultTournamentDurationMinutes,
  canManageFacilitiesTimeStandards = false,
  locale = "de-CH",
}: TurniereTournamentRecordWorkspaceProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState(tournament.title);
  const [organizerSelection, setOrganizerSelection] = useState<ExternalClubPickerResult | null>(() =>
    organizerPickerSelectionFromTournament(tournament),
  );
  const [competitionLabel, setCompetitionLabel] = useState(tournament.competitionLabel ?? "");
  const [location, setLocation] = useState(tournament.location ?? "");
  const [startAt, setStartAt] = useState(toDateTimeLocalValue(tournament.startAt, timezone));
  const [endAt, setEndAt] = useState(toDateTimeLocalValue(tournament.endAt, timezone));
  const [meetingTime, setMeetingTime] = useState(toDateTimeLocalValue(tournament.meetingTime, timezone));
  const [description, setDescription] = useState(tournament.description ?? "");
  const [resultLabel, setResultLabel] = useState(tournament.resultLabel ?? "");
  const [remarks, setRemarks] = useState(tournament.remarks ?? "");
  const [teamId, setTeamId] = useState(tournament.team?.id ?? "");
  const [homeAway, setHomeAway] = useState(tournament.homeAway);

  const [publication, setPublication] = useState<TournamentPublicationState>({
    websiteVisible: tournament.visibility.websiteVisible,
    infoboardVisible: tournament.visibility.infoboardVisible,
    homepageVisible: tournament.visibility.homepageVisible,
    wochenplanVisible: tournament.visibility.wochenplanVisible,
    teamPageVisible: tournament.visibility.teamPageVisible,
  });

  const initialSnapshotRef = useRef(
    buildFormSnapshot({
      title: tournament.title,
      organizerSelection: organizerPickerSelectionFromTournament(tournament),
      competitionLabel: tournament.competitionLabel ?? "",
      location: tournament.location ?? "",
      startAt: toDateTimeLocalValue(tournament.startAt, timezone),
      endAt: toDateTimeLocalValue(tournament.endAt, timezone),
      meetingTime: toDateTimeLocalValue(tournament.meetingTime, timezone),
      description: tournament.description ?? "",
      resultLabel: tournament.resultLabel ?? "",
      remarks: tournament.remarks ?? "",
      teamId: tournament.team?.id ?? "",
      homeAway: tournament.homeAway,
      publication: {
        websiteVisible: tournament.visibility.websiteVisible,
        infoboardVisible: tournament.visibility.infoboardVisible,
        homepageVisible: tournament.visibility.homepageVisible,
        wochenplanVisible: tournament.visibility.wochenplanVisible,
        teamPageVisible: tournament.visibility.teamPageVisible,
      },
    }),
  );

  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteImpactLoading, setDeleteImpactLoading] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<DeletionImpact[] | null>(null);

  const isCancelled = tournament.status === "CANCELLED";
  const isEditable = canManage && tournament.status !== "ARCHIVED" && tournament.status !== "COMPLETED";

  const assessment = useMemo(() => assessTournamentOperationalState(tournament), [tournament]);
  const statusPresentation = resolveTournamentStatusPresentation(tournament, assessment);
  const identity = resolveTurniereRecordIdentity(tournament, tenantLogoUrl);
  const resourcePresentation = resolveTurniereRecordResourcePresentation(tournament);
  const venueLine = resolveTurniereRecordVenueLine(tournament);

  const wochenplanerHref = buildTournamentWochenplanerHref({
    startAt: tournament.startAt,
    teamId: tournament.team?.id ?? tournament.participants.find((p) => p.team)?.team?.id,
    timezone,
  });

  const { pitchAvailability, dressingRoomAvailability } = useFacilityAvailability({
    enabled: homeAway === "HOME" && !!startAt,
    startAt,
    endAt,
    excludeEventId: tournament.id,
  });

  const currentSnapshot = useMemo(
    () =>
      buildFormSnapshot({
        title,
        organizerSelection,
        competitionLabel,
        location,
        startAt,
        endAt,
        meetingTime,
        description,
        resultLabel,
        remarks,
        teamId,
        homeAway,
        publication,
      }),
    [
      title,
      organizerSelection,
      competitionLabel,
      location,
      startAt,
      endAt,
      meetingTime,
      description,
      resultLabel,
      remarks,
      teamId,
      homeAway,
      publication,
    ],
  );

  const isDirty = useMemo(
    () => JSON.stringify(currentSnapshot) !== JSON.stringify(initialSnapshotRef.current),
    [currentSnapshot],
  );

  useEffect(() => {
    let active = true;

    async function loadTeams() {
      setTeamsLoading(true);
      try {
        const res = await fetch("/api/teams", { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as TeamItem[] | { error?: string } | null;
        if (!active) return;
        setTeams(Array.isArray(data) ? data.filter((t) => t.isActive) : []);
      } finally {
        if (active) setTeamsLoading(false);
      }
    }

    if (canManage) {
      loadTeams();
    }

    return () => {
      active = false;
    };
  }, [canManage]);

  async function handleSave() {
    if (!title.trim()) {
      toast.danger("Titel ist erforderlich.");
      return;
    }
    if (!startAt) {
      toast.danger("Startdatum ist erforderlich.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          organizerName: organizerNameFromPickerSelection(organizerSelection),
          competitionLabel: competitionLabel.trim() || null,
          location: location.trim() || null,
          startAt,
          endAt: endAt || null,
          meetingTime: meetingTime || null,
          description: description.trim() || null,
          resultLabel: resultLabel.trim() || null,
          remarks: remarks.trim() || null,
          teamId: teamId || null,
          homeAway,
          ...publication,
        }),
      });

      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        throw new Error(data?.error ?? "Änderungen konnten nicht gespeichert werden.");
      }

      initialSnapshotRef.current = currentSnapshot;
      toast.success("Turnier aktualisiert.");
      router.refresh();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Änderungen konnten nicht gespeichert werden.", {
        duration: 6000,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleLifecycleToggle() {
    setLifecycleLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isCancelled ? "SCHEDULED" : "CANCELLED" }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        throw new Error(data?.error ?? "Aktion fehlgeschlagen.");
      }

      toast.success(isCancelled ? "Turnier wiederhergestellt." : "Turnier storniert.");
      router.refresh();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Aktion fehlgeschlagen.", { duration: 6000 });
    } finally {
      setLifecycleLoading(false);
    }
  }

  async function openDeleteConfirmation() {
    setDeleteOpen(true);
    setDeleteError(null);
    setDeleteImpact(null);
    setDeleteImpactLoading(true);

    try {
      const res = await fetch(`/api/tournaments/${tournament.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as
        | { error?: string; impact?: DeletionImpact[] }
        | null;

      if (!res.ok) {
        throw new Error(data?.error ?? "Löschen nicht möglich.");
      }

      setDeleteImpact(Array.isArray(data?.impact) ? data.impact : []);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.");
    } finally {
      setDeleteImpactLoading(false);
    }
  }

  async function handleDelete() {
    setDeleteBusy(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/tournaments/${tournament.id}?confirm=true`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        throw new Error(data?.error ?? "Löschen fehlgeschlagen.");
      }

      setDeleteOpen(false);
      setDeleteImpact(null);
      toast.success("Turnier endgültig gelöscht.");
      router.push("/dashboard/tournamentcenter");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.");
    } finally {
      setDeleteBusy(false);
    }
  }

  const displayTitle = title.trim() || tournament.title;
  const dateLine = formatTurniereRecordDateLine(tournament.startAt, tournament.endAt, locale, timezone);
  const headerMetaParts = [identity.categoryLine, identity.competitionLabel, dateLine, venueLine].filter(Boolean);

  const participantSummary =
    identity.participantCount > 0
      ? `${identity.participantCount} ${identity.participantCount === 1 ? "Team" : "Teams"}`
      : null;

  const breadcrumbs = [
    { label: "Planung", href: "/dashboard/planner/week" },
    { label: "Turniere", href: "/dashboard/tournamentcenter" },
    { label: displayTitle },
  ];

  const header = (
    <div className="flex flex-col gap-4 pt-1 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-2)]">
          <span>Turnier</span>
          <span className="text-[var(--muted)]" aria-hidden>
            ·
          </span>
          <Badge variant={badgeVariantForStatusTone(statusPresentation.tone)} data-testid="turniere-record-status">
            {statusPresentation.label}
          </Badge>
          <span className="text-[var(--muted)]" aria-hidden>
            ·
          </span>
          <span data-testid="turniere-record-home-away-chip">{identity.homeAwayLabel}</span>
          <span className="text-[var(--muted)]" aria-hidden>
            ·
          </span>
          <span data-testid="turniere-record-publication-chip">{identity.publication.label}</span>
          {isDirty ? (
            <>
              <span className="text-[var(--muted)]" aria-hidden>
                ·
              </span>
              <span className="text-[var(--sce-primary)]" data-testid="turniere-record-unsaved-hint">
                Ungespeicherte Änderungen
              </span>
            </>
          ) : null}
        </div>

        <div className="flex min-w-0 items-start gap-3 sm:gap-4" data-testid="turniere-record-identity">
          <ClubLogo
            logoUrl={identity.crest.logoUrl}
            name={identity.crest.altName}
            size="lg"
            bare
            className="shrink-0"
          />
          <div className="min-w-0 space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
              {displayTitle}
            </h1>
            {headerMetaParts.length > 0 ? (
              <p className="text-sm text-[var(--text-2)]" data-testid="turniere-record-meta-line">
                {headerMetaParts.join(" · ")}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {shouldShowTurniereRecordReadinessPill(tournament.homeAway, assessment) ? (
                <TurniereTournamentRecordReadinessPill assessment={assessment} className="normal-case" />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <TurniereTournamentRecordContextMenu
          wochenplanerHref={wochenplanerHref}
          canManageLifecycle={canManage && tournament.status !== "ARCHIVED" && tournament.status !== "COMPLETED"}
          isCancelled={isCancelled}
          lifecycleLoading={lifecycleLoading}
          onLifecycleToggle={() => void handleLifecycleToggle()}
          canDelete={canDelete}
          onDeleteRequest={canDelete ? () => void openDeleteConfirmation() : undefined}
        />
        {isEditable ? (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !isDirty}
            aria-busy={saving}
            className={cn(
              "fca-button-primary inline-flex min-w-[7.5rem] items-center justify-center gap-2 text-sm disabled:opacity-50",
              isDirty && "ring-2 ring-[var(--sce-primary)]/35",
            )}
            data-testid="tournament-save"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Wird gespeichert…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden />
                Speichern
              </>
            )}
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <TurniereRecordWorkspaceShell
        breadcrumbs={breadcrumbs}
        header={header}
        testId="turniere-tournament-record-workspace"
        contextRail={
          <TurniereTournamentRecordContextRail
            statusLabel={statusPresentation.label}
            assessment={assessment}
            tournamentTitle={displayTitle}
            scheduleLine={formatTurniereRecordScheduleRailLine(tournament.startAt, locale, timezone)}
            timeLine={formatTurniereRecordTimeOnly(tournament.startAt, locale, timezone)}
            participantSummary={participantSummary}
            facilityLine={resourcePresentation.facilityName ?? venueLine}
            publicationLabel={identity.publication.label}
            lastChangedLabel={resolveTurniereRecordLastChangedLabel(tournament, locale, timezone)}
            wochenplanerHref={wochenplanerHref}
            showReadiness={shouldShowTurniereRecordReadinessPill(tournament.homeAway, assessment)}
          />
        }
      >
        <div className={`${TURNIERE_RECORD_WORKSPACE_SURFACE_CLASS} divide-y divide-[var(--border)]/80`}>
          <TurniereRecordSection title="Übersicht" testId="turniere-record-section-overview">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 sm:col-span-2">
                <span className="fca-label">Turniername</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!isEditable || saving}
                  className="fca-input"
                  required
                  aria-label="Turniername"
                />
              </label>

              <TournamentOrganizerClubField
                selected={organizerSelection}
                onChange={setOrganizerSelection}
                disabled={!isEditable || saving}
                testId="turniere-record-organizer-club"
              />

              <label className="block space-y-2">
                <span className="fca-label">Ort</span>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={!isEditable || saving}
                  className="fca-input"
                  placeholder="z. B. Turnhalle Binningen"
                />
              </label>

              <label className="block space-y-2">
                <span className="fca-label">Wettbewerb / Turnierart</span>
                <input
                  type="text"
                  value={competitionLabel}
                  onChange={(e) => setCompetitionLabel(e.target.value)}
                  disabled={!isEditable || saving}
                  className="fca-input"
                  placeholder="z. B. Hallenturnier"
                />
              </label>

              <div className="block space-y-2">
                <span className="fca-label">Heim / Auswärts</span>
                <HomeAwaySegmentedControl
                  value={homeAway}
                  onChange={setHomeAway}
                  disabled={!isEditable || saving}
                  testId="tournament-home-away"
                  aria-label="Heim / Auswärts"
                />
              </div>

              <label className="block space-y-2 sm:col-span-2">
                <span className="fca-label">Hauptteam (Teamseite / Wochenplan)</span>
                <TeamSearchablePicker
                  options={teams}
                  value={teamId}
                  onChange={setTeamId}
                  tenantLogoUrl={tenantLogoUrl}
                  disabled={!isEditable || teamsLoading || saving}
                  testId="tournament-team"
                  placeholder={teamsLoading ? "Teams laden…" : "Hauptteam auswählen…"}
                  emptyLabel="— Kein Hauptteam zugeordnet —"
                />
              </label>

              <label className="block space-y-2 sm:col-span-2">
                <span className="fca-label">Beschreibung</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!isEditable || saving}
                  className="fca-textarea min-h-[88px]"
                />
              </label>

              <label className="block space-y-2 sm:col-span-2">
                <span className="fca-label">Bemerkungen</span>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={!isEditable || saving}
                  className="fca-input"
                />
              </label>

              <label className="block space-y-2 sm:col-span-2">
                <span className="fca-label">Resultat / Rang</span>
                <input
                  type="text"
                  value={resultLabel}
                  onChange={(e) => setResultLabel(e.target.value)}
                  disabled={!isEditable || saving}
                  className="fca-input"
                  placeholder="z. B. 2. Platz"
                />
              </label>
            </div>
          </TurniereRecordSection>

          <TurniereRecordSection title="Termin & Ablauf" testId="turniere-record-section-schedule">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="fca-label">Start</span>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  disabled={!isEditable || saving}
                  className="fca-input"
                  required
                  aria-label="Start"
                />
              </label>

              <label className="block space-y-2">
                <span className="fca-label">Ende</span>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  disabled={!isEditable || saving}
                  className="fca-input"
                  aria-label="Ende"
                />
              </label>

              <label className="block space-y-2">
                <span className="fca-label">Treffpunkt</span>
                <input
                  type="datetime-local"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  disabled={!isEditable || saving}
                  className="fca-input"
                />
              </label>

              <div className="sm:col-span-2">
                <TournamentStandardDurationHint
                  defaultTournamentDurationMinutes={defaultTournamentDurationMinutes}
                  canManageFacilitiesTimeStandards={canManageFacilitiesTimeStandards}
                />
              </div>
            </div>
          </TurniereRecordSection>

          {tournament.status !== "CANCELLED" ? (
            <TurniereRecordSection title="Teilnahme" testId="turniere-record-section-participation">
              <ParticipationRequestConfigEditor
                apiPath={`/api/tournaments/${tournament.id}/participation-request`}
                timeZone={timezone}
                disabled={!isEditable}
                values={{
                  participationResponseDueAt: tournament.participationResponseDueAt,
                  participationReminder1At: tournament.participationReminder1At,
                  participationReminder2At: tournament.participationReminder2At,
                  participationReminder1PresetKey: tournament.participationReminder1PresetKey,
                  participationReminder2PresetKey: tournament.participationReminder2PresetKey,
                }}
                onSaved={() => router.refresh()}
              />
            </TurniereRecordSection>
          ) : null}

          <TurniereRecordSection
            title="Teilnehmer"
            description={
              identity.participantCount > 0
                ? `${identity.participantCount} ${identity.participantCount === 1 ? "Team" : "Teams"}`
                : undefined
            }
            testId="turniere-record-section-participants"
          >
            <TournamentParticipantsEditor
              tournamentId={tournament.id}
              canManage={isEditable}
              homeAway={homeAway}
              initialParticipants={tournament.participants}
              dressingRoomFacilityGroups={dressingRoomFacilityGroups}
              dressingRoomAvailability={dressingRoomAvailability}
              tenantLogoUrl={tenantLogoUrl}
            />
          </TurniereRecordSection>

          {isTenantHostedTournament({ homeAway }) ? (
            <TurniereRecordSection title="Ressourcen" testId="turniere-record-section-resources">
              <div className="space-y-4">
                <TurniereTournamentRecordResourceSummary presentation={resourcePresentation} />
                <TournamentResourceAllocationEditor
                  tournamentId={tournament.id}
                  canManage={isEditable}
                  initialAllocations={tournament.resourceAllocations}
                  facilityGroups={pitchHallFacilityGroups}
                  availabilityByResourceId={pitchAvailability}
                />
              </div>
            </TurniereRecordSection>
          ) : null}

          <TurniereRecordSection title="Veröffentlichung" testId="turniere-record-section-publication">
            <TournamentPublicationToggles
              value={publication}
              onChange={(patch) => setPublication((prev) => ({ ...prev, ...patch }))}
              disabled={!isEditable || saving}
            />
          </TurniereRecordSection>
        </div>
      </TurniereRecordWorkspaceShell>

      <TurniereTournamentRecordDeleteDialog
        open={deleteOpen}
        title={`„${tournament.title}" endgültig löschen?`}
        deleteImpactLoading={deleteImpactLoading}
        deleteBusy={deleteBusy}
        deleteError={deleteError}
        deleteImpact={deleteImpact}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteImpact(null);
          setDeleteError(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}

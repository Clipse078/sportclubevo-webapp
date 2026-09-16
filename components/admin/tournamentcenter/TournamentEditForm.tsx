"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Ban, Loader2, RotateCcw, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Card } from "@/components/ui";
import { FormSection } from "@/components/ui/FormSection";
import type { TournamentDto } from "@/lib/tournaments/types";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import TournamentParticipantsEditor from "@/components/admin/tournamentcenter/TournamentParticipantsEditor";
import TournamentResourceAllocationEditor from "@/components/admin/tournamentcenter/TournamentResourceAllocationEditor";
import TournamentPublicationToggles from "@/components/admin/tournamentcenter/TournamentPublicationToggles";
import TournamentEditorChrome from "@/components/admin/tournamentcenter/TournamentEditorChrome";
import StaticOptionSearchablePicker from "@/components/admin/shared/StaticOptionSearchablePicker";
import TeamSearchablePicker from "@/components/admin/shared/TeamSearchablePicker";
import { useFacilityAvailability } from "@/hooks/use-facility-availability";
import PlanningWorkflowBadge from "@/components/admin/shared/PlanningWorkflowBadge";
import PlanningWorkflowActionsClient from "@/components/admin/shared/PlanningWorkflowActionsClient";
import { utcInstantToDateTimeLocalValue } from "@/lib/events/tenant-local-datetime";

type DeletionImpact = { key: string; label: string; count: number };

type TeamItem = {
  id: string;
  name: string;
  ageGroup: string | null;
  genderGroup: string | null;
  isActive: boolean;
};

const HOME_AWAY_OPTIONS = [
  { value: "HOME", label: "Heim (FC Allschwil ausrichtend)" },
  { value: "AWAY", label: "Auswärts (extern ausgerichtet)" },
] as const;

function toDateTimeLocalValue(iso: string | null, timezone: string): string {
  return utcInstantToDateTimeLocalValue(iso, timezone);
}

type TournamentEditFormProps = {
  tournament: TournamentDto;
  canManage: boolean;
  canDelete?: boolean;
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
  isCoordinatorForPlanning?: boolean;
  isProtectedSource?: boolean;
  timezone: string;
  tenantLogoUrl?: string | null;
};

export default function TournamentEditForm({
  tournament,
  canManage,
  canDelete = false,
  pitchHallFacilityGroups,
  dressingRoomFacilityGroups,
  isCoordinatorForPlanning = false,
  isProtectedSource = false,
  timezone,
  tenantLogoUrl = null,
}: TournamentEditFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState(tournament.title);
  const [organizerName, setOrganizerName] = useState(tournament.organizerName ?? "");
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

  const [publication, setPublication] = useState({
    websiteVisible: tournament.visibility.websiteVisible,
    infoboardVisible: tournament.visibility.infoboardVisible,
    homepageVisible: tournament.visibility.homepageVisible,
    wochenplanVisible: tournament.visibility.wochenplanVisible,
    teamPageVisible: tournament.visibility.teamPageVisible,
  });

  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteImpactLoading, setDeleteImpactLoading] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<DeletionImpact[] | null>(null);

  const isCancelled = tournament.status === "CANCELLED";
  const isEditable = canManage && tournament.status !== "ARCHIVED" && tournament.status !== "COMPLETED";

  const { pitchAvailability, dressingRoomAvailability } = useFacilityAvailability({
    enabled: homeAway === "HOME" && !!startAt,
    startAt,
    endAt,
    excludeEventId: tournament.id,
  });

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
          organizerName: organizerName.trim() || null,
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
    setDeleteConfirming(true);
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

      setDeleteConfirming(false);
      setDeleteImpact(null);
      toast.success("Turnier endgültig gelöscht.");
      router.push("/dashboard/tournamentcenter");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.");
    } finally {
      setDeleteBusy(false);
    }
  }

  const saveButton = isEditable ? (
    <button
      type="button"
      onClick={handleSave}
      disabled={saving}
      data-testid="tournament-save"
      className="fca-button-primary"
    >
      {saving ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Wird gespeichert...
        </>
      ) : (
        <>
          <Save className="h-4 w-4" />
          Änderungen speichern
        </>
      )}
    </button>
  ) : null;

  return (
    <div className="space-y-2">
      <TournamentEditorChrome
        eyebrow="TournamentCenter · Turnier bearbeiten"
        title={title.trim() || tournament.title}
        description="Änderungen gelten für dieses Turnier. Sichtbarkeits-Einstellungen wirken sich direkt auf Website, Wochenplan, Teamseite und Infoboard aus."
        breadcrumbs={[
          { label: "Tournament Center", href: "/dashboard/tournamentcenter" },
          { label: "Bearbeiten" },
        ]}
        primaryAction={saveButton}
        secondaryActions={
          !isProtectedSource ? (
            <div className="flex items-center gap-2">
              <PlanningWorkflowBadge stage={tournament.reviewStage} size="sm" />
              <PlanningWorkflowActionsClient
                recordId={tournament.id}
                domain="tournament"
                planningStage={tournament.reviewStage}
                isCoordinator={isCoordinatorForPlanning}
                isProtectedSource={isProtectedSource}
              />
            </div>
          ) : undefined
        }
      />

      <FormSection title="Grunddaten" description="Turniername, Organisator und Zeitrahmen">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="block space-y-2 sm:col-span-2 xl:col-span-3">
            <span className="fca-label">Titel</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!isEditable || saving}
              className="fca-input"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="fca-label">Heim / Auswärts</span>
            <StaticOptionSearchablePicker
              options={[...HOME_AWAY_OPTIONS]}
              value={homeAway}
              onChange={(v) => setHomeAway(v === "AWAY" ? "AWAY" : "HOME")}
              disabled={!isEditable || saving}
              testId="tournament-home-away"
              placeholder="Heim / Auswärts"
            />
          </label>

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

          <label className="block space-y-2">
            <span className="fca-label">Organisator</span>
            <input
              type="text"
              value={organizerName}
              onChange={(e) => setOrganizerName(e.target.value)}
              disabled={!isEditable || saving}
              className="fca-input"
              placeholder="z. B. FC Aesch"
            />
          </label>

          <label className="block space-y-2">
            <span className="fca-label">Wettbewerb / Label</span>
            <input
              type="text"
              value={competitionLabel}
              onChange={(e) => setCompetitionLabel(e.target.value)}
              disabled={!isEditable || saving}
              className="fca-input"
              placeholder="z. B. Hallenturnier"
            />
          </label>

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

          <label className="block space-y-2">
            <span className="fca-label">Start</span>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              disabled={!isEditable || saving}
              className="fca-input"
              required
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
            />
          </label>

          <label className="block space-y-2">
            <span className="fca-label">Treffpunkt Zeit</span>
            <input
              type="datetime-local"
              value={meetingTime}
              onChange={(e) => setMeetingTime(e.target.value)}
              disabled={!isEditable || saving}
              className="fca-input"
            />
          </label>

          <label className="block space-y-2 sm:col-span-2 xl:col-span-3">
            <span className="fca-label">Beschreibung</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isEditable || saving}
              className="fca-textarea min-h-[88px]"
            />
          </label>

          <label className="block space-y-2 sm:col-span-2 xl:col-span-3">
            <span className="fca-label">Bemerkungen</span>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={!isEditable || saving}
              className="fca-input"
            />
          </label>
        </div>
      </FormSection>

      <FormSection
        title="Teilnehmende Teams"
        description="FC Allschwil Teams und externe Vereine aus dem Vereinsverzeichnis."
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
      </FormSection>

      {homeAway === "HOME" && (
        <FormSection
          title="Ressourcen"
          description="Spielfeld / Halle — Verfügbarkeit live für Start–Ende."
        >
          <TournamentResourceAllocationEditor
            tournamentId={tournament.id}
            canManage={isEditable}
            initialAllocations={tournament.resourceAllocations}
            facilityGroups={pitchHallFacilityGroups}
            availabilityByResourceId={pitchAvailability}
          />
        </FormSection>
      )}

      <FormSection title="Veröffentlichung" description="Ausgabekanäle für dieses Turnier">
        <TournamentPublicationToggles
          value={publication}
          onChange={(patch) => setPublication((prev) => ({ ...prev, ...patch }))}
          disabled={!isEditable || saving}
        />
      </FormSection>

      {canManage && tournament.status !== "ARCHIVED" && tournament.status !== "COMPLETED" && (
        <div className="border-b border-[var(--border)] py-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Turnierstatus</h3>
          <p className="mt-1 max-w-xl text-xs text-[var(--text-2)]">
            Stornierung oder Wiederherstellung — getrennt vom Speichern der Turnierdaten.
          </p>
          <button
            type="button"
            onClick={handleLifecycleToggle}
            disabled={lifecycleLoading}
            data-testid="tournament-lifecycle-toggle"
            className="fca-button-secondary mt-4 border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-500/10"
          >
            {lifecycleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isCancelled ? (
              <RotateCcw className="h-4 w-4" />
            ) : (
              <Ban className="h-4 w-4" />
            )}
            {isCancelled ? "Turnier wiederherstellen" : "Turnier absagen"}
          </button>
        </div>
      )}

      {canDelete && (
        <Card variant="warning" title="Gefahrenzone" className="mt-4">
          <p className="text-sm text-[var(--text-2)]">
            Das Turnier wird unwiderruflich gelöscht. Teilnehmende Vereine und Ressourcen selbst bleiben erhalten.
          </p>
          <Button
            variant="danger"
            size="sm"
            iconLeft={<Trash2 className="h-4 w-4" />}
            onClick={openDeleteConfirmation}
            data-testid="tournament-delete-button"
            className="mt-4"
          >
            Endgültig löschen
          </Button>
        </Card>
      )}

      <Dialog
        open={deleteConfirming}
        onClose={() => {
          setDeleteConfirming(false);
          setDeleteImpact(null);
          setDeleteError(null);
        }}
        title={`„${tournament.title}" endgültig löschen?`}
        description="Diese Aktion ist endgültig und kann nicht rückgängig gemacht werden."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteConfirming(false);
                setDeleteImpact(null);
                setDeleteError(null);
              }}
            >
              Abbrechen
            </Button>
            <Button
              variant="danger"
              loading={deleteBusy}
              disabled={deleteImpactLoading}
              onClick={handleDelete}
              data-testid="tournament-delete-confirm"
            >
              Endgültig löschen
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {deleteError ? (
            <p className="text-sm font-medium text-[var(--sce-danger)]">{deleteError}</p>
          ) : null}

          {deleteImpactLoading ? (
            <p className="text-sm text-[var(--text-2)]">Auswirkungen werden geprüft…</p>
          ) : deleteImpact && deleteImpact.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-lg border border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] p-3 text-[var(--sce-warning)]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p className="text-sm">
                  Folgende verknüpfte Daten werden ebenfalls unwiderruflich entfernt. Teilnehmende Vereine, Teams und
                  Ressourcen selbst bleiben erhalten.
                </p>
              </div>
              <ul className="list-inside list-disc space-y-1 text-sm text-[var(--text-2)]">
                {deleteImpact.map((item) => (
                  <li key={item.key}>
                    {item.label}: {item.count}
                  </li>
                ))}
              </ul>
            </div>
          ) : deleteImpact ? (
            <p className="text-sm text-[var(--text-2)]">
              Keine Teilnehmer, Ressourcen-Zuordnungen oder Historie vorhanden.
            </p>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}

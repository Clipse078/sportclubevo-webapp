"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, UserCircle2 } from "lucide-react";
import type { Weekday } from "@/lib/training/types";
import TrainingWeekdayScheduleEditor from "@/components/admin/training/form/TrainingWeekdayScheduleEditor";
import { TRAINING_FORM_WORKSPACE_SURFACE_CLASS } from "@/components/admin/training/form/training-form-layout";
import TrainingRecordWorkspaceShell from "@/components/admin/training/record/TrainingRecordWorkspaceShell";
import TrainingRecordSection from "@/components/admin/training/record/TrainingRecordSection";
import TrainingRecordContextRail from "@/components/admin/training/record/TrainingRecordContextRail";
import TrainingRecordPublicationSection from "@/components/admin/training/record/TrainingRecordPublicationSection";
import TrainingSeriesRecordContextMenu from "@/components/admin/training/record/TrainingSeriesRecordContextMenu";
import TrainingRecordStatusBadge from "@/components/admin/training/record/TrainingRecordStatusBadge";
import { buildTrainingRecordPrimaryTitle } from "@/lib/training/training-series-edit-presentation";
import { defaultNewTrainingSlotTimes } from "@/lib/training/training-create-schedule-defaults";
import type { BreadcrumbItem } from "@/components/ui/page";
import type { TrainingSeriesStatus } from "@/lib/training/types";
import { cn } from "@/lib/cn";
import {
  ParticipationSeriesPolicyEditor,
  type ParticipationSeriesPolicyValues,
} from "@/components/admin/participation/ParticipationSeriesPolicyEditor";

export type TeamSeasonOption = {
  id: string;
  teamId: string;
  teamName: string;
  seasonName: string;
  trainers: { id: string; name: string; roleLabel: string | null }[];
};

export type TrainingSeriesFormDefaultValues = {
  teamSeasonId: string;
  title: string;
  description: string | null;
  timezone: string;
  validFrom: string | null;
  validUntil: string | null;
  weekdaySchedules: { weekday: Weekday; startsAt: string; endsAt: string }[];
};

type PublicationProps = {
  trainingWebsiteVisible: boolean;
  infoboardVisible: boolean;
  canEditTeamPublication: boolean;
};

type Props = {
  seriesId: string;
  seriesStatus: TrainingSeriesStatus;
  teamSeasons: TeamSeasonOption[];
  defaultValues: TrainingSeriesFormDefaultValues;
  resourcesSection?: ReactNode;
  wochenplanerHref: string;
  scheduleRail: string | null;
  pitchLabel: string | null;
  dressingRoomLabel: string | null;
  updatedAtIso: string;
  publication: PublicationProps;
  canManage: boolean;
  canDelete: boolean;
  exceptionNotice?: ReactNode;
  /** Canonical training duration for newly enabled weekday slots only. */
  defaultTrainingDurationMinutes: number;
  participationPolicy: ParticipationSeriesPolicyValues;
};

type WeekdayRow = {
  weekday: Weekday;
  label: string;
  enabled: boolean;
  startsAt: string;
  endsAt: string;
};

const WEEKDAY_DEFS: { weekday: Weekday; label: string }[] = [
  { weekday: "MONDAY", label: "Montag" },
  { weekday: "TUESDAY", label: "Dienstag" },
  { weekday: "WEDNESDAY", label: "Mittwoch" },
  { weekday: "THURSDAY", label: "Donnerstag" },
  { weekday: "FRIDAY", label: "Freitag" },
  { weekday: "SATURDAY", label: "Samstag" },
  { weekday: "SUNDAY", label: "Sonntag" },
];

function buildInitialWeekdayRows(
  defaultValues: TrainingSeriesFormDefaultValues,
  defaultTrainingDurationMinutes: number,
): WeekdayRow[] {
  const slotDefaults = defaultNewTrainingSlotTimes(defaultTrainingDurationMinutes);
  const byWeekday = new Map(defaultValues.weekdaySchedules.map((s) => [s.weekday, s]));
  return WEEKDAY_DEFS.map(({ weekday, label }) => {
    const existing = byWeekday.get(weekday);
    return {
      weekday,
      label,
      enabled: !!existing,
      startsAt: existing?.startsAt ?? slotDefaults.startsAt,
      endsAt: existing?.endsAt ?? slotDefaults.endsAt,
    };
  });
}

function serializeFormSnapshot(input: {
  teamSeasonId: string;
  title: string;
  description: string;
  timezone: string;
  validFrom: string;
  validUntil: string;
  weekdayRows: WeekdayRow[];
}): string {
  const enabled = input.weekdayRows
    .filter((r) => r.enabled)
    .map((r) => ({ weekday: r.weekday, startsAt: r.startsAt, endsAt: r.endsAt }));
  return JSON.stringify({
    teamSeasonId: input.teamSeasonId,
    title: input.title.trim(),
    description: input.description.trim(),
    timezone: input.timezone.trim(),
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    weekdaySchedules: enabled,
  });
}

function formatUpdatedAt(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function TrainingSeriesRecordWorkspace({
  seriesId,
  seriesStatus,
  teamSeasons,
  defaultValues,
  resourcesSection,
  wochenplanerHref,
  scheduleRail,
  pitchLabel,
  dressingRoomLabel,
  updatedAtIso,
  publication,
  canManage,
  canDelete,
  exceptionNotice,
  defaultTrainingDurationMinutes,
  participationPolicy,
}: Props) {
  const router = useRouter();

  const [teamSeasonId] = useState(defaultValues.teamSeasonId);
  const [title, setTitle] = useState(defaultValues.title);
  const [description, setDescription] = useState(defaultValues.description ?? "");
  const [timezone, setTimezone] = useState(defaultValues.timezone);
  const [validFrom, setValidFrom] = useState(defaultValues.validFrom ?? "");
  const [validUntil, setValidUntil] = useState(defaultValues.validUntil ?? "");
  const [weekdayRows, setWeekdayRows] = useState<WeekdayRow[]>(() =>
    buildInitialWeekdayRows(defaultValues, defaultTrainingDurationMinutes),
  );

  const initialSnapshot = useMemo(
    () =>
      serializeFormSnapshot({
        teamSeasonId: defaultValues.teamSeasonId,
        title: defaultValues.title,
        description: defaultValues.description ?? "",
        timezone: defaultValues.timezone,
        validFrom: defaultValues.validFrom ?? "",
        validUntil: defaultValues.validUntil ?? "",
        weekdayRows: buildInitialWeekdayRows(defaultValues, defaultTrainingDurationMinutes),
      }),
    [defaultValues, defaultTrainingDurationMinutes],
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const isDirty =
    serializeFormSnapshot({
      teamSeasonId,
      title,
      description,
      timezone,
      validFrom,
      validUntil,
      weekdayRows,
    }) !== initialSnapshot;

  const selectedTeamSeason = useMemo(
    () => teamSeasons.find((ts) => ts.id === teamSeasonId) ?? null,
    [teamSeasons, teamSeasonId],
  );

  const primaryTitle = selectedTeamSeason
    ? buildTrainingRecordPrimaryTitle(selectedTeamSeason.teamName, title)
    : title;

  const teamLabel = selectedTeamSeason
    ? `${selectedTeamSeason.teamName} · ${selectedTeamSeason.seasonName}`
    : "—";

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Planung", href: "/dashboard/planner" },
    { label: "Trainings", href: "/dashboard/training" },
    { label: selectedTeamSeason?.teamName ?? "Training" },
  ];

  const primaryTrainer = selectedTeamSeason?.trainers[0] ?? null;
  const teamSettingsHref = selectedTeamSeason
    ? `/dashboard/teams/${selectedTeamSeason.teamId}`
    : "/dashboard/teams";

  function toggleWeekday(weekday: Weekday) {
    setWeekdayRows((rows) =>
      rows.map((r) => (r.weekday === weekday ? { ...r, enabled: !r.enabled } : r)),
    );
  }

  function updateWeekdayTime(weekday: Weekday, field: "startsAt" | "endsAt", value: string) {
    setWeekdayRows((rows) =>
      rows.map((r) => (r.weekday === weekday ? { ...r, [field]: value } : r)),
    );
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setSaveSuccess(null);

    if (!title.trim()) {
      setError("Name des Trainings ist erforderlich.");
      return;
    }
    if (!validFrom || !validUntil) {
      setError("Gültig ab und Gültig bis sind erforderlich.");
      return;
    }

    const enabledRows = weekdayRows.filter((r) => r.enabled);
    if (enabledRows.length === 0) {
      setError("Mindestens ein Wochentag ist erforderlich.");
      return;
    }
    for (const row of enabledRows) {
      if (row.startsAt >= row.endsAt) {
        setError(`${row.label}: Beginn muss vor Ende liegen.`);
        return;
      }
    }

    const weekdaySchedules = enabledRows.map((r) => ({
      weekday: r.weekday,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
    }));

    setLoading(true);
    try {
      const res = await fetch(`/api/training-series/${seriesId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          timezone: timezone.trim() || "Europe/Zurich",
          validFrom,
          validUntil,
          weekdaySchedules,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Fehler beim Speichern.");
        return;
      }

      setSaveSuccess(
        `${data.generation.occurrencesInWindow} Termine — ${data.generation.updated} aktualisiert, ${data.generation.unchanged} unverändert.`,
      );
      router.refresh();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  const header = (
    <div className="flex flex-col gap-3 pt-1 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-2)]">
          <span>Trainingsserie</span>
          <span className="text-[var(--muted)]" aria-hidden>
            ·
          </span>
          <TrainingRecordStatusBadge status={seriesStatus} />
          {isDirty ? (
            <>
              <span className="text-[var(--muted)]" aria-hidden>
                ·
              </span>
              <span className="text-[var(--sce-primary)]" data-testid="training-record-unsaved-hint">
                Ungespeicherte Änderungen
              </span>
            </>
          ) : null}
        </div>
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-[var(--foreground)]">
          {primaryTitle}
        </h1>
        {scheduleRail ? <p className="text-sm text-[var(--text-2)]">{scheduleRail}</p> : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <TrainingSeriesRecordContextMenu
          seriesId={seriesId}
          seriesTitle={title}
          wochenplanerHref={wochenplanerHref}
          status={seriesStatus}
          canManage={canManage}
          canDelete={canDelete}
          onRestored={() => router.refresh()}
        />
        <button
          type="button"
          disabled={loading || !isDirty || !canManage}
          onClick={() => void handleSubmit()}
          className={cn(
            "fca-button-primary inline-flex min-w-[7.5rem] items-center justify-center gap-2 text-sm disabled:opacity-50",
            isDirty && "ring-2 ring-[var(--sce-primary)]/35",
          )}
          data-testid="training-series-submit"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Speichern
        </button>
      </div>
    </div>
  );

  return (
    <TrainingRecordWorkspaceShell
      breadcrumbs={breadcrumbs}
      header={header}
      testId="training-series-edit-page"
      contextRail={
        <TrainingRecordContextRail
          status={seriesStatus}
          teamLabel={teamLabel}
          scheduleSummary={scheduleRail}
          facilityLabel={pitchLabel}
          dressingRoomLabel={dressingRoomLabel}
          updatedAtLabel={formatUpdatedAt(updatedAtIso, "de-CH")}
          wochenplanerHref={wochenplanerHref}
        />
      }
    >
      {exceptionNotice}

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="training-series-form">
        {error ? <div className="fca-status-box fca-status-box-error">{error}</div> : null}
        {saveSuccess ? (
          <div
            className="fca-status-box border border-emerald-500/30 bg-emerald-500/10 text-sm text-[var(--foreground)]"
            data-testid="training-series-save-success"
            role="status"
          >
            Training gespeichert — {saveSuccess}
          </div>
        ) : null}

        <div className={`${TRAINING_FORM_WORKSPACE_SURFACE_CLASS} divide-y divide-[var(--border)]/80`}>
          <TrainingRecordSection title="Übersicht" testId="training-record-section-overview">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block space-y-1 md:col-span-2">
                <span className="fca-label">Mannschaft</span>
                <div className="fca-input bg-[var(--surface-2)]/60 text-[var(--foreground)]" aria-readonly>
                  {teamLabel}
                </div>
              </label>

              <label className="block space-y-1 md:col-span-2">
                <span className="fca-label">Bezeichnung</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="fca-input"
                  required
                  disabled={!canManage}
                  data-testid="training-series-title"
                />
                <p className="text-xs text-[var(--muted)]">Interner Serienname — wird in Planung und Listen verwendet.</p>
              </label>

              <label className="block space-y-1 md:col-span-2">
                <span className="fca-label">Beschreibung</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="fca-input min-h-[3.5rem] max-h-28"
                  disabled={!canManage}
                />
              </label>
            </div>
          </TrainingRecordSection>

          <TrainingRecordSection
            title="Zeitplan"
            description="Wöchentliche Wiederholung und Gültigkeitszeitraum der Serie."
            testId="training-record-section-schedule"
          >
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block space-y-1">
                <span className="fca-label">Gültig ab</span>
                <input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="fca-input"
                  required
                  disabled={!canManage}
                />
              </label>
              <label className="block space-y-1">
                <span className="fca-label">Gültig bis</span>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="fca-input"
                  required
                  disabled={!canManage}
                />
              </label>
              <label className="block space-y-1 sm:col-span-2 lg:col-span-1">
                <span className="fca-label">Zeitzone</span>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="fca-input"
                  disabled={!canManage}
                />
              </label>
            </div>

            <TrainingWeekdayScheduleEditor
              rows={weekdayRows}
              onToggle={toggleWeekday}
              onTimeChange={updateWeekdayTime}
              testIdPrefix="training-series-weekday"
            />
          </TrainingRecordSection>

          <TrainingRecordSection
            title="Teilnahme"
            description="Antwortfrist und Erinnerungen für neu erzeugte Trainingstermine."
            testId="training-record-section-participation"
          >
            <ParticipationSeriesPolicyEditor
              seriesId={seriesId}
              timeZone={timezone}
              values={participationPolicy}
              disabled={!canManage}
              onSaved={() => router.refresh()}
            />
          </TrainingRecordSection>

          {resourcesSection ? (
            <TrainingRecordSection
              id="training-series-ressourcen"
              title="Ressourcen"
              description="Standard-Zuweisung für alle Termine dieser Serie."
              testId="training-series-edit-resources-section"
            >
              {resourcesSection}
            </TrainingRecordSection>
          ) : null}

          <TrainingRecordSection title="Veröffentlichung" testId="training-record-section-publication">
            {selectedTeamSeason ? (
              <TrainingRecordPublicationSection
                teamId={selectedTeamSeason.teamId}
                teamSeasonId={selectedTeamSeason.id}
                initialPublication={{
                  trainingWebsiteVisible: publication.trainingWebsiteVisible,
                  infoboardVisible: publication.infoboardVisible,
                }}
                canEditTeamPublication={publication.canEditTeamPublication}
                teamSettingsHref={teamSettingsHref}
              />
            ) : (
              <p className="text-sm text-[var(--muted)]">Mannschaft nicht verfügbar.</p>
            )}
          </TrainingRecordSection>

          <TrainingRecordSection title="Trainer" testId="training-record-section-trainer">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {selectedTeamSeason ? (
                <Link
                  href={teamSettingsHref}
                  className="text-xs font-semibold text-[var(--sce-primary)] hover:underline"
                  data-testid="training-series-trainer-change-link"
                >
                  {primaryTrainer ? "Im Team verwalten" : "Trainer zuweisen"}
                </Link>
              ) : null}
            </div>
            {primaryTrainer ? (
              <div className="mt-3 flex items-start gap-3 rounded-lg border border-[var(--border)]/80 bg-[var(--surface-2)]/30 px-3 py-2.5">
                <UserCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-[var(--blue)]" aria-hidden />
                <div className="min-w-0">
                  <p className="font-medium text-[var(--foreground)]">{primaryTrainer.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {primaryTrainer.roleLabel ?? selectedTeamSeason?.teamName ?? "Team-Trainer"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">Kein Trainer zugewiesen — Zuweisung erfolgt im Team.</p>
            )}
          </TrainingRecordSection>
        </div>
      </form>
    </TrainingRecordWorkspaceShell>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, UserCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import type { Weekday } from "@/lib/training/types";
import TrainingWeekdayScheduleEditor from "@/components/admin/training/form/TrainingWeekdayScheduleEditor";
import {
  TRAINING_FORM_STICKY_FOOTER_CLASS,
  TRAINING_FORM_STICKY_FOOTER_RESERVE_CLASS,
  TRAINING_FORM_WORKSPACE_SURFACE_CLASS,
} from "@/components/admin/training/form/training-form-layout";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  /** "YYYY-MM-DD" */
  validFrom: string | null;
  /** "YYYY-MM-DD" */
  validUntil: string | null;
  weekdaySchedules: { weekday: Weekday; startsAt: string; endsAt: string }[];
};

type Props = {
  mode: "create" | "edit";
  seriesId?: string;
  teamSeasons: TeamSeasonOption[];
  defaultValues?: TrainingSeriesFormDefaultValues;
  /** Integrated Ressourcen block (edit workspace). */
  resourcesSection?: ReactNode;
  /** Collapsed danger zone below the workspace (edit). */
  dangerZoneSection?: ReactNode;
};

type WeekdayRow = {
  weekday: Weekday;
  label: string;
  enabled: boolean;
  startsAt: string;
  endsAt: string;
};

type GenerationResult = {
  occurrencesInWindow: number;
  created: number;
  updated: number;
  unchanged: number;
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
  defaultValues: TrainingSeriesFormDefaultValues | undefined,
): WeekdayRow[] {
  const byWeekday = new Map(
    (defaultValues?.weekdaySchedules ?? []).map((s) => [s.weekday, s]),
  );
  return WEEKDAY_DEFS.map(({ weekday, label }) => {
    const existing = byWeekday.get(weekday);
    return {
      weekday,
      label,
      enabled: !!existing,
      startsAt: existing?.startsAt ?? "17:00",
      endsAt: existing?.endsAt ?? "18:00",
    };
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

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

export default function TrainingSeriesForm({
  mode,
  seriesId,
  teamSeasons,
  defaultValues,
  resourcesSection,
  dangerZoneSection,
}: Props) {
  const router = useRouter();

  const [teamSeasonId, setTeamSeasonId] = useState(defaultValues?.teamSeasonId ?? "");
  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [timezone, setTimezone] = useState(defaultValues?.timezone ?? "Europe/Zurich");
  const [validFrom, setValidFrom] = useState(defaultValues?.validFrom ?? "");
  const [validUntil, setValidUntil] = useState(defaultValues?.validUntil ?? "");
  const [weekdayRows, setWeekdayRows] = useState<WeekdayRow[]>(
    buildInitialWeekdayRows(defaultValues),
  );

  const initialSnapshot = useMemo(
    () =>
      serializeFormSnapshot({
        teamSeasonId: defaultValues?.teamSeasonId ?? "",
        title: defaultValues?.title ?? "",
        description: defaultValues?.description ?? "",
        timezone: defaultValues?.timezone ?? "Europe/Zurich",
        validFrom: defaultValues?.validFrom ?? "",
        validUntil: defaultValues?.validUntil ?? "",
        weekdayRows: buildInitialWeekdayRows(defaultValues),
      }),
    [defaultValues],
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<{ seriesId: string; generation: GenerationResult } | null>(
    null,
  );

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaveSuccess(null);

    if (mode === "create" && !teamSeasonId) {
      setError("Team / Saison ist erforderlich.");
      return;
    }
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
      const url = mode === "edit" ? `/api/training-series/${seriesId}` : "/api/training-series";
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(mode === "create" ? { teamSeasonId } : {}),
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

      if (mode === "edit") {
        setSaveSuccess(
          `${data.generation.occurrencesInWindow} Termine — ${data.generation.updated} aktualisiert, ${data.generation.unchanged} unverändert.`,
        );
      } else {
        setResult({ seriesId: data.series.id, generation: data.generation });
      }
      router.refresh();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-6 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
        <div>
          <p className="text-lg font-semibold text-[var(--foreground)]">
            {mode === "edit" ? "Training aktualisiert" : "Training erstellt"}
          </p>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            {result.generation.occurrencesInWindow} Termine im gewählten Zeitraum — {result.generation.created} neu
            generiert, {result.generation.updated} aktualisiert, {result.generation.unchanged} unverändert.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/dashboard/training/series/${result.seriesId}/allocations`}
            className="fca-button-primary text-sm"
          >
            Ressourcen zuweisen
          </Link>
          <Link href="/dashboard/training" className="fca-button-secondary text-sm">
            Zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const primaryTrainer = selectedTeamSeason?.trainers[0] ?? null;

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-4 ${TRAINING_FORM_STICKY_FOOTER_RESERVE_CLASS}`}
      data-testid="training-series-form"
    >
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

      <div className={`${TRAINING_FORM_WORKSPACE_SURFACE_CLASS} divide-y divide-[var(--border)]`}>
        <section className="px-4 py-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            {mode === "edit" ? "Grunddaten" : "Team"}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-1 md:col-span-2">
              <span className="fca-label">Team / Saison</span>
              {mode === "create" ? (
                <select
                  value={teamSeasonId}
                  onChange={(e) => setTeamSeasonId(e.target.value)}
                  className="fca-input"
                  required
                >
                  <option value="">— Auswählen —</option>
                  {teamSeasons.map((ts) => (
                    <option key={ts.id} value={ts.id}>
                      {ts.teamName} · {ts.seasonName}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="fca-input bg-[var(--surface-2)] text-[var(--text-2)]" aria-readonly>
                  {selectedTeamSeason
                    ? `${selectedTeamSeason.teamName} · ${selectedTeamSeason.seasonName}`
                    : "—"}
                </div>
              )}
            </label>

            <label className="block space-y-1 md:col-span-2">
              <span className="fca-label">Trainingsname</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z. B. Junioren D-7 D1 Training"
                className="fca-input"
                required
                data-testid="training-series-title"
              />
            </label>

            <label className="block space-y-1 md:col-span-2">
              <span className="fca-label">Beschreibung</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Kurze Notiz…"
                className="fca-input min-h-[3.5rem] max-h-28"
              />
            </label>
          </div>
        </section>

        <section className="px-4 py-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Zeitraum</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block space-y-1">
              <span className="fca-label">Gültig ab</span>
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="fca-input"
                required
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
              />
            </label>
            <label className="block space-y-1 sm:col-span-2 lg:col-span-1">
              <span className="fca-label">Zeitzone</span>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Europe/Zurich"
                className="fca-input"
              />
            </label>
          </div>
        </section>

        <section className="px-4 py-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Wiederholung &amp; Zeiten</h2>
          <TrainingWeekdayScheduleEditor
            rows={weekdayRows}
            onToggle={toggleWeekday}
            onTimeChange={updateWeekdayTime}
            testIdPrefix="training-series-weekday"
          />
        </section>

        {resourcesSection ? (
          <section className="px-4 py-4" data-testid="training-series-edit-resources-section">
            <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Ressourcen</h2>
            {resourcesSection}
          </section>
        ) : null}

        <section className="px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Trainer</h2>
            {selectedTeamSeason ? (
              <Link
                href={`/dashboard/teams/${selectedTeamSeason.teamId}`}
                className="text-xs font-semibold text-[var(--blue)] hover:underline"
                data-testid="training-series-trainer-change-link"
              >
                {primaryTrainer ? "Ändern" : "Trainer zuweisen"}
              </Link>
            ) : null}
          </div>
          {primaryTrainer ? (
            <div className="mt-3 flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-2.5">
              <UserCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-[var(--blue)]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-medium text-[var(--foreground)]">{primaryTrainer.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {primaryTrainer.roleLabel ?? selectedTeamSeason?.teamName ?? "Team-Trainer"}
                </p>
                {selectedTeamSeason && selectedTeamSeason.trainers.length > 1 ? (
                  <p className="mt-1 text-xs text-[var(--text-2)]">
                    +{selectedTeamSeason.trainers.length - 1} weitere Trainer
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">
              {selectedTeamSeason
                ? "Noch kein Trainer zugewiesen"
                : "Team auswählen, um zugewiesene Trainer zu sehen."}
            </p>
          )}
        </section>

        <div className={TRAINING_FORM_STICKY_FOOTER_CLASS}>
          <button type="button" onClick={() => router.back()} className="fca-button-secondary">
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={loading || (mode === "edit" && !isDirty)}
            className="fca-button-primary inline-flex items-center gap-2 disabled:opacity-60"
            data-testid="training-series-submit"
          >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {mode === "create" ? "Training erstellen" : "Änderungen speichern"}
          </button>
        </div>
      </div>

      {dangerZoneSection ? <div className="pt-1">{dangerZoneSection}</div> : null}
    </form>
  );
}

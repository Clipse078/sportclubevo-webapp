"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Users, MoreHorizontal } from "lucide-react";
import type { Weekday } from "@/lib/training/types";
import { SectionCard } from "@/components/ui/page/SectionCard";
import { SceTimeField } from "@/components/admin/shared/SceTimeField";
import {
  trainingCenterFieldClass,
  trainingCenterHelperClass,
  trainingCenterLabelClass,
  trainingCenterSectionTitleClass,
} from "@/components/admin/training/training-center-ui";
import { TRAINING_CENTER_EDITOR_MAX_CLASS } from "@/lib/training/training-center-layout";
import { cn } from "@/lib/cn";

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
  /** Integrated resource editor (series edit page). */
  resourcesSection?: React.ReactNode;
  /** Danger zone (permanent delete). */
  dangerSection?: React.ReactNode;
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

export default function TrainingSeriesForm({
  mode,
  seriesId,
  teamSeasons,
  defaultValues,
  resourcesSection,
  dangerSection,
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ seriesId: string; generation: GenerationResult } | null>(
    null,
  );

  const selectedTeamSeason = useMemo(
    () => teamSeasons.find((ts) => ts.id === teamSeasonId) ?? null,
    [teamSeasons, teamSeasonId],
  );

  const inactiveWeekdays = weekdayRows.filter((r) => !r.enabled);
  const activeWeekdays = weekdayRows.filter((r) => r.enabled);

  function enableWeekday(weekday: Weekday) {
    setWeekdayRows((rows) =>
      rows.map((r) => (r.weekday === weekday ? { ...r, enabled: true } : r)),
    );
  }

  function removeWeekday(weekday: Weekday) {
    setWeekdayRows((rows) =>
      rows.map((r) => (r.weekday === weekday ? { ...r, enabled: false } : r)),
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

    if (mode === "create" && !teamSeasonId) {
      setError("Team / Saison ist erforderlich.");
      return;
    }
    if (!title.trim()) {
      setError("Name der Trainingsserie ist erforderlich.");
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

      setResult({ seriesId: data.series.id, generation: data.generation });
      router.refresh();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass = trainingCenterFieldClass;
  const labelClass = trainingCenterLabelClass;

  if (result) {
    return (
      <div className="space-y-6 rounded-xl border border-[color-mix(in_srgb,var(--sce-success)_35%,var(--border))] bg-[color-mix(in_srgb,var(--sce-success)_10%,var(--surface))] p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
        <div>
          <p className="text-lg font-semibold text-[var(--foreground)]">
            {mode === "edit" ? "Trainingsserie aktualisiert" : "Trainingsserie erstellt"}
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

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", TRAINING_CENTER_EDITOR_MAX_CLASS)} data-testid="training-series-form">
      {error ? (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--sce-danger)_35%,var(--border))] bg-[color-mix(in_srgb,var(--sce-danger)_8%,var(--surface))] px-4 py-3 text-sm font-medium text-[var(--sce-danger)]">
          {error}
        </div>
      ) : null}

      <SectionCard>
        <h3 className={cn(trainingCenterSectionTitleClass, "mb-4")}>Grunddaten</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelClass}>Team / Saison *</label>
            {mode === "create" ? (
              <select
                value={teamSeasonId}
                onChange={(e) => setTeamSeasonId(e.target.value)}
                className={fieldClass}
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
              <div className={`${fieldClass} bg-[var(--surface-2)] text-[var(--text-2)]`}>
                {selectedTeamSeason
                  ? `${selectedTeamSeason.teamName} · ${selectedTeamSeason.seasonName}`
                  : "—"}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Name der Trainingsserie *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. E1 Dienstagstraining"
              className={fieldClass}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optionale Beschreibung…"
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Gültig ab *</label>
            <input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className={fieldClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Gültig bis *</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className={fieldClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Zeitzone</label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="Europe/Zurich"
              className={fieldClass}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <h3 className={cn(trainingCenterSectionTitleClass, "mb-1")}>Trainingszeiten</h3>
        <p className={cn(trainingCenterHelperClass, "mb-4")}>
          Aktive Wochentage mit eigener Start- und Endzeit. Weitere Tage bei Bedarf hinzufügen.
        </p>
        <div className="space-y-2" data-testid="training-series-weekday-schedule">
          {activeWeekdays.map((row) => (
            <div
              key={row.weekday}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-2.5"
            >
              <span className="w-28 shrink-0 text-sm font-medium text-[var(--foreground)]">{row.label}</span>
              <div className="flex flex-wrap items-center gap-2">
                <SceTimeField
                  value={row.startsAt}
                  onChange={(value) => updateWeekdayTime(row.weekday, "startsAt", value)}
                  aria-label={`${row.label} Beginn`}
                  required
                />
                <span className="text-[var(--muted)]">—</span>
                <SceTimeField
                  value={row.endsAt}
                  onChange={(value) => updateWeekdayTime(row.weekday, "endsAt", value)}
                  aria-label={`${row.label} Ende`}
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => removeWeekday(row.weekday)}
                className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--sce-danger)]"
                aria-label={`${row.label} entfernen`}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
          {inactiveWeekdays.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <label className="sr-only" htmlFor="training-add-weekday">Trainingstag hinzufügen</label>
              <select
                id="training-add-weekday"
                className={cn(fieldClass, "max-w-xs")}
                defaultValue=""
                onChange={(e) => {
                  const value = e.target.value as Weekday;
                  if (value) enableWeekday(value);
                  e.target.value = "";
                }}
                data-testid="training-series-add-weekday"
              >
                <option value="">+ Trainingstag hinzufügen</option>
                {inactiveWeekdays.map((row) => (
                  <option key={row.weekday} value={row.weekday}>{row.label}</option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {resourcesSection ? (
        <SectionCard>
          <h3 className={cn(trainingCenterSectionTitleClass, "mb-4")}>Ressourcen</h3>
          {resourcesSection}
        </SectionCard>
      ) : null}

      <SectionCard>
        <h3 className={cn(trainingCenterSectionTitleClass, "mb-1 flex items-center gap-2")}>
          <Users className="h-4 w-4 text-[var(--muted)]" aria-hidden />
          Trainer
        </h3>
        <p className="mb-4 text-sm text-[var(--text-2)]">
          Trainer werden auf Stufe Mannschaft verwaltet und hier nur angezeigt.
        </p>
        {selectedTeamSeason && selectedTeamSeason.trainers.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {selectedTeamSeason.trainers.map((t) => (
              <li
                key={t.id}
                className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--foreground)]"
              >
                {t.name}
                {t.roleLabel ? <span className="ml-1 text-[var(--muted)]">({t.roleLabel})</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            {selectedTeamSeason
              ? "Keine Trainer für dieses Team hinterlegt."
              : "Team auswählen, um zugewiesene Trainer zu sehen."}
          </p>
        )}
        {selectedTeamSeason ? (
          <Link
            href={`/dashboard/teams/${selectedTeamSeason.teamId}`}
            className="mt-3 inline-block text-xs text-[var(--blue)] hover:underline"
          >
            Trainer für dieses Team verwalten
          </Link>
        ) : null}
      </SectionCard>

      <SectionCard>
        <h3 className={cn(trainingCenterSectionTitleClass, "mb-1")}>Öffentliche Sichtbarkeit</h3>
        <p className="text-sm text-[var(--text-2)] leading-relaxed">
          Trainings werden abhängig von Team-, Wochenplan- und Publikationseinstellungen auf den öffentlichen
          Kanälen verwendet. Diese Einstellungen werden hier nicht geändert.
        </p>
        <Link
          href="/dashboard/website/publishing"
          className="mt-2 inline-block text-xs font-semibold text-[var(--sce-primary)] hover:underline"
        >
          Mehr erfahren
        </Link>
      </SectionCard>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="fca-button-secondary text-sm"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={loading}
          className="fca-button-primary inline-flex items-center gap-2 text-sm disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "create" ? "Trainingsserie erstellen" : "Änderungen speichern"}
        </button>
      </div>

      {dangerSection ? (
        <div data-testid="training-series-danger-zone">
          <SectionCard title="Gefahrenbereich">{dangerSection}</SectionCard>
        </div>
      ) : null}
    </form>
  );
}

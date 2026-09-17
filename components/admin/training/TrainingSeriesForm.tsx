"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Users } from "lucide-react";
import type { Weekday } from "@/lib/training/types";
import TrainingWeekdayScheduleEditor from "@/components/admin/training/form/TrainingWeekdayScheduleEditor";
import {
  TRAINING_FORM_STICKY_FOOTER_CLASS,
  TRAINING_FORM_STICKY_FOOTER_RESERVE_CLASS,
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

export default function TrainingSeriesForm({ mode, seriesId, teamSeasons, defaultValues }: Props) {
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

      setResult({ seriesId: data.series.id, generation: data.generation });
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

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-5 ${TRAINING_FORM_STICKY_FOOTER_RESERVE_CLASS}`}
      data-testid="training-series-form"
    >
      {error ? <div className="fca-status-box fca-status-box-error">{error}</div> : null}

      <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <section className="px-4 py-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Team</h2>
          <p className="mb-3 text-xs text-[var(--text-2)]">Mannschaft und Trainingsname.</p>
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
              <span className="fca-label">Beschreibung (optional)</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Kurze Notiz…"
                className="fca-input min-h-[4.5rem]"
              />
            </label>
          </div>
        </section>

        <section className="px-4 py-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Zeitraum</h2>
          <p className="mb-3 text-xs text-[var(--text-2)]">Gültigkeit der Serie und Zeitzone.</p>
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
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Wiederholung &amp; Zeiten</h2>
          <p className="mb-3 text-xs text-[var(--text-2)]">Aktive Wochentage mit Start- und Endzeit.</p>
          <TrainingWeekdayScheduleEditor
            rows={weekdayRows}
            onToggle={toggleWeekday}
            onTimeChange={updateWeekdayTime}
            testIdPrefix="training-series-weekday"
          />
        </section>

        <section className="px-4 py-4">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <Users className="h-4 w-4 text-[var(--blue)]" aria-hidden />
            Trainer
          </h2>
          <p className="mb-3 text-xs text-[var(--text-2)]">Verwaltet auf Stufe Mannschaft.</p>
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
              className="mt-3 inline-block text-xs font-medium text-[var(--blue)] hover:underline"
            >
              Trainer verwalten
            </Link>
          ) : null}
        </section>
      </div>

      <div className={TRAINING_FORM_STICKY_FOOTER_CLASS}>
        <button type="button" onClick={() => router.back()} className="fca-button-secondary">
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={loading}
          className="fca-button-primary inline-flex items-center gap-2 disabled:opacity-60"
          data-testid="training-series-submit"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {mode === "create" ? "Training erstellen" : "Änderungen speichern"}
        </button>
      </div>
    </form>
  );
}

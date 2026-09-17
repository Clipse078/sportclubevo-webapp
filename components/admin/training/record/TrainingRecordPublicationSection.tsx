"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type PublicationState = {
  trainingWebsiteVisible: boolean;
  infoboardVisible: boolean;
};

type Props = {
  teamId: string;
  teamSeasonId: string;
  initialPublication: PublicationState;
  canEditTeamPublication: boolean;
  teamSettingsHref: string;
};

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  pending,
  onChange,
  testId,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  pending?: boolean;
  onChange: (next: boolean) => void;
  testId: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-[var(--foreground)]">{label}</p>
        <p className="text-xs text-[var(--text-2)]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled || pending}
        data-testid={testId}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] disabled:opacity-50",
          checked ? "bg-[var(--sce-primary)]" : "bg-[var(--surface-2)] ring-1 ring-[var(--border)]",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-1",
          )}
        />
        {pending ? (
          <Loader2 className="absolute -right-6 top-0.5 h-4 w-4 animate-spin text-[var(--muted)]" aria-hidden />
        ) : null}
      </button>
    </div>
  );
}

export default function TrainingRecordPublicationSection({
  teamId,
  teamSeasonId,
  initialPublication,
  canEditTeamPublication,
  teamSettingsHref,
}: Props) {
  const [publication, setPublication] = useState(initialPublication);
  const [websitePending, setWebsitePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateTrainingWebsiteVisible(next: boolean) {
    if (!canEditTeamPublication) return;
    setWebsitePending(true);
    setError(null);
    const previous = publication.trainingWebsiteVisible;
    setPublication((current) => ({ ...current, trainingWebsiteVisible: next }));

    try {
      const res = await fetch(`/api/teams/${teamId}/team-seasons/${teamSeasonId}/publication`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainingWebsiteVisible: next }),
      });
      const data = (await res.json().catch(() => null)) as {
        publication?: { trainingWebsiteVisible?: boolean };
        error?: string;
      } | null;

      if (!res.ok) {
        setPublication((current) => ({ ...current, trainingWebsiteVisible: previous }));
        setError(data?.error ?? "Speichern fehlgeschlagen.");
        return;
      }

      if (typeof data?.publication?.trainingWebsiteVisible === "boolean") {
        setPublication((current) => ({
          ...current,
          trainingWebsiteVisible: data.publication!.trainingWebsiteVisible!,
        }));
      }
    } catch {
      setPublication((current) => ({ ...current, trainingWebsiteVisible: previous }));
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setWebsitePending(false);
    }
  }

  return (
    <div className="divide-y divide-[var(--border)]/70" data-testid="training-record-publication">
      <p className="pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">Ausgabe</p>

      <ToggleRow
        label="Website"
        description="Trainingszeiten auf der öffentlichen Teamseite anzeigen."
        checked={publication.trainingWebsiteVisible}
        disabled={!canEditTeamPublication}
        pending={websitePending}
        onChange={updateTrainingWebsiteVisible}
        testId="training-record-publication-website"
      />

      <div className="flex items-start justify-between gap-4 py-2.5">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-[var(--foreground)]">Infoboard</p>
          <p className="text-xs text-[var(--text-2)]">
            Geplante Trainings erscheinen auf den Vereinsbildschirmen, solange sie nicht abgesagt sind.
            Teamweite Sichtbarkeit:{" "}
            <span className="font-medium text-[var(--foreground)]">
              {publication.infoboardVisible ? "Aktiv" : "Ausgeblendet"}
            </span>
            .
          </p>
          <a href={teamSettingsHref} className="text-xs font-semibold text-[var(--sce-primary)] hover:underline">
            In Team-Einstellungen verwalten
          </a>
        </div>
      </div>

      {error ? (
        <p className="pt-2 text-xs text-[var(--sce-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {!canEditTeamPublication ? (
        <p className="pt-2 text-xs text-[var(--muted)]">
          Website-Ausgabe erfordert Berechtigung zur Team-Verwaltung.
        </p>
      ) : null}
    </div>
  );
}

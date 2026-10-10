"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import TeamSeasonSearchablePicker, {
  type TeamSeasonPickerOption,
} from "@/components/admin/shared/TeamSeasonSearchablePicker";
import { PLAYER_RELEASE_REASON_OPTIONS } from "@/lib/match-squad/player-release-presentation";
import type { PlayerReleaseListItem } from "@/lib/match-squad/player-release-service";

export type PlayerReleaseEditorContext =
  | { mode: "PERIOD" }
  | {
      mode: "ACTIVITY";
      scopeLabel: string;
      eventId?: string;
      trainingSessionId?: string;
    };

type RosterPlayer = { personId: string; displayName: string };

type Props = {
  open: boolean;
  onClose: () => void;
  apiBase: string;
  editing: PlayerReleaseListItem | null;
  initialPersonId?: string;
  initialPersonDisplayName?: string;
  rosterPlayers: RosterPlayer[];
  context?: PlayerReleaseEditorContext;
  onSaved: () => void | Promise<void>;
};

type FormState = {
  personId: string;
  targetTeamSeasonId: string;
  validFrom: string;
  validUntil: string;
  maxMinutes: string;
  reason: string;
  note: string;
};

const EMPTY_FORM: FormState = {
  personId: "",
  targetTeamSeasonId: "",
  validFrom: "",
  validUntil: "",
  maxMinutes: "",
  reason: "SPIELPRAXIS",
  note: "",
};

function mapTargetOptions(
  rows: {
    teamSeasonId: string;
    teamId: string;
    label: string;
    secondaryLabel?: string | null;
    category?: string;
    genderGroup?: string | null;
  }[],
): TeamSeasonPickerOption[] {
  return rows.map((row) => ({
    id: row.teamSeasonId,
    teamId: row.teamId,
    teamName: row.label,
    seasonName: row.secondaryLabel ?? "",
    category: row.category,
    genderGroup: row.genderGroup,
  }));
}

export default function PlayerReleaseEditorSheet({
  open,
  onClose,
  apiBase,
  editing,
  initialPersonId,
  initialPersonDisplayName,
  rosterPlayers,
  context = { mode: "PERIOD" },
  onSaved,
}: Props) {
  const personSelectId = useId();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [targetOptions, setTargetOptions] = useState<TeamSeasonPickerOption[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isActivity = context.mode === "ACTIVITY";
  const lockedPersonId = editing?.personId ?? initialPersonId ?? "";
  const lockedPersonName =
    editing?.personDisplayName ?? initialPersonDisplayName ?? rosterPlayers.find((p) => p.personId === lockedPersonId)?.displayName;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        personId: editing.personId,
        targetTeamSeasonId: editing.targetTeamSeasonId,
        validFrom: editing.validFrom,
        validUntil: editing.validUntil,
        maxMinutes: editing.maxMinutes != null ? String(editing.maxMinutes) : "",
        reason: editing.reason,
        note: editing.note ?? "",
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        personId: initialPersonId ?? "",
      });
    }
    setFormError(null);
  }, [open, editing, initialPersonId]);

  const loadTargets = useCallback(
    async (personId: string) => {
      if (!personId) {
        setTargetOptions([]);
        return;
      }
      setTargetsLoading(true);
      try {
        const response = await fetch(
          `${apiBase}/target-teams?personId=${encodeURIComponent(personId)}`,
        );
        const json = (await response.json()) as {
          targetOptions?: {
            teamSeasonId: string;
            teamId: string;
            label: string;
            secondaryLabel?: string | null;
            category?: string;
            genderGroup?: string | null;
          }[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(json.error ?? "Zielteams konnten nicht geladen werden.");
        }
        setTargetOptions(mapTargetOptions(json.targetOptions ?? []));
      } catch {
        setTargetOptions([]);
      } finally {
        setTargetsLoading(false);
      }
    },
    [apiBase],
  );

  useEffect(() => {
    if (!open) return;
    const personId = editing?.personId ?? form.personId;
    void loadTargets(personId);
  }, [open, editing, form.personId, loadTargets]);

  async function handleSubmit() {
    setSubmitting(true);
    setFormError(null);
    try {
      const personId = editing?.personId ?? form.personId;
      const payload: Record<string, unknown> = {
        personId,
        targetTeamSeasonId: form.targetTeamSeasonId,
        maxMinutes: form.maxMinutes === "" ? null : Number(form.maxMinutes),
        reason: form.reason,
        note: form.note.trim() || null,
      };

      if (isActivity && !editing) {
        payload.scope = "ACTIVITY";
        if (context.eventId) payload.eventId = context.eventId;
        if (context.trainingSessionId) payload.trainingSessionId = context.trainingSessionId;
      } else if (!editing) {
        payload.scope = "PERIOD";
        payload.validFrom = form.validFrom;
        payload.validUntil = form.validUntil;
      } else if (editing.scope === "PERIOD") {
        payload.validFrom = form.validFrom;
        payload.validUntil = form.validUntil;
      }

      const response = await fetch(editing ? `${apiBase}/${editing.id}` : apiBase, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing
            ? {
                ...payload,
                expectedVersion: editing.version,
              }
            : payload,
        ),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Speichern fehlgeschlagen.");
      }
      onClose();
      await onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "Freigabe bearbeiten" : "Spieler freigeben"}
    >
      <div className="space-y-4 p-4">
        {isActivity && !editing ? (
          <p className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-2)]">
            <span className="font-medium text-[var(--text-1)]">Nur für diesen Termin</span>
            <br />
            {context.scopeLabel}
          </p>
        ) : null}

        {!editing && !initialPersonId ? (
          <label className="block text-sm" htmlFor={personSelectId}>
            <span className="mb-1 block font-medium">Spieler</span>
            <select
              id={personSelectId}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
              value={form.personId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, personId: event.target.value, targetTeamSeasonId: "" }))
              }
            >
              <option value="">Bitte wählen</option>
              {rosterPlayers.map((player) => (
                <option key={player.personId} value={player.personId}>
                  {player.displayName}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm text-[var(--text-2)]">
            Spieler: <strong>{lockedPersonName}</strong>
          </p>
        )}

        {!editing ? (
          <div className="block text-sm">
            <span className="mb-1 block font-medium">Zielteam</span>
            <TeamSeasonSearchablePicker
              options={targetOptions}
              value={form.targetTeamSeasonId}
              onChange={(value) => setForm((prev) => ({ ...prev, targetTeamSeasonId: value }))}
              placeholder="Zielteam suchen…"
              emptyLabel="Keine passenden Zielteams gefunden."
              disabled={targetsLoading || !form.personId}
              testId="player-release-target-picker"
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              Es werden nur Teams angezeigt, die für diesen Spieler als mögliches Zielteam erkannt
              werden.
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-2)]">
            Zielteam: <strong>{editing?.targetTeamLabel}</strong>
          </p>
        )}

        {!isActivity && editing?.scope !== "ACTIVITY" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Gültig ab</span>
              <input
                type="date"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
                value={form.validFrom}
                onChange={(event) => setForm((prev) => ({ ...prev, validFrom: event.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Gültig bis</span>
              <input
                type="date"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
                value={form.validUntil}
                onChange={(event) => setForm((prev) => ({ ...prev, validUntil: event.target.value }))}
              />
            </label>
          </div>
        ) : null}

        {editing?.scope === "ACTIVITY" ? (
          <p className="text-sm text-[var(--text-2)]">{editing.validityLabel}</p>
        ) : null}

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Max. Einsatzzeit (Minuten)</span>
          <input
            type="number"
            min={1}
            placeholder="Keine spezifische Begrenzung"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
            value={form.maxMinutes}
            onChange={(event) => setForm((prev) => ({ ...prev, maxMinutes: event.target.value }))}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Grund</span>
          <select
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
            value={form.reason}
            onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
          >
            {PLAYER_RELEASE_REASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Notiz (optional)</span>
          <textarea
            className="min-h-[80px] w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
            value={form.note}
            onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
          />
        </label>

        {formError ? <p className="text-sm text-[var(--danger)]">{formError}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="button" variant="primary" disabled={submitting} onClick={() => void handleSubmit()}>
            {editing ? "Speichern" : "Freigabe erstellen"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

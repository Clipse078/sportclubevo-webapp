"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Ban } from "lucide-react";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { PLAYER_RELEASE_REASON_OPTIONS } from "@/lib/match-squad/player-release-presentation";
import type { PlayerReleaseListItem } from "@/lib/match-squad/player-release-service";

type Props = {
  teamId: string;
  teamSeasonId: string;
};

type ListPayload = {
  releases: PlayerReleaseListItem[];
  rosterPlayers: { personId: string; displayName: string }[];
  targetOptions: { teamSeasonId: string; label: string; teamId: string }[];
  canEdit: boolean;
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

function statusTone(phase: string): "success" | "warning" | "muted" | "default" {
  switch (phase) {
    case "ACTIVE":
      return "success";
    case "EXPIRING_SOON":
    case "UPCOMING":
      return "warning";
    case "REVOKED":
    case "EXPIRED":
      return "muted";
    default:
      return "default";
  }
}

export default function TeamPlayerReleaseSection({ teamId, teamSeasonId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ListPayload | null>(null);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<PlayerReleaseListItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const apiBase = `/api/teams/${teamId}/team-seasons/${teamSeasonId}/player-releases`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}?includeHistory=${includeHistory ? "true" : "false"}`);
      const json = (await response.json()) as ListPayload & { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Spielerfreigaben konnten nicht geladen werden.");
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [apiBase, includeHistory]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, PlayerReleaseListItem[]>();
    for (const row of data?.releases ?? []) {
      const list = map.get(row.personId) ?? [];
      list.push(row);
      map.set(row.personId, list);
    }
    return [...map.entries()].sort((a, b) =>
      (a[1][0]?.personDisplayName ?? "").localeCompare(b[1][0]?.personDisplayName ?? "", "de"),
    );
  }, [data?.releases]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setSheetOpen(true);
  }

  function openEdit(row: PlayerReleaseListItem) {
    setEditing(row);
    setForm({
      personId: row.personId,
      targetTeamSeasonId: row.targetTeamSeasonId,
      validFrom: row.validFrom,
      validUntil: row.validUntil,
      maxMinutes: row.maxMinutes != null ? String(row.maxMinutes) : "",
      reason: row.reason,
      note: row.note ?? "",
    });
    setFormError(null);
    setSheetOpen(true);
  }

  async function handleSubmit() {
    if (!data?.canEdit) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        personId: form.personId,
        targetTeamSeasonId: form.targetTeamSeasonId,
        validFrom: form.validFrom,
        validUntil: form.validUntil,
        maxMinutes: form.maxMinutes === "" ? null : Number(form.maxMinutes),
        reason: form.reason,
        note: form.note.trim() || null,
      };

      const response = await fetch(
        editing ? `${apiBase}/${editing.id}` : apiBase,
        {
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
        },
      );
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Speichern fehlgeschlagen.");
      }
      setSheetOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(row: PlayerReleaseListItem) {
    if (!data?.canEdit) return;
    if (!window.confirm(`Freigabe für ${row.targetTeamLabel} widerrufen?`)) return;
    setSubmitting(true);
    try {
      const response = await fetch(`${apiBase}/${row.id}/revoke`, { method: "POST" });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Widerruf fehlgeschlagen.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Widerruf fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 md:p-5"
      data-testid="team-player-release-section"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-1)]">Spielerfreigaben</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Proaktive Freigabe für andere Teams — unabhängig von Verfügbarkeit und Aufgebot.
          </p>
        </div>
        {data?.canEdit ? (
          <Button type="button" variant="primary" onClick={openCreate} disabled={submitting}>
            <Plus className="h-4 w-4" aria-hidden />
            Für anderes Team freigeben
          </Button>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-3 text-sm">
        <label className="inline-flex items-center gap-2 text-[var(--text-2)]">
          <input
            type="checkbox"
            checked={includeHistory}
            onChange={(event) => setIncludeHistory(event.target.checked)}
          />
          Vergangen / Widerrufen anzeigen
        </label>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Spielerfreigaben werden geladen…</p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}

      {!loading && !error && grouped.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Noch keine Spielerfreigaben für diese Team-Saison erfasst.
        </p>
      ) : null}

      <div className="mt-4 space-y-5">
        {grouped.map(([personId, rows]) => (
          <div key={personId} data-testid={`player-release-group-${personId}`}>
            <h3 className="text-sm font-semibold text-[var(--text-1)]">
              {rows[0]?.personDisplayName}
            </h3>
            <ul className="mt-2 divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                  data-testid={`player-release-row-${row.id}`}
                >
                  <div className="min-w-0 space-y-1 text-sm">
                    <p className="font-medium text-[var(--text-1)]">{row.targetTeamLabel}</p>
                    <p className="text-[var(--text-2)]">
                      {row.validityLabel} · {row.maxMinutesLabel} · {row.reasonLabel}
                    </p>
                    {!row.sourceRosterMember ? (
                      <p className="text-xs text-[var(--warning)]">
                        Spieler nicht mehr im aktuellen Saison-Kader (historische Freigabe).
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminStatusPill tone={statusTone(row.displayPhase)} label={row.displayLabel} />
                    {data?.canEdit && row.status === "ACTIVE" ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => openEdit(row)}
                          aria-label="Freigabe bearbeiten"
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                          Bearbeiten
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void handleRevoke(row)}
                          aria-label="Freigabe widerrufen"
                        >
                          <Ban className="h-4 w-4" aria-hidden />
                          Widerrufen
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? "Freigabe bearbeiten" : "Spieler freigeben"}
      >
        <div className="space-y-4 p-4">
          {!editing ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Spieler</span>
              <select
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
                value={form.personId}
                onChange={(event) => setForm((prev) => ({ ...prev, personId: event.target.value }))}
              >
                <option value="">Bitte wählen</option>
                {(data?.rosterPlayers ?? []).map((player) => (
                  <option key={player.personId} value={player.personId}>
                    {player.displayName}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-[var(--text-2)]">
              Spieler: <strong>{editing.personDisplayName}</strong>
            </p>
          )}

          {!editing ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Zielteam</span>
              <select
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
                value={form.targetTeamSeasonId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, targetTeamSeasonId: event.target.value }))
                }
              >
                <option value="">Bitte wählen</option>
                {(data?.targetOptions ?? []).map((target) => (
                  <option key={target.teamSeasonId} value={target.teamSeasonId}>
                    {target.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-[var(--text-2)]">
              Zielteam: <strong>{editing?.targetTeamLabel}</strong>
            </p>
          )}

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
            <Button type="button" variant="secondary" onClick={() => setSheetOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" disabled={submitting} onClick={() => void handleSubmit()}>
              {editing ? "Speichern" : "Freigabe erstellen"}
            </Button>
          </div>
        </div>
      </Sheet>
    </section>
  );
}

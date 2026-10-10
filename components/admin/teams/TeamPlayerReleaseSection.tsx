"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Plus, Pencil, Ban } from "lucide-react";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { Button } from "@/components/ui/Button";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import PlayerReleaseEditorSheet from "@/components/admin/teams/PlayerReleaseEditorSheet";
import type { PlayerReleaseListItem } from "@/lib/match-squad/player-release-service";

type Props = {
  teamId: string;
  teamSeasonId: string;
};

type ListPayload = {
  releases: PlayerReleaseListItem[];
  rosterPlayers: { personId: string; displayName: string }[];
  canEdit: boolean;
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
  const historyToggleId = useId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ListPayload | null>(null);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<PlayerReleaseListItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    setSheetOpen(true);
  }

  function openEdit(row: PlayerReleaseListItem) {
    setEditing(row);
    setSheetOpen(true);
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

      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <span className="text-[var(--text-2)]" id={`${historyToggleId}-label`}>
          Vergangen / Widerrufen anzeigen
        </span>
        <SwitchThumb
          id={historyToggleId}
          checked={includeHistory}
          onChange={setIncludeHistory}
          aria-label="Vergangen / Widerrufen anzeigen"
        />
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
                      {row.reasonLabel} · {row.maxMinutesLabel}
                    </p>
                    <p className="text-[var(--text-2)]">{row.validityLabel}</p>
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

      <PlayerReleaseEditorSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        apiBase={apiBase}
        editing={editing}
        rosterPlayers={data?.rosterPlayers ?? []}
        context={{ mode: "PERIOD" }}
        onSaved={load}
      />
    </section>
  );
}

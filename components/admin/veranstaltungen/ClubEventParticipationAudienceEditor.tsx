"use client";

import { useCallback, useEffect, useState } from "react";

type AudienceEntry = {
  id: string;
  kind: string;
  label: string;
  referenceId: string;
};

type TeamOption = { id: string; name: string };

type Props = {
  eventId: string;
  disabled?: boolean;
};

export default function ClubEventParticipationAudienceEditor({ eventId, disabled }: Props) {
  const [entries, setEntries] = useState<AudienceEntry[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [teamId, setTeamId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/participation-audience`, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { entries?: AudienceEntry[] } | null;
    if (res.ok && data?.entries) setEntries(data.entries);
  }, [eventId]);

  useEffect(() => {
    void reload();
    void fetch("/api/teams?limit=100")
      .then((r) => r.json())
      .then((data: { teams?: TeamOption[] }) => setTeams(Array.isArray(data?.teams) ? data.teams : []))
      .catch(() => setTeams([]));
  }, [reload]);

  async function addTeamAudience() {
    if (!teamId) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/participation-audience`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "TEAM", teamId }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; entries?: AudienceEntry[] } | null;
      if (!res.ok) {
        setError(data?.error ?? "Teilnehmerkreis konnte nicht gespeichert werden.");
        return;
      }
      if (data?.entries) setEntries(data.entries);
      setTeamId("");
    } finally {
      setPending(false);
    }
  }

  async function removeEntry(entryId: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/participation-audience/${entryId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("Eintrag konnte nicht entfernt werden.");
        return;
      }
      await reload();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3" data-testid="club-event-participation-audience-editor">
      <p className="text-xs text-[var(--text-2)]">
        Zielgruppe für Teilnahme/RSVP — Team, Org-Einheit, Rolle oder einzelne Person (kanonisches Event-Modell).
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-[12rem] flex-1 space-y-1">
          <span className="fca-label text-xs">Team hinzufügen</span>
          <select
            className="fca-select h-8 text-sm"
            value={teamId}
            disabled={disabled || pending}
            onChange={(e) => setTeamId(e.target.value)}
            data-testid="club-event-audience-team-select"
          >
            <option value="">— Team wählen —</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="fca-button-secondary !min-h-8"
          disabled={disabled || pending || !teamId}
          onClick={() => void addTeamAudience()}
          data-testid="club-event-audience-team-add"
        >
          Hinzufügen
        </button>
      </div>
      {entries.length > 0 ? (
        <ul className="space-y-1 text-sm" data-testid="club-event-audience-list">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)]/60 px-2 py-1.5"
            >
              <span>
                {entry.kind}: {entry.label}
              </span>
              {!disabled ? (
                <button
                  type="button"
                  className="text-xs text-[var(--destructive)] hover:underline"
                  disabled={pending}
                  onClick={() => void removeEntry(entry.id)}
                >
                  Entfernen
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

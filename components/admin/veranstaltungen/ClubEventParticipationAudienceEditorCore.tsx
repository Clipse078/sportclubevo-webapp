"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { useCollaborationMutation } from "@/lib/collaboration/client/use-collaboration-mutation";
import { formatClubEventParticipationAudienceEntryLabel } from "@/lib/collaboration/club-event/club-event-audience-presentation";

type AudienceEntry = {
  id: string;
  kind: string;
  label: string;
  referenceId: string;
};

type TeamOption = { id: string; name: string };

export type ClubEventParticipationAudienceEditorInteraction = "inline" | "contextual";

export type ClubEventParticipationAudienceEditorCoreProps = {
  eventId: string;
  disabled?: boolean;
  interaction?: ClubEventParticipationAudienceEditorInteraction;
  onAudienceMutated?: () => void;
};

export type ClubEventParticipationAudienceEditorCoreHandle = {
  savePendingSelection: () => Promise<boolean>;
  hasPendingSelection: () => boolean;
};

export const ClubEventParticipationAudienceEditorCore = forwardRef<
  ClubEventParticipationAudienceEditorCoreHandle,
  ClubEventParticipationAudienceEditorCoreProps
>(function ClubEventParticipationAudienceEditorCore(
  { eventId, disabled, interaction = "inline", onAudienceMutated },
  ref,
) {
  const tf = useTranslations("Veranstaltungen.editor.fields");
  const { attachCycleBaseline, applyMutationCollaboration } = useCollaborationMutation(
    "CLUB_EVENT",
    eventId,
  );
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

  async function addTeamAudience(): Promise<boolean> {
    if (!teamId) return false;
    setPending(true);
    setError(null);
    try {
      const { payload, cycleRequested } = attachCycleBaseline({ kind: "TEAM", teamId });
      const res = await fetch(`/api/events/${eventId}/participation-audience`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        entries?: AudienceEntry[];
        collaboration?: unknown;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "Teilnehmerkreis konnte nicht gespeichert werden.");
        return false;
      }
      if (data?.entries) setEntries(data.entries);
      applyMutationCollaboration(data, cycleRequested);
      setTeamId("");
      onAudienceMutated?.();
      return true;
    } finally {
      setPending(false);
    }
  }

  async function removeEntry(entryId: string) {
    setPending(true);
    setError(null);
    try {
      const { payload, cycleRequested } = attachCycleBaseline({});
      const res = await fetch(`/api/events/${eventId}/participation-audience/${entryId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        entries?: AudienceEntry[];
        collaboration?: unknown;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "Eintrag konnte nicht entfernt werden.");
        return;
      }
      if (data?.entries) setEntries(data.entries);
      else await reload();
      applyMutationCollaboration(data, cycleRequested);
      onAudienceMutated?.();
    } finally {
      setPending(false);
    }
  }

  useImperativeHandle(ref, () => ({
    savePendingSelection: () => addTeamAudience(),
    hasPendingSelection: () => teamId.length > 0,
  }));

  const showInlineAdd = interaction === "inline";

  return (
    <div className="space-y-3" data-testid="club-event-participation-audience-editor-core">
      <p className="text-xs text-[var(--text-2)]">
        Zielgruppe für Teilnahme/RSVP — Team, Org-Einheit, Rolle oder einzelne Person (kanonisches
        Event-Modell).
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="block min-w-[12rem] flex-1 space-y-1">
          <span className="fca-label text-xs">Team hinzufügen</span>
          <select
            className="fca-select min-h-[2.375rem] py-2 text-sm leading-normal"
            value={teamId}
            disabled={disabled || pending}
            onChange={(e) => setTeamId(e.target.value)}
            data-testid="club-event-audience-team-select"
          >
            <option value="">{tf("teamSelectPlaceholder")}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        {showInlineAdd ? (
          <button
            type="button"
            className="fca-button-secondary min-h-[2.375rem] self-end sm:self-auto"
            disabled={disabled || pending || !teamId}
            onClick={() => void addTeamAudience()}
            data-testid="club-event-audience-team-add"
          >
            Hinzufügen
          </button>
        ) : null}
      </div>
      {entries.length > 0 ? (
        <ul className="space-y-1 text-sm" data-testid="club-event-audience-list">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)]/60 px-2 py-1.5"
              data-testid="club-event-audience-entry"
              data-audience-kind={entry.kind}
            >
              <span>{formatClubEventParticipationAudienceEntryLabel(entry)}</span>
              {!disabled ? (
                <button
                  type="button"
                  className="text-xs text-[var(--destructive)] hover:underline"
                  disabled={pending}
                  onClick={() => void removeEntry(entry.id)}
                  data-testid="club-event-audience-entry-remove"
                >
                  Entfernen
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p className="text-xs text-rose-600" role="alert" data-testid="club-event-audience-error">
          {error}
        </p>
      ) : null}
    </div>
  );
});

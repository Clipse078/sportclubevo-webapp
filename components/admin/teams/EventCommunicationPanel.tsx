"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import type { UpcomingParticipationEvent } from "@/lib/participation/types";

type Props = {
  teamId: string;
  teamSeasonId: string;
  selectedEvent: UpcomingParticipationEvent | null;
  canSend: boolean;
};

const PRESETS = [
  { id: "ALL_INVITEES", label: "Alle Eingeladenen" },
  { id: "ACCEPTED_ONLY", label: "Nur Zusagen" },
  { id: "DECLINED_ONLY", label: "Nur Absagen" },
  { id: "NOT_RESPONDED", label: "Ohne Rückmeldung" },
] as const;

function eventPayload(selectedEvent: UpcomingParticipationEvent) {
  if (selectedEvent.eventKind === "TRAINING") {
    return {
      eventKind: selectedEvent.eventKind,
      trainingSessionId: selectedEvent.trainingSessionId,
    };
  }
  return {
    eventKind: selectedEvent.eventKind,
    eventId: selectedEvent.eventId,
  };
}

export function EventCommunicationPanel({ teamId, teamSeasonId, selectedEvent, canSend }: Props) {
  const [preset, setPreset] = useState<string>("ALL_INVITEES");
  const [previewLabel, setPreviewLabel] = useState<string | null>(null);
  const [bodyText, setBodyText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refreshPreview = useCallback(async () => {
    if (!selectedEvent || !canSend) return;
    const response = await fetch(`/api/teams/${teamId}/events/communication/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamSeasonId,
        audiencePreset: preset,
        ...eventPayload(selectedEvent),
      }),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { previewLabel?: string };
    setPreviewLabel(data.previewLabel ?? null);
  }, [canSend, preset, selectedEvent, teamId, teamSeasonId]);

  useEffect(() => {
    void refreshPreview();
  }, [refreshPreview]);

  if (!canSend || !selectedEvent) return null;

  const sendCommunication = (kind: string) => {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/teams/${teamId}/events/communication/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamSeasonId,
          kind,
          audiencePreset: preset,
          bodyText: bodyText.trim() || "—",
          subject: kind === "MESSAGE" ? null : selectedEvent.title,
          ...eventPayload(selectedEvent),
        }),
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { error?: string };
        setMessage(err.error ?? "Senden fehlgeschlagen.");
        return;
      }
      setMessage("Nachricht wurde gesendet.");
      setBodyText("");
    });
  };

  const remindNoResponse = () => {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(
        `/api/teams/${teamId}/events/communication/remind-no-response`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamSeasonId,
            bodyText: bodyText.trim() || undefined,
            ...eventPayload(selectedEvent),
          }),
        },
      );
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { error?: string };
        setMessage(err.error ?? "Erinnerung fehlgeschlagen.");
        return;
      }
      setMessage("Erinnerung wurde gesendet.");
    });
  };

  return (
    <div
      className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-4"
      data-testid="event-communication-panel"
    >
      <h4 className="text-sm font-semibold text-[var(--foreground)]">Event-Kommunikation</h4>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Empfänger-Preset für {selectedEvent.title}
        {previewLabel ? ` · ${previewLabel}` : null}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`event-comm-preset-${item.id}`}
            className={`rounded-md border px-2 py-1 text-xs ${
              preset === item.id
                ? "border-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--border)]"
            }`}
            onClick={() => setPreset(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <textarea
        className="mt-3 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        rows={3}
        placeholder="Nachricht (optional — Standardtext bei Erinnerung)"
        value={bodyText}
        onChange={(e) => setBodyText(e.target.value)}
        data-testid="event-comm-body"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          data-testid="event-comm-send-message"
          onClick={() => sendCommunication("MESSAGE")}
        >
          Nachricht senden
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          data-testid="event-comm-send-announcement"
          onClick={() => sendCommunication("ANNOUNCEMENT")}
        >
          Mitteilung senden
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          data-testid="event-comm-send-alert"
          onClick={() => sendCommunication("ALERT")}
        >
          Alarm senden
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          data-testid="event-comm-remind-no-response"
          onClick={remindNoResponse}
        >
          Ausstehende Antworten erinnern
        </Button>
      </div>

      {message ? (
        <p className="mt-2 text-xs text-[var(--text-2)]" data-testid="event-comm-feedback">
          {message}
        </p>
      ) : null}
    </div>
  );
}

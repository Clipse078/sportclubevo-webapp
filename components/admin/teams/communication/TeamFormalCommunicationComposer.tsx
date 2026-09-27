"use client";

import { useId, useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui";
import { TEAM_AUDIENCE_PRESETS } from "@/lib/communication/team/team-audience-presets";
import { MAX_TEAM_COMMUNICATION_BODY_LENGTH } from "@/lib/communication/team/team-communication-constants";

export type FormalComposerMode = "ANNOUNCEMENT" | "ALERT";

type Props = {
  teamId: string;
  mode: FormalComposerMode;
  disabled?: boolean;
  onSend: (payload: {
    subject: string;
    bodyText: string;
    audiencePreset: string;
    acknowledgementRequired: boolean;
    attachmentIds: string[];
  }) => Promise<{ ok: boolean; message?: string }>;
  onSent: () => void;
};

const AUDIENCE_LABELS: Record<(typeof TEAM_AUDIENCE_PRESETS)[number], string> = {
  ALL: "Alle",
  PLAYERS: "Spieler",
  TRAINERS_STAFF: "Trainer / Staff",
};

export function TeamFormalCommunicationComposer({
  mode,
  disabled,
  onSend,
  onSent,
}: Props) {
  const subjectId = useId();
  const bodyId = useId();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audiencePreset, setAudiencePreset] =
    useState<(typeof TEAM_AUDIENCE_PRESETS)[number]>("ALL");
  const [acknowledgementRequired, setAcknowledgementRequired] = useState(
    mode === "ALERT",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const trimmedBody = body.trim();
  const trimmedSubject = subject.trim();
  const subjectRequired = mode === "ALERT";
  const canSubmit =
    !disabled &&
    !pending &&
    trimmedBody.length > 0 &&
    (!subjectRequired || trimmedSubject.length > 0);

  return (
    <div
      className="sticky bottom-0 z-10 space-y-3 border-t border-[var(--border)] bg-[var(--surface)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      data-testid={`team-formal-composer-${mode.toLowerCase()}`}
    >
      <div className="space-y-1">
        <label htmlFor={subjectId} className="text-xs font-medium text-[var(--text-2)]">
          {mode === "ALERT" ? "Titel (Pflicht)" : "Betreff"}
        </label>
        <input
          id={subjectId}
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={240}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
          data-testid="team-formal-subject-input"
          placeholder={mode === "ALERT" ? "z. B. Training fällt aus" : "Optionaler Betreff"}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={bodyId} className="text-xs font-medium text-[var(--text-2)]">
          Inhalt
        </label>
        <textarea
          id={bodyId}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MAX_TEAM_COMMUNICATION_BODY_LENGTH}
          rows={4}
          className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
          data-testid="team-formal-body-input"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-[var(--text-2)]">Zielgruppe</span>
          <select
            value={audiencePreset}
            onChange={(e) =>
              setAudiencePreset(e.target.value as (typeof TEAM_AUDIENCE_PRESETS)[number])
            }
            className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-sm"
            data-testid="team-formal-audience-select"
          >
            {TEAM_AUDIENCE_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {AUDIENCE_LABELS[preset]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
          <input
            type="checkbox"
            checked={acknowledgementRequired}
            onChange={(e) => setAcknowledgementRequired(e.target.checked)}
            data-testid="team-formal-ack-toggle"
          />
          Bestätigung erforderlich
        </label>
      </div>

      {error ? (
        <p className="text-sm text-red-600" data-testid="team-formal-error">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        disabled={!canSubmit}
        className="w-full sm:w-auto"
        data-testid="team-formal-send-button"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await onSend({
              subject: trimmedSubject,
              bodyText: trimmedBody,
              audiencePreset,
              acknowledgementRequired,
              attachmentIds: [],
            });
            if (!result.ok) {
              setError(result.message ?? "Senden fehlgeschlagen.");
              return;
            }
            setSubject("");
            setBody("");
            onSent();
          })
        }
      >
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        {mode === "ALERT" ? "Alarm senden" : "Mitteilung senden"}
      </Button>
    </div>
  );
}

"use client";

import { useId, useState, useTransition } from "react";
import { Loader2, Plus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { TEAM_AUDIENCE_PRESETS } from "@/lib/communication/team/team-audience-presets";
import { POLL_MODES, POLL_RESULTS_VISIBILITY } from "@/lib/communication/team/team-poll-types";

export type PollComposerMode = "POLL" | "DATE_POLL";

type Props = {
  teamId: string;
  mode: PollComposerMode;
  disabled?: boolean;
  onSend: (payload: {
    question: string;
    description: string;
    options: Array<{ label: string } | { startAt: string; endAt?: string | null }>;
    mode: string;
    deadlineAt: string | null;
    resultsVisibility: string;
    audiencePreset: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  onSent: () => void;
};

const AUDIENCE_LABELS: Record<(typeof TEAM_AUDIENCE_PRESETS)[number], string> = {
  ALL: "Alle",
  PLAYERS: "Spieler",
  TRAINERS_STAFF: "Trainer / Staff",
};

const VISIBILITY_LABELS: Record<(typeof POLL_RESULTS_VISIBILITY)[number], string> = {
  AFTER_RESPONSE: "Nach eigener Antwort",
  AFTER_CLOSE: "Nach Abschluss",
  SENDER_ONLY: "Nur Sender",
};

export function TeamPollComposer({ mode, disabled, onSend, onSent }: Props) {
  const questionId = useId();
  const descriptionId = useId();
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [pollMode, setPollMode] = useState<(typeof POLL_MODES)[number]>("SINGLE");
  const [resultsVisibility, setResultsVisibility] =
    useState<(typeof POLL_RESULTS_VISIBILITY)[number]>("AFTER_CLOSE");
  const [audiencePreset, setAudiencePreset] =
    useState<(typeof TEAM_AUDIENCE_PRESETS)[number]>("ALL");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [textOptions, setTextOptions] = useState(["", ""]);
  const [dateOptions, setDateOptions] = useState<
    { startAt: string; endAt: string }[]
  >([
    { startAt: "", endAt: "" },
    { startAt: "", endAt: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const trimmedQuestion = question.trim();
  const validTextOptions =
    mode === "POLL" ? textOptions.map((o) => o.trim()).filter(Boolean) : [];
  const validDateOptions =
    mode === "DATE_POLL"
      ? dateOptions.filter((o) => o.startAt.trim().length > 0)
      : [];
  const optionCount = mode === "POLL" ? validTextOptions.length : validDateOptions.length;

  const canSubmit =
    !disabled &&
    !pending &&
    trimmedQuestion.length > 0 &&
    optionCount >= 2;

  return (
    <div
      className="sticky bottom-0 z-10 space-y-3 border-t border-[var(--border)] bg-[var(--surface)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      data-testid={`team-poll-composer-${mode.toLowerCase()}`}
    >
      <div className="space-y-1">
        <label htmlFor={questionId} className="text-xs font-medium text-[var(--text-2)]">
          Frage
        </label>
        <input
          id={questionId}
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={240}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
          data-testid="team-poll-question-input"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={descriptionId} className="text-xs font-medium text-[var(--text-2)]">
          Beschreibung (optional)
        </label>
        <textarea
          id={descriptionId}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
          data-testid="team-poll-description-input"
        />
      </div>

      <div className="space-y-2" data-testid="team-poll-options">
        <p className="text-xs font-medium text-[var(--text-2)]">
          {mode === "POLL" ? "Antwortoptionen" : "Terminvorschläge"}
        </p>
        {mode === "POLL"
          ? textOptions.map((opt, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const next = [...textOptions];
                    next[index] = e.target.value;
                    setTextOptions(next);
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                  data-testid={`team-poll-option-${index}`}
                  placeholder={`Option ${index + 1}`}
                />
                {textOptions.length > 2 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    aria-label="Option entfernen"
                    onClick={() => setTextOptions(textOptions.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))
          : dateOptions.map((opt, index) => (
              <div key={index} className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="datetime-local"
                  value={opt.startAt}
                  onChange={(e) => {
                    const next = [...dateOptions];
                    next[index] = { ...next[index]!, startAt: e.target.value };
                    setDateOptions(next);
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                  data-testid={`team-date-poll-start-${index}`}
                />
                <input
                  type="datetime-local"
                  value={opt.endAt}
                  onChange={(e) => {
                    const next = [...dateOptions];
                    next[index] = { ...next[index]!, endAt: e.target.value };
                    setDateOptions(next);
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                  data-testid={`team-date-poll-end-${index}`}
                  placeholder="Ende optional"
                />
                {dateOptions.length > 2 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setDateOptions(dateOptions.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          data-testid="team-poll-add-option"
          onClick={() => {
            if (mode === "POLL") setTextOptions([...textOptions, ""]);
            else setDateOptions([...dateOptions, { startAt: "", endAt: "" }]);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          Option hinzufügen
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-2)]">Modus</span>
          <select
            value={pollMode}
            onChange={(e) => setPollMode(e.target.value as (typeof POLL_MODES)[number])}
            className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-sm"
            data-testid="team-poll-mode-select"
          >
            <option value="SINGLE">Einfachauswahl</option>
            <option value="MULTIPLE">Mehrfachauswahl</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-2)]">Ergebnisse</span>
          <select
            value={resultsVisibility}
            onChange={(e) =>
              setResultsVisibility(e.target.value as (typeof POLL_RESULTS_VISIBILITY)[number])
            }
            className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-sm"
            data-testid="team-poll-visibility-select"
          >
            {(POLL_RESULTS_VISIBILITY as readonly string[]).map((key) => (
              <option key={key} value={key}>
                {VISIBILITY_LABELS[key as (typeof POLL_RESULTS_VISIBILITY)[number]]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-2)]">Zielgruppe</span>
          <select
            value={audiencePreset}
            onChange={(e) =>
              setAudiencePreset(e.target.value as (typeof TEAM_AUDIENCE_PRESETS)[number])
            }
            className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-sm"
            data-testid="team-poll-audience-select"
          >
            {TEAM_AUDIENCE_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {AUDIENCE_LABELS[preset]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-2)]">Frist</span>
          <input
            type="datetime-local"
            value={deadlineAt}
            onChange={(e) => setDeadlineAt(e.target.value)}
            className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-sm"
            data-testid="team-poll-deadline-input"
          />
        </label>
      </div>

      {error ? (
        <p className="text-sm text-red-600" data-testid="team-poll-composer-error">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        disabled={!canSubmit}
        data-testid="team-poll-send-button"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const options =
              mode === "POLL"
                ? validTextOptions.map((label) => ({ label }))
                : validDateOptions.map((o) => ({
                    startAt: new Date(o.startAt).toISOString(),
                    endAt: o.endAt ? new Date(o.endAt).toISOString() : null,
                  }));
            const result = await onSend({
              question: trimmedQuestion,
              description: description.trim(),
              options,
              mode: pollMode,
              deadlineAt: deadlineAt ? new Date(deadlineAt).toISOString() : null,
              resultsVisibility,
              audiencePreset,
            });
            if (result.ok) onSent();
            else setError(result.message ?? "Senden fehlgeschlagen.");
          })
        }
      >
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        Senden
      </Button>
    </div>
  );
}

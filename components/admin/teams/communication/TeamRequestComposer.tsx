"use client";

import { useId, useState, useTransition } from "react";
import { Loader2, Plus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { TEAM_AUDIENCE_PRESETS } from "@/lib/communication/team/team-audience-presets";

type SlotDraft = {
  label: string;
  description: string;
  requiredCapacity: string;
  startAt: string;
  endAt: string;
};

type Props = {
  teamId: string;
  disabled?: boolean;
  onSend: (payload: {
    title: string;
    description: string;
    slots: Array<{
      label: string;
      description?: string | null;
      requiredCapacity?: number;
      startAt?: string | null;
      endAt?: string | null;
    }>;
    deadlineAt: string | null;
    audiencePreset: string;
    eventId: string | null;
  }) => Promise<{ ok: boolean; message?: string }>;
  onSent: () => void;
};

const AUDIENCE_LABELS: Record<(typeof TEAM_AUDIENCE_PRESETS)[number], string> = {
  ALL: "Alle",
  PLAYERS: "Spieler",
  TRAINERS_STAFF: "Trainer / Staff",
};

const emptySlot = (): SlotDraft => ({
  label: "",
  description: "",
  requiredCapacity: "1",
  startAt: "",
  endAt: "",
});

export function TeamRequestComposer({ disabled, onSend, onSent }: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audiencePreset, setAudiencePreset] =
    useState<(typeof TEAM_AUDIENCE_PRESETS)[number]>("ALL");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [eventId, setEventId] = useState("");
  const [slots, setSlots] = useState<SlotDraft[]>([emptySlot()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const trimmedTitle = title.trim();
  const validSlots = slots.filter((s) => s.label.trim().length > 0);
  const canSubmit = !disabled && !pending && trimmedTitle.length > 0 && validSlots.length >= 1;

  return (
    <div
      className="sticky bottom-0 z-10 space-y-3 border-t border-[var(--border)] bg-[var(--surface)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      data-testid="team-request-composer"
    >
      <div className="space-y-1">
        <label htmlFor={titleId} className="text-xs font-medium text-[var(--text-2)]">
          Titel
        </label>
        <input
          id={titleId}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={240}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
          data-testid="team-request-title-input"
          placeholder="z. B. Helfer fürs Heimturnier"
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
          rows={3}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
          data-testid="team-request-description-input"
        />
      </div>

      <div className="space-y-2" data-testid="team-request-slots-editor">
        <p className="text-xs font-medium text-[var(--text-2)]">Einsätze / Slots</p>
        {slots.map((slot, index) => (
          <div
            key={index}
            className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"
            data-testid={`team-request-slot-row-${index}`}
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={slot.label}
                onChange={(e) =>
                  setSlots((prev) =>
                    prev.map((row, i) => (i === index ? { ...row, label: e.target.value } : row)),
                  )
                }
                placeholder="Bezeichnung (z. B. Grill)"
                className="min-w-0 flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                data-testid={`team-request-slot-label-${index}`}
              />
              <input
                type="number"
                min={1}
                max={99}
                value={slot.requiredCapacity}
                onChange={(e) =>
                  setSlots((prev) =>
                    prev.map((row, i) =>
                      i === index ? { ...row, requiredCapacity: e.target.value } : row,
                    ),
                  )
                }
                className="w-20 rounded-lg border border-[var(--border)] px-2 py-2 text-sm"
                aria-label="Anzahl Personen"
                data-testid={`team-request-slot-capacity-${index}`}
              />
              {slots.length > 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  aria-label="Slot entfernen"
                  onClick={() => setSlots((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="datetime-local"
                value={slot.startAt}
                onChange={(e) =>
                  setSlots((prev) =>
                    prev.map((row, i) => (i === index ? { ...row, startAt: e.target.value } : row)),
                  )
                }
                className="rounded-lg border border-[var(--border)] px-2 py-2 text-xs"
                data-testid={`team-request-slot-start-${index}`}
              />
              <input
                type="datetime-local"
                value={slot.endAt}
                onChange={(e) =>
                  setSlots((prev) =>
                    prev.map((row, i) => (i === index ? { ...row, endAt: e.target.value } : row)),
                  )
                }
                className="rounded-lg border border-[var(--border)] px-2 py-2 text-xs"
                data-testid={`team-request-slot-end-${index}`}
              />
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setSlots((prev) => [...prev, emptySlot()])}
          data-testid="team-request-add-slot"
        >
          <Plus className="mr-1 h-4 w-4" />
          Slot hinzufügen
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-[var(--text-2)]">
          Frist (optional)
          <input
            type="datetime-local"
            value={deadlineAt}
            onChange={(e) => setDeadlineAt(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
            data-testid="team-request-deadline-input"
          />
        </label>
        <label className="space-y-1 text-xs text-[var(--text-2)]">
          Zielgruppe
          <select
            value={audiencePreset}
            onChange={(e) =>
              setAudiencePreset(e.target.value as (typeof TEAM_AUDIENCE_PRESETS)[number])
            }
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
            data-testid="team-request-audience-select"
          >
            {TEAM_AUDIENCE_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {AUDIENCE_LABELS[preset]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1 text-xs text-[var(--text-2)]">
        Event-Referenz (optional)
        <input
          type="text"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          placeholder="Event-ID"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
          data-testid="team-request-event-input"
        />
      </label>

      {error ? (
        <p className="text-sm text-red-600" data-testid="team-request-error">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        disabled={!canSubmit}
        className="w-full sm:w-auto"
        data-testid="team-request-send-button"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await onSend({
              title: trimmedTitle,
              description,
              slots: validSlots.map((slot) => ({
                label: slot.label.trim(),
                description: slot.description.trim() || null,
                requiredCapacity: Number.parseInt(slot.requiredCapacity, 10) || 1,
                startAt: slot.startAt ? new Date(slot.startAt).toISOString() : null,
                endAt: slot.endAt ? new Date(slot.endAt).toISOString() : null,
              })),
              deadlineAt: deadlineAt ? new Date(deadlineAt).toISOString() : null,
              audiencePreset,
              eventId: eventId.trim() || null,
            });
            if (result.ok) onSent();
            else setError(result.message ?? "Senden fehlgeschlagen.");
          })
        }
      >
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        Anfrage senden
      </Button>
    </div>
  );
}

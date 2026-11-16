"use client";

import { useRef, useState, useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { MeetingWorkspacePeopleField, personDisplayLabel } from "@/components/admin/meetings/workspace/MeetingWorkspacePeopleField";
import type { PersonPickerResult } from "@/components/shared/PeoplePicker";
import { meetingWorkspaceApi } from "@/lib/meetings/meeting-workspace-mutations";
import { buildMeetingActionAgendaLinkedRefs } from "@/lib/meetings/meeting-protocol-linked-refs";
import {
  useTraktandumOutcomeDraft,
  type TraktandumOutcomeOwnerDraft,
} from "@/lib/meetings/sitzungsmodus/meeting-traktandum-outcome-draft";
import {
  workspaceGhostButtonClass,
  workspaceInputClass,
  workspacePrimaryButtonClass,
} from "@/components/admin/meetings/workspace/meetingWorkspaceFieldClasses";

export type MeetingTraktandumOutcomeActionsProps = {
  meetingId: string;
  meetingTitle: string;
  agendaItemId: string;
  agendaTitle: string;
  agendaPosition: number;
  agendaNotes: string | null;
  canManage: boolean;
  testIdPrefix: string;
  onDecisionCreated: () => void | Promise<void>;
  onActionCreated: () => void | Promise<void>;
  onNotesUpdated: (notes: string) => void;
};

function ownerFromPicker(person: PersonPickerResult | null): TraktandumOutcomeOwnerDraft | null {
  if (!person) return null;
  return { id: person.id, displayName: personDisplayLabel(person) };
}

function ownerToPicker(owner: TraktandumOutcomeOwnerDraft | null): PersonPickerResult | null {
  if (!owner) return null;
  const parts = owner.displayName.split(/\s+/).filter(Boolean);
  return {
    id: owner.id,
    firstName: parts[0] ?? owner.displayName,
    lastName: parts.slice(1).join(" ") || "",
    displayName: owner.displayName,
    email: null,
    phone: null,
  };
}

function normalizeNotes(value: string | null | undefined): string {
  return (value?.trim() ?? "") || "";
}

export function MeetingTraktandumOutcomeActions({
  meetingId,
  meetingTitle,
  agendaItemId,
  agendaTitle,
  agendaPosition,
  agendaNotes,
  canManage,
  testIdPrefix,
  onDecisionCreated,
  onActionCreated,
  onNotesUpdated,
}: MeetingTraktandumOutcomeActionsProps) {
  const { draft, patch, reset } = useTraktandumOutcomeDraft(meetingId, agendaItemId);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inFlightRef = useRef(false);

  if (!canManage) return null;

  function clearOutcomeFormFields() {
    patch({
      activeForm: null,
      decisionTitle: "",
      decisionDescription: "",
      decisionRationale: "",
      showDecisionDetails: false,
      pendenzTitle: "",
      pendenzOwner: null,
      pendenzDueDate: "",
      pendenzDescription: "",
      showPendenzDetails: false,
      noteText: "",
    });
  }

  function cancelAll() {
    setError(null);
    reset();
  }

  function saveDecision() {
    const trimmed = draft.decisionTitle.trim();
    if (!trimmed || inFlightRef.current) return;
    setError(null);
    inFlightRef.current = true;
    startTransition(async () => {
      try {
        await meetingWorkspaceApi.decisions.create(meetingId, {
          title: trimmed,
          description: draft.decisionDescription.trim() || null,
          rationale: draft.decisionRationale.trim() || null,
          sourceAgendaItemId: agendaItemId,
          status: "CONFIRMED",
        });
        await onDecisionCreated();
        patch({
          activeForm: null,
          decisionTitle: "",
          decisionDescription: "",
          decisionRationale: "",
          showDecisionDetails: false,
          offerPendenzAfterDecision: true,
          lastSavedDecisionTitle: trimmed,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Beschluss konnte nicht gespeichert werden.");
      } finally {
        inFlightRef.current = false;
      }
    });
  }

  function savePendenz() {
    const trimmed = draft.pendenzTitle.trim();
    if (!trimmed || inFlightRef.current) return;
    setError(null);
    inFlightRef.current = true;
    const ownerPicker = ownerToPicker(draft.pendenzOwner);
    startTransition(async () => {
      try {
        await meetingWorkspaceApi.actions.create(meetingId, {
          title: trimmed,
          description: draft.pendenzDescription.trim() || null,
          ownerPersonId: ownerPicker?.id ?? null,
          owner: ownerPicker ? personDisplayLabel(ownerPicker) : null,
          dueDate: draft.pendenzDueDate || null,
          status: "OPEN",
          linkedRefs: buildMeetingActionAgendaLinkedRefs(agendaItemId),
        });
        await onActionCreated();
        patch({
          offerPendenzAfterDecision: false,
          lastSavedDecisionTitle: null,
        });
        clearOutcomeFormFields();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Pendenz konnte nicht gespeichert werden.");
      } finally {
        inFlightRef.current = false;
      }
    });
  }

  function startPendenzAfterDecision() {
    const seed =
      draft.lastSavedDecisionTitle?.trim() ?
        `Umsetzung: ${draft.lastSavedDecisionTitle.trim()}`
      : "";
    patch({
      activeForm: "pendenz",
      pendenzTitle: seed,
      offerPendenzAfterDecision: false,
    });
  }

  async function loadServerAgendaNotes(): Promise<string | null> {
    const res = await fetch(`/api/meetings/${meetingId}/agenda`);
    const data = (await res.json().catch(() => ({}))) as { items?: Array<{ id: string; notes: string | null }> };
    if (!res.ok || !Array.isArray(data.items)) {
      throw new Error("Notizen konnten nicht geladen werden.");
    }
    const row = data.items.find((item) => item.id === agendaItemId);
    return row?.notes ?? null;
  }

  function saveNote() {
    const addition = draft.noteText.trim();
    if (!addition || inFlightRef.current) return;
    setError(null);
    inFlightRef.current = true;
    startTransition(async () => {
      try {
        const serverNotes = await loadServerAgendaNotes();
        if (normalizeNotes(serverNotes) !== normalizeNotes(agendaNotes)) {
          setError(
            "Notizen wurden zwischenzeitlich geändert. Die aktuelle Version wurde übernommen — bitte Ergänzung prüfen und erneut speichern.",
          );
          if (serverNotes != null) onNotesUpdated(serverNotes);
          return;
        }
        const merged = agendaNotes?.trim() ? `${agendaNotes.trim()}\n\n${addition}` : addition;
        await meetingWorkspaceApi.agenda.update(meetingId, agendaItemId, { notes: merged });
        onNotesUpdated(merged);
        clearOutcomeFormFields();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Notiz konnte nicht gespeichert werden.");
      } finally {
        inFlightRef.current = false;
      }
    });
  }

  const pendenzOwnerPicker = ownerToPicker(draft.pendenzOwner);

  return (
    <div
      className="space-y-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)]/40 p-3"
      data-testid={`${testIdPrefix}-outcome-actions`}
    >
      <p className="text-xs text-[var(--text-2)]" data-testid={`${testIdPrefix}-outcome-context`}>
        <span className="font-semibold text-[var(--foreground)]">{meetingTitle}</span>
        {" · "}
        Traktandum {agendaPosition}: <span className="font-medium text-[var(--foreground)]">{agendaTitle}</span>
      </p>

      {error ? (
        <p className="text-xs text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      {draft.offerPendenzAfterDecision ? (
        <div
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
          data-testid={`${testIdPrefix}-pendenz-follow-up`}
        >
          <p className="text-sm text-[var(--foreground)]">Beschluss gespeichert.</p>
          <button
            type="button"
            className={`${workspacePrimaryButtonClass} mt-2`}
            data-testid={`${testIdPrefix}-pendenz-follow-up-trigger`}
            onClick={startPendenzAfterDecision}
          >
            Pendenz dazu erstellen
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={workspaceGhostButtonClass}
          data-testid={`${testIdPrefix}-outcome-decision-trigger`}
          disabled={pending}
          onClick={() =>
            patch({ activeForm: draft.activeForm === "decision" ? null : "decision", offerPendenzAfterDecision: false })
          }
        >
          Beschluss erfassen
        </button>
        <button
          type="button"
          className={workspaceGhostButtonClass}
          data-testid={`${testIdPrefix}-outcome-pendenz-trigger`}
          disabled={pending}
          onClick={() =>
            patch({ activeForm: draft.activeForm === "pendenz" ? null : "pendenz", offerPendenzAfterDecision: false })
          }
        >
          Pendenz erstellen
        </button>
        <button
          type="button"
          className={workspaceGhostButtonClass}
          data-testid={`${testIdPrefix}-outcome-note-trigger`}
          disabled={pending}
          onClick={() => patch({ activeForm: draft.activeForm === "note" ? null : "note" })}
        >
          Notiz ergänzen
        </button>
      </div>

      {draft.activeForm === "decision" ? (
        <div className="space-y-2 border-t border-[var(--border)] pt-2">
          <label className="block text-xs font-semibold text-[var(--muted)]">
            Beschlusstitel
            <input
              className={`${workspaceInputClass} mt-1`}
              value={draft.decisionTitle}
              onChange={(e) => patch({ decisionTitle: e.target.value })}
              placeholder="Kurzform"
            />
          </label>
          {draft.showDecisionDetails ? (
            <>
              <label className="block space-y-1 text-xs font-semibold text-[var(--muted)]">
                Beschlusswortlaut (optional)
                <textarea
                  className={workspaceInputClass}
                  rows={2}
                  value={draft.decisionDescription}
                  onChange={(e) => patch({ decisionDescription: e.target.value })}
                />
              </label>
              <label className="block space-y-1 text-xs font-semibold text-[var(--muted)]">
                Begründung (optional)
                <textarea
                  className={workspaceInputClass}
                  rows={2}
                  value={draft.decisionRationale}
                  onChange={(e) => patch({ decisionRationale: e.target.value })}
                />
              </label>
            </>
          ) : (
            <button
              type="button"
              className={`${workspaceGhostButtonClass} text-xs`}
              onClick={() => patch({ showDecisionDetails: true })}
            >
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              <span className="ml-1">Weitere Angaben</span>
            </button>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={workspacePrimaryButtonClass}
              disabled={pending || !draft.decisionTitle.trim()}
              onClick={() => saveDecision()}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className="ml-1">Speichern</span>
            </button>
            <button type="button" className={workspaceGhostButtonClass} onClick={cancelAll}>
              Abbrechen
            </button>
          </div>
        </div>
      ) : null}

      {draft.activeForm === "pendenz" ? (
        <div className="space-y-2 border-t border-[var(--border)] pt-2">
          <label className="block text-xs font-semibold text-[var(--muted)]">
            Massnahme / Pendenz
            <input
              className={`${workspaceInputClass} mt-1`}
              value={draft.pendenzTitle}
              onChange={(e) => patch({ pendenzTitle: e.target.value })}
              placeholder="Was ist zu tun?"
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <MeetingWorkspacePeopleField
              label="Verantwortliche/r"
              selected={pendenzOwnerPicker}
              onSelect={(person) => patch({ pendenzOwner: ownerFromPicker(person) })}
              onClear={() => patch({ pendenzOwner: null })}
            />
            <label className="block space-y-1 text-xs font-semibold text-[var(--muted)]">
              Fälligkeitsdatum
              <input
                type="date"
                className={workspaceInputClass}
                value={draft.pendenzDueDate}
                onChange={(e) => patch({ pendenzDueDate: e.target.value })}
              />
            </label>
          </div>
          {draft.showPendenzDetails ? (
            <label className="block space-y-1 text-xs font-semibold text-[var(--muted)]">
              Beschreibung (optional)
              <textarea
                className={workspaceInputClass}
                rows={2}
                value={draft.pendenzDescription}
                onChange={(e) => patch({ pendenzDescription: e.target.value })}
              />
            </label>
          ) : (
            <button
              type="button"
              className={`${workspaceGhostButtonClass} text-xs`}
              onClick={() => patch({ showPendenzDetails: true })}
            >
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              <span className="ml-1">Weitere Angaben</span>
            </button>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={workspacePrimaryButtonClass}
              disabled={pending || !draft.pendenzTitle.trim()}
              onClick={() => savePendenz()}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className="ml-1">Speichern</span>
            </button>
            <button type="button" className={workspaceGhostButtonClass} onClick={cancelAll}>
              Abbrechen
            </button>
          </div>
        </div>
      ) : null}

      {draft.activeForm === "note" ? (
        <div className="space-y-2 border-t border-[var(--border)] pt-2">
          <label className="block text-xs font-semibold text-[var(--muted)]">
            Notiz zu diesem Traktandum
            <textarea
              className={`${workspaceInputClass} mt-1 min-h-[72px]`}
              value={draft.noteText}
              onChange={(e) => patch({ noteText: e.target.value })}
              placeholder="Ergänzung zum Protokoll"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={workspacePrimaryButtonClass}
              disabled={pending || !draft.noteText.trim()}
              onClick={() => saveNote()}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className="ml-1">Notiz speichern</span>
            </button>
            <button type="button" className={workspaceGhostButtonClass} onClick={cancelAll}>
              Abbrechen
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
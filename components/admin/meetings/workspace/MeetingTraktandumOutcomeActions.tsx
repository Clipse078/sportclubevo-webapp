"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { MeetingWorkspacePeopleField, personDisplayLabel } from "@/components/admin/meetings/workspace/MeetingWorkspacePeopleField";
import type { PersonPickerResult } from "@/components/shared/PeoplePicker";
import { meetingWorkspaceApi } from "@/lib/meetings/meeting-workspace-mutations";
import { buildMeetingActionAgendaLinkedRefs } from "@/lib/meetings/meeting-protocol-linked-refs";
import {
  workspaceGhostButtonClass,
  workspaceInputClass,
  workspacePrimaryButtonClass,
} from "@/components/admin/meetings/workspace/meetingWorkspaceFieldClasses";

type OutcomeForm = "decision" | "pendenz" | "note" | null;

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
  const [activeForm, setActiveForm] = useState<OutcomeForm>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [decisionTitle, setDecisionTitle] = useState("");
  const [decisionDescription, setDecisionDescription] = useState("");
  const [decisionRationale, setDecisionRationale] = useState("");
  const [showDecisionDetails, setShowDecisionDetails] = useState(false);

  const [pendenzTitle, setPendenzTitle] = useState("");
  const [pendenzOwner, setPendenzOwner] = useState<PersonPickerResult | null>(null);
  const [pendenzDueDate, setPendenzDueDate] = useState("");
  const [pendenzDescription, setPendenzDescription] = useState("");
  const [showPendenzDetails, setShowPendenzDetails] = useState(false);

  const [noteText, setNoteText] = useState("");

  if (!canManage) return null;

  function resetForms() {
    setActiveForm(null);
    setError(null);
    setDecisionTitle("");
    setDecisionDescription("");
    setDecisionRationale("");
    setShowDecisionDetails(false);
    setPendenzTitle("");
    setPendenzOwner(null);
    setPendenzDueDate("");
    setPendenzDescription("");
    setShowPendenzDetails(false);
    setNoteText("");
  }

  function saveDecision() {
    const trimmed = decisionTitle.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      try {
        await meetingWorkspaceApi.decisions.create(meetingId, {
          title: trimmed,
          description: decisionDescription.trim() || null,
          rationale: decisionRationale.trim() || null,
          sourceAgendaItemId: agendaItemId,
          status: "CONFIRMED",
        });
        await onDecisionCreated();
        resetForms();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Beschluss konnte nicht gespeichert werden.");
      }
    });
  }

  function savePendenz() {
    const trimmed = pendenzTitle.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      try {
        await meetingWorkspaceApi.actions.create(meetingId, {
          title: trimmed,
          description: pendenzDescription.trim() || null,
          ownerPersonId: pendenzOwner?.id ?? null,
          owner: pendenzOwner ? personDisplayLabel(pendenzOwner) : null,
          dueDate: pendenzDueDate || null,
          status: "OPEN",
          linkedRefs: buildMeetingActionAgendaLinkedRefs(agendaItemId),
        });
        await onActionCreated();
        resetForms();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Pendenz konnte nicht gespeichert werden.");
      }
    });
  }

  function saveNote() {
    const addition = noteText.trim();
    if (!addition) return;
    setError(null);
    const merged = agendaNotes?.trim() ? `${agendaNotes.trim()}\n\n${addition}` : addition;
    startTransition(async () => {
      try {
        await meetingWorkspaceApi.agenda.update(meetingId, agendaItemId, { notes: merged });
        onNotesUpdated(merged);
        resetForms();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Notiz konnte nicht gespeichert werden.");
      }
    });
  }

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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={workspaceGhostButtonClass}
          data-testid={`${testIdPrefix}-outcome-decision-trigger`}
          disabled={pending}
          onClick={() => setActiveForm(activeForm === "decision" ? null : "decision")}
        >
          Beschluss erfassen
        </button>
        <button
          type="button"
          className={workspaceGhostButtonClass}
          data-testid={`${testIdPrefix}-outcome-pendenz-trigger`}
          disabled={pending}
          onClick={() => setActiveForm(activeForm === "pendenz" ? null : "pendenz")}
        >
          Pendenz erstellen
        </button>
        <button
          type="button"
          className={workspaceGhostButtonClass}
          data-testid={`${testIdPrefix}-outcome-note-trigger`}
          disabled={pending}
          onClick={() => setActiveForm(activeForm === "note" ? null : "note")}
        >
          Notiz ergänzen
        </button>
      </div>

      {activeForm === "decision" ? (
        <div className="space-y-2 border-t border-[var(--border)] pt-2">
          <label className="block text-xs font-semibold text-[var(--muted)]">
            Beschlusstitel
            <input
              className={`${workspaceInputClass} mt-1`}
              value={decisionTitle}
              onChange={(e) => setDecisionTitle(e.target.value)}
              placeholder="Kurzform"
            />
          </label>
          {showDecisionDetails ? (
            <>
              <label className="block space-y-1 text-xs font-semibold text-[var(--muted)]">
                Beschlusswortlaut (optional)
                <textarea
                  className={workspaceInputClass}
                  rows={2}
                  value={decisionDescription}
                  onChange={(e) => setDecisionDescription(e.target.value)}
                />
              </label>
              <label className="block space-y-1 text-xs font-semibold text-[var(--muted)]">
                Begründung (optional)
                <textarea
                  className={workspaceInputClass}
                  rows={2}
                  value={decisionRationale}
                  onChange={(e) => setDecisionRationale(e.target.value)}
                />
              </label>
            </>
          ) : (
            <button
              type="button"
              className={`${workspaceGhostButtonClass} text-xs`}
              onClick={() => setShowDecisionDetails(true)}
            >
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              <span className="ml-1">Weitere Angaben</span>
            </button>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={workspacePrimaryButtonClass}
              disabled={pending || !decisionTitle.trim()}
              onClick={() => saveDecision()}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className="ml-1">Speichern</span>
            </button>
            <button type="button" className={workspaceGhostButtonClass} onClick={resetForms}>
              Abbrechen
            </button>
          </div>
        </div>
      ) : null}

      {activeForm === "pendenz" ? (
        <div className="space-y-2 border-t border-[var(--border)] pt-2">
          <label className="block text-xs font-semibold text-[var(--muted)]">
            Massnahme / Pendenz
            <input
              className={`${workspaceInputClass} mt-1`}
              value={pendenzTitle}
              onChange={(e) => setPendenzTitle(e.target.value)}
              placeholder="Was ist zu tun?"
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <MeetingWorkspacePeopleField
              label="Verantwortliche/r"
              selected={pendenzOwner}
              onSelect={setPendenzOwner}
              onClear={() => setPendenzOwner(null)}
            />
            <label className="block space-y-1 text-xs font-semibold text-[var(--muted)]">
              Fälligkeitsdatum
              <input
                type="date"
                className={workspaceInputClass}
                value={pendenzDueDate}
                onChange={(e) => setPendenzDueDate(e.target.value)}
              />
            </label>
          </div>
          {showPendenzDetails ? (
            <label className="block space-y-1 text-xs font-semibold text-[var(--muted)]">
              Beschreibung (optional)
              <textarea
                className={workspaceInputClass}
                rows={2}
                value={pendenzDescription}
                onChange={(e) => setPendenzDescription(e.target.value)}
              />
            </label>
          ) : (
            <button
              type="button"
              className={`${workspaceGhostButtonClass} text-xs`}
              onClick={() => setShowPendenzDetails(true)}
            >
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              <span className="ml-1">Weitere Angaben</span>
            </button>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={workspacePrimaryButtonClass}
              disabled={pending || !pendenzTitle.trim()}
              onClick={() => savePendenz()}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className="ml-1">Speichern</span>
            </button>
            <button type="button" className={workspaceGhostButtonClass} onClick={resetForms}>
              Abbrechen
            </button>
          </div>
        </div>
      ) : null}

      {activeForm === "note" ? (
        <div className="space-y-2 border-t border-[var(--border)] pt-2">
          <label className="block text-xs font-semibold text-[var(--muted)]">
            Notiz zu diesem Traktandum
            <textarea
              className={`${workspaceInputClass} mt-1 min-h-[72px]`}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Ergänzung zum Protokoll"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={workspacePrimaryButtonClass}
              disabled={pending || !noteText.trim()}
              onClick={() => saveNote()}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className="ml-1">Notiz speichern</span>
            </button>
            <button type="button" className={workspaceGhostButtonClass} onClick={resetForms}>
              Abbrechen
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
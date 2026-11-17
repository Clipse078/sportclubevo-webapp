"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { meetingWorkspaceApi, MeetingWorkspaceApiError } from "@/lib/meetings/meeting-workspace-mutations";
import { resolveMeetingAgendaTopicBackground } from "@/lib/meetings/meeting-agenda-topic-context";
import { useTraktandumAgendaNotesDraft } from "@/lib/meetings/meeting-traktandum-agenda-notes-draft";
import type { MeetingSubEntities } from "@/lib/meetings/queries";
import {
  workspaceGhostButtonClass,
  workspaceInputClass,
  workspacePrimaryButtonClass,
} from "@/components/admin/meetings/workspace/meetingWorkspaceFieldClasses";

type AgendaItem = MeetingSubEntities["agendaItems"][number];

type Props = {
  meetingId: string;
  agendaItemId: string;
  agendaItem: Pick<AgendaItem, "notes" | "initiative">;
  canManage: boolean;
  testIdPrefix: string;
  onNotesSaved: (notes: string | null) => void;
};

function normalizeNotes(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function MeetingTraktandumAgendaNotes({
  meetingId,
  agendaItemId,
  agendaItem,
  canManage,
  testIdPrefix,
  onNotesSaved,
}: Props) {
  const { draft, patch } = useTraktandumAgendaNotesDraft(meetingId, agendaItemId);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [quietSuccess, setQuietSuccess] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const background = resolveMeetingAgendaTopicBackground(agendaItem);
  const serverNotes = normalizeNotes(agendaItem.notes);

  useEffect(() => {
    if (!draft.editing) return;
    setQuietSuccess(null);
  }, [draft.editing]);

  if (!background && !serverNotes && !draft.editing && !canManage) {
    return null;
  }

  function beginEdit() {
    setError(null);
    setQuietSuccess(null);
    patch({
      editing: true,
      draftText: serverNotes ?? "",
      baselineServerNotes: serverNotes,
      conflictServerNotes: null,
    });
  }

  function cancelEdit() {
    patch({
      editing: false,
      draftText: "",
      baselineServerNotes: null,
      conflictServerNotes: null,
    });
    setError(null);
  }

  function saveEdit() {
    if (inFlightRef.current) return;
    setError(null);
    inFlightRef.current = true;
    const nextNotes = normalizeNotes(draft.draftText);
    startTransition(async () => {
      try {
        const result = await meetingWorkspaceApi.agenda.update(meetingId, agendaItemId, {
          notes: nextNotes,
          expectedNotes: draft.baselineServerNotes,
        });
        const saved =
          typeof (result as { item?: { notes?: string | null } }).item?.notes !== "undefined"
            ? normalizeNotes((result as { item: { notes: string | null } }).item.notes)
            : nextNotes;
        onNotesSaved(saved);
        setQuietSuccess("Traktanden-Notizen gespeichert.");
        patch({
          editing: false,
          draftText: "",
          baselineServerNotes: null,
          conflictServerNotes: null,
        });
      } catch (err) {
        if (err instanceof MeetingWorkspaceApiError && err.code === "NOTES_CONFLICT") {
          const current =
            typeof err.payload.currentNotes === "string" || err.payload.currentNotes === null
              ? (err.payload.currentNotes as string | null)
              : null;
          patch({ conflictServerNotes: current });
          onNotesSaved(current);
          setError(err.message);
          return;
        }
        setError(err instanceof Error ? err.message : "Notizen konnten nicht gespeichert werden.");
      } finally {
        inFlightRef.current = false;
      }
    });
  }

  const displayNotes = draft.conflictServerNotes ?? serverNotes;

  return (
    <div className="space-y-2" data-testid={`${testIdPrefix}-topic-context`}>
      {background ? (
        <div className="space-y-0.5" data-testid={`${testIdPrefix}-topic-background`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Hintergrund (Vorhaben)
          </p>
          <p className="whitespace-pre-wrap text-sm text-[var(--text-2)]">{background}</p>
        </div>
      ) : null}

      {draft.editing ? (
        <div className="space-y-2" data-testid={`${testIdPrefix}-notes-edit`}>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Traktanden-Notizen (Protokoll)
            <textarea
              className={`${workspaceInputClass} mt-1 min-h-[88px]`}
              value={draft.draftText}
              onChange={(e) => patch({ draftText: e.target.value })}
              data-testid={`${testIdPrefix}-notes-draft`}
            />
          </label>
          {draft.conflictServerNotes !== null ? (
            <MotionSafeMuted className="rounded-lg border border-amber-200 bg-amber-50/80 p-2 text-xs text-amber-900">
              <p className="font-semibold">Aktuelle Server-Version</p>
              <p className="mt-1 whitespace-pre-wrap">{draft.conflictServerNotes || "—"}</p>
            </MotionSafeMuted>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={workspacePrimaryButtonClass}
              disabled={pending}
              onClick={saveEdit}
              data-testid={`${testIdPrefix}-notes-save`}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className="ml-1">Notizen speichern</span>
            </button>
            <button type="button" className={workspaceGhostButtonClass} disabled={pending} onClick={cancelEdit}>
              Abbrechen
            </button>
          </div>
        </div>
      ) : displayNotes || canManage ? (
        <div className="space-y-1" data-testid={`${testIdPrefix}-notes-read`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Traktanden-Notizen (Protokoll)
            </p>
            {canManage ? (
              <button
                type="button"
                className={`${workspaceGhostButtonClass} text-xs`}
                onClick={beginEdit}
                data-testid={`${testIdPrefix}-notes-edit-trigger`}
              >
                Bearbeiten
              </button>
            ) : null}
          </div>
          {displayNotes ? (
            <p className="whitespace-pre-wrap text-sm text-[var(--text-2)]" data-testid={`${testIdPrefix}-notes-body`}>
              {displayNotes}
            </p>
          ) : canManage ? (
            <p className="text-sm text-[var(--muted)]">Keine Notizen hinterlegt.</p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="text-xs text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      {quietSuccess ? (
        <p className="text-xs text-[var(--text-2)]" role="status">
          {quietSuccess}
        </p>
      ) : null}
    </div>
  );
}

function MotionSafeMuted({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className} data-reduced-motion-safe="true">
      {children}
    </div>
  );
}
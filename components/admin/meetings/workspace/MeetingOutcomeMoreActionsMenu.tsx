"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";
import { useId, useRef, useState, useTransition } from "react";
import SceInlineDestructiveConfirm from "@/components/sce/club-development/SceInlineDestructiveConfirm";
import { PopoverContent } from "@/components/ui/Popover";
import { meetingWorkspaceApi, MeetingWorkspaceApiError } from "@/lib/meetings/meeting-workspace-mutations";
import {
  buildMeetingActionDeletionConfirmDescription,
  buildMeetingDecisionDeletionConfirmDescription,
} from "@/lib/meetings/meeting-outcome-delete-confirm-copy";
import type {
  MeetingActionDeletionImpact,
  MeetingDecisionDeletionImpact,
} from "@/lib/meetings/meeting-outcome-delete-service";
import { workspaceGhostButtonClass } from "@/components/admin/meetings/workspace/meetingWorkspaceFieldClasses";

type OutcomeKind = "decision" | "pendenz";

const OUTCOME_MENU_SURFACE_CLASS =
  "min-w-[12rem] rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-md";

const OUTCOME_MENU_DESTRUCTIVE_ITEM_CLASS =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-800 hover:bg-red-50 focus:bg-red-50 focus:outline-none";

type MeetingOutcomeMoreActionsMenuProps = {
  meetingId: string;
  recordId: string;
  recordTitle: string;
  kind: OutcomeKind;
  canManage: boolean;
  onDeleted: () => void | Promise<void>;
  testIdPrefix?: string;
  /** When false, menu is omitted (e.g. canonical Aufgabe rows). */
  showDelete?: boolean;
};

export function MeetingOutcomeMoreActionsMenu({
  meetingId,
  recordId,
  recordTitle,
  kind,
  canManage,
  onDeleted,
  testIdPrefix = "meeting-outcome",
  showDelete = true,
}: MeetingOutcomeMoreActionsMenuProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [impactLoading, setImpactLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [decisionImpact, setDecisionImpact] = useState<MeetingDecisionDeletionImpact | null>(null);
  const [actionImpact, setActionImpact] = useState<MeetingActionDeletionImpact | null>(null);

  if (!canManage || !showDelete) return null;

  const deleteLabel = kind === "decision" ? "Beschluss löschen" : "Pendenz löschen";
  const confirmTitle = kind === "decision" ? "Beschluss löschen?" : "Pendenz löschen?";

  async function openDeleteConfirm() {
    setMenuOpen(false);
    setError(null);
    setConfirmOpen(true);
    setImpactLoading(true);
    try {
      if (kind === "decision") {
        const preview = await meetingWorkspaceApi.decisions.previewRemove(meetingId, recordId);
        setDecisionImpact(preview.impact);
      } else {
        const preview = await meetingWorkspaceApi.actions.previewRemove(meetingId, recordId);
        setActionImpact(preview.impact);
      }
    } catch (e) {
      setError(e instanceof MeetingWorkspaceApiError ? e.message : "Vorschau nicht verfügbar.");
    } finally {
      setImpactLoading(false);
    }
  }

  function cancelConfirm() {
    if (pending) return;
    setConfirmOpen(false);
    setError(null);
    triggerRef.current?.focus();
  }

  function performDelete() {
    if (pending || impactLoading) return;
    setError(null);
    startTransition(async () => {
      try {
        if (kind === "decision") {
          await meetingWorkspaceApi.decisions.remove(meetingId, recordId);
        } else {
          await meetingWorkspaceApi.actions.remove(meetingId, recordId);
        }
        setConfirmOpen(false);
        await onDeleted();
        triggerRef.current?.focus();
      } catch (e) {
        setError(
          e instanceof MeetingWorkspaceApiError ? e.message : "Löschen fehlgeschlagen. Bitte erneut versuchen.",
        );
      }
    });
  }

  const description =
    kind === "decision"
      ? buildMeetingDecisionDeletionConfirmDescription(recordTitle, decisionImpact)
      : buildMeetingActionDeletionConfirmDescription(recordTitle, actionImpact);

  return (
    <div className="shrink-0" data-testid={`${testIdPrefix}-more-actions-${recordId}`}>
      {!confirmOpen ? (
        <>
          <button
            ref={triggerRef}
            type="button"
            className={`${workspaceGhostButtonClass} px-2 py-1 text-xs`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            data-testid={`${testIdPrefix}-more-actions-trigger-${recordId}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setMenuOpen((open) => !open);
            }}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
            <span className="sr-only">Weitere Aktionen</span>
          </button>
          <PopoverContent
            open={menuOpen}
            onOpenChange={(open) => {
              setMenuOpen(open);
              if (!open) triggerRef.current?.focus();
            }}
            anchorRef={triggerRef}
            placement="bottom-end"
            matchAnchorWidth={false}
            constrainHeight={false}
            clipOverflow={false}
            role="dialog"
            id={menuId}
            className={OUTCOME_MENU_SURFACE_CLASS}
          >
            <div
              role="menu"
              data-testid={`${testIdPrefix}-more-actions-popover-${recordId}`}
            >
              <button
                type="button"
                role="menuitem"
                className={OUTCOME_MENU_DESTRUCTIVE_ITEM_CLASS}
                onClick={() => void openDeleteConfirm()}
                data-testid={`${testIdPrefix}-delete-trigger-${recordId}`}
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {deleteLabel}
              </button>
            </div>
          </PopoverContent>
        </>
      ) : (
        <SceInlineDestructiveConfirm
          title={confirmTitle}
          description={impactLoading ? "Auswirkungen werden geprüft…" : description}
          confirmLabel={deleteLabel}
          pending={pending || impactLoading}
          error={error}
          onConfirm={performDelete}
          onCancel={cancelConfirm}
          testId={`${testIdPrefix}-delete-confirm-${recordId}`}
        />
      )}
    </div>
  );
}
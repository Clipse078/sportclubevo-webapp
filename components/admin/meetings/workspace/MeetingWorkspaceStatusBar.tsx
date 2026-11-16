"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, MoreHorizontal } from "lucide-react";
import type { MeetingLiveData } from "@/lib/meetings/queries";
import { buildMeetingWorkspaceStatusSummary } from "@/lib/meetings/meeting-workspace-status-summary";
import type { MeetingSubEntities } from "@/lib/meetings/queries";
import {
  MeetingDeleteInlineConfirm,
  MeetingDeleteMenuItem,
  fetchMeetingDeletionImpact,
} from "@/components/admin/meetings/MeetingDeleteButton";
import {
  meetingProtocolPrintDraftHint,
  meetingProtocolPrintPath,
  meetingProtocolPrintUnavailableReason,
} from "@/lib/meetings/meeting-protocol-print";
import { PopoverContent } from "@/components/ui/Popover";
import type { MeetingDeletionImpact } from "@/lib/meetings/meeting-delete-service";
import {
  hasMeetingSecondaryMenuItems,
  meetingShowsCloseInSecondaryMenu,
} from "@/lib/meetings/meeting-workspace-secondary-menu";

type Props = {
  meeting: MeetingLiveData;
  canManage: boolean;
  canDelete?: boolean;
  participants: MeetingSubEntities["participants"];
  agendaItems: MeetingSubEntities["agendaItems"];
  decisions: MeetingSubEntities["decisions"];
  actions: MeetingSubEntities["actions"];
  slug: string;
  openPendenzenCount?: number;
  overduePendenzenCount?: number;
};

export default function MeetingWorkspaceStatusBar({
  meeting,
  canManage,
  canDelete = false,
  participants,
  agendaItems,
  decisions,
  actions,
  slug,
  openPendenzenCount = 0,
  overduePendenzenCount = 0,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteImpactLoading, setDeleteImpactLoading] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState<MeetingDeletionImpact | null>(null);
  const [deleteImpactError, setDeleteImpactError] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuTriggerRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const summary = buildMeetingWorkspaceStatusSummary({
    meeting,
    participants,
    agendaItems,
    decisions,
    actions,
    hasInvitedParticipants: participants.some((p) => p.status === "INVITED"),
    openPendenzenCount,
    overduePendenzenCount,
  });

  const showSecondaryMenu = hasMeetingSecondaryMenuItems({ canManage });
  const showCloseAction = meetingShowsCloseInSecondaryMenu(meeting.status);

  async function callLifecycle(action: string, extra?: Record<string, unknown>) {
    setError(null);
    setLoading(action);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/lifecycle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Aktion fehlgeschlagen.");
        return;
      }
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(null);
      setMenuOpen(false);
    }
  }

  async function beginDeleteConfirm() {
    setMenuOpen(false);
    menuTriggerRef.current?.focus();
    setDeleteConfirmOpen(true);
    setDeleteImpact(null);
    setDeleteImpactError(null);
    setDeleteImpactLoading(true);
    try {
      const impact = await fetchMeetingDeletionImpact(meeting.id);
      setDeleteImpact(impact);
    } catch (err) {
      setDeleteImpactError(err instanceof Error ? err.message : "Vorschau nicht verfügbar.");
    } finally {
      setDeleteImpactLoading(false);
    }
  }

  return (
    <section className="flex flex-col gap-1.5" data-testid="meeting-workspace-status-bar">
      {summary.attentionLine ? (
        <p className="text-xs text-amber-800" role="status" data-testid="meeting-attention-hint">
          {summary.attentionLine}
        </p>
      ) : null}

      {showSecondaryMenu ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            ref={menuTriggerRef}
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            data-testid="meeting-workspace-secondary-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
            Weitere Aktionen
          </button>

          <PopoverContent
            open={menuOpen}
            onOpenChange={(open) => {
              setMenuOpen(open);
              if (!open) menuTriggerRef.current?.focus();
            }}
            anchorRef={menuTriggerRef}
            placement="bottom-end"
            matchAnchorWidth={false}
            constrainHeight={false}
            clipOverflow={false}
            role="dialog"
            className="min-w-[12rem] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0 shadow-lg"
          >
            <div role="menu" className="py-1" data-testid="meeting-workspace-summary-menu-popover">
              {showCloseAction ? (
                <button
                  type="button"
                  role="menuitem"
                  disabled={loading !== null}
                  className="block w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] disabled:opacity-50"
                  onClick={() => callLifecycle("close")}
                  data-testid="meeting-close"
                >
                  {loading === "close" ? "Wird geschlossen…" : "Sitzung abschliessen"}
                </button>
              ) : null}
              {meetingProtocolPrintUnavailableReason(meeting.status) ? (
                <button
                  type="button"
                  role="menuitem"
                  disabled
                  title={meetingProtocolPrintUnavailableReason(meeting.status) ?? undefined}
                  className="block w-full cursor-not-allowed px-3 py-2 text-left text-sm text-[var(--muted)]"
                  data-testid="meeting-print-protocol-unavailable"
                >
                  Protokoll drucken
                </button>
              ) : (
                <Link
                  href={meetingProtocolPrintPath(slug)}
                  role="menuitem"
                  className="block px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                  onClick={() => setMenuOpen(false)}
                  data-testid="meeting-print-protocol"
                  title={meetingProtocolPrintDraftHint(meeting.status) ?? undefined}
                >
                  Protokoll drucken
                </Link>
              )}
              {canDelete ? (
                <>
                  <MenuDivider />
                  <MeetingDeleteMenuItem
                    onSelect={beginDeleteConfirm}
                    disabled={loading !== null || deleteImpactLoading}
                  />
                </>
              ) : null}
            </div>
          </PopoverContent>
        </div>
      ) : null}

      {deleteConfirmOpen ? (
        <div data-testid="meeting-delete-inline-confirm-host">
          {deleteImpactError ? (
            <p className="text-xs text-rose-600" role="alert">
              {deleteImpactError}
            </p>
          ) : null}
          <MeetingDeleteInlineConfirm
            meetingId={meeting.id}
            meetingTitle={meeting.title}
            impact={deleteImpact}
            impactLoading={deleteImpactLoading}
            onCancel={() => {
              setDeleteConfirmOpen(false);
              setDeleteImpact(null);
              setDeleteImpactError(null);
            }}
          />
        </div>
      ) : null}

      {meeting.status === "COMPLETED" && canManage ? (
        <div className="space-y-2 pt-2" data-testid="meeting-lifecycle-panel">
          <label className="block text-xs font-medium text-[var(--text-2)]" htmlFor="reopen-reason">
            Wieder öffnen (Begründung erforderlich)
          </label>
          <textarea
            id="reopen-reason"
            rows={2}
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={loading !== null || reopenReason.trim().length < 3}
            onClick={() => callLifecycle("reopen", { reason: reopenReason })}
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 disabled:opacity-50"
            data-testid="meeting-reopen"
          >
            {loading === "reopen" ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : null}
            Wieder öffnen
          </button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </section>
  );
}

function MenuDivider() {
  return <div className="my-1 border-t border-[var(--border)]" role="separator" />;
}
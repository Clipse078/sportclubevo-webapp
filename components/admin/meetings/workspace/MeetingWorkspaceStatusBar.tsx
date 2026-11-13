"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, MoreHorizontal } from "lucide-react";
import type { MeetingLiveData } from "@/lib/meetings/queries";
import { buildMeetingWorkspaceStatusSummary } from "@/lib/meetings/meeting-workspace-status-summary";
import type { MeetingSubEntities } from "@/lib/meetings/queries";
import MeetingDeleteButton from "@/components/admin/meetings/MeetingDeleteButton";

type Props = {
  meeting: MeetingLiveData;
  canManage: boolean;
  canDelete?: boolean;
  participants: MeetingSubEntities["participants"];
  agendaItems: MeetingSubEntities["agendaItems"];
  decisions: MeetingSubEntities["decisions"];
  actions: MeetingSubEntities["actions"];
  slug: string;
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
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [reopenReason, setReopenReason] = useState("");

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const summary = buildMeetingWorkspaceStatusSummary({
    meeting,
    participants,
    agendaItems,
    decisions,
    actions,
    hasInvitedParticipants: participants.some((p) => p.status === "INVITED"),
  });

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

  return (
    <section
      className="flex flex-col gap-2 border-y border-[var(--border)] py-3"
      data-testid="meeting-workspace-status-bar"
    >
      {summary.attentionLine ? (
        <p className="text-xs text-amber-800" role="status" data-testid="meeting-attention-hint">
          {summary.attentionLine}
        </p>
      ) : null}

      {canManage ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div ref={menuRef} className="relative">
            <button
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
            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 min-w-[12rem] rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg"
              >
                <Link
                  href={`/vereinsleitung/meetings/${slug}/edit`}
                  role="menuitem"
                  className="block px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                  onClick={() => setMenuOpen(false)}
                >
                  Bearbeiten
                </Link>
                {meeting.status === "PLANNED" ? (
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
                {meeting.status === "COMPLETED" ? (
                  <Link
                    href={`/vereinsleitung/meetings/${slug}/protokoll`}
                    role="menuitem"
                    className="block px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                    onClick={() => setMenuOpen(false)}
                    data-testid="meeting-print-protocol"
                  >
                    Protokoll drucken
                  </Link>
                ) : null}
                {canDelete ? (
                  <>
                    <MenuDivider />
                    <div className="px-1 py-1" role="none">
                      <MeetingDeleteButton
                        meetingId={meeting.id}
                        meetingTitle={meeting.title}
                        presentation="menu"
                        onMenuAction={() => setMenuOpen(false)}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {meeting.status === "COMPLETED" && canManage ? (
        <div className="space-y-2 border-t border-[var(--border)] pt-3" data-testid="meeting-lifecycle-panel">
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

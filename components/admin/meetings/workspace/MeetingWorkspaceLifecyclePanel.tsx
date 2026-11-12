"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { MeetingLiveData } from "@/lib/meetings/queries";
import { meetingApprovalRuleLabel } from "@/lib/meetings/meeting-approval-rules";
import { getMeetingLifecyclePresentation } from "@/lib/meetings/meeting-lifecycle";

type Props = {
  meeting: MeetingLiveData;
  canManage: boolean;
  participantCount: number;
  agendaCount: number;
};

export default function MeetingWorkspaceLifecyclePanel({
  meeting,
  canManage,
  participantCount,
  agendaCount,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState("");

  const lifecycle = getMeetingLifecyclePresentation({
    status: meeting.status,
    meetingDate: meeting.meetingDate,
    participantCount,
    agendaCount,
    decisionCount: 0,
    actionCount: 0,
    conductedAt: meeting.conductedAt,
    reviewStage: meeting.reviewStage,
    protocolApprovalRequired: meeting.protocolApprovalRequired,
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
    }
  }

  if (!canManage && meeting.status !== "COMPLETED") return null;

  return (
    <section
      className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm"
      data-testid="meeting-lifecycle-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            Sitzungs-Lebenszyklus
          </p>
          {lifecycle.showPastDocumentationHint ? (
            <p className="mt-1 text-sm text-[var(--text-2)]" data-testid="meeting-past-documentation-hint">
              Sitzung liegt in der Vergangenheit — Protokoll vervollständigen.
            </p>
          ) : null}
          {meeting.protocolApprovalRequired ? (
            <p className="mt-1 text-[12px] text-[var(--muted)]">
              Freigaberegel: {meetingApprovalRuleLabel(meeting.protocolApprovalRule)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {meeting.status === "PLANNED" && !meeting.conductedAt ? (
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => callLifecycle("conduct")}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[12px] font-semibold text-indigo-800"
              data-testid="meeting-mark-conducted"
            >
              {loading === "conduct" ? <Loader2 className="inline h-3 w-3 animate-spin" /> : null}{" "}
              Als durchgeführt markieren
            </button>
          ) : null}
          {meeting.status === "PLANNED" &&
          meeting.protocolApprovalRequired &&
          meeting.reviewStage === "DRAFT" ? (
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => callLifecycle("submit_protocol")}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-800"
              data-testid="meeting-submit-protocol"
            >
              Zur Freigabe einreichen
            </button>
          ) : null}
          {meeting.status === "PLANNED" ? (
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => callLifecycle("close")}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-[12px] font-semibold text-white"
              data-testid="meeting-close"
            >
              {loading === "close" ? <Loader2 className="inline h-3 w-3 animate-spin" /> : null}{" "}
              Sitzung abschliessen
            </button>
          ) : null}
          {meeting.status === "COMPLETED" ? (
            <Link
              href={`/vereinsleitung/meetings/${meeting.slug}/protokoll`}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--foreground)]"
              data-testid="meeting-print-protocol"
            >
              Protokoll drucken
            </Link>
          ) : null}
        </div>
      </div>

      {meeting.status === "COMPLETED" && canManage ? (
        <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
          <label className="block text-[12px] font-medium text-[var(--text-2)]" htmlFor="reopen-reason">
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
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[12px] font-semibold text-rose-800"
            data-testid="meeting-reopen"
          >
            Wieder öffnen
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-[12px] text-rose-600">{error}</p> : null}
    </section>
  );
}

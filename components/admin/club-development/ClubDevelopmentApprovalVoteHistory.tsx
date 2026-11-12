"use client";

import type { ApprovalVoteHistoryGroup } from "@/lib/club-development/club-development-approval-vote-revision";
import { meetingApprovalVoteDecisionLabel } from "@/lib/meetings/meeting-approval-presentation";

function formatDecidedAt(value: Date | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ClubDevelopmentApprovalVoteHistory({
  history,
  approverLabels,
}: {
  history: ApprovalVoteHistoryGroup[];
  approverLabels: Record<string, string>;
}) {
  if (history.length === 0) return null;

  return (
    <div
      className="mt-4 space-y-3 border-t border-[var(--border)] pt-3"
      data-testid="club-development-approval-vote-history"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
        Freigabe-Verlauf (frühere Revisionen)
      </p>
      {history.map((group) => (
        <details
          key={group.contentRevision}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
        >
          <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)]">
            Revision {group.contentRevision}
            {group.legacyRevisionUnscoped ? (
              <span className="ml-2 text-[11px] font-normal text-[var(--muted)]">
                (Legacy — Revision nicht zweifelsfrei nachweisbar)
              </span>
            ) : null}
          </summary>
          <ul className="mt-2 space-y-2">
            {group.votes.map((vote) => (
              <li key={`${vote.contentRevision}-${vote.approverPersonId}`} className="text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{approverLabels[vote.approverPersonId] ?? "Unbekannte Person"}</span>
                  <span className="text-[11px] text-[var(--muted)]">
                    {meetingApprovalVoteDecisionLabel(vote.decision)}
                    {vote.decidedAt ? ` · ${formatDecidedAt(vote.decidedAt)}` : null}
                  </span>
                </div>
                {vote.comment ? (
                  <p className="mt-1 text-[12px] text-[var(--text-2)]">{vote.comment}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

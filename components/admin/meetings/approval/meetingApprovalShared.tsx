"use client";

import { Loader2 } from "lucide-react";
import type { MeetingApprovalRule } from "@prisma/client";
import { meetingApprovalRuleLabel } from "@/lib/meetings/meeting-approval-rules";
import type { MeetingApprovalVoteView } from "@/lib/meetings/meeting-approval-workspace-data";
import { meetingApprovalVoteDecisionLabel } from "@/lib/meetings/meeting-approval-presentation";
import {
  workspaceGhostButtonClass,
  workspaceInputClass,
  workspacePrimaryButtonClass,
} from "@/components/admin/meetings/workspace/meetingWorkspaceFieldClasses";

export function MeetingApprovalRuleSelect({
  value,
  onChange,
  disabled,
  id = "meeting-approval-rule",
}: {
  value: MeetingApprovalRule;
  onChange: (rule: MeetingApprovalRule) => void;
  disabled?: boolean;
  id?: string;
}) {
  const rules: MeetingApprovalRule[] = ["ALL", "ONE", "MAJORITY"];
  return (
    <div className="space-y-1">
      <label className="text-[12px] font-medium text-[var(--text-2)]" htmlFor={id}>
        Freigaberegel
      </label>
      <select
        id={id}
        className={workspaceInputClass}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as MeetingApprovalRule)}
        data-testid="meeting-approval-rule-select"
      >
        {rules.map((rule) => (
          <option key={rule} value={rule}>
            {meetingApprovalRuleLabel(rule)}
          </option>
        ))}
      </select>
    </div>
  );
}

export function MeetingApprovalVoteList({
  votes,
  approverLabels,
  approverPersonIds,
}: {
  votes: MeetingApprovalVoteView[];
  approverLabels: Record<string, string>;
  approverPersonIds: string[];
}) {
  const voteByPerson = new Map(votes.map((v) => [v.approverPersonId, v]));
  return (
    <ul className="mt-2 space-y-2" data-testid="meeting-approval-vote-list">
      {approverPersonIds.map((personId) => {
        const vote = voteByPerson.get(personId);
        const label = approverLabels[personId] ?? vote?.approverLabel ?? "Unbekannte Person";
        return (
          <li
            key={personId}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-[var(--foreground)]">{label}</span>
              <span className="text-[11px] font-semibold text-[var(--muted)]">
                {vote ? meetingApprovalVoteDecisionLabel(vote.decision) : "Ausstehend"}
              </span>
            </div>
            {vote?.comment ? (
              <p className="mt-1 text-[12px] text-[var(--text-2)]">{vote.comment}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function MeetingApprovalVoteActions({
  disabled,
  loading,
  onApprove,
  onRequestChanges,
  comment,
  onCommentChange,
}: {
  disabled?: boolean;
  loading?: boolean;
  onApprove: () => void;
  onRequestChanges: () => void;
  comment: string;
  onCommentChange: (value: string) => void;
}) {
  return (
    <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3" data-testid="meeting-approval-vote-actions">
      <label className="block text-[12px] font-medium text-[var(--text-2)]" htmlFor="meeting-approval-vote-comment">
        Kommentar (optional)
      </label>
      <textarea
        id="meeting-approval-vote-comment"
        rows={2}
        value={comment}
        disabled={disabled || loading}
        onChange={(e) => onCommentChange(e.target.value)}
        className={`${workspaceInputClass} w-full`}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={workspacePrimaryButtonClass}
          disabled={disabled || loading}
          onClick={onApprove}
          data-testid="meeting-approval-vote-approve"
        >
          {loading ? <Loader2 className="inline h-3 w-3 animate-spin" /> : null} Genehmigen
        </button>
        <button
          type="button"
          className={workspaceGhostButtonClass}
          disabled={disabled || loading}
          onClick={onRequestChanges}
          data-testid="meeting-approval-vote-request-changes"
        >
          Änderungen anfordern
        </button>
      </div>
    </div>
  );
}

export function formatGermanDateTime(value: Date | string | null): string | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

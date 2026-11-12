"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import { SceExpandablePanel } from "@/components/sce/page/SceExpandablePanel";
import MeetingParticipantMultiPicker from "@/components/admin/meetings/MeetingParticipantMultiPicker";
import type { MeetingApprovalRule } from "@prisma/client";
import type { MeetingApprovalVoteView } from "@/lib/meetings/meeting-approval-workspace-data";
import {
  canConfigureProcessApproval,
  canSubmitProcessForApproval,
  meetingApprovalAggregateStatusLabel,
  parseApproverPersonIds,
  validateApprovalConfig,
} from "@/lib/club-development/process-approval-presentation";
import { meetingApprovalRuleLabel } from "@/lib/meetings/meeting-approval-rules";
import {
  MeetingApprovalRuleSelect,
  MeetingApprovalVoteActions,
  MeetingApprovalVoteList,
} from "@/components/admin/meetings/approval/meetingApprovalShared";
import type { ApprovalVoteHistoryGroup } from "@/lib/club-development/club-development-approval-vote-revision";
import ClubDevelopmentApprovalVoteHistory from "@/components/admin/club-development/ClubDevelopmentApprovalVoteHistory";

type ProcessApprovalPanelProps = {
  processId: string;
  canManage: boolean;
  actorPersonId: string | null;
  contentRevision: number;
  process: {
    approvalRequired: boolean;
    approvalRule: MeetingApprovalRule;
    approverPersonIds: unknown;
    approvalStatus: string;
  };
  votes: MeetingApprovalVoteView[];
  voteHistory: ApprovalVoteHistoryGroup[];
  approverLabels: Record<string, string>;
};

export default function ProcessApprovalPanel({
  processId,
  canManage,
  actorPersonId,
  contentRevision,
  process,
  votes,
  voteHistory,
  approverLabels,
}: ProcessApprovalPanelProps) {
  const router = useRouter();
  const savedApproverIds = useMemo(
    () => parseApproverPersonIds(process.approverPersonIds),
    [process.approverPersonIds],
  );
  const [draftRequired, setDraftRequired] = useState(process.approvalRequired);
  const [draftRule, setDraftRule] = useState<MeetingApprovalRule>(process.approvalRule);
  const [draftApproverIds, setDraftApproverIds] = useState<string[]>(savedApproverIds);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voteComment, setVoteComment] = useState("");

  const configEditable =
    canManage && canConfigureProcessApproval({ approvalStatus: process.approvalStatus as never });
  const canSubmit =
    canManage &&
    canSubmitProcessForApproval({
      approvalRequired: process.approvalRequired,
      approvalStatus: process.approvalStatus as never,
      approverCount: savedApproverIds.length,
    });

  const showVoteActions =
    actorPersonId &&
    process.approvalRequired &&
    process.approvalStatus === "PENDING" &&
    savedApproverIds.includes(actorPersonId);

  async function saveConfig() {
    const validation = validateApprovalConfig({
      approvalRequired: draftRequired,
      approverPersonIds: draftApproverIds,
    });
    if (validation) {
      setError(validation);
      return;
    }
    setLoading("save");
    setError(null);
    try {
      const res = await fetch(`/api/club-development/processes/${processId}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalRequired: draftRequired,
          approvalRule: draftRule,
          approverPersonIds: draftApproverIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Speichern fehlgeschlagen.");
        return;
      }
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(null);
    }
  }

  async function submitForApproval() {
    setLoading("submit");
    setError(null);
    try {
      const res = await fetch(`/api/club-development/processes/${processId}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submitForApproval: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Einreichen fehlgeschlagen.");
        return;
      }
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(null);
    }
  }

  async function castVote(decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED") {
    if (!actorPersonId) return;
    setLoading("vote");
    setError(null);
    try {
      const res = await fetch(`/api/club-development/processes/${processId}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approverPersonId: actorPersonId,
          decision,
          comment: voteComment,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Freigabe fehlgeschlagen.");
        return;
      }
      setVoteComment("");
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <SceExpandablePanel
      defaultOpen={process.approvalRequired}
      testId={`process-approval-panel-${processId}`}
      summary={
        <span className="text-sm font-medium text-[var(--foreground)]">
          Freigabe: {meetingApprovalAggregateStatusLabel(process.approvalStatus as never)}
        </span>
      }
    >
      <div className="space-y-4 pt-2">
        <p className="text-xs text-[var(--muted)]">
          Inhaltsrevision für Freigabe: {contentRevision}
        </p>
        {error ? <p className="text-xs text-rose-700">{error}</p> : null}
        {configEditable ? (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <SwitchThumb
                id={`process-approval-required-${processId}`}
                checked={draftRequired}
                onChange={setDraftRequired}
              />
              Freigabe erforderlich
            </label>
            {draftRequired ? (
              <>
                <MeetingApprovalRuleSelect
                  value={draftRule}
                  onChange={setDraftRule}
                  disabled={loading !== null}
                />
                <p className="text-xs text-[var(--muted)]">Regel: {meetingApprovalRuleLabel(draftRule)}</p>
                <MeetingParticipantMultiPicker
                  label="Prüfer"
                  selectedPersonIds={draftApproverIds}
                  onSelectedPersonIdsChange={setDraftApproverIds}
                  disabled={loading !== null}
                />
              </>
            ) : null}
            <button
              type="button"
              className="fca-button-primary text-sm"
              disabled={loading !== null}
              onClick={() => void saveConfig()}
            >
              {loading === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Konfiguration speichern"}
            </button>
          </div>
        ) : null}
        {process.approvalRequired && savedApproverIds.length > 0 ? (
          <MeetingApprovalVoteList
            votes={votes}
            approverLabels={approverLabels}
            approverPersonIds={savedApproverIds}
          />
        ) : null}
        {canSubmit ? (
          <button
            type="button"
            className="fca-button-secondary text-sm"
            disabled={loading !== null}
            onClick={() => void submitForApproval()}
          >
            Zur Freigabe einreichen
          </button>
        ) : null}
        {process.approvalStatus === "CHANGES_REQUESTED" && canManage ? (
          <p className="text-xs text-[var(--text-2)]">
            Änderungen anwenden, speichern und erneut einreichen — materielle Änderungen nach Freigabe erhöhen die Inhaltsrevision; frühere Stimmen bleiben im Verlauf sichtbar.
          </p>
        ) : null}
        <ClubDevelopmentApprovalVoteHistory history={voteHistory} approverLabels={approverLabels} />
        {showVoteActions ? (
          <MeetingApprovalVoteActions
            disabled={loading !== null}
            loading={loading === "vote"}
            comment={voteComment}
            onCommentChange={setVoteComment}
            onApprove={() => void castVote("APPROVED")}
            onRequestChanges={() => void castVote("CHANGES_REQUESTED")}
          />
        ) : null}
      </div>
    </SceExpandablePanel>
  );
}

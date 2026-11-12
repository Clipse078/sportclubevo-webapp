"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import { SceExpandablePanel } from "@/components/sce/page/SceExpandablePanel";
import MeetingParticipantMultiPicker from "@/components/admin/meetings/MeetingParticipantMultiPicker";
import type { MeetingApprovalRule } from "@prisma/client";
import {
  canConfigureInitiativeApproval,
  canSubmitInitiativeForApproval,
  meetingApprovalAggregateStatusLabel,
  parseApproverPersonIds,
  validateApprovalConfig,
} from "@/lib/club-development/initiative-approval-presentation";
import { meetingApprovalRuleLabel } from "@/lib/meetings/meeting-approval-rules";
import {
  MeetingApprovalRuleSelect,
  MeetingApprovalVoteActions,
} from "@/components/admin/meetings/approval/meetingApprovalShared";

type InitiativeApprovalProps = {
  initiativeId: string;
  canManage: boolean;
  actorPersonId: string | null;
  initiative: {
    approvalRequired: boolean;
    approvalRule: MeetingApprovalRule;
    approverPersonIds: unknown;
    approvalStatus: string;
  };
};

export default function InitiativeApprovalPanel({
  initiativeId,
  canManage,
  actorPersonId,
  initiative,
}: InitiativeApprovalProps) {
  const router = useRouter();
  const savedApproverIds = useMemo(
    () => parseApproverPersonIds(initiative.approverPersonIds),
    [initiative.approverPersonIds],
  );
  const [draftRequired, setDraftRequired] = useState(initiative.approvalRequired);
  const [draftRule, setDraftRule] = useState<MeetingApprovalRule>(initiative.approvalRule);
  const [draftApproverIds, setDraftApproverIds] = useState<string[]>(savedApproverIds);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voteComment, setVoteComment] = useState("");

  const configEditable = canManage && canConfigureInitiativeApproval({ approvalStatus: initiative.approvalStatus as never });
  const canSubmit = canManage && canSubmitInitiativeForApproval({
    approvalRequired: initiative.approvalRequired,
    approvalStatus: initiative.approvalStatus as never,
    approverCount: savedApproverIds.length,
  });

  const showVoteActions =
    actorPersonId &&
    initiative.approvalRequired &&
    initiative.approvalStatus === "PENDING" &&
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
      const res = await fetch(`/api/initiatives/${initiativeId}/approval`, {
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
      const res = await fetch(`/api/initiatives/${initiativeId}/approval`, {
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
      const res = await fetch(`/api/initiatives/${initiativeId}/approval`, {
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
      defaultOpen={initiative.approvalRequired}
      testId={`initiative-approval-panel-${initiativeId}`}
      summary={
        <span className="text-sm font-medium text-[var(--foreground)]">
          Freigabe: {meetingApprovalAggregateStatusLabel(initiative.approvalStatus as never)}
        </span>
      }
    >
      <div className="space-y-4 pt-2">
        {error ? <p className="text-xs text-rose-700">{error}</p> : null}
        {configEditable ? (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <SwitchThumb id={`initiative-approval-required-${initiativeId}`} checked={draftRequired} onChange={setDraftRequired} />
              Freigabe erforderlich
            </label>
            {draftRequired ? (
              <>
                <MeetingApprovalRuleSelect value={draftRule} onChange={setDraftRule} disabled={loading !== null} />
                <p className="text-xs text-[var(--muted)]">Regel: {meetingApprovalRuleLabel(draftRule)}</p>
                <MeetingParticipantMultiPicker
                  label="Prüfer"
                  selectedPersonIds={draftApproverIds}
                  onSelectedPersonIdsChange={setDraftApproverIds}
                  disabled={loading !== null}
                />
              </>
            ) : null}
            <button type="button" className="fca-button-primary text-sm" disabled={loading !== null} onClick={() => void saveConfig()}>
              {loading === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Konfiguration speichern"}
            </button>
          </div>
        ) : null}
        {canSubmit ? (
          <button type="button" className="fca-button-secondary text-sm" disabled={loading !== null} onClick={() => void submitForApproval()}>
            Zur Freigabe einreichen
          </button>
        ) : null}
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

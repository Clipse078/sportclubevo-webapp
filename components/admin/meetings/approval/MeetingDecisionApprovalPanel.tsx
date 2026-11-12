"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import { SceExpandablePanel } from "@/components/sce/page/SceExpandablePanel";
import MeetingParticipantMultiPicker from "@/components/admin/meetings/MeetingParticipantMultiPicker";
import type { MeetingSubEntities } from "@/lib/meetings/queries";
import type { MeetingApprovalWorkspaceData } from "@/lib/meetings/meeting-approval-workspace-data";
import type { MeetingStatus } from "@prisma/client";
import type { MeetingApprovalRule } from "@prisma/client";
import {
  canConfigureDecisionApproval,
  canSubmitDecisionForApproval,
  meetingApprovalAggregateStatusLabel,
  parseApproverPersonIds,
  validateApprovalConfig,
} from "@/lib/meetings/meeting-approval-presentation";
import { meetingApprovalRuleLabel } from "@/lib/meetings/meeting-approval-rules";
import {
  MeetingApprovalRuleSelect,
  MeetingApprovalVoteActions,
  MeetingApprovalVoteList,
} from "@/components/admin/meetings/approval/meetingApprovalShared";
import {
  workspaceGhostButtonClass,
  workspacePrimaryButtonClass,
} from "@/components/admin/meetings/workspace/meetingWorkspaceFieldClasses";

type Decision = MeetingSubEntities["decisions"][number];

type Props = {
  meetingId: string;
  meetingStatus: MeetingStatus;
  decision: Decision;
  canManage: boolean;
  actorPersonId: string | null;
  approvalData: MeetingApprovalWorkspaceData;
  onDecisionUpdated: (decision: Decision) => void;
};

export default function MeetingDecisionApprovalPanel({
  meetingId,
  meetingStatus,
  decision,
  canManage,
  actorPersonId,
  approvalData,
  onDecisionUpdated,
}: Props) {
  const router = useRouter();
  const savedApproverIds = useMemo(
    () => parseApproverPersonIds(decision.approverPersonIds),
    [decision.approverPersonIds],
  );
  const approverLabels = approvalData.decisionApproverLabelsByDecisionId[decision.id] ?? {};
  const votes = approvalData.decisionVotesByDecisionId[decision.id] ?? [];

  const [editing, setEditing] = useState(false);
  const [draftRequired, setDraftRequired] = useState(decision.approvalRequired);
  const [draftRule, setDraftRule] = useState<MeetingApprovalRule>(decision.approvalRule);
  const [draftApproverIds, setDraftApproverIds] = useState<string[]>(savedApproverIds);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voteComment, setVoteComment] = useState("");

  const configEditable =
    canManage &&
    canConfigureDecisionApproval({
      meetingStatus,
      approvalStatus: decision.approvalStatus,
    });

  const showVoteActions =
    actorPersonId &&
    decision.approvalRequired &&
    decision.approvalStatus === "PENDING" &&
    savedApproverIds.includes(actorPersonId) &&
    !votes.some((v) => v.approverPersonId === actorPersonId);

  async function saveConfig() {
    const validation = validateApprovalConfig({
      approvalRequired: draftRequired,
      approverPersonIds: draftApproverIds,
    });
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    setLoading("save");
    try {
      const res = await fetch(`/api/meetings/${meetingId}/decisions/${decision.id}/approval`, {
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
      const updated = (data as { decision?: Decision }).decision;
      if (updated) {
        onDecisionUpdated({ ...decision, ...updated, approvalRule: draftRule, approverPersonIds: draftApproverIds });
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(null);
    }
  }

  function cancelEdit() {
    setDraftRequired(decision.approvalRequired);
    setDraftRule(decision.approvalRule);
    setDraftApproverIds(savedApproverIds);
    setEditing(false);
    setError(null);
  }

  async function submitForApproval() {
    setError(null);
    setLoading("submit");
    try {
      const res = await fetch(`/api/meetings/${meetingId}/decisions/${decision.id}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submitForApproval: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Einreichen fehlgeschlagen.");
        return;
      }
      const updated = (data as { decision?: Decision }).decision;
      if (updated) onDecisionUpdated({ ...decision, ...updated });
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(null);
    }
  }

  async function submitVote(voteDecision: "APPROVED" | "CHANGES_REQUESTED") {
    if (!actorPersonId) return;
    setError(null);
    setLoading(voteDecision);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/decisions/${decision.id}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approverPersonId: actorPersonId,
          decision: voteDecision,
          comment: voteComment.trim() || null,
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

  const knownApprovers = savedApproverIds.map((personId) => ({
    personId,
    label: approverLabels[personId] ?? "Unbekannte Person",
  }));

  const statusLabel =
    decision.approvalRequired && decision.approvalStatus === "NOT_REQUIRED"
      ? "Vorbereitet — noch nicht eingereicht"
      : meetingApprovalAggregateStatusLabel(decision.approvalStatus);
  const summary = decision.approvalRequired
    ? `Freigabe erforderlich: Ja — ${statusLabel}`
    : "Freigabe erforderlich: Nein";

  return (
    <SceExpandablePanel
      testId={`meeting-decision-approval-${decision.id}`}
      summary={<span className="text-[12px] text-[var(--text-2)]">{summary}</span>}
    >
      <div className="space-y-3">
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
            {error}
          </p>
        ) : null}

        {editing && configEditable ? (
          <div className="space-y-3" data-testid={`meeting-decision-approval-config-${decision.id}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Freigabe erforderlich</span>
              <SwitchThumb
                id={`decision-approval-required-${decision.id}`}
                checked={draftRequired}
                onChange={setDraftRequired}
                aria-label="Beschluss-Freigabe erforderlich"
              />
            </div>
            {draftRequired ? (
              <>
                <MeetingParticipantMultiPicker
                  label="Freigabeberechtigte Personen"
                  selectedPersonIds={draftApproverIds}
                  onSelectedPersonIdsChange={(ids) => setDraftApproverIds([...new Set(ids)])}
                  initialKnown={knownApprovers.map((p) => ({ personId: p.personId, label: p.label }))}
                />
                <MeetingApprovalRuleSelect
                  id={`decision-approval-rule-${decision.id}`}
                  value={draftRule}
                  onChange={setDraftRule}
                />
              </>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={workspacePrimaryButtonClass}
                disabled={loading !== null}
                onClick={saveConfig}
                data-testid={`meeting-decision-approval-save-${decision.id}`}
              >
                {loading === "save" ? <Loader2 className="inline h-3 w-3 animate-spin" /> : null} Speichern
              </button>
              <button
                type="button"
                className={workspaceGhostButtonClass}
                disabled={loading !== null}
                onClick={cancelEdit}
              >
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <>
            {decision.approvalRequired ? (
              <>
                <p className="text-[12px] text-[var(--text-2)]">
                  Freigaberegel: {meetingApprovalRuleLabel(decision.approvalRule)}
                </p>
                <MeetingApprovalVoteList
                  votes={votes}
                  approverLabels={approverLabels}
                  approverPersonIds={savedApproverIds}
                />
              </>
            ) : null}
            {configEditable ? (
              <button type="button" className={workspaceGhostButtonClass} onClick={() => setEditing(true)}>
                Freigabe konfigurieren
              </button>
            ) : null}
            {canManage &&
            canSubmitDecisionForApproval({
              approvalRequired: decision.approvalRequired,
              approvalStatus: decision.approvalStatus,
              approverCount: savedApproverIds.length,
            }) ? (
              <button
                type="button"
                className={workspacePrimaryButtonClass}
                disabled={loading !== null}
                onClick={submitForApproval}
                data-testid={`meeting-decision-approval-submit-${decision.id}`}
              >
                {loading === "submit" ? <Loader2 className="inline h-3 w-3 animate-spin" /> : null}{" "}
                Zur Freigabe einreichen
              </button>
            ) : null}
          </>
        )}

        {showVoteActions ? (
          <MeetingApprovalVoteActions
            loading={loading === "APPROVED" || loading === "CHANGES_REQUESTED"}
            comment={voteComment}
            onCommentChange={setVoteComment}
            onApprove={() => submitVote("APPROVED")}
            onRequestChanges={() => submitVote("CHANGES_REQUESTED")}
          />
        ) : null}
      </div>
    </SceExpandablePanel>
  );
}

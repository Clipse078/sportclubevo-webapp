"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import { SceExpandablePanel } from "@/components/sce/page/SceExpandablePanel";
import MeetingParticipantMultiPicker from "@/components/admin/meetings/MeetingParticipantMultiPicker";
import type { MeetingLiveData } from "@/lib/meetings/queries";
import type { MeetingApprovalWorkspaceData } from "@/lib/meetings/meeting-approval-workspace-data";
import {
  canConfigureProtocolApproval,
  canSubmitProtocolForApproval,
  parseApproverPersonIds,
  protocolReviewStageStatusLabel,
  validateApprovalConfig,
} from "@/lib/meetings/meeting-approval-presentation";
import { meetingApprovalRuleLabel } from "@/lib/meetings/meeting-approval-rules";
import {
  MeetingApprovalRuleSelect,
  MeetingApprovalVoteActions,
  MeetingApprovalVoteList,
  formatGermanDateTime,
} from "@/components/admin/meetings/approval/meetingApprovalShared";
import type { MeetingApprovalRule } from "@prisma/client";
import {
  workspaceGhostButtonClass,
  workspacePrimaryButtonClass,
} from "@/components/admin/meetings/workspace/meetingWorkspaceFieldClasses";

type Props = {
  meeting: MeetingLiveData;
  canManage: boolean;
  actorPersonId: string | null;
  approvalData: MeetingApprovalWorkspaceData;
};

export default function MeetingProtocolApprovalSection({
  meeting,
  canManage,
  actorPersonId,
  approvalData,
}: Props) {
  const router = useRouter();
  const savedRequired = meeting.protocolApprovalRequired;
  const savedRule = meeting.protocolApprovalRule;
  const savedApproverIds = useMemo(
    () => parseApproverPersonIds(meeting.protocolApproverPersonIds),
    [meeting.protocolApproverPersonIds],
  );

  const [editing, setEditing] = useState(false);
  const [draftRequired, setDraftRequired] = useState(savedRequired);
  const [draftRule, setDraftRule] = useState<MeetingApprovalRule>(savedRule);
  const [draftApproverIds, setDraftApproverIds] = useState<string[]>(savedApproverIds);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voteComment, setVoteComment] = useState("");

  const configEditable =
    canManage &&
    canConfigureProtocolApproval({ status: meeting.status, reviewStage: meeting.reviewStage });
  const knownApprovers = useMemo(
    () =>
      savedApproverIds.map((personId) => ({
        personId,
        label: approvalData.protocolApproverLabels[personId] ?? "Unbekannte Person",
      })),
    [savedApproverIds, approvalData.protocolApproverLabels],
  );

  const showVoteActions =
    actorPersonId &&
    savedRequired &&
    meeting.reviewStage === "SUBMITTED" &&
    savedApproverIds.includes(actorPersonId) &&
    !approvalData.protocolVotes.some((v) => v.approverPersonId === actorPersonId);

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
      const res = await fetch(`/api/meetings/${meeting.id}/protocol-approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocolApprovalRequired: draftRequired,
          protocolApprovalRule: draftRule,
          protocolApproverPersonIds: draftApproverIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Speichern fehlgeschlagen.");
        return;
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
    setDraftRequired(savedRequired);
    setDraftRule(savedRule);
    setDraftApproverIds(savedApproverIds);
    setEditing(false);
    setError(null);
  }

  async function submitVote(decision: "APPROVED" | "CHANGES_REQUESTED") {
    if (!actorPersonId) return;
    setError(null);
    setLoading(decision);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/protocol-approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approverPersonId: actorPersonId,
          decision,
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

  async function submitForApproval() {
    setError(null);
    setLoading("submit");
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/lifecycle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_protocol" }),
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

  const summaryLine = savedRequired
    ? "Freigabe erforderlich: Ja"
    : "Freigabe erforderlich: Nein";

  const submittedLabel = formatGermanDateTime(approvalData.protocolSubmittedAt);

  return (
    <SceExpandablePanel
      testId="meeting-protocol-approval-section"
      summary={
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            Freigabe des Sitzungsprotokolls
          </p>
          <p className="mt-0.5 text-sm text-[var(--foreground)]" data-testid="meeting-protocol-approval-summary">
            {summaryLine}
          </p>
        </div>
      }
    >
      <div className="space-y-4">
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
            {error}
          </p>
        ) : null}

        {editing && configEditable ? (
          <div className="space-y-4" data-testid="meeting-protocol-approval-config-form">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-[var(--foreground)]">Freigabe erforderlich</span>
              <SwitchThumb
                id="meeting-protocol-approval-required"
                checked={draftRequired}
                onChange={setDraftRequired}
                aria-label="Freigabe erforderlich"
              />
            </div>
            {draftRequired ? (
              <>
                <MeetingParticipantMultiPicker
                  label="Freigabeberechtigte Personen"
                  selectedPersonIds={draftApproverIds}
                  onSelectedPersonIdsChange={(ids) =>
                    setDraftApproverIds([...new Set(ids)])
                  }
                  initialKnown={knownApprovers.map((p) => ({
                    personId: p.personId,
                    label: p.label,
                  }))}
                />
                <MeetingApprovalRuleSelect value={draftRule} onChange={setDraftRule} />
              </>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={workspacePrimaryButtonClass}
                disabled={loading !== null}
                onClick={saveConfig}
                data-testid="meeting-protocol-approval-save"
              >
                {loading === "save" ? <Loader2 className="inline h-3 w-3 animate-spin" /> : null} Speichern
              </button>
              <button
                type="button"
                className={workspaceGhostButtonClass}
                disabled={loading !== null}
                onClick={cancelEdit}
                data-testid="meeting-protocol-approval-cancel"
              >
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-2)]">
              Status:{" "}
              <span className="font-medium text-[var(--foreground)]">
                {protocolReviewStageStatusLabel(meeting.reviewStage, savedRequired)}
              </span>
            </p>
            {savedRequired ? (
              <>
                <p className="text-[12px] text-[var(--text-2)]">
                  Freigaberegel: {meetingApprovalRuleLabel(savedRule)}
                </p>
                {submittedLabel ? (
                  <p className="text-[12px] text-[var(--muted)]">Eingereicht: {submittedLabel}</p>
                ) : null}
                <MeetingApprovalVoteList
                  votes={approvalData.protocolVotes}
                  approverLabels={approvalData.protocolApproverLabels}
                  approverPersonIds={savedApproverIds}
                />
              </>
            ) : null}
            {configEditable && canManage ? (
              <button
                type="button"
                className={workspaceGhostButtonClass}
                onClick={() => setEditing(true)}
                data-testid="meeting-protocol-approval-edit"
              >
                Konfiguration bearbeiten
              </button>
            ) : null}
            {canManage &&
            canSubmitProtocolForApproval({
              protocolApprovalRequired: savedRequired,
              reviewStage: meeting.reviewStage,
              status: meeting.status,
              approverCount: savedApproverIds.length,
            }) ? (
              <button
                type="button"
                className={workspacePrimaryButtonClass}
                disabled={loading !== null}
                onClick={submitForApproval}
                data-testid="meeting-protocol-approval-submit"
              >
                {loading === "submit" ? <Loader2 className="inline h-3 w-3 animate-spin" /> : null}{" "}
                Zur Freigabe einreichen
              </button>
            ) : null}
          </div>
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

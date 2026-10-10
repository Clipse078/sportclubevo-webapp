"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import type { MultiActivityChangeImpact } from "@/lib/collaboration/multi-activity/types";
import { summarizeActivityChangeLine } from "@/lib/collaboration/activity-change/presentation";
import { buildMultiActivityChangeSetFromImpact } from "@/lib/collaboration/multi-activity/group-multi-activity-impact";
import {
  contextualMultiTrainingSeriesPreparePath,
  contextualMultiTrainingSeriesPublishPath,
} from "@/lib/collaboration/client/contextual-communication-api";
import { ContextualActivityCommunicationComposer } from "@/components/admin/collaboration/ContextualActivityCommunicationComposer";
import { useActivityChangeCollaboration } from "@/components/admin/collaboration/ActivityChangeCollaborationContext";

type Props = {
  trainingSeriesId: string;
  impact: MultiActivityChangeImpact;
  onDismiss: () => void;
};

export function ContextualMultiActivityChangeImpactSurface({
  trainingSeriesId,
  impact,
  onDismiss,
}: Props) {
  const t = useTranslations("Collaboration.activityChange");
  const { acknowledgeMultiCommunicationSent } = useActivityChangeCollaboration();
  const [composerOpen, setComposerOpen] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [composerStale, setComposerStale] = useState(false);
  const [pending, startTransition] = useTransition();
  const [draftPrefill, setDraftPrefill] = useState<{
    draftId: string;
    teamId: string;
    subject: string;
    bodyText: string;
    audienceLabel: string;
    recipientCount: number;
    canDispatch: boolean;
  } | null>(null);
  const preparedFingerprintRef = useRef<string | null>(null);
  const currentFingerprint = impact.batchFingerprint;

  useEffect(() => {
    if (!composerOpen || !currentFingerprint || !preparedFingerprintRef.current) return;
    if (currentFingerprint !== preparedFingerprintRef.current) {
      setComposerStale(true);
      setDraftPrefill(null);
      setComposerOpen(false);
      preparedFingerprintRef.current = null;
    }
  }, [composerOpen, currentFingerprint]);

  function handleCommunicateClick() {
    const multiChangeSet = buildMultiActivityChangeSetFromImpact(impact);
    if (!multiChangeSet || !impact.canCommunicate) return;

    setPrepareError(null);
    setComposerStale(false);
    startTransition(async () => {
      try {
        const res = await fetch(contextualMultiTrainingSeriesPreparePath(trainingSeriesId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ multiChangeSet }),
        });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          draftId?: string;
          teamId?: string | null;
          subject?: string;
          bodyText?: string;
          audienceLabel?: string;
          recipientCount?: number;
          canDispatch?: boolean;
        } | null;
        if (!res.ok || !data?.draftId || !data.teamId) {
          throw new Error(data?.error ?? t("prepareError"));
        }
        preparedFingerprintRef.current = multiChangeSet.batchFingerprint;
        setDraftPrefill({
          draftId: data.draftId,
          teamId: data.teamId,
          subject: data.subject ?? "",
          bodyText: data.bodyText ?? "",
          audienceLabel:
            data.audienceLabel ??
            impact.audience?.teamNamesLabel ??
            impact.audience?.teamName ??
            "",
          recipientCount: data.recipientCount ?? impact.audience?.effectiveRecipientCount ?? 0,
          canDispatch: data.canDispatch ?? (data.recipientCount ?? 0) > 0,
        });
        setComposerOpen(true);
      } catch (err) {
        setPrepareError(err instanceof Error ? err.message : t("prepareError"));
      }
    });
  }

  const anchorActivityId = impact.items[0]?.activityId ?? trainingSeriesId;

  return (
    <div
      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 shadow-sm"
      data-testid="contextual-multi-activity-change-impact"
      role="status"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {impact.activityCount === 1
              ? t("trainingUpdated")
              : `${impact.activityCount} Trainings geändert`}
          </p>
          {impact.dispatchStrategy === "SEPARATE_REQUIRED" ? (
            <p className="text-xs text-amber-700" data-testid="contextual-multi-activity-separate-required">
              Änderungen müssen getrennt kommuniziert werden.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
          aria-label={t("dismiss")}
          data-testid="contextual-multi-activity-change-dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ul
        className="mt-2 space-y-2 text-xs text-[var(--foreground)]"
        data-testid="contextual-multi-activity-change-list"
      >
        {impact.items.map((item) => {
          const lines = (item.impact.changeSet?.entries ?? []).map((entry) =>
            summarizeActivityChangeLine(entry),
          );
          return (
            <li key={item.activityId} className="rounded-md bg-[var(--surface-3)]/40 px-2 py-1.5">
              <p className="font-medium" data-testid={`contextual-multi-activity-schedule-${item.activityId}`}>
                {item.impact.activityScheduleLine ?? item.impact.activityTitle}
              </p>
              {lines.length > 0 ? (
                <ul className="mt-0.5 list-disc pl-4 text-[var(--text-2)]">
                  {lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>

      {impact.audience ? (
        <div
          className="mt-2 space-y-0.5 text-xs text-[var(--text-2)]"
          data-testid="contextual-multi-activity-change-audience"
        >
          <p>
            <span className="font-medium text-[var(--foreground)]">{t("audience")}: </span>
            {impact.audience.teamNamesLabel ?? impact.audience.teamName}
          </p>
          {impact.audience.effectiveRecipientCount !== null ? (
            <p data-testid="contextual-multi-activity-change-recipient-count">
              <span className="font-medium text-[var(--foreground)]">{t("recipients")}: </span>
              {impact.audience.effectiveRecipientCount}
            </p>
          ) : null}
        </div>
      ) : null}

      {composerStale ? (
        <p className="mt-2 text-xs text-amber-700" role="status">
          {t("composerStale")}
        </p>
      ) : null}

      {impact.canCommunicate && impact.dispatchStrategy === "COMBINED" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleCommunicateClick}
            disabled={pending}
            data-testid="contextual-multi-activity-change-communicate"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("communicateChange")}
          </Button>
        </div>
      ) : null}

      {prepareError ? (
        <p className="mt-2 text-xs text-rose-600" role="alert">
          {prepareError}
        </p>
      ) : null}

      {composerOpen && draftPrefill ? (
        <ContextualActivityCommunicationComposer
          domain="TRAINING"
          activityId={anchorActivityId}
          teamId={draftPrefill.teamId}
          draftId={draftPrefill.draftId}
          initialSubject={draftPrefill.subject}
          initialBody={draftPrefill.bodyText}
          audienceLabel={draftPrefill.audienceLabel}
          recipientCount={draftPrefill.recipientCount}
          canDispatch={draftPrefill.canDispatch}
          publishPath={contextualMultiTrainingSeriesPublishPath(trainingSeriesId)}
          onClose={() => setComposerOpen(false)}
          onPublished={() => {
            acknowledgeMultiCommunicationSent();
            onDismiss();
          }}
        />
      ) : null}
    </div>
  );
}

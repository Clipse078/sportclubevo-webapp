"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import type {
  ActivityChangeImpact,
  ActivityCollaborationDomain,
} from "@/lib/collaboration/activity-change/types";
import {
  MATCH_ACTIVITY_CHANGE_FIELD_LABELS_DE,
  TOURNAMENT_ACTIVITY_CHANGE_FIELD_LABELS_DE,
  CLUB_EVENT_ACTIVITY_CHANGE_FIELD_LABELS_DE,
  summarizeActivityChangeLine,
} from "@/lib/collaboration/activity-change/presentation";
import type { ClubEventCommunicationScope } from "@/lib/collaboration/club-event/resolve-club-event-audience-preview";
import { ContextualActivityCommunicationComposer } from "@/components/admin/collaboration/ContextualActivityCommunicationComposer";
import { contextualPrepareCommunicationPath } from "@/lib/collaboration/client/contextual-communication-api";
import { useActivityChangeCollaboration } from "@/components/admin/collaboration/ActivityChangeCollaborationContext";

type Props = {
  domain: ActivityCollaborationDomain;
  activityId: string;
  impact: ActivityChangeImpact;
  onDismiss: () => void;
};

function fieldLabelsForDomain(domain: ActivityCollaborationDomain) {
  if (domain === "MATCH") return MATCH_ACTIVITY_CHANGE_FIELD_LABELS_DE;
  if (domain === "TOURNAMENT") return TOURNAMENT_ACTIVITY_CHANGE_FIELD_LABELS_DE;
  if (domain === "CLUB_EVENT") return CLUB_EVENT_ACTIVITY_CHANGE_FIELD_LABELS_DE;
  return undefined;
}

export function ContextualActivityChangeImpactSurface({
  domain,
  activityId,
  impact,
  onDismiss,
}: Props) {
  const t = useTranslations("Collaboration.activityChange");
  const { acknowledgeCommunicationSent } = useActivityChangeCollaboration();
  const labels = fieldLabelsForDomain(domain);
  const [composerOpen, setComposerOpen] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [composerStale, setComposerStale] = useState(false);
  const [pending, startTransition] = useTransition();
  const [draftPrefill, setDraftPrefill] = useState<{
    draftId: string;
    teamId: string | null;
    communicationScope?: ClubEventCommunicationScope;
    subject: string;
    bodyText: string;
    changeFingerprint: string;
    audienceLabel: string;
    recipientCount: number;
    canDispatch: boolean;
  } | null>(null);
  const preparedFingerprintRef = useRef<string | null>(null);

  const entries = impact.changeSet?.entries ?? [];
  const summaryLines = entries.map((entry) => summarizeActivityChangeLine(entry, labels));
  const currentFingerprint = impact.changeSet?.fingerprint ?? null;

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
    if (!impact.changeSet || !impact.canCommunicate) return;
    setPrepareError(null);
    setComposerStale(false);
    startTransition(async () => {
      try {
        const res = await fetch(contextualPrepareCommunicationPath(domain, activityId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ changeSet: impact.changeSet }),
        });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          draftId?: string;
          teamId?: string | null;
          communicationScope?: ClubEventCommunicationScope;
          subject?: string;
          bodyText?: string;
          audienceLabel?: string;
          recipientCount?: number;
          canDispatch?: boolean;
        } | null;
        const scopeOk =
          domain === "CLUB_EVENT"
            ? Boolean(data?.draftId)
            : Boolean(data?.draftId && data?.teamId);
        if (!res.ok || !scopeOk) {
          throw new Error(data?.error ?? t("prepareError"));
        }
        const fingerprint = impact.changeSet!.fingerprint;
        preparedFingerprintRef.current = fingerprint;
        setDraftPrefill({
          draftId: data!.draftId!,
          teamId: data!.teamId ?? null,
          communicationScope: data!.communicationScope,
          subject: data!.subject ?? "",
          bodyText: data!.bodyText ?? "",
          changeFingerprint: fingerprint,
          audienceLabel:
            data!.audienceLabel ??
            impact.audience?.teamNamesLabel ??
            impact.audience?.teamName ??
            "",
          recipientCount: data!.recipientCount ?? impact.audience?.effectiveRecipientCount ?? 0,
          canDispatch: data!.canDispatch ?? (data!.recipientCount ?? 0) > 0,
        });
        setComposerOpen(true);
      } catch (err) {
        setPrepareError(err instanceof Error ? err.message : t("prepareError"));
      }
    });
  }

  return (
    <div
      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 shadow-sm"
      data-testid="contextual-activity-change-impact"
      role="status"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {domain === "MATCH"
              ? t("matchUpdated")
              : domain === "TOURNAMENT"
                ? t("tournamentUpdated")
                : domain === "CLUB_EVENT"
                  ? t("clubEventUpdated")
                  : t("trainingUpdated")}
          </p>
          <p className="text-xs text-[var(--text-2)]" data-testid="contextual-activity-change-title">
            {impact.activityTitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
          aria-label={t("dismiss")}
          data-testid="contextual-activity-change-dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 space-y-1 text-xs text-[var(--foreground)]">
        {summaryLines.length === 1 ? (
          <p data-testid="contextual-activity-change-single">{summaryLines[0]}</p>
        ) : (
          <>
            <p className="font-medium">{t("multipleChanges", { count: summaryLines.length })}</p>
            <ul className="list-disc space-y-0.5 pl-4" data-testid="contextual-activity-change-list">
              {summaryLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      {impact.audience ? (
        <div
          className="mt-2 space-y-0.5 text-xs text-[var(--text-2)]"
          data-testid="contextual-activity-change-audience"
        >
          <p>
            <span className="font-medium text-[var(--foreground)]">{t("audience")}: </span>
            {impact.audience.teamNamesLabel ?? impact.audience.teamName}
          </p>
          {impact.audience.effectiveRecipientCount !== null ? (
            <p data-testid="contextual-activity-change-recipient-count">
              <span className="font-medium text-[var(--foreground)]">{t("recipients")}: </span>
              {impact.audience.effectiveRecipientCount}
            </p>
          ) : null}
        </div>
      ) : null}

      {composerStale ? (
        <p className="mt-2 text-xs text-amber-700" role="status" data-testid="contextual-activity-composer-stale">
          {t("composerStale")}
        </p>
      ) : null}

      {impact.canCommunicate ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleCommunicateClick}
            disabled={pending}
            data-testid="contextual-activity-change-communicate"
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
          domain={domain}
          activityId={activityId}
          teamId={draftPrefill.teamId}
          communicationScope={draftPrefill.communicationScope}
          draftId={draftPrefill.draftId}
          initialSubject={draftPrefill.subject}
          initialBody={draftPrefill.bodyText}
          audienceLabel={draftPrefill.audienceLabel}
          recipientCount={draftPrefill.recipientCount}
          canDispatch={draftPrefill.canDispatch}
          onClose={() => setComposerOpen(false)}
          onPublished={() => {
            acknowledgeCommunicationSent();
            onDismiss();
          }}
        />
      ) : null}
    </div>
  );
}

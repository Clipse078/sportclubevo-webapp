"use client";

import { useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import type {
  ActivityChangeImpact,
  ActivityCollaborationDomain,
} from "@/lib/collaboration/activity-change/types";
import { summarizeActivityChangeLine } from "@/lib/collaboration/activity-change/presentation";
import { ContextualActivityCommunicationComposer } from "@/components/admin/collaboration/ContextualActivityCommunicationComposer";
import { contextualPrepareCommunicationPath } from "@/lib/collaboration/client/contextual-communication-api";

type Props = {
  domain: ActivityCollaborationDomain;
  activityId: string;
  impact: ActivityChangeImpact;
  onDismiss: () => void;
};

export function ContextualActivityChangeImpactSurface({
  domain,
  activityId,
  impact,
  onDismiss,
}: Props) {
  const t = useTranslations("Collaboration.activityChange");
  const [composerOpen, setComposerOpen] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [draftPrefill, setDraftPrefill] = useState<{
    draftId: string;
    teamId: string;
    subject: string;
    bodyText: string;
  } | null>(null);

  const entries = impact.changeSet?.entries ?? [];
  const summaryLines = entries.map((entry) => summarizeActivityChangeLine(entry));

  function handleCommunicateClick() {
    if (!impact.changeSet || !impact.canCommunicate) return;
    setPrepareError(null);
    startTransition(async () => {
      try {
        const res = await fetch(contextualPrepareCommunicationPath(domain, activityId), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ changeSet: impact.changeSet }),
          },
        );
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          draftId?: string;
          teamId?: string;
          subject?: string;
          bodyText?: string;
        } | null;
        if (!res.ok || !data?.draftId || !data.teamId) {
          throw new Error(data?.error ?? t("prepareError"));
        }
        setDraftPrefill({
          draftId: data.draftId,
          teamId: data.teamId,
          subject: data.subject ?? "",
          bodyText: data.bodyText ?? "",
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
        <p className="mt-2 text-xs text-[var(--text-2)]" data-testid="contextual-activity-change-audience">
          <span className="font-medium text-[var(--foreground)]">{t("audience")}: </span>
          {impact.audience.zeroRecipients
            ? t("zeroRecipients")
            : (impact.audience.recipientPreviewLabel ?? impact.audience.teamName)}
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
          draftId={draftPrefill.draftId}
          initialSubject={draftPrefill.subject}
          initialBody={draftPrefill.bodyText}
          onClose={() => setComposerOpen(false)}
          onPublished={onDismiss}
        />
      ) : null}
    </div>
  );
}

"use client";

import { useId, useState, useTransition } from "react";
import { Loader2, Send, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { MAX_TEAM_COMMUNICATION_BODY_LENGTH } from "@/lib/communication/team/team-communication-constants";
import { useToast } from "@/hooks/use-toast";

import type { ActivityCollaborationDomain } from "@/lib/collaboration/activity-change/types";
import { contextualPublishCommunicationPath } from "@/lib/collaboration/client/contextual-communication-api";
import { CONTEXTUAL_COMMUNICATION_ERROR_CODES } from "@/lib/collaboration/contextual-communication-http";

type Props = {
  domain: ActivityCollaborationDomain;
  activityId: string;
  teamId: string;
  draftId: string;
  initialSubject: string;
  initialBody: string;
  audienceLabel?: string;
  recipientCount: number;
  canDispatch: boolean;
  onClose: () => void;
  onPublished: () => void;
};

export function ContextualActivityCommunicationComposer({
  domain,
  activityId,
  teamId,
  draftId,
  initialSubject,
  initialBody,
  audienceLabel,
  recipientCount,
  canDispatch,
  onClose,
  onPublished,
}: Props) {
  const t = useTranslations("Collaboration.activityChange");
  const subjectId = useId();
  const bodyId = useId();
  const { toast } = useToast();
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canSubmit = !pending && body.trim().length > 0 && canDispatch;

  function handlePublish() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(contextualPublishCommunicationPath(domain, activityId), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              draftId,
              teamId,
              subject,
              bodyText: body,
            }),
          },
        );
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          errorCode?: string;
          recipientCount?: number;
        } | null;
        if (!res.ok) {
          if (data?.errorCode === CONTEXTUAL_COMMUNICATION_ERROR_CODES.NO_ELIGIBLE_RECIPIENTS) {
            throw new Error(t("noRecipientsBody"));
          }
          const raw = data?.error ?? "";
          if (raw.includes("no eligible recipients for dispatch")) {
            throw new Error(t("noRecipientsBody"));
          }
          throw new Error(raw || t("publishError"));
        }
        toast.success(t("publishSuccess", { count: data?.recipientCount ?? 0 }));
        onPublished();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : t("publishError"));
      }
    });
  }

  return (
    <div
      className="mt-3 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
      data-testid="contextual-activity-communication-composer"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--foreground)]">{t("composerTitle")}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-3)]"
          aria-label={t("composerClose")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!canDispatch ? (
        <div
          className="space-y-1 rounded-md border border-amber-200 bg-amber-50/80 p-2 text-xs text-amber-950"
          role="status"
          data-testid="contextual-activity-communication-no-recipients"
        >
          <p className="font-semibold">{t("noRecipientsTitle")}</p>
          <p>{t("noRecipientsBody")}</p>
          {audienceLabel ? (
            <p className="text-amber-900/90">
              {t("audience")}: {audienceLabel} · {t("recipients")}: {recipientCount}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-1">
        <label htmlFor={subjectId} className="text-xs font-medium text-[var(--text-2)]">
          {t("fieldSubject")}
        </label>
        <input
          id={subjectId}
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={240}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
          data-testid="contextual-activity-communication-subject"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={bodyId} className="text-xs font-medium text-[var(--text-2)]">
          {t("fieldBody")}
        </label>
        <textarea
          id={bodyId}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MAX_TEAM_COMMUNICATION_BODY_LENGTH}
          rows={6}
          className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
          data-testid="contextual-activity-communication-body"
        />
      </div>

      {error ? (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={pending}>
          {t("composerCancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handlePublish}
          disabled={!canSubmit}
          title={!canDispatch ? t("sendDisabledNoRecipients") : undefined}
          data-testid="contextual-activity-communication-send"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t("composerSend")}
        </Button>
      </div>
    </div>
  );
}

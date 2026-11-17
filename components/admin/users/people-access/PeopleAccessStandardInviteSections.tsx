"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  resolvePeopleAccessInviteLiveSendBlocker,
  resolvePeopleAccessInvitePrepareBlocker,
} from "@/lib/admin/people-access/people-access-invite-wizard-policy";
import {
  resolvePeopleAccessInvitePrepareStatusHint,
  PEOPLE_ACCESS_INVITE_PREPARE_SUCCESS_MESSAGE,
} from "@/lib/admin/vl-onboarding/vl-standard-invite-user-copy";
import type { VlInvitationSendMode } from "@/lib/admin/vl-onboarding/vl-invitation-send-mode";

export type PeopleAccessStandardWizardContext = {
  emailPreview: { subject: string; html: string; variant: string } | null;
  emailPreviewLoading: boolean;
  sendBlocker: string | null;
  liveSendBlocker: string | null;
  sendMode: VlInvitationSendMode | null;
  sendPolicyLoadError: string | null;
  prepareSuccessMessage: string | null;
};

export function usePeopleAccessStandardWizardContext(input: {
  enabled: boolean;
  canInvite: boolean;
  email: string;
  firstName: string;
  lastName: string;
  selectedRoleIds: string[];
  step: number;
}): PeopleAccessStandardWizardContext & {
  setPrepareSuccessMessage: (message: string | null) => void;
} {
  const [emailPreview, setEmailPreview] = useState<{
    subject: string;
    html: string;
    variant: string;
  } | null>(null);
  const [emailPreviewLoading, setEmailPreviewLoading] = useState(false);
  const [sendMode, setSendMode] = useState<VlInvitationSendMode | null>(null);
  const [sendPolicyLoadError, setSendPolicyLoadError] = useState<string | null>(null);
  const [prepareSuccessMessage, setPrepareSuccessMessage] = useState<string | null>(null);

  const loadSendPolicy = useCallback(async () => {
    if (!input.enabled || !input.canInvite) return;
    setSendPolicyLoadError(null);
    try {
      const res = await fetch("/api/admin/people-access/invite/policy");
      const data = (await res.json()) as { error?: string; sendMode?: VlInvitationSendMode };
      if (!res.ok) {
        setSendMode(null);
        setSendPolicyLoadError(data.error ?? "Versandfreigabe konnte nicht geladen werden.");
        return;
      }
      if (
        data.sendMode === "DRY_RUN" ||
        data.sendMode === "LIVE_ALLOWED" ||
        data.sendMode === "LIVE_BLOCKED"
      ) {
        setSendMode(data.sendMode);
      } else {
        setSendMode(null);
        setSendPolicyLoadError("Ungültige Versandfreigabe vom Server.");
      }
    } catch {
      setSendMode(null);
      setSendPolicyLoadError("Netzwerkfehler beim Laden der Versandfreigabe.");
    }
  }, [input.enabled, input.canInvite]);

  useEffect(() => {
    if (!input.enabled) return;
    void loadSendPolicy();
  }, [input.enabled, loadSendPolicy]);

  const refreshEmailPreview = useCallback(async () => {
    if (!input.enabled || !input.email.trim()) return;
    setEmailPreviewLoading(true);
    try {
      const res = await fetch("/api/admin/people-access/invite/preview-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: input.email.trim(),
          firstName: input.firstName.trim(),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        subject?: string;
        html?: string;
        variant?: string;
      };
      if (res.ok && data.subject && data.html) {
        setEmailPreview({
          subject: data.subject,
          html: data.html,
          variant: data.variant ?? "new_account",
        });
      }
    } finally {
      setEmailPreviewLoading(false);
    }
  }, [input.enabled, input.email, input.firstName]);

  useEffect(() => {
    if (!input.enabled) return;
    if (input.step !== 3) return;
    void refreshEmailPreview();
  }, [input.enabled, input.step, refreshEmailPreview]);

  const policyInput = useMemo(
    () => ({
      sendMode,
      sendPolicyLoadError,
      canInvite: input.canInvite,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      selectedRoleIds: input.selectedRoleIds,
    }),
    [input, sendMode, sendPolicyLoadError],
  );

  const sendBlocker = useMemo(() => {
    if (!input.enabled) return null;
    return resolvePeopleAccessInvitePrepareBlocker(policyInput);
  }, [input.enabled, policyInput]);

  const liveSendBlocker = useMemo(() => {
    if (!input.enabled) return null;
    return resolvePeopleAccessInviteLiveSendBlocker(policyInput);
  }, [input.enabled, policyInput]);

  return {
    emailPreview,
    emailPreviewLoading,
    sendBlocker,
    liveSendBlocker,
    sendMode,
    sendPolicyLoadError,
    prepareSuccessMessage,
    setPrepareSuccessMessage,
  };
}

export function PeopleAccessStandardReviewStep({
  ctx,
  firstName,
  lastName,
  email,
}: {
  ctx: PeopleAccessStandardWizardContext;
  firstName: string;
  lastName: string;
  email: string;
}) {
  const statusHint =
    ctx.prepareSuccessMessage ??
    (ctx.sendMode ? resolvePeopleAccessInvitePrepareStatusHint(ctx.sendMode) : null);

  return (
    <div className="space-y-4" data-testid="people-access-standard-review-email">
      {ctx.sendPolicyLoadError ? (
        <p className="text-sm text-red-600" role="alert" data-testid="people-access-send-policy-error">
          {ctx.sendPolicyLoadError}
        </p>
      ) : null}
      {ctx.emailPreviewLoading ? (
        <p className="text-sm text-[var(--muted)]">E-Mail-Vorschau wird geladen…</p>
      ) : null}
      {ctx.emailPreview ? (
        <div data-testid="people-access-standard-email-preview">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Einladungs-E-Mail
          </p>
          <p className="mt-1 text-sm font-medium">{ctx.emailPreview.subject}</p>
          <iframe
            title="Einladungsvorschau"
            srcDoc={ctx.emailPreview.html}
            className="mt-3 h-[min(420px,50vh)] w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-white"
            sandbox=""
          />
        </div>
      ) : null}
      {ctx.prepareSuccessMessage ? (
        <p
          className="text-sm text-emerald-700"
          role="status"
          data-testid="people-access-prepare-success"
        >
          {ctx.prepareSuccessMessage}
        </p>
      ) : null}
      {ctx.sendBlocker ? (
        <p className="text-sm text-amber-700" role="alert" data-testid="people-access-send-blocker">
          {ctx.sendBlocker}
        </p>
      ) : statusHint ? (
        <p className="text-xs text-[var(--muted)]" data-testid="people-access-prepare-status-hint">
          {statusHint}
        </p>
      ) : null}
      {ctx.liveSendBlocker && !ctx.sendPolicyLoadError ? (
        <p className="text-xs text-[var(--muted)]" data-testid="people-access-live-send-prerequisite">
          Live-Versand: {ctx.liveSendBlocker}
        </p>
      ) : null}
      <p className="text-xs text-[var(--muted)]">
        Person: {firstName} {lastName} · {email}
      </p>
    </div>
  );
}

export { PEOPLE_ACCESS_INVITE_PREPARE_SUCCESS_MESSAGE };
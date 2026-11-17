"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  VL_STANDARD_INVITE_ORG_FUNCTION_OPTIONS,
} from "@/lib/admin/vl-onboarding/vl-org-function-options";
import { FCA_VL_INVITATION_PRESET } from "@/lib/admin/vl-onboarding/fca-vl-invitation-preset";
import type { VereinsentwicklungAccessRow } from "@/lib/admin/people-access/vereinsentwicklung-access-presentation";
import type { VlInvitationResolvedRow } from "@/lib/admin/vl-onboarding/resolve-vl-invitation-rows";
import type { VlContributorRoleSyncDiff } from "@/lib/admin/vl-onboarding/vl-contributor-role-sync-diff";
import type { VlInvitationSendMode } from "@/lib/admin/vl-onboarding/vl-invitation-send-policy";
import {
  resolveVlStandardInviteLiveSendBlocker,
  resolveVlStandardInviteWizardBlocker,
} from "@/lib/admin/vl-onboarding/vl-standard-invite-wizard-policy";

function VlAccessPreviewTable({ rows }: { rows: VereinsentwicklungAccessRow[] }) {
  return (
    <table className="mt-2 w-full text-xs" data-testid="vl-wizard-effective-access-preview">
      <tbody>
        {rows.map((row) => (
          <tr key={row.navLabel}>
            <td className="py-0.5 pr-2 text-[var(--muted)]">{row.navLabel}</td>
            <td className="py-0.5 font-medium">{row.detail}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type ResolvePayload = {
  resolved: VlInvitationResolvedRow;
  existingVereinsentwicklungPreview?: VereinsentwicklungAccessRow[] | null;
  addedVlVereinsentwicklungPreview?: VereinsentwicklungAccessRow[] | null;
  contributorRoleProvisioned?: boolean;
  contributorRoleSyncDiff?: VlContributorRoleSyncDiff;
  contributorRoleProvisioningNote?: string | null;
  sendMode?: VlInvitationSendMode;
};

export type PeopleAccessVlWizardContext = {
  functionKey: string;
  setFunctionKey: (key: string) => void;
  resolvePayload: ResolvePayload | null;
  resolveLoading: boolean;
  resolveError: string | null;
  refreshResolve: () => Promise<void>;
  emailPreview: { subject: string; html: string; variant: string } | null;
  emailPreviewLoading: boolean;
  refreshEmailPreview: () => Promise<void>;
  sendBlocker: string | null;
  liveSendBlocker: string | null;
  contributorRoleSyncDiff: VlContributorRoleSyncDiff | null;
};

export function usePeopleAccessVlWizardContext(input: {
  enabled: boolean;
  canInvite: boolean;
  email: string;
  firstName: string;
  lastName: string;
  functionKey: string;
  setFunctionKey: (key: string) => void;
  step: number;
}): PeopleAccessVlWizardContext {
  const [resolvePayload, setResolvePayload] = useState<ResolvePayload | null>(null);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [emailPreview, setEmailPreview] = useState<{
    subject: string;
    html: string;
    variant: string;
  } | null>(null);
  const [emailPreviewLoading, setEmailPreviewLoading] = useState(false);

  const refreshResolve = useCallback(async () => {
    if (!input.enabled || !input.email.trim()) return;
    setResolveLoading(true);
    setResolveError(null);
    try {
      const res = await fetch("/api/admin/people-access/vl-invite/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: input.email.trim(),
          functionKey: input.functionKey || undefined,
        }),
      });
      const data = (await res.json()) as ResolvePayload & { error?: string };
      if (!res.ok) {
        setResolveError(data.error ?? "Auflösung fehlgeschlagen.");
        setResolvePayload(null);
        return;
      }
      setResolvePayload(data);
    } catch {
      setResolveError("Netzwerkfehler bei der Auflösung.");
      setResolvePayload(null);
    } finally {
      setResolveLoading(false);
    }
  }, [input.enabled, input.email, input.functionKey]);

  const refreshEmailPreview = useCallback(async () => {
    if (!input.enabled || !input.email.trim()) return;
    setEmailPreviewLoading(true);
    try {
      const res = await fetch("/api/admin/people-access/vl-invite/preview-email", {
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
    if (input.step < 2) return;
    void refreshResolve();
  }, [input.enabled, input.step, refreshResolve]);

  useEffect(() => {
    if (!input.enabled) return;
    if (input.step !== 3) return;
    void refreshEmailPreview();
  }, [input.enabled, input.step, refreshEmailPreview, input.email, input.firstName]);

  const policyInput = useMemo(
    () => ({
      sendMode: resolvePayload?.sendMode ?? ("DRY_RUN" as const),
      canInvite: input.canInvite,
      contributorRoleProvisioned: resolvePayload?.contributorRoleProvisioned ?? null,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      functionKey: input.functionKey,
      resolved: resolvePayload?.resolved ?? null,
    }),
    [input, resolvePayload],
  );

  const sendBlocker = useMemo(() => {
    if (!input.enabled) return null;
    return resolveVlStandardInviteWizardBlocker(policyInput);
  }, [input.enabled, policyInput]);

  const liveSendBlocker = useMemo(() => {
    if (!input.enabled) return null;
    return resolveVlStandardInviteLiveSendBlocker(policyInput);
  }, [input.enabled, policyInput]);

  return {
    functionKey: input.functionKey,
    setFunctionKey: input.setFunctionKey,
    resolvePayload,
    resolveLoading,
    resolveError,
    refreshResolve,
    emailPreview,
    emailPreviewLoading,
    refreshEmailPreview,
    sendBlocker,
    liveSendBlocker,
    contributorRoleSyncDiff: resolvePayload?.contributorRoleSyncDiff ?? null,
  };
}

export function PeopleAccessVlPresetAccessTypeField({
  value,
  onChange,
}: {
  value: "standard" | "vereinsleitung_pilot";
  onChange: (v: "standard" | "vereinsleitung_pilot") => void;
}) {
  return (
    <fieldset className="space-y-2" data-testid="people-access-vl-preset-choice">
      <legend className="text-sm font-medium text-[var(--foreground)]">Zugangstyp</legend>
      <label className="flex cursor-pointer gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-3">
        <input
          type="radio"
          name="people-access-invite-type"
          checked={value === "standard"}
          onChange={() => onChange("standard")}
          className="mt-1"
        />
        <span>
          <span className="block text-sm font-medium">Individuell</span>
          <span className="text-xs text-[var(--muted)]">Rollen und Bereiche frei wählen</span>
        </span>
      </label>
      <label className="flex cursor-pointer gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-3">
        <input
          type="radio"
          name="people-access-invite-type"
          checked={value === "vereinsleitung_pilot"}
          onChange={() => onChange("vereinsleitung_pilot")}
          className="mt-1"
        />
        <span>
          <span className="block text-sm font-medium">{FCA_VL_INVITATION_PRESET.presetLabel}</span>
          <span className="text-xs text-[var(--muted)]">
            Minimale Vereinsentwicklung-Rechte, VL-Sitzungen — kein Club-Admin
          </span>
        </span>
      </label>
    </fieldset>
  );
}

export function PeopleAccessVlOrgFunctionField({
  functionKey,
  onChange,
}: {
  functionKey: string;
  onChange: (key: string) => void;
}) {
  return (
    <div data-testid="people-access-vl-org-function">
      <label htmlFor="vl-org-function" className="mb-1 block text-xs font-medium">
        Organisationsfunktion im Verein *
      </label>
      <select
        id="vl-org-function"
        value={functionKey}
        onChange={(e) => onChange(e.target.value)}
        className="fca-input w-full"
        required
      >
        <option value="">Bitte wählen…</option>
        {VL_STANDARD_INVITE_ORG_FUNCTION_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Organisatorische Zuordnung zur Org-Einheit Vereinsleitung (ohne zusätzliche Admin-Rechte).
      </p>
    </div>
  );
}

export function PeopleAccessVlAccessStep({ ctx }: { ctx: PeopleAccessVlWizardContext }) {
  const resolved = ctx.resolvePayload?.resolved;
  return (
    <div className="space-y-4" data-testid="people-access-vl-access-step">
      <div>
        <h3 className="text-lg font-semibold">Zugriff — Vereinsleitung (Pilot)</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Festes Mitwirkungs-Preset mit {FCA_VL_INVITATION_PRESET.permissionKeys.length} Berechtigungen.
        </p>
      </div>
      {ctx.resolveLoading ? (
        <p className="text-sm text-[var(--muted)]">Zugriff wird aufgelöst…</p>
      ) : null}
      {ctx.resolveError ? (
        <p className="text-sm text-red-600" role="alert">
          {ctx.resolveError}
        </p>
      ) : null}
      {resolved ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4 text-sm">
          <p>
            <span className="font-medium">Status:</span> {resolved.label}
          </p>
          {resolved.hasPresidentRole ? (
            <p className="mt-2 text-amber-700 text-xs">
              Hinweis: Person hat Präsidenten-Pilot-Rolle — manuell prüfen, kein Wildcard-Upgrade.
            </p>
          ) : null}
        </div>
      ) : null}
      {ctx.resolvePayload?.existingVereinsentwicklungPreview?.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Bestehender Zugriff
          </p>
          <VlAccessPreviewTable rows={ctx.resolvePayload.existingVereinsentwicklungPreview} />
        </div>
      ) : null}
      {ctx.resolvePayload?.addedVlVereinsentwicklungPreview?.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {ctx.resolvePayload.existingVereinsentwicklungPreview?.length
              ? "Ergänzend durch VL-Preset"
              : "Effektiver VL-Zugriff (Vorschau)"}
          </p>
          <VlAccessPreviewTable rows={ctx.resolvePayload.addedVlVereinsentwicklungPreview} />
        </div>
      ) : null}
      {ctx.resolvePayload?.contributorRoleProvisioningNote ? (
        <div
          className="flex gap-2 rounded-[var(--radius-lg)] border border-amber-500/40 bg-[var(--surface-2)] p-3 text-sm"
          role="alert"
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" aria-hidden />
          <p>{ctx.resolvePayload.contributorRoleProvisioningNote}</p>
        </div>
      ) : null}
      {ctx.contributorRoleSyncDiff?.roleMissing ? (
        <p className="text-xs text-[var(--muted)]" data-testid="vl-contributor-role-dry-run-hint">
          Rollen-Sync (Dry-Run):{" "}
          <code className="text-[11px]">npx tsx scripts/sync-fca-vereinsleitung-contributor-pilot-role.ts</code>
        </p>
      ) : null}
    </div>
  );
}

export function PeopleAccessVlReviewStep({
  ctx,
  firstName,
  lastName,
  email,
}: {
  ctx: PeopleAccessVlWizardContext;
  firstName: string;
  lastName: string;
  email: string;
}) {
  return (
    <div className="space-y-4" data-testid="people-access-vl-review-step">
      <div className="space-y-2 rounded-[var(--radius-xl)] bg-[var(--surface-2)] p-4 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Person</p>
        <p className="font-medium">
          {firstName} {lastName}
        </p>
        <p className="text-[var(--muted)]">{email}</p>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] pt-2">
          Zugang
        </p>
        <p>{FCA_VL_INVITATION_PRESET.presetLabel}</p>
      </div>
      {ctx.emailPreviewLoading ? (
        <p className="text-sm text-[var(--muted)]">E-Mail-Vorschau wird geladen…</p>
      ) : null}
      {ctx.emailPreview ? (
        <div data-testid="people-access-vl-email-preview">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Einladungs-E-Mail
          </p>
          <p className="mt-1 text-sm font-medium">{ctx.emailPreview.subject}</p>
          <p className="text-xs text-[var(--muted)]">Variante: {ctx.emailPreview.variant}</p>
          <iframe
            title="VL-Einladungsvorschau"
            srcDoc={ctx.emailPreview.html}
            className="mt-3 h-[min(420px,50vh)] w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-white"
            sandbox=""
          />
        </div>
      ) : null}
      {ctx.sendBlocker ? (
        <p className="text-sm text-amber-700" role="alert" data-testid="people-access-vl-send-blocker">
          {ctx.sendBlocker}
        </p>
      ) : (
        <p className="text-xs text-[var(--muted)]">
          Dry-Run: «Einladung vorbereiten» nutzt denselben Transport wie Bulk-VL — ohne Live-Zustellung.
        </p>
      )}
      {ctx.liveSendBlocker ? (
        <p className="text-xs text-[var(--muted)]" data-testid="people-access-vl-live-send-prerequisite">
          Live-Versand: {ctx.liveSendBlocker}
        </p>
      ) : null}
    </div>
  );
}
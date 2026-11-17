"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Mail, Send } from "lucide-react";
import SceClubDevelopmentContextualCreateCollapsibleShell from "@/components/sce/club-development/SceClubDevelopmentContextualCreateCollapsibleShell";
import { Button } from "@/components/ui/Button";
import { SwitchToggle } from "@/components/ui/SwitchToggle";
import { cn } from "@/lib/cn";
import { FCA_VL_INVITATION_CONFIRMED_EMAILS } from "@/lib/admin/vl-onboarding/fca-vl-confirmed-invitee-emails";
import type { VereinsentwicklungAccessRow } from "@/lib/admin/people-access/vereinsentwicklung-access-presentation";
import type { VlInvitationSendMode } from "@/lib/admin/vl-onboarding/vl-invitation-send-mode";
import { resolveVlInvitationSendUiState } from "@/lib/admin/vl-onboarding/vl-invitation-send-ui-policy";
import { VL_CONTRIBUTOR_ROLE_SETUP_REQUIRED } from "@/lib/admin/vl-onboarding/vl-standard-invite-user-copy";

type ValidationRow = {
  raw: string;
  valid: boolean;
  duplicate: boolean;
  message?: string;
};

type ResolvedRow = {
  email: string;
  action: string;
  label: string;
  displayName?: string;
  missingFunction?: boolean;
  vereinsentwicklungPreview?: VereinsentwicklungAccessRow[];
};

type EmailPreview = {
  subject: string;
  html: string;
  variant: string;
  preview?: boolean;
  disclaimer?: string;
};

const ACTION_TONE: Record<string, string> = {
  EXISTING_ACCESS: "text-emerald-700",
  UPDATE_ACCESS: "text-amber-700",
  INVITATION_PENDING: "text-amber-700",
  NEW_INVITATION: "text-sky-700",
  PERSON_LINK_ACCESS: "text-sky-700",
  MASKED: "text-muted-foreground",
};

function VlAccessPreviewTable({ rows }: { rows: VereinsentwicklungAccessRow[] }) {
  return (
    <table className="mt-2 w-full text-xs" data-testid="vl-effective-access-preview">
      <tbody>
        {rows.map((row) => (
          <tr key={row.navLabel}>
            <td className="py-0.5 pr-2 text-muted-foreground">{row.navLabel}</td>
            <td className="py-0.5 font-medium">{row.detail}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function VlBulkInvitationWorkspace({ canInvite }: { canInvite: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [rawEmails, setRawEmails] = useState(FCA_VL_INVITATION_CONFIRMED_EMAILS.join("\n"));
  const [validationRows, setValidationRows] = useState<ValidationRow[]>([]);
  const [resolved, setResolved] = useState<ResolvedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewVariant, setPreviewVariant] = useState<"new_account" | "existing_account">(
    "new_account",
  );
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [contributorRoleProvisioned, setContributorRoleProvisioned] = useState<boolean | null>(
    null,
  );
  const [contributorRoleNote, setContributorRoleNote] = useState<string | null>(null);
  const [sendMode, setSendMode] = useState<VlInvitationSendMode>("DRY_RUN");
  const [liveSendConfirmed, setLiveSendConfirmed] = useState(false);
  const [actionNote, setActionNote] = useState<string | null>(null);

  const resolveRows = useCallback(async () => {
    if (!canInvite) return;
    setLoading(true);
    setError(null);
  try {
      const res = await fetch("/api/admin/vl-invitations/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: rawEmails }),
      });
      const data = (await res.json()) as {
        error?: string;
        validationRows?: ValidationRow[];
        resolved?: ResolvedRow[];
        contributorRoleProvisioned?: boolean;
        contributorRoleProvisioningNote?: string | null;
        sendMode?: VlInvitationSendMode;
      };
      if (!res.ok) {
        setError(data.error ?? "Auflösung fehlgeschlagen.");
        return;
      }
      setValidationRows(data.validationRows ?? []);
      setResolved(data.resolved ?? []);
      setContributorRoleProvisioned(data.contributorRoleProvisioned ?? null);
      setContributorRoleNote(data.contributorRoleProvisioningNote ?? null);
      if (data.sendMode) {
        setSendMode(data.sendMode);
      }
    } catch {
      setError("Netzwerkfehler bei der Auflösung.");
    } finally {
      setLoading(false);
    }
  }, [canInvite, rawEmails]);

  const loadEmailPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/admin/vl-invitations/preview-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant: previewVariant }),
      });
      const data = (await res.json()) as EmailPreview & { error?: string };
      if (res.ok) {
        setEmailPreview({
          subject: data.subject,
          html: data.html,
          variant: data.variant,
          preview: data.preview,
          disclaimer: data.disclaimer,
        });
      }
    } finally {
      setPreviewLoading(false);
    }
  }, [previewVariant]);

  useEffect(() => {
    if (expanded) {
      void resolveRows();
    }
  }, [expanded, resolveRows]);

  useEffect(() => {
    if (expanded) {
      void loadEmailPreview();
    }
  }, [expanded, loadEmailPreview]);

  const invalidCount = useMemo(
    () => validationRows.filter((r) => !r.valid).length,
    [validationRows],
  );

  const sendUi = useMemo(
    () =>
      resolveVlInvitationSendUiState({
        sendMode,
        canInvite,
        contributorRoleProvisioned,
        invalidEmailCount: invalidCount,
        resolved,
      }),
    [sendMode, canInvite, contributorRoleProvisioned, invalidCount, resolved],
  );

  const refreshPreview = useCallback(async () => {
    setActionNote(null);
    setError(null);
    await resolveRows();
    await loadEmailPreview();
    setActionNote("Vorschau aktualisiert — keine Einladungen erzeugt, keine E-Mails versendet.");
  }, [resolveRows, loadEmailPreview]);

  const handleLiveSend = async () => {
    if (!liveSendConfirmed) return;
    setActionNote(null);
    setError(null);
    const res = await fetch("/api/admin/vl-invitations/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw: rawEmails, confirmLiveSend: true }),
    });
    const data = (await res.json()) as {
      error?: string;
      sent?: boolean;
      resolved?: ResolvedRow[];
    };
    if (data.resolved) {
      setResolved(data.resolved);
    }
    if (!res.ok) {
      setError(data.error ?? "Versand fehlgeschlagen.");
      return;
    }
    setActionNote(data.sent ? "Einladungen versendet." : (data.error ?? "Versand abgeschlossen."));
    setLiveSendConfirmed(false);
  };

  if (!canInvite) return null;

  return (
    <SceClubDevelopmentContextualCreateCollapsibleShell
      actionLabel="VL-Einladungen vorbereiten"
      contextLabel="Mehrere E-Mail-Adressen inline — Validierung, Vorschau und Versandfreigabe"
      expanded={expanded}
      onExpandedChange={setExpanded}
      panelDomId="vl-bulk-invitation-panel"
      cardTestId="vl-bulk-invitation-workspace"
      collapseToggleTestId="vl-bulk-invitation-toggle"
    >
      <div className="space-y-6">
        <section className="space-y-2">
          <label htmlFor="vl-invite-emails" className="text-sm font-medium text-foreground">
            E-Mail-Adressen (eine pro Zeile)
          </label>
          <textarea
            id="vl-invite-emails"
            data-testid="vl-invite-emails-input"
            className="min-h-[120px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={rawEmails}
            onChange={(e) => setRawEmails(e.target.value)}
          />
          {invalidCount > 0 ? (
            <p className="text-xs text-amber-700">
              {invalidCount} Zeile(n) ungültig oder doppelt — werden beim Versand übersprungen.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => void resolveRows()} disabled={loading}>
              {loading ? "Wird geprüft…" : "Vorschau prüfen"}
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm font-medium">Vereinsleitung-Zugang (Preset)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Vereinsleitung (Pilot) — Mitwirkung · minimale Rechte für Vereinsentwicklung, kein
            Club-Admin, kein Präsidenten-Rollenklon.
          </p>
          {contributorRoleProvisioned === false ? (
            <p
              className="mt-2 flex items-start gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-2 text-xs text-amber-800"
              data-testid="vl-contributor-role-missing-blocker"
              role="status"
            >
              <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
              {contributorRoleNote ?? VL_CONTRIBUTOR_ROLE_SETUP_REQUIRED}
            </p>
          ) : null}
        </section>

        {resolved.length > 0 ? (
          <section className="space-y-3" data-testid="vl-invitation-row-list">
            <p className="text-sm font-medium">Empfänger</p>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {resolved.map((row) => (
                <li key={row.email} className="px-3 py-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{row.email}</p>
                      {row.displayName ? (
                        <p className="text-xs text-muted-foreground">{row.displayName}</p>
                      ) : (
                        <p className="text-xs text-amber-700">Anzeigename noch offen</p>
                      )}
                    </div>
                    <span className={cn("text-xs font-medium", ACTION_TONE[row.action] ?? "")}>
                      {row.label}
                    </span>
                  </div>
                  {row.missingFunction ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                      <AlertTriangle className="size-3" aria-hidden />
                      Organisationsfunktion noch nicht bestätigt
                    </p>
                  ) : null}
                  {row.vereinsentwicklungPreview ? (
                    <VlAccessPreviewTable rows={row.vereinsentwicklungPreview} />
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="space-y-3 rounded-lg border border-border p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Mail className="size-4" aria-hidden />
            E-Mail-Vorschau (Beispieldaten, kein Live-Token)
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={previewVariant === "new_account" ? "primary" : "secondary"}
              onClick={() => setPreviewVariant("new_account")}
            >
              Neues Konto
            </Button>
            <Button
              type="button"
              size="sm"
              variant={previewVariant === "existing_account" ? "primary" : "secondary"}
              onClick={() => setPreviewVariant("existing_account")}
            >
              Bestehendes Konto
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => void loadEmailPreview()} disabled={previewLoading}>
              Aktualisieren
            </Button>
          </div>
          {emailPreview ? (
            <div className="space-y-2">
              {emailPreview.disclaimer ? (
                <p className="text-xs text-muted-foreground" role="note">
                  {emailPreview.disclaimer}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Betreff: <span className="font-medium text-foreground">{emailPreview.subject}</span>
              </p>
              <div
                role="document"
                lang="de"
                aria-label="Einladungs-E-Mail Vorschau mit Beispieldaten"
                className="max-h-[420px] overflow-auto rounded border border-border bg-white p-0"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: emailPreview.html }}
              />
            </div>
          ) : null}
        </section>

        <section className="space-y-3 border-t border-border pt-4">
          <Button
            type="button"
            data-testid="vl-invitation-preview-refresh"
            variant="secondary"
            onClick={() => void refreshPreview()}
            disabled={!sendUi.primaryButtonEnabled || loading || previewLoading}
            className="gap-2"
          >
            {loading || previewLoading ? "Wird aktualisiert…" : sendUi.primaryButtonLabel}
          </Button>
          {sendUi.previewStatusHint ? (
            <p className="text-xs text-muted-foreground" data-testid="vl-invitation-preview-hint">
              {sendUi.previewStatusHint}
            </p>
          ) : null}
          {sendUi.liveSendVisible ? (
            <div className="space-y-2">
              {sendUi.liveSendEnabled ? (
                <div data-testid="vl-invitation-live-send-confirm">
                  <SwitchToggle
                    id="vl-invitation-live-send-confirm-switch"
                    label="Live-Versand bestätigen"
                    description="Ich bestätige den Live-Versand an die gültigen Empfänger."
                    checked={liveSendConfirmed}
                    onChange={setLiveSendConfirmed}
                  />
                </div>
              ) : null}
              <Button
                type="button"
                data-testid="vl-invitation-live-send"
                onClick={() => void handleLiveSend()}
                disabled={!sendUi.liveSendEnabled || !liveSendConfirmed}
                className="gap-2"
              >
                <Send className="size-4" aria-hidden />
                Einladungen senden
              </Button>
              {sendUi.blockerMessage ? (
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="vl-invitation-live-send-blocker"
                  role="status"
                >
                  {sendUi.blockerMessage}
                </p>
              ) : null}
            </div>
          ) : null}
          {actionNote ? (
            <p
              className="flex items-center gap-1 text-xs text-foreground"
              data-testid="vl-invitation-action-note"
              role="status"
            >
              <CheckCircle2 className="size-3 text-emerald-600" aria-hidden />
              {actionNote}
            </p>
          ) : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </section>
      </div>
    </SceClubDevelopmentContextualCreateCollapsibleShell>
  );
}
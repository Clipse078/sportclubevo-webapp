"use client";

import { useState } from "react";
import { CommunicationCenterImapSecurity } from "@prisma/client";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SCE_SURFACE_STANDARD_PANEL } from "@/lib/shell/sce-surface-system";
import { cn } from "@/lib/cn";

type PublicMailbox = {
  id: string;
  displayName: string;
  emailAddress: string;
  status: string;
  imapHost: string | null;
  imapPort: number | null;
  imapSecurity: CommunicationCenterImapSecurity | null;
  imapUsername: string | null;
  hasCredential: boolean;
  lastSyncSuccessAt: string | null;
  lastSyncErrorMessage: string | null;
};

type Props = {
  initialMailboxes: PublicMailbox[];
};

export default function CommunicationMailboxSettingsForm({ initialMailboxes }: Props) {
  const [mailboxes, setMailboxes] = useState(initialMailboxes);
  const [form, setForm] = useState({
    displayName: "",
    emailAddress: "",
    imapHost: "",
    imapPort: 993,
    imapSecurity: CommunicationCenterImapSecurity.TLS,
    imapUsername: "",
    credential: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [showCredential, setShowCredential] = useState(false);

  async function refreshMailboxes() {
    const res = await fetch("/api/communication/inbox/mailboxes");
    const data = (await res.json()) as { mailboxes?: PublicMailbox[] };
    setMailboxes(data.mailboxes ?? []);
  }

  async function createMailbox() {
    setMessage(null);
    const res = await fetch("/api/communication/inbox/mailboxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      setMessage(err.error ?? "Speichern fehlgeschlagen.");
      return;
    }
    setForm({
      displayName: "",
      emailAddress: "",
      imapHost: "",
      imapPort: 993,
      imapSecurity: CommunicationCenterImapSecurity.TLS,
      imapUsername: "",
      credential: "",
    });
    setShowCredential(false);
    setMessage("Postfach gespeichert. Passwort wird nicht erneut angezeigt.");
    await refreshMailboxes();
  }

  async function testConnection(mailboxId: string) {
    setMessage(null);
    const res = await fetch(`/api/communication/inbox/mailboxes/${mailboxId}/test-connection`, {
      method: "POST",
    });
    const data = (await res.json()) as { ok?: boolean; message?: string; code?: string };
    setMessage(data.ok ? "Verbindung erfolgreich." : data.message ?? data.code ?? "Test fehlgeschlagen.");
  }

  return (
    <div className="space-y-8">
      <section className={cn(SCE_SURFACE_STANDARD_PANEL, "p-4")}>
        <h2 className="text-sm font-semibold">Postfach hinzufügen</h2>
        <p className="mt-1 text-xs text-[var(--text-2)]">
          Zugangsdaten werden verschlüsselt gespeichert und nie erneut im Browser angezeigt.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(
            [
              ["displayName", "Anzeigename"],
              ["emailAddress", "E-Mail-Adresse"],
              ["imapHost", "IMAP-Host"],
              ["imapUsername", "Benutzername"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-xs font-medium text-[var(--text-2)]">
              {label}
              <input
                className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                value={form[key]}
                onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
              />
            </label>
          ))}
          <label className="text-xs font-medium text-[var(--text-2)]">
            Port
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              value={form.imapPort}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, imapPort: Number(event.target.value) || 993 }))
              }
            />
          </label>
          <label htmlFor="mailbox-credential" className="text-xs font-medium text-[var(--text-2)]">
            Passwort / App-Passwort
            <div className="relative mt-1">
              <input
                id="mailbox-credential"
                type={showCredential ? "text" : "password"}
                autoComplete="new-password"
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 pr-9 text-sm"
                value={form.credential}
                onChange={(event) => setForm((prev) => ({ ...prev, credential: event.target.value }))}
                data-testid="mailbox-credential-input"
              />
              <button
                type="button"
                onClick={() => setShowCredential((visible) => !visible)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
                aria-label={showCredential ? "Passwort verbergen" : "Passwort anzeigen"}
                aria-pressed={showCredential}
                data-testid="mailbox-credential-visibility-toggle"
              >
                {showCredential ? (
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            </div>
          </label>
        </div>
        <div className="mt-4">
          <Button type="button" onClick={() => void createMailbox()}>
            Postfach speichern
          </Button>
        </div>
      </section>

      <section className={cn(SCE_SURFACE_STANDARD_PANEL, "p-4")}>
        <h2 className="text-sm font-semibold">Konfigurierte Postfächer</h2>
        <ul className="mt-3 divide-y divide-[var(--border)]">
          {mailboxes.map((mailbox) => (
            <li key={mailbox.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium">
                  {mailbox.displayName} · {mailbox.emailAddress}
                </p>
                <p className="text-xs text-[var(--text-2)]">
                  Status: {mailbox.status}
                  {mailbox.hasCredential ? " · Zugangsdaten hinterlegt" : " · Keine Zugangsdaten"}
                </p>
                {mailbox.lastSyncErrorMessage ? (
                  <p className="text-xs text-red-600">{mailbox.lastSyncErrorMessage}</p>
                ) : null}
              </div>
              <Button type="button" variant="secondary" onClick={() => void testConnection(mailbox.id)}>
                Verbindung testen
              </Button>
            </li>
          ))}
          {mailboxes.length === 0 ? (
            <li className="py-4 text-sm text-[var(--text-2)]">Noch keine Postfächer konfiguriert.</li>
          ) : null}
        </ul>
      </section>

      {message ? <p className="text-sm text-[var(--text-2)]">{message}</p> : null}
    </div>
  );
}

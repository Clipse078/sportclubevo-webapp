"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { useToast } from "@/hooks/use-toast";

type SenderRow = {
  id: string;
  displayName: string;
  emailAddress: string;
  status: "ACTIVE" | "ARCHIVED";
  isDefault: boolean;
  providerStatus: string;
};

const labelClass =
  "block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] mb-1.5";

function verificationLabel(status: string): string {
  if (status === "VERIFIED") return "Verifiziert";
  if (status === "NOT_VERIFIED") return "Nicht verifiziert";
  if (status === "UNKNOWN") return "Unbekannt";
  return "Nicht konfiguriert";
}

export function EmailSenderManagementPanel() {
  const { toast } = useToast();
  const [senders, setSenders] = useState<SenderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadSenders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/communication/email/senders");
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { senders?: SenderRow[] };
      setSenders(data.senders ?? []);
    } catch {
      toast.danger("Absender konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadSenders();
  }, [loadSenders]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/communication/email/senders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, emailAddress }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.danger(data.error ?? "Absender konnte nicht erstellt werden.");
        return;
      }
      setDisplayName("");
      setEmailAddress("");
      toast.success("Absender hinzugefügt.");
      await loadSenders();
    } finally {
      setCreating(false);
    }
  }

  async function handleSetDefault(id: string) {
    const res = await fetch(`/api/communication/email/senders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setDefault" }),
    });
    if (!res.ok) {
      toast.danger("Standardabsender konnte nicht gesetzt werden.");
      return;
    }
    toast.success("Standardabsender aktualisiert.");
    await loadSenders();
  }

  async function handleArchive(id: string) {
    const res = await fetch(`/api/communication/email/senders/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.danger("Absender konnte nicht deaktiviert werden.");
      return;
    }
    toast.success("Absender deaktiviert.");
    await loadSenders();
  }

  async function handleSaveEdit(id: string) {
    const res = await fetch(`/api/communication/email/senders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, emailAddress }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.danger(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }
    setEditingId(null);
    toast.success("Absender gespeichert.");
    await loadSenders();
  }

  return (
    <section
      aria-labelledby="email-sender-list-heading"
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 md:p-6"
      data-testid="email-sender-management"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="email-sender-list-heading" className="text-base font-semibold">
            Vereinsabsender
          </h2>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            Mehrere Absender verwalten, Standard setzen und Verifizierung einsehen.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-[var(--muted)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Absender werden geladen…
        </div>
      ) : (
        <ul className="mt-4 space-y-3" data-testid="email-sender-list">
          {senders
            .filter((sender) => sender.status === "ACTIVE")
            .map((sender) => (
              <li
                key={sender.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4"
              >
                {editingId === sender.id ? (
                  <div className="space-y-3">
                    <input
                      className="fca-input w-full"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      aria-label="Absendername bearbeiten"
                    />
                    <input
                      className="fca-input w-full"
                      type="email"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      aria-label="E-Mail bearbeiten"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="fca-btn fca-btn-primary"
                        onClick={() => void handleSaveEdit(sender.id)}
                      >
                        Speichern
                      </button>
                      <button
                        type="button"
                        className="fca-btn fca-btn-secondary"
                        onClick={() => setEditingId(null)}
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{sender.displayName}</p>
                        <p className="text-sm text-[var(--text-2)]">{sender.emailAddress}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sender.isDefault ? (
                          <AdminStatusPill label="Standard" tone="success" />
                        ) : null}
                        <AdminStatusPill
                          label={verificationLabel(sender.providerStatus)}
                          tone={
                            sender.providerStatus === "VERIFIED"
                              ? "success"
                              : sender.providerStatus === "UNKNOWN"
                                ? "warning"
                                : "muted"
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="fca-btn fca-btn-secondary text-sm"
                        onClick={() => {
                          setEditingId(sender.id);
                          setDisplayName(sender.displayName);
                          setEmailAddress(sender.emailAddress);
                        }}
                      >
                        Bearbeiten
                      </button>
                      {!sender.isDefault ? (
                        <button
                          type="button"
                          className="fca-btn fca-btn-secondary text-sm"
                          onClick={() => void handleSetDefault(sender.id)}
                        >
                          Als Standard
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="fca-btn fca-btn-secondary text-sm"
                        onClick={() => void handleArchive(sender.id)}
                      >
                        Deaktivieren
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="mt-6 space-y-3 border-t border-[var(--border)] pt-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" aria-hidden />
          Absender hinzufügen
        </h3>
        <div>
          <label htmlFor="new-sender-name" className={labelClass}>
            Absendername
          </label>
          <input
            id="new-sender-name"
            className="fca-input w-full"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="new-sender-email" className={labelClass}>
            E-Mail-Adresse
          </label>
          <input
            id="new-sender-email"
            type="email"
            className="fca-input w-full"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="fca-btn fca-btn-primary" disabled={creating}>
          {creating ? "Speichern…" : "Absender hinzufügen"}
        </button>
      </form>

      <div className="mt-6 rounded-lg border border-dashed border-[var(--border)] p-4 text-sm">
        <p className="font-medium">SportClubEvo-Fallback</p>
        <p className="mt-1 text-[var(--text-2)]">
          Plattform-Absender aus <code className="text-xs">EMAIL_FROM</code> — nicht als Vereinsabsender
          verwaltbar. Wird genutzt, wenn kein verifizierter Vereinsabsender bereit ist.
        </p>
      </div>
    </section>
  );
}

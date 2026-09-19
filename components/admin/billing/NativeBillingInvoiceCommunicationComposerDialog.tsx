"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";

export type CommunicationComposerMode = "compose" | "reply";

export type CommunicationComposerInitialValues = {
  to: string;
  cc: string;
  subject: string;
  message: string;
  parentCommunicationId?: string;
};

type Props = {
  open: boolean;
  mode: CommunicationComposerMode;
  invoiceKey: string;
  fromAddress: string;
  initial: CommunicationComposerInitialValues;
  onClose: () => void;
  onSent: () => void;
};

function parseAddressField(value: string): string[] {
  return value
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function NativeBillingInvoiceCommunicationComposerDialog({
  open,
  mode,
  invoiceKey,
  fromAddress,
  initial,
  onClose,
  onSent,
}: Props) {
  const [to, setTo] = useState(initial.to);
  const [cc, setCc] = useState(initial.cc);
  const [subject, setSubject] = useState(initial.subject);
  const [message, setMessage] = useState(initial.message);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTo(initial.to);
    setCc(initial.cc);
    setSubject(initial.subject);
    setMessage(initial.message);
    setError(null);
    setSuccess(null);
  }, [open, initial]);

  async function handleSend() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `/api/platform/billing/invoices/${encodeURIComponent(invoiceKey)}/communications`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            parentCommunicationId: initial.parentCommunicationId,
            to: parseAddressField(to),
            cc: parseAddressField(cc),
            subject,
            message,
          }),
        },
      );
      const data = (await res.json()) as { error?: string; communication?: { id: string } };
      if (!res.ok) {
        throw new Error(data.error ?? "Senden fehlgeschlagen.");
      }
      setSuccess("Nachricht wurde gesendet.");
      onSent();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Senden fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "reply" ? "Antworten" : "Neue Nachricht";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description="Rechnungsbezogene E-Mail über SportClubEvo Abrechnung."
      size="lg"
      footer={
        <>
          <button
            type="button"
            className="fca-button-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="fca-button-primary"
            onClick={() => void handleSend()}
            disabled={loading}
          >
            {loading ? "Wird gesendet…" : "Senden"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {success ? (
          <p className="text-sm text-[var(--success)]" role="status">
            {success}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-[var(--destructive)]" role="alert">
            {error}
          </p>
        ) : null}

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted)]" htmlFor="billing-compose-from">
            Von
          </label>
          <input
            id="billing-compose-from"
            className="fca-input w-full bg-[color-mix(in_srgb,var(--muted)_8%,transparent)]"
            value={fromAddress}
            readOnly
            aria-readonly="true"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted)]" htmlFor="billing-compose-to">
            An
          </label>
          <input
            id="billing-compose-to"
            className="fca-input w-full"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="empfaenger@example.com"
            autoComplete="off"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted)]" htmlFor="billing-compose-cc">
            CC
          </label>
          <input
            id="billing-compose-cc"
            className="fca-input w-full"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="Optional, durch Komma getrennt"
            autoComplete="off"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted)]" htmlFor="billing-compose-subject">
            Betreff
          </label>
          <input
            id="billing-compose-subject"
            className="fca-input w-full"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted)]" htmlFor="billing-compose-message">
            Nachricht
          </label>
          <textarea
            id="billing-compose-message"
            className="fca-input min-h-[10rem] w-full resize-y"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      </div>
    </Dialog>
  );
}

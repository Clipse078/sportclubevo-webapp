"use client";

import { useEffect, useState } from "react";
import {
  EmailAttachmentComposer,
  formatAttachmentSize,
  type ComposerAttachment,
} from "@/components/admin/communications/EmailAttachmentComposer";
import { Dialog } from "@/components/ui/Dialog";
import {
  MAX_BILLING_COMMUNICATION_ATTACHMENT_SIZE_BYTES,
  MAX_BILLING_COMMUNICATION_ATTACHMENTS_PER_COMMUNICATION,
} from "@/lib/billing/billing-communication/billing-communication-attachment-policy";

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
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTo(initial.to);
    setCc(initial.cc);
    setSubject(initial.subject);
    setMessage(initial.message);
    setError(null);
    setSuccess(null);
    setAttachments([]);
    setAttachmentError(null);
  }, [open, initial]);

  async function uploadAttachment(file: File, localId: string) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(
      `/api/platform/billing/invoices/${encodeURIComponent(invoiceKey)}/communications/attachments`,
      { method: "POST", body: formData },
    );
    const payload = (await response.json()) as {
      error?: string;
      attachment?: { id: string; filename: string; contentType: string; sizeBytes: number };
    };
    if (!response.ok || !payload.attachment) {
      throw new Error(payload.error ?? "Upload fehlgeschlagen.");
    }
    setAttachments((current) =>
      current.map((entry) =>
        entry.localId === localId
          ? {
              ...entry,
              attachmentId: payload.attachment!.id,
              filename: payload.attachment!.filename,
              contentType: payload.attachment!.contentType,
              size: payload.attachment!.sizeBytes,
              status: "READY",
            }
          : entry,
      ),
    );
  }

  function handleFilesSelected(files: File[] | FileList | null) {
    const list = files ? Array.from(files) : [];
    if (list.length === 0) return;
    setAttachmentError(null);
    const next = [...attachments];
    for (const file of list) {
      if (next.length >= MAX_BILLING_COMMUNICATION_ATTACHMENTS_PER_COMMUNICATION) {
        setAttachmentError("Maximal 10 Anhänge pro Nachricht.");
        break;
      }
      if (file.size > MAX_BILLING_COMMUNICATION_ATTACHMENT_SIZE_BYTES) {
        setAttachmentError(`${file.name} überschreitet 10 MiB.`);
        continue;
      }
      const localId = crypto.randomUUID();
      next.push({
        localId,
        attachmentId: null,
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
        status: "UPLOADING",
      });
      void uploadAttachment(file, localId).catch((uploadError) => {
        setAttachments((current) =>
          current.map((entry) =>
            entry.localId === localId
              ? {
                  ...entry,
                  status: "ERROR",
                  error: uploadError instanceof Error ? uploadError.message : "Upload fehlgeschlagen.",
                }
              : entry,
          ),
        );
      });
    }
    setAttachments(next);
  }

  async function handleSend() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    if (attachments.some((entry) => entry.status === "UPLOADING")) {
      setError("Bitte warten, bis alle Anhänge hochgeladen sind.");
      setLoading(false);
      return;
    }
    if (attachments.some((entry) => entry.status === "ERROR")) {
      setError("Bitte fehlerhafte Anhänge entfernen oder erneut hochladen.");
      setLoading(false);
      return;
    }
    const attachmentIds = attachments
      .map((entry) => entry.attachmentId)
      .filter((id): id is string => Boolean(id));
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
            attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
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

        <div className="space-y-2">
          <EmailAttachmentComposer
            attachments={attachments}
            onAddFiles={(files) => handleFilesSelected(files)}
            onRemove={(localId) =>
              setAttachments((current) => current.filter((entry) => entry.localId !== localId))
            }
            disabled={loading}
            error={attachmentError}
          />
          {attachments.length > 0 ? (
            <p className="text-xs text-[var(--muted)]">
              Gesamt {formatAttachmentSize(attachments.reduce((sum, entry) => sum + entry.size, 0))}
            </p>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}

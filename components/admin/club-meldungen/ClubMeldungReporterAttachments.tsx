"use client";

import type React from "react";
import { useRef, useState } from "react";
import {
  MAX_COMMUNICATION_ATTACHMENTS_PER_MESSAGE,
  MAX_COMMUNICATION_ATTACHMENT_SIZE_BYTES,
  MAX_COMMUNICATION_ATTACHMENT_TOTAL_BYTES,
} from "@/lib/communication/attachment-validation";

export type ReporterAttachmentDraft = {
  localId: string;
  attachmentId: string | null;
  filename: string;
  contentType: string;
  size: number;
  status: "UPLOADING" | "READY" | "ERROR";
  error?: string;
};

type Props = {
  tenantSlug: string;
  attachments: ReporterAttachmentDraft[];
  onChange: React.Dispatch<React.SetStateAction<ReporterAttachmentDraft[]>>;
  disabled?: boolean;
};

export default function ClubMeldungReporterAttachments({
  tenantSlug,
  attachments,
  onChange,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [listError, setListError] = useState<string | null>(null);

  async function uploadFile(file: File, localId: string) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(
        `/api/tenants/${encodeURIComponent(tenantSlug)}/meldungen/attachments`,
        { method: "POST", body: formData },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        attachment?: { attachmentId: string; filename: string; contentType: string; size: number };
      };
      if (!response.ok || !payload.attachment) {
        throw new Error(payload.error ?? "Upload fehlgeschlagen.");
      }
      onChange((current) =>
        current.map((row) =>
          row.localId === localId
            ? {
                ...row,
                attachmentId: payload.attachment!.attachmentId,
                filename: payload.attachment!.filename,
                contentType: payload.attachment!.contentType,
                size: payload.attachment!.size,
                status: "READY" as const,
                error: undefined,
              }
            : row,
        ),
      );
    } catch (error) {
      onChange((current) =>
        current.map((row) =>
          row.localId === localId
            ? {
                ...row,
                status: "ERROR" as const,
                error: error instanceof Error ? error.message : "Upload fehlgeschlagen.",
              }
            : row,
        ),
      );
    }
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setListError(null);
    const next = [...attachments];
    const fingerprints = new Set(
      next.map((a) => `${a.filename.toLowerCase()}:${a.size}:${a.contentType}`),
    );
    let projectedTotal = next.reduce((sum, a) => sum + a.size, 0);
    const uploads: Array<{ file: File; localId: string }> = [];
    let error: string | null = null;

    for (const file of Array.from(fileList)) {
      const fingerprint = `${file.name.toLowerCase()}:${file.size}:${file.type}`;
      if (fingerprints.has(fingerprint)) {
        error = "Diese Datei ist bereits ausgewählt.";
        continue;
      }
      if (next.length >= MAX_COMMUNICATION_ATTACHMENTS_PER_MESSAGE) {
        error = "Es können höchstens 10 Anhänge hinzugefügt werden.";
        break;
      }
      if (file.size > MAX_COMMUNICATION_ATTACHMENT_SIZE_BYTES) {
        error = "Die Datei überschreitet 10 MiB.";
        continue;
      }
      if (projectedTotal + file.size > MAX_COMMUNICATION_ATTACHMENT_TOTAL_BYTES) {
        error = "Die Anhänge dürfen zusammen höchstens 20 MiB umfassen.";
        break;
      }
      const localId =
        globalThis.crypto && "randomUUID" in globalThis.crypto
          ? globalThis.crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      next.push({
        localId,
        attachmentId: null,
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
        status: "UPLOADING",
      });
      fingerprints.add(fingerprint);
      projectedTotal += file.size;
      uploads.push({ file, localId });
    }

    onChange(next);
    if (error) setListError(error);
    for (const item of uploads) {
      void uploadFile(item.file, item.localId);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(localId: string) {
    onChange((current) => current.filter((row) => row.localId !== localId));
  }

  const readyIds = attachments
    .filter((a) => a.status === "READY" && a.attachmentId)
    .map((a) => a.attachmentId as string);

  return (
    <fieldset className="flex flex-col gap-2 rounded-md border border-slate-200 p-3" disabled={disabled}>
      <legend className="px-1 text-sm font-medium text-slate-900">Fotos und Dateien (optional)</legend>
      <p className="text-xs text-slate-600">
        Bis zu 10 Dateien, je 10 MiB, gesamt 20 MiB. Auf dem Smartphone kannst du Kamera oder Galerie
        wählen.
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.txt"
        className="text-sm text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-200 file:bg-white file:px-3 file:py-1"
        aria-label="Dateien auswählen"
        disabled={disabled}
        onChange={(event) => addFiles(event.target.files)}
      />
      {listError ? (
        <p className="text-sm text-amber-800" role="alert">
          {listError}
        </p>
      ) : null}
      {attachments.length > 0 ? (
        <ul className="space-y-2" aria-live="polite">
          {attachments.map((row) => (
            <li
              key={row.localId}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-100 bg-slate-50 px-2 py-1 text-sm"
            >
              <span>
                <span className="font-medium text-slate-900">{row.filename}</span>
                <span className="sr-only"> — </span>
                <span className="text-xs text-slate-600">
                  {row.status === "UPLOADING"
                    ? "Wird hochgeladen…"
                    : row.status === "READY"
                      ? "Bereit"
                      : "Fehler"}
                </span>
              </span>
              <span className="flex gap-2">
                {row.status === "ERROR" ? (
                  <button
                    type="button"
                    className="text-xs text-slate-700 underline"
                    onClick={() => inputRef.current?.click()}
                  >
                    Erneut Datei wählen
                  </button>
                ) : null}
                <button
                  type="button"
                  className="text-xs text-red-700 underline"
                  onClick={() => remove(row.localId)}
                  disabled={disabled || row.status === "UPLOADING"}
                >
                  Entfernen
                </button>
              </span>
              {row.error ? (
                <p className="w-full text-xs text-red-700" role="alert">
                  {row.error}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <input type="hidden" name="meldung-attachment-ids" value={readyIds.join(",")} readOnly />
    </fieldset>
  );
}
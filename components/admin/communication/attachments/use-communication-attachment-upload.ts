"use client";

import { useCallback, useState } from "react";
import {
  MAX_COMMUNICATION_ATTACHMENT_SIZE_BYTES,
  MAX_COMMUNICATION_ATTACHMENT_TOTAL_BYTES,
  MAX_COMMUNICATION_ATTACHMENTS_PER_MESSAGE,
} from "@/lib/communication/attachment-constants";
import type { ComposerAttachment } from "@/components/admin/communications/EmailAttachmentComposer";

type UploadResponse = {
  attachment?: {
    id: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
  };
  error?: string;
};

function newLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useCommunicationAttachmentUpload() {
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File, localId: string) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/communication/attachments", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as UploadResponse;
      if (!response.ok || !payload.attachment) {
        throw new Error(payload.error ?? "Upload fehlgeschlagen");
      }
      setAttachments((current) =>
        current.map((attachment) =>
          attachment.localId === localId
            ? {
                ...attachment,
                attachmentId: payload.attachment?.id ?? null,
                filename: payload.attachment?.filename ?? attachment.filename,
                contentType: payload.attachment?.contentType ?? attachment.contentType,
                size: payload.attachment?.sizeBytes ?? attachment.size,
                status: "READY",
              }
            : attachment,
        ),
      );
    } catch (uploadError) {
      setAttachments((current) =>
        current.map((attachment) =>
          attachment.localId === localId
            ? {
                ...attachment,
                status: "ERROR",
                error:
                  uploadError instanceof Error
                    ? uploadError.message
                    : "Upload fehlgeschlagen",
              }
            : attachment,
        ),
      );
    }
  }, []);

  const addFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      setError(null);
      const next = [...attachments];
      const seen = new Set(
        next.map(
          (attachment) =>
            `${attachment.filename.toLowerCase()}:${attachment.size}:${attachment.contentType}`,
        ),
      );
      let projectedTotal = next.reduce((sum, attachment) => sum + attachment.size, 0);

      for (const file of files) {
        if (next.length >= MAX_COMMUNICATION_ATTACHMENTS_PER_MESSAGE) {
          setError("Maximal 10 Anhänge pro Nachricht.");
          break;
        }
        if (file.size > MAX_COMMUNICATION_ATTACHMENT_SIZE_BYTES) {
          setError("Einzelne Dateien dürfen höchstens 10 MiB gross sein.");
          continue;
        }
        if (projectedTotal + file.size > MAX_COMMUNICATION_ATTACHMENT_TOTAL_BYTES) {
          setError("Anhänge dürfen zusammen höchstens 20 MiB gross sein.");
          continue;
        }
        const key = `${file.name.toLowerCase()}:${file.size}:${file.type}`;
        if (seen.has(key)) continue;
        seen.add(key);
        projectedTotal += file.size;
        const localId = newLocalId();
        next.push({
          localId,
          attachmentId: null,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          status: "UPLOADING",
        });
        void uploadFile(file, localId);
      }
      setAttachments(next);
    },
    [attachments, uploadFile],
  );

  const removeAttachment = useCallback((localId: string) => {
    setAttachments((current) => current.filter((attachment) => attachment.localId !== localId));
  }, []);

  const readyAttachmentIds = attachments.flatMap((attachment) =>
    attachment.attachmentId && attachment.status === "READY" ? [attachment.attachmentId] : [],
  );

  const hasUnreadyAttachments = attachments.some(
    (attachment) => attachment.status !== "READY",
  );

  return {
    attachments,
    setAttachments,
    error,
    setError,
    addFiles,
    removeAttachment,
    readyAttachmentIds,
    hasUnreadyAttachments,
  };
}

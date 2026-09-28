"use client";

import Link from "next/link";
import { formatAttachmentSize } from "@/components/admin/communications/EmailAttachmentComposer";

export type CommunicationAttachmentListItem = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  downloadAvailable: boolean;
  previewAvailable?: boolean;
  unavailableReason?: string;
};

export function CommunicationAttachmentList({
  attachments,
}: {
  attachments: CommunicationAttachmentListItem[];
}) {
  if (attachments.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1 text-xs text-[var(--text-2)]" aria-label="Anhänge">
      {attachments.map((attachment) => (
        <li key={attachment.id} className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 break-words">
            {attachment.filename} ({formatAttachmentSize(attachment.sizeBytes)})
          </span>
          {attachment.downloadAvailable ? (
            <>
              <Link
                href={`/api/communication/attachments/${encodeURIComponent(attachment.id)}/download`}
                className="font-medium text-[var(--sce-primary)] underline-offset-2 hover:underline"
              >
                Herunterladen
              </Link>
              {attachment.previewAvailable ? (
                <Link
                  href={`/api/communication/attachments/${encodeURIComponent(attachment.id)}/download?disposition=inline`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[var(--sce-primary)] underline-offset-2 hover:underline"
                >
                  Vorschau
                </Link>
              ) : null}
            </>
          ) : (
            <span className="text-[var(--muted)]">
              {attachment.unavailableReason ?? "Datei nicht verfügbar"}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

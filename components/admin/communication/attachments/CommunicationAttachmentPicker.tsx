"use client";

import {
  EmailAttachmentComposer,
  type ComposerAttachment,
} from "@/components/admin/communications/EmailAttachmentComposer";
import { useCommunicationAttachmentUpload } from "@/components/admin/communication/attachments/use-communication-attachment-upload";

type Props = {
  disabled?: boolean;
  /** Controlled mode (optional). */
  attachments?: ComposerAttachment[];
  onAttachmentsChange?: (attachments: ComposerAttachment[]) => void;
  error?: string | null;
  onErrorChange?: (error: string | null) => void;
  onAddFiles?: (files: File[]) => void;
  onRemove?: (localId: string) => void;
};

export function CommunicationAttachmentPicker(props: Props) {
  const internal = useCommunicationAttachmentUpload();
  const attachments = props.attachments ?? internal.attachments;
  const error = props.error ?? internal.error;
  const onAddFiles = props.onAddFiles ?? internal.addFiles;
  const onRemove = props.onRemove ?? internal.removeAttachment;

  return (
    <EmailAttachmentComposer
      attachments={attachments}
      disabled={props.disabled ?? false}
      error={error}
      onAddFiles={onAddFiles}
      onRemove={onRemove}
    />
  );
}

export { useCommunicationAttachmentUpload };

import type { ComposerAttachment } from "@/components/admin/communications/EmailAttachmentComposer";

/** Canonical empty reply attachment list from {@link useCommunicationAttachmentUpload}. */
export const INBOX_REPLY_ATTACHMENTS_EMPTY: ComposerAttachment[] = [];

export function inboxReplyHasSendableAttachment(
  attachments: ComposerAttachment[],
): boolean {
  return attachments.some(
    (attachment) => attachment.status === "READY" && Boolean(attachment.attachmentId),
  );
}

/** Stable no-op handlers for inbox detail pane tests and Storybook-style renders. */
export const inboxReplyComposerTestDefaults = {
  replyAttachments: INBOX_REPLY_ATTACHMENTS_EMPTY,
  replyAttachmentError: null as string | null,
  onReplyAddAttachments: () => undefined,
  onReplyRemoveAttachment: () => undefined,
  replyUseSignature: false,
  onReplyUseSignatureChange: () => undefined,
  replySignatureBody: null as string | null,
};

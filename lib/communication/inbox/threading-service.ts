import { normalizeInternetMessageId } from "@/lib/communication/inbox/message-id";

export function resolveThreadRootMessageId(input: {
  messageIdHeader: string | null;
  inReplyTo: string | null;
  references: string[];
  subject: string | null;
}): string {
  const own = normalizeInternetMessageId(input.messageIdHeader);
  if (own) return own;
  const replyParent = normalizeInternetMessageId(input.inReplyTo);
  if (replyParent) return replyParent;
  const firstRef = input.references.map((r) => normalizeInternetMessageId(r)).find(Boolean);
  if (firstRef) return firstRef;
  const subjectKey = normalizeSubjectForThreadFallback(input.subject);
  return `subject-fallback:${subjectKey}`;
}

export function normalizeSubjectForThreadFallback(subject: string | null): string {
  if (!subject?.trim()) return "(no-subject)";
  return subject
    .trim()
    .replace(/^re:\s*/i, "")
    .replace(/^fwd:\s*/i, "")
    .replace(/^wg:\s*/i, "")
    .toLowerCase();
}

export function shouldUseSubjectFallbackThreading(input: {
  messageIdHeader: string | null;
  inReplyTo: string | null;
  references: string[];
}): boolean {
  return (
    !normalizeInternetMessageId(input.messageIdHeader) &&
    !normalizeInternetMessageId(input.inReplyTo) &&
    input.references.length === 0
  );
}

export function buildReplyReferences(existing: string[], inReplyTo: string | null): string[] {
  const refs = [...existing];
  const normalizedReply = normalizeInternetMessageId(inReplyTo);
  if (normalizedReply && !refs.includes(normalizedReply)) {
    refs.push(normalizedReply);
  }
  return refs.slice(-20);
}

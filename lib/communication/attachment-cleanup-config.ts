/**
 * SCE-COMM-EVO-09 — conservative cleanup for abandoned compose uploads.
 * Linked READY rows (messages, communications, signatures) are never candidates.
 */

const DEFAULT_UNLINKED_MAX_AGE_HOURS = 24 * 7;
const DEFAULT_CLEANUP_BATCH_SIZE = 25;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const trimmed = raw?.trim();
  if (!trimmed) return fallback;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

export function getCommunicationUnlinkedAttachmentMaxAgeMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const hours = parsePositiveInt(
    env.COMMUNICATION_UNLINKED_ATTACHMENT_MAX_AGE_HOURS,
    DEFAULT_UNLINKED_MAX_AGE_HOURS,
  );
  return hours * 60 * 60 * 1000;
}

export function getCommunicationUnlinkedAttachmentCleanupBatchSize(
  env: NodeJS.ProcessEnv = process.env,
): number {
  return parsePositiveInt(
    env.COMMUNICATION_UNLINKED_ATTACHMENT_CLEANUP_BATCH,
    DEFAULT_CLEANUP_BATCH_SIZE,
  );
}

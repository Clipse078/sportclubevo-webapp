/**
 * BILLING-COMMS-01F — conservative staged attachment cleanup configuration.
 * READY billing communication attachments are never removed here (see retention module).
 */

const DEFAULT_STAGED_MAX_AGE_HOURS = 24 * 7;
const DEFAULT_CLEANUP_BATCH_SIZE = 25;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const trimmed = raw?.trim();
  if (!trimmed) return fallback;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

export function getBillingCommunicationStagedAttachmentMaxAgeMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const hours = parsePositiveInt(
    env.BILLING_COMMUNICATION_STAGED_ATTACHMENT_MAX_AGE_HOURS,
    DEFAULT_STAGED_MAX_AGE_HOURS,
  );
  return hours * 60 * 60 * 1000;
}

export function getBillingCommunicationStagedCleanupBatchSize(
  env: NodeJS.ProcessEnv = process.env,
): number {
  return parsePositiveInt(
    env.BILLING_COMMUNICATION_STAGED_CLEANUP_BATCH,
    DEFAULT_CLEANUP_BATCH_SIZE,
  );
}

export const BILLING_INBOUND_CRON_STALE_THRESHOLD_MS = 15 * 60 * 1000;

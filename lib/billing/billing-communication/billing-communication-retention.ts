/**
 * BILLING-COMMS-01F — billing correspondence retention policy (explicit defaults).
 *
 * There is no established SCE destructive retention policy for billing communications.
 * Records and READY attachments are retained indefinitely until a future policy is approved.
 *
 * STAGED outbound attachments are temporary compose artifacts and may be purged by
 * stale cleanup (see billing-communication-attachment-cleanup-config.ts).
 */

export const BILLING_COMMUNICATION_RETENTION_POLICY = {
  readyCommunications: "INDEFINITE" as const,
  readyAttachments: "INDEFINITE" as const,
  stagedAttachments: "EPHEMERAL_STAGED_CLEANUP" as const,
  unresolvedInboundQueue: "INDEFINITE_UNTIL_RESOLVED_OR_MANUAL" as const,
};

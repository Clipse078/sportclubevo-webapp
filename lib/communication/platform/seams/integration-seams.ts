/**
 * SCE-COMM-01 — cross-module integration identifiers (documentation + type seams).
 */

/** Formal tasks remain Aufgaben domain; requests may optionally spawn Aufgaben later. */
export type RequestToAufgabeBridge = {
  requirementId?: string;
  createOnAccept: boolean;
};

/** Attachments: lightweight comm media vs Workspace-backed documents (COMM-01A attachments). */
export type CommunicationAttachmentSeam =
  | { kind: "MESSAGE_MEDIA"; attachmentId: string }
  | { kind: "WORKSPACE_DOCUMENT"; documentId: string; versionId?: string };

/** Notifications are attention signals; Communication owns content/conversation. */
export type CommunicationNotificationBridge = {
  notificationType: string;
  deduplicationKey: string;
  href: string;
};

/** Audit references communication entities; bodies stay out of generic audit payloads. */
export type CommunicationAuditSeam = {
  moduleKey: "communication";
  action:
    | "COMMUNICATION_CREATED"
    | "COMMUNICATION_UPDATED"
    | "COMMUNICATION_SCHEDULED"
    | "COMMUNICATION_SENT"
    | "COMMUNICATION_CANCELLED";
  communicationId: string;
  audienceSnapshotId?: string;
};

/** Async dispatch boundary (COMM-19 / workers). */
export type CommunicationDispatchJobSeam = {
  tenantId: string;
  communicationId: string;
  idempotencyKey: string;
  batchIndex: number;
};

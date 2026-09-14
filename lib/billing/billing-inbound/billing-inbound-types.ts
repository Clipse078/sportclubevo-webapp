export type ParsedInboundBillingEmail = {
  senderAddress: string;
  toAddresses: string[];
  ccAddresses: string[];
  subject: string | null;
  textBody: string | null;
  htmlBody: string | null;
  receivedAt: Date;
  internetMessageId: string | null;
  inReplyTo: string | null;
  referencesHeader: string | null;
  hasAttachments: boolean;
};

export type BillingImapFetchedMessage = {
  uid: number;
  uidValidity: number;
  providerMessageId: string;
  rawSource: Buffer;
};

export type BillingInboundIngestResult =
  | { kind: "INGESTED"; communicationId: string; tenantId: string }
  | { kind: "DUPLICATE"; communicationId: string; tenantId: string }
  | { kind: "UNRESOLVED"; unresolvedId: string; reason: string }
  | { kind: "FAILED"; retryable: boolean; reason: string };

export type BillingInboundSyncSummary = {
  mailboxKey: string;
  fetched: number;
  ingested: number;
  duplicate: number;
  unresolved: number;
  failed: number;
  skipped: boolean;
  skipReason?: string;
};

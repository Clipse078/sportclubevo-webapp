import type { CommunicationCenterImapSecurity } from "@prisma/client";

export type InboundImapConnectionConfig = {
  host: string;
  port: number;
  security: CommunicationCenterImapSecurity;
  username: string;
  password: string;
};

export type InboundFetchedMessage = {
  uid: number;
  uidValidity: number;
  providerMessageKey: string;
  rawSource: Buffer;
};

export type InboundFetchBatch = {
  uidValidity: number;
  messages: InboundFetchedMessage[];
  highestUid: number | null;
};

export type InboundCommunicationConnector = {
  testConnection(config: InboundImapConnectionConfig): Promise<{ ok: true } | { ok: false; code: string; message: string }>;
  fetchNewInboxMessages(input: {
    config: InboundImapConnectionConfig;
    uidValidity: bigint | null;
    lastProcessedUid: bigint | null;
    batchSize: number;
  }): Promise<InboundFetchBatch>;
};

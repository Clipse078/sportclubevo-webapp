import type { BillingImapConfig } from "./billing-imap-config";
import type { BillingImapFetchedMessage } from "./billing-inbound-types";

export type BillingImapFetchBatch = {
  uidValidity: number;
  messages: BillingImapFetchedMessage[];
  highestUid: number | null;
};

export interface BillingImapClient {
  fetchNewInboxMessages(input: {
    config: BillingImapConfig;
    uidValidity: bigint | null;
    lastProcessedUid: bigint | null;
    batchSize: number;
  }): Promise<BillingImapFetchBatch>;
}

export type BillingImapClientFactory = () => BillingImapClient;

let imapClientFactory: BillingImapClientFactory | null = null;

export function setBillingImapClientFactory(factory: BillingImapClientFactory | null): void {
  imapClientFactory = factory;
}

export async function createBillingImapClient(): Promise<BillingImapClient> {
  if (imapClientFactory) {
    return imapClientFactory();
  }
  const { ImapFlowBillingImapClient } = await import("./billing-imap-imapflow-client");
  return new ImapFlowBillingImapClient();
}

import { ImapFlow } from "imapflow";
import type { BillingImapConfig } from "./billing-imap-config";
import type { BillingImapClient, BillingImapFetchBatch } from "./billing-imap-client";
import type { BillingImapFetchedMessage } from "./billing-inbound-types";

export class ImapFlowBillingImapClient implements BillingImapClient {
  async fetchNewInboxMessages(input: {
    config: BillingImapConfig;
    uidValidity: bigint | null;
    lastProcessedUid: bigint | null;
    batchSize: number;
  }): Promise<BillingImapFetchBatch> {
    const client = new ImapFlow({
      host: input.config.host,
      port: input.config.port,
      secure: input.config.tls,
      auth: {
        user: input.config.user,
        pass: input.config.password,
      },
      logger: false,
      tls: {
        minVersion: "TLSv1.2",
      },
    });

    await client.connect();
    try {
      const mailbox = await client.mailboxOpen("INBOX");
      const uidValidity = Number(mailbox.uidValidity);
      const lastUid = input.lastProcessedUid ? Number(input.lastProcessedUid) : 0;

      if (input.uidValidity !== null && input.uidValidity !== BigInt(uidValidity)) {
        return {
          uidValidity,
          messages: [],
          highestUid: null,
        };
      }

      const rangeStart = lastUid + 1;
      const range = `${rangeStart}:*`;
      const messages: BillingImapFetchedMessage[] = [];
      let highestUid: number | null = null;

      for await (const msg of client.fetch(range, {
        uid: true,
        source: true,
      })) {
        if (!msg.uid || !msg.source) continue;
        if (messages.length >= input.batchSize) break;
        highestUid = msg.uid;
        messages.push({
          uid: msg.uid,
          uidValidity,
          providerMessageId: `${uidValidity}:${msg.uid}`,
          rawSource: Buffer.isBuffer(msg.source) ? msg.source : Buffer.from(msg.source),
        });
      }

      return { uidValidity, messages, highestUid };
    } finally {
      await client.logout().catch(() => undefined);
    }
  }
}

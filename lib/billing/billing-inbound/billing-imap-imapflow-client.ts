import { ImapFlow } from "imapflow";
import type { BillingImapConfig } from "./billing-imap-config";
import type { BillingImapClient, BillingImapFetchBatch } from "./billing-imap-client";
import type { BillingImapFetchedMessage } from "./billing-inbound-types";
import { pickBillingImapCandidateUids } from "./billing-imap-candidate-uids";

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
      const searchResult = await client.search({ uid: `${rangeStart}:*` }, { uid: true });
      if (searchResult === false) {
        throw new Error("IMAP UID SEARCH failed");
      }

      const candidateUids = pickBillingImapCandidateUids(
        searchResult ?? [],
        lastUid,
        input.batchSize,
      );

      if (candidateUids.length === 0) {
        return { uidValidity, messages: [], highestUid: null };
      }

      const messages: BillingImapFetchedMessage[] = [];
      let highestUid: number | null = null;

      for await (const msg of client.fetch(
        candidateUids,
        {
          uid: true,
          source: true,
        },
        { uid: true },
      )) {
        if (!msg.uid || !msg.source) continue;
        highestUid = msg.uid;
        messages.push({
          uid: msg.uid,
          uidValidity,
          providerMessageId: `${uidValidity}:${msg.uid}`,
          rawSource: Buffer.isBuffer(msg.source) ? msg.source : Buffer.from(msg.source),
        });
      }

      messages.sort((a, b) => a.uid - b.uid);

      return { uidValidity, messages, highestUid };
    } finally {
      await client.logout().catch(() => undefined);
    }
  }
}

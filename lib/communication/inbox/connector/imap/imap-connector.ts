import { ImapFlow } from "imapflow";
import type {
  InboundCommunicationConnector,
  InboundFetchBatch,
  InboundImapConnectionConfig,
} from "@/lib/communication/inbox/connector/types";
import { pickInboundImapCandidateUids } from "@/lib/communication/inbox/connector/imap/imap-candidate-uids";
import { CommunicationCenterImapSecurity } from "@prisma/client";

function mapSecurity(security: CommunicationCenterImapSecurity): { secure: boolean; requireTLS: boolean } {
  switch (security) {
    case "TLS":
      return { secure: true, requireTLS: false };
    case "STARTTLS":
      return { secure: false, requireTLS: true };
    default:
      return { secure: false, requireTLS: false };
  }
}

function buildClient(config: InboundImapConnectionConfig): ImapFlow {
  const tls = mapSecurity(config.security);
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: tls.secure,
    auth: { user: config.username, pass: config.password },
    logger: false,
    tls: { minVersion: "TLSv1.2" },
    ...(tls.requireTLS ? { requireTLS: true } : {}),
  });
}

export class ImapInboundCommunicationConnector implements InboundCommunicationConnector {
  async testConnection(
    config: InboundImapConnectionConfig,
  ): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
    const client = buildClient(config);
    try {
      await client.connect();
      await client.mailboxOpen("INBOX");
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "IMAP connection failed";
      const lower = message.toLowerCase();
      const code = lower.includes("auth") ? "AUTH_FAILED" : "CONNECTION_FAILED";
      return { ok: false, code, message: message.slice(0, 200) };
    } finally {
      await client.logout().catch(() => undefined);
    }
  }

  async fetchNewInboxMessages(input: {
    config: InboundImapConnectionConfig;
    uidValidity: bigint | null;
    lastProcessedUid: bigint | null;
    batchSize: number;
  }): Promise<InboundFetchBatch> {
    const client = buildClient(input.config);
    await client.connect();
    try {
      const mailbox = await client.mailboxOpen("INBOX");
      const uidValidity = Number(mailbox.uidValidity);
      const lastUid = input.lastProcessedUid ? Number(input.lastProcessedUid) : 0;

      if (input.uidValidity !== null && input.uidValidity !== BigInt(uidValidity)) {
        return { uidValidity, messages: [], highestUid: null };
      }

      const rangeStart = lastUid + 1;
      const searchResult = await client.search({ uid: `${rangeStart}:*` }, { uid: true });
      if (searchResult === false) {
        throw new Error("IMAP UID SEARCH failed");
      }

      const candidateUids = pickInboundImapCandidateUids(
        searchResult ?? [],
        lastUid,
        input.batchSize,
      );

      if (candidateUids.length === 0) {
        return { uidValidity, messages: [], highestUid: null };
      }

      const messages: InboundFetchBatch["messages"] = [];
      let highestUid: number | null = null;

      for await (const msg of client.fetch(
        candidateUids,
        { uid: true, source: true },
        { uid: true },
      )) {
        if (!msg.uid || !msg.source) continue;
        highestUid = msg.uid;
        messages.push({
          uid: msg.uid,
          uidValidity,
          providerMessageKey: `${uidValidity}:${msg.uid}`,
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

let connectorFactory: (() => InboundCommunicationConnector) | null = null;

export function setInboundCommunicationConnectorFactory(
  factory: (() => InboundCommunicationConnector) | null,
): void {
  connectorFactory = factory;
}

export function createInboundCommunicationConnector(): InboundCommunicationConnector {
  if (connectorFactory) return connectorFactory();
  return new ImapInboundCommunicationConnector();
}

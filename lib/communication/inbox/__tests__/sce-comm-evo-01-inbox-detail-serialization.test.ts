/**
 * SCE-COMM-EVO-01 — documents release blocker: inbox conversation detail GET
 * must be JSON-serializable for imported EMAIL rows (BigInt IMAP fields).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("SCE-COMM-EVO-01 inbox detail JSON serialization", () => {
  it("fails when detail payload includes Prisma BigInt fields on EMAIL messages", () => {
    const prismaShapedDetail = {
      id: "conv-email-1",
      tenantId: "tenant-a",
      channel: "EMAIL",
      subject: "Sicherheitswarnung",
      messages: [
        {
          id: "msg-1",
          direction: "INBOUND",
          imapUid: 42n,
          uidValidity: 169n,
          bodyText: "Hello",
          bodyHtmlSanitized: "<p>Hello</p>",
        },
      ],
    };

    expect(() => JSON.stringify({ conversation: prismaShapedDetail })).toThrow(
      /serialize a BigInt/i,
    );
  });

  it("detail route must map Prisma rows to a JSON-safe client DTO before responding", () => {
    const routeSource = readFileSync(
      join(
        process.cwd(),
        "app/api/communication/inbox/conversations/[conversationId]/route.ts",
      ),
      "utf8",
    );
    expect(routeSource).toMatch(
      /mapCommunicationCenterConversationDetail|inboxConversationDetailToApiDto|serializeCommunicationCenterConversationDetail/,
    );
  });

  it("expects a public detail DTO without internal BigInt fields (future fix contract)", () => {
    const publicDetail = {
      id: "conv-email-1",
      subject: "Sicherheitswarnung",
      messages: [
        {
          id: "msg-1",
          direction: "INBOUND",
          bodyText: "Hello",
          bodyHtmlSanitized: "<p>Hello</p>",
          sentAt: null,
          receivedAt: "2026-09-28T12:00:00.000Z",
          deliveryError: null,
        },
      ],
    };

    expect(() => JSON.stringify({ conversation: publicDetail })).not.toThrow();
  });
});

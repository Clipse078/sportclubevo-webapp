import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  billingCommunication: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

const { listBillingCommunicationsForInvoiceTenant } = await import(
  "../billing-communication-repository"
);

describe("listBillingCommunicationsForInvoiceTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters by tenant and invoice without exposing bodies", async () => {
    prismaMock.billingCommunication.findMany.mockResolvedValue([
      {
        id: "c1",
        direction: "OUTBOUND",
        channel: "EMAIL",
        status: "SENT",
        subject: "Test",
        senderAddress: "from@test",
        toAddresses: ["to@test"],
        ccAddresses: [],
        bccAddresses: [],
        sentAt: new Date(),
        receivedAt: null,
        createdAt: new Date(),
        internetMessageId: null,
        providerMessageId: "p1",
        parentCommunicationId: null,
        invoiceDeliveryId: null,
        invoiceDelivery: null,
      },
    ]);

    const rows = await listBillingCommunicationsForInvoiceTenant({
      tenantId: "tenant-a",
      invoiceId: "inv-1",
    });

    expect(prismaMock.billingCommunication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-a", invoiceId: "inv-1" },
        select: expect.not.objectContaining({
          textBody: expect.anything(),
          htmlBody: expect.anything(),
        }),
      }),
    );
    expect(rows[0]?.fromAddress).toBe("from@test");
  });
});

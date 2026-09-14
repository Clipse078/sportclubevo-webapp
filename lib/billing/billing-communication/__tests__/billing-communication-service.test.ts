import { beforeEach, describe, expect, it, vi } from "vitest";
import { NativeBillingValidationError } from "@/lib/billing/native-billing-types";

const prismaMock = vi.hoisted(() => ({
  billingCommunication: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  billingCustomerTenant: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
}));

const repoMocks = vi.hoisted(() => ({
  findInvoiceById: vi.fn(),
  findBillingContractById: vi.fn(),
  findActiveBillingCustomerTenantLink: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/billing/native-billing-commercial-repository", () => ({
  findInvoiceById: repoMocks.findInvoiceById,
  findBillingContractById: repoMocks.findBillingContractById,
}));

vi.mock("@/lib/billing/native-billing-repository", () => ({
  findActiveBillingCustomerTenantLink: repoMocks.findActiveBillingCustomerTenantLink,
}));

const {
  recordOutboundInvoiceEmailCommunication,
  createOutboundBillingCommunicationForTenant,
} = await import("../billing-communication-service");

const {
  findBillingCommunicationByIdForTenant,
} = await import("../billing-communication-repository");

const baseCommunication = {
  id: "comm-1",
  key: "comm-key",
  tenantId: "tenant-a",
  direction: "OUTBOUND" as const,
  channel: "EMAIL" as const,
  status: "SENT" as const,
  invoiceId: "inv-1",
  billingContractId: "contract-1",
  invoiceDeliveryId: "del-1",
  senderAddress: "billing@sportclubevo.com",
  toAddresses: ["club@example.test"],
  ccAddresses: [],
  bccAddresses: [],
  subject: "Rechnung",
  textBody: "Plain text",
  htmlBody: null,
  sentAt: new Date("2026-09-14T12:00:00.000Z"),
  receivedAt: null,
  provider: "resend",
  providerMessageId: "msg-1",
  internetMessageId: null,
  inReplyTo: null,
  referencesHeader: null,
  parentCommunicationId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("billing communication service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.billingCommunication.findUnique.mockResolvedValue(null);
    prismaMock.billingCommunication.findFirst.mockResolvedValue(null);
    prismaMock.billingCustomerTenant.findMany.mockResolvedValue([{ tenantId: "tenant-a" }]);
    repoMocks.findActiveBillingCustomerTenantLink.mockResolvedValue({
      id: "link-1",
      billingCustomerId: "cust-1",
      tenantId: "tenant-a",
      linkRole: null,
      activeFrom: new Date(),
      activeUntil: null,
      createdAt: new Date(),
    });
    repoMocks.findBillingContractById.mockResolvedValue({
      id: "contract-1",
      billingCustomerId: "cust-1",
    });
    prismaMock.billingCommunication.create.mockResolvedValue(baseCommunication);
  });

  it("creates outbound EMAIL communication with correct relations", async () => {
    const result = await recordOutboundInvoiceEmailCommunication({
      invoice: {
        id: "inv-1",
        billingCustomerId: "cust-1",
        billingContractId: "contract-1",
      },
      delivery: {
        id: "del-1",
        recipientEmail: "club@example.test",
        sentAt: new Date("2026-09-14T12:00:00.000Z"),
      },
      email: {
        subject: "Rechnung 2026-000003",
        textBody: "Plain text",
        fromAddress: "billing@sportclubevo.com",
      },
      transport: {
        provider: "resend",
        providerMessageId: "msg-unique-1",
      },
    });

    expect(result.direction).toBe("OUTBOUND");
    expect(result.status).toBe("SENT");
    expect(result.tenantId).toBe("tenant-a");
    expect(prismaMock.billingCommunication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: "OUTBOUND",
          status: "SENT",
          invoiceId: "inv-1",
          billingContractId: "contract-1",
          invoiceDeliveryId: "del-1",
          internetMessageId: "msg-unique-1",
        }),
      }),
    );
  });

  it("is idempotent by invoice delivery id", async () => {
    prismaMock.billingCommunication.findUnique.mockImplementation(async (args) => {
      if (args?.where?.invoiceDeliveryId === "del-1") {
        return baseCommunication;
      }
      return null;
    });

    const result = await recordOutboundInvoiceEmailCommunication({
      invoice: {
        id: "inv-1",
        billingCustomerId: "cust-1",
        billingContractId: null,
      },
      delivery: {
        id: "del-1",
        recipientEmail: "club@example.test",
        sentAt: new Date(),
      },
      email: {
        subject: "Rechnung",
        textBody: "text",
        fromAddress: "from@test",
      },
      transport: { provider: "resend", providerMessageId: "msg-other" },
    });

    expect(result.id).toBe("comm-1");
    expect(prismaMock.billingCommunication.create).not.toHaveBeenCalled();
  });

  it("allows a distinct later message with a new delivery id", async () => {
    await recordOutboundInvoiceEmailCommunication({
      invoice: {
        id: "inv-1",
        billingCustomerId: "cust-1",
        billingContractId: null,
      },
      delivery: {
        id: "del-2",
        recipientEmail: "club@example.test",
        sentAt: new Date(),
      },
      email: {
        subject: "Rechnung",
        textBody: "text",
        fromAddress: "from@test",
      },
      transport: { provider: "resend", providerMessageId: "msg-2" },
    });

    expect(prismaMock.billingCommunication.create).toHaveBeenCalledTimes(1);
  });

  it("rejects cross-tenant contract linkage", async () => {
    repoMocks.findBillingContractById.mockResolvedValue({
      id: "contract-b",
      billingCustomerId: "other-customer",
    });

    await expect(
      recordOutboundInvoiceEmailCommunication({
        invoice: {
          id: "inv-1",
          billingCustomerId: "cust-1",
          billingContractId: "contract-b",
        },
        delivery: {
          id: "del-3",
          recipientEmail: "club@example.test",
          sentAt: new Date(),
        },
        email: { subject: "s", textBody: "t", fromAddress: "f" },
        transport: { provider: "resend", providerMessageId: "msg-3" },
      }),
    ).rejects.toBeInstanceOf(NativeBillingValidationError);
  });

  it("blocks write when tenant does not match billing customer", async () => {
    repoMocks.findInvoiceById.mockResolvedValue({
      id: "inv-1",
      billingCustomerId: "cust-1",
      billingContractId: null,
    });
    repoMocks.findActiveBillingCustomerTenantLink.mockResolvedValue(null);

    await expect(
      createOutboundBillingCommunicationForTenant({
        tenantId: "tenant-b",
        invoiceId: "inv-1",
        billingCustomerId: "cust-1",
        senderAddress: "from@test",
        toAddresses: ["to@test"],
        subject: "s",
        textBody: "t",
        invoiceDeliveryId: "del-9",
        sentAt: new Date(),
        provider: "resend",
        providerMessageId: "msg-9",
      }),
    ).rejects.toBeInstanceOf(NativeBillingValidationError);
  });

  it("cannot read communication through another tenant", async () => {
    prismaMock.billingCommunication.findFirst.mockResolvedValue(null);

    const row = await findBillingCommunicationByIdForTenant({
      id: "comm-1",
      tenantId: "tenant-b",
    });
    expect(row).toBeNull();
    expect(prismaMock.billingCommunication.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "comm-1", tenantId: "tenant-b" },
      }),
    );
  });
});

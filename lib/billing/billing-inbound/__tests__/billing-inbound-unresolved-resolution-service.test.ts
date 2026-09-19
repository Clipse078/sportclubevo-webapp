import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  download: vi.fn(),
  upload: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    billingInboundUnresolvedMessage: {
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/billing/native-billing-commercial-repository", () => ({
  findInvoiceByKey: vi.fn(),
}));

vi.mock("@/lib/billing/billing-communication/billing-communication-tenant", () => ({
  resolveTenantIdForBillingCustomer: vi.fn(),
  assertTenantMatchesBillingCustomer: vi.fn(),
}));

vi.mock("../billing-inbound-tenant-resolver", () => ({
  assertInvoiceBelongsToTenant: vi.fn(),
}));

vi.mock("../billing-inbound-mailbox-repository", () => ({
  findBillingInboundUnresolvedMessageById: vi.fn(),
}));

vi.mock("@/lib/billing/billing-communication/billing-communication-repository", () => ({
  createInboundBillingCommunication: vi.fn(),
  findInboundBillingCommunicationByProviderMessageId: vi.fn(),
}));

vi.mock("@/lib/billing/billing-communication/billing-communication-attachment-repository", () => ({
  createBillingCommunicationAttachment: vi.fn(),
}));

vi.mock("@/lib/billing/billing-communication/billing-communication-attachment-storage", () => ({
  billingCommunicationAttachmentStorage: storageMock,
  getBillingCommunicationAttachmentStorageKey: vi.fn(() => "tenant/new-key"),
}));

const { prisma } = await import("@/lib/db/prisma");
const commercialRepo = await import("@/lib/billing/native-billing-commercial-repository");
const tenant = await import("@/lib/billing/billing-communication/billing-communication-tenant");
const resolver = await import("../billing-inbound-tenant-resolver");
const mailboxRepo = await import("../billing-inbound-mailbox-repository");
const commRepo = await import("@/lib/billing/billing-communication/billing-communication-repository");
const { resolveBillingInboundUnresolvedMessage } = await import(
  "../billing-inbound-unresolved-resolution-service"
);
const { NativeBillingValidationError } = await import("@/lib/billing/native-billing-types");

describe("billing inbound unresolved resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(commercialRepo.findInvoiceByKey).mockResolvedValue({
      id: "inv-id",
      billingCustomerId: "cust",
      billingContractId: null,
      status: "OPEN",
    } as never);
    vi.mocked(tenant.resolveTenantIdForBillingCustomer).mockResolvedValue("tenant-1");
    vi.mocked(tenant.assertTenantMatchesBillingCustomer).mockResolvedValue(undefined);
    vi.mocked(resolver.assertInvoiceBelongsToTenant).mockResolvedValue(true);
    vi.mocked(commRepo.findInboundBillingCommunicationByProviderMessageId).mockResolvedValue(null);
    vi.mocked(commRepo.createInboundBillingCommunication).mockResolvedValue({
      id: "comm-1",
    } as never);
    vi.mocked(mailboxRepo.findBillingInboundUnresolvedMessageById).mockResolvedValue({
      id: "unresolved-1",
      provider: "infomaniak-imap",
      providerMessageId: "uid-1",
      senderAddress: "a@example.com",
      toAddresses: ["billing@sportclubevo.com"],
      subject: "Test",
      receivedAt: new Date(),
      createdAt: new Date(),
      internetMessageId: null,
      inReplyTo: null,
      referencesHeader: null,
      attachments: [],
    } as never);
  });

  it("rejects cross-tenant invoice assignment", async () => {
    vi.mocked(resolver.assertInvoiceBelongsToTenant).mockResolvedValue(false);

    await expect(
      resolveBillingInboundUnresolvedMessage({
        unresolvedMessageId: "unresolved-1",
        invoiceKey: "wrong-invoice",
      }),
    ).rejects.toBeInstanceOf(NativeBillingValidationError);
  });

  it("resolves unresolved message into inbound communication", async () => {
    const result = await resolveBillingInboundUnresolvedMessage({
      unresolvedMessageId: "unresolved-1",
      invoiceKey: "inv-key",
      storage: storageMock as never,
    });

    expect(result.kind).toBe("RESOLVED");
    expect(prisma.billingInboundUnresolvedMessage.delete).toHaveBeenCalled();
  });
});

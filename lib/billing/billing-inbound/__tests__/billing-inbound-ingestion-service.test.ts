import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  findInboundBillingCommunicationByProviderMessageId: vi.fn(),
  findBillingCommunicationByInternetMessageId: vi.fn(),
  findBillingCommunicationByProviderMessageId: vi.fn(),
  createInboundBillingCommunication: vi.fn(),
  findBillingInboundUnresolvedByProviderMessageId: vi.fn(),
  createBillingInboundUnresolvedMessage: vi.fn(),
}));

const resolverMocks = vi.hoisted(() => ({
  resolveBillingInboundTenant: vi.fn(),
  assertInvoiceBelongsToTenant: vi.fn(),
}));

vi.mock("@/lib/billing/billing-communication/billing-communication-repository", () => ({
  findInboundBillingCommunicationByProviderMessageId:
    repoMocks.findInboundBillingCommunicationByProviderMessageId,
  findBillingCommunicationByInternetMessageId:
    repoMocks.findBillingCommunicationByInternetMessageId,
  findBillingCommunicationByProviderMessageId:
    repoMocks.findBillingCommunicationByProviderMessageId,
  createInboundBillingCommunication: repoMocks.createInboundBillingCommunication,
}));

vi.mock("../billing-inbound-mailbox-repository", () => ({
  findBillingInboundUnresolvedByProviderMessageId:
    repoMocks.findBillingInboundUnresolvedByProviderMessageId,
  createBillingInboundUnresolvedMessage: repoMocks.createBillingInboundUnresolvedMessage,
}));

vi.mock("../billing-inbound-tenant-resolver", () => ({
  resolveBillingInboundTenant: resolverMocks.resolveBillingInboundTenant,
  assertInvoiceBelongsToTenant: resolverMocks.assertInvoiceBelongsToTenant,
}));

const { ingestBillingInboundImapMessage } = await import("../billing-inbound-ingestion-service");

const mime = [
  "From: Customer <customer@club.test>",
  "To: billing@sportclubevo.com",
  "Subject: Re: Invoice",
  "Message-ID: <inbound-dup@test>",
  "Date: Sun, 14 Sep 2026 12:00:00 +0000",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Body",
].join("\r\n");

describe("billing inbound ingestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMocks.findInboundBillingCommunicationByProviderMessageId.mockResolvedValue(null);
    repoMocks.findBillingInboundUnresolvedByProviderMessageId.mockResolvedValue(null);
    repoMocks.findBillingCommunicationByInternetMessageId.mockResolvedValue(null);
    repoMocks.findBillingCommunicationByProviderMessageId.mockResolvedValue(null);
    resolverMocks.resolveBillingInboundTenant.mockResolvedValue({
      kind: "THREAD",
      tenantId: "tenant-a",
      invoiceId: "inv-1",
      billingContractId: "contract-1",
      parentCommunicationId: "out-1",
    });
    resolverMocks.assertInvoiceBelongsToTenant.mockResolvedValue(true);
    repoMocks.createInboundBillingCommunication.mockResolvedValue({
      id: "in-1",
      tenantId: "tenant-a",
      direction: "INBOUND",
      status: "RECEIVED",
    });
  });

  it("creates INBOUND RECEIVED communication for valid mail", async () => {
    const result = await ingestBillingInboundImapMessage({
      uid: 10,
      uidValidity: 1,
      providerMessageId: "1:10",
      rawSource: Buffer.from(mime),
    });
    expect(result.kind).toBe("INGESTED");
    expect(repoMocks.createInboundBillingCommunication).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-a",
        invoiceId: "inv-1",
        billingContractId: "contract-1",
        parentCommunicationId: "out-1",
      }),
    );
  });

  it("dedupes repeated provider UID imports", async () => {
    repoMocks.findInboundBillingCommunicationByProviderMessageId.mockResolvedValue({
      id: "existing",
      tenantId: "tenant-a",
    });
    const result = await ingestBillingInboundImapMessage({
      uid: 10,
      uidValidity: 1,
      providerMessageId: "1:10",
      rawSource: Buffer.from(mime),
    });
    expect(result.kind).toBe("DUPLICATE");
    expect(repoMocks.createInboundBillingCommunication).not.toHaveBeenCalled();
  });

  it("stores unresolved queue entry when tenant cannot be resolved", async () => {
    resolverMocks.resolveBillingInboundTenant.mockResolvedValue({
      kind: "UNRESOLVED",
      reason: "UNKNOWN_TENANT",
    });
    repoMocks.createBillingInboundUnresolvedMessage.mockResolvedValue({ id: "un-1" });
    const result = await ingestBillingInboundImapMessage({
      uid: 11,
      uidValidity: 1,
      providerMessageId: "1:11",
      rawSource: Buffer.from(mime),
    });
    expect(result.kind).toBe("UNRESOLVED");
    expect(repoMocks.createInboundBillingCommunication).not.toHaveBeenCalled();
  });

  it("blocks cross-tenant invoice linkage", async () => {
    resolverMocks.resolveBillingInboundTenant.mockResolvedValue({
      kind: "INVOICE",
      tenantId: "tenant-a",
      invoiceId: "inv-x",
      billingContractId: null,
      parentCommunicationId: null,
    });
    resolverMocks.assertInvoiceBelongsToTenant.mockResolvedValue(false);
    repoMocks.createBillingInboundUnresolvedMessage.mockResolvedValue({ id: "un-2" });
    const result = await ingestBillingInboundImapMessage({
      uid: 12,
      uidValidity: 1,
      providerMessageId: "1:12",
      rawSource: Buffer.from(mime),
    });
    expect(result.kind).toBe("UNRESOLVED");
  });
});

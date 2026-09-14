import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  billingCommunication: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  invoice: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
}));

const tenantMocks = vi.hoisted(() => ({
  resolveTenantIdForBillingCustomer: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/billing/billing-communication/billing-communication-tenant", () => ({
  resolveTenantIdForBillingCustomer: tenantMocks.resolveTenantIdForBillingCustomer,
}));

const { resolveBillingInboundTenant } = await import("../billing-inbound-tenant-resolver");

const outboundParent = {
  id: "out-1",
  key: "k1",
  tenantId: "tenant-a",
  direction: "OUTBOUND" as const,
  channel: "EMAIL" as const,
  status: "SENT" as const,
  invoiceId: "inv-1",
  billingContractId: "contract-1",
  invoiceDeliveryId: "del-1",
  senderAddress: "billing@sportclubevo.com",
  toAddresses: ["club@test"],
  ccAddresses: [],
  bccAddresses: [],
  subject: "Invoice",
  textBody: "body",
  htmlBody: null,
  sentAt: new Date(),
  receivedAt: null,
  provider: "infomaniak-smtp",
  providerMessageId: "<outbound-1@sportclubevo.com>",
  internetMessageId: "outbound-1@sportclubevo.com",
  inReplyTo: null,
  referencesHeader: null,
  parentCommunicationId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("billing inbound tenant resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.billingCommunication.findFirst.mockResolvedValue(null);
    tenantMocks.resolveTenantIdForBillingCustomer.mockResolvedValue("tenant-a");
  });

  it("inherits tenant, invoice, and contract from In-Reply-To thread match", async () => {
    prismaMock.billingCommunication.findFirst.mockResolvedValue(outboundParent);
    const result = await resolveBillingInboundTenant({
      inReplyTo: "<outbound-1@sportclubevo.com>",
      referencesHeader: null,
      subject: "Re:",
      textBody: null,
    });
    expect(result).toEqual({
      kind: "THREAD",
      tenantId: "tenant-a",
      invoiceId: "inv-1",
      billingContractId: "contract-1",
      parentCommunicationId: "out-1",
    });
  });

  it("matches References header against outbound Message-ID", async () => {
    prismaMock.billingCommunication.findFirst.mockResolvedValue(outboundParent);
    const result = await resolveBillingInboundTenant({
      inReplyTo: null,
      referencesHeader: "<other@test> <outbound-1@sportclubevo.com>",
      subject: "Re:",
      textBody: null,
    });
    expect(result.kind).toBe("THREAD");
  });

  it("resolves uniquely when exact invoice number appears in subject", async () => {
    prismaMock.invoice.findMany.mockResolvedValue([
      {
        id: "inv-9",
        billingCustomerId: "cust-1",
        billingContractId: "contract-9",
      },
    ]);
    const result = await resolveBillingInboundTenant({
      inReplyTo: null,
      referencesHeader: null,
      subject: "Question about invoice 2026-000042",
      textBody: null,
    });
    expect(result).toEqual({
      kind: "INVOICE",
      tenantId: "tenant-a",
      invoiceId: "inv-9",
      billingContractId: "contract-9",
      parentCommunicationId: null,
    });
  });

  it("does not guess tenant when no deterministic signal exists", async () => {
    const result = await resolveBillingInboundTenant({
      inReplyTo: null,
      referencesHeader: null,
      subject: "Hello",
      textBody: "General inquiry",
    });
    expect(result).toEqual({ kind: "UNRESOLVED", reason: "UNKNOWN_TENANT" });
  });

  it("treats ambiguous invoice references as unresolved", async () => {
    prismaMock.invoice.findMany.mockResolvedValue([
      { id: "inv-1", billingCustomerId: "cust-1", billingContractId: null },
      { id: "inv-2", billingCustomerId: "cust-2", billingContractId: null },
    ]);
    const result = await resolveBillingInboundTenant({
      inReplyTo: null,
      referencesHeader: null,
      subject: "Invoice 2026-000001",
      textBody: null,
    });
    expect(result).toEqual({ kind: "UNRESOLVED", reason: "AMBIGUOUS_INVOICE_REFERENCE" });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NativeBillingNotFoundError } from "@/lib/billing/native-billing-types";

const repoMocks = vi.hoisted(() => ({
  findInvoiceByKey: vi.fn(),
  listBillingCommunicationsForInvoiceTenant: vi.fn(),
}));

const tenantMocks = vi.hoisted(() => ({
  resolveTenantIdForBillingCustomer: vi.fn(),
  assertTenantMatchesBillingCustomer: vi.fn(),
}));

vi.mock("@/lib/billing/native-billing-commercial-repository", () => ({
  findInvoiceByKey: repoMocks.findInvoiceByKey,
  findInvoiceById: vi.fn(),
  findBillingContractById: vi.fn(),
}));

vi.mock("../billing-communication-repository", async (importOriginal) => {
  const original = await importOriginal<typeof import("../billing-communication-repository")>();
  return {
    ...original,
    listBillingCommunicationsForInvoiceTenant: repoMocks.listBillingCommunicationsForInvoiceTenant,
    createOutboundBillingCommunication: vi.fn(),
    findBillingCommunicationByInvoiceDeliveryId: vi.fn(),
    findBillingCommunicationByProviderMessageId: vi.fn(),
  };
});

vi.mock("../billing-communication-tenant", () => ({
  resolveTenantIdForBillingCustomer: tenantMocks.resolveTenantIdForBillingCustomer,
  assertTenantMatchesBillingCustomer: tenantMocks.assertTenantMatchesBillingCustomer,
}));

const { getInvoiceBillingCommunicationTimeline } = await import("../billing-communication-service");

const baseRow = {
  id: "comm-1",
  direction: "OUTBOUND" as const,
  channel: "EMAIL" as const,
  status: "SENT" as const,
  subject: "Rechnung 2026-000002",
  fromAddress: "billing@sportclubevo.com",
  toAddresses: ["finanzen@club.test"],
  ccAddresses: [] as string[],
  bccAddresses: ["hello@tulip-digital.ch"],
  sentAt: new Date("2026-09-14T19:41:00.000Z"),
  receivedAt: null,
  createdAt: new Date("2026-09-14T19:41:00.000Z"),
  internetMessageId: "msg-out",
  providerMessageId: "prov-out",
  parentCommunicationId: null,
  invoiceDeliveryId: "del-1",
  invoiceDeliveryStatus: "SENT",
};

describe("getInvoiceBillingCommunicationTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMocks.findInvoiceByKey.mockResolvedValue({
      id: "inv-1",
      key: "inv-key",
      billingCustomerId: "cust-1",
    });
    tenantMocks.resolveTenantIdForBillingCustomer.mockResolvedValue("tenant-a");
    tenantMocks.assertTenantMatchesBillingCustomer.mockResolvedValue(undefined);
  });

  it("throws when invoice is missing", async () => {
    repoMocks.findInvoiceByKey.mockResolvedValue(null);
    await expect(getInvoiceBillingCommunicationTimeline("missing")).rejects.toBeInstanceOf(
      NativeBillingNotFoundError,
    );
  });

  it("scopes query by tenant and invoice", async () => {
    repoMocks.listBillingCommunicationsForInvoiceTenant.mockResolvedValue([]);
    await getInvoiceBillingCommunicationTimeline("inv-key");
    expect(repoMocks.listBillingCommunicationsForInvoiceTenant).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      invoiceId: "inv-1",
    });
  });

  it("returns communications in ascending chronological order", async () => {
    repoMocks.listBillingCommunicationsForInvoiceTenant.mockResolvedValue([
      {
        ...baseRow,
        id: "comm-late",
        sentAt: new Date("2026-09-16T08:00:00.000Z"),
        direction: "INBOUND",
        status: "RECEIVED",
        receivedAt: new Date("2026-09-16T08:00:00.000Z"),
        fromAddress: "finanzen@club.test",
        toAddresses: ["billing@sportclubevo.com"],
        parentCommunicationId: "comm-1",
      },
      { ...baseRow },
    ]);

    const timeline = await getInvoiceBillingCommunicationTimeline("inv-key");
    expect(timeline.map((item) => item.id)).toEqual(["comm-1", "comm-late"]);
  });

  it("maps outbound and inbound presentation labels", async () => {
    repoMocks.listBillingCommunicationsForInvoiceTenant.mockResolvedValue([
      { ...baseRow },
      {
        ...baseRow,
        id: "comm-in",
        direction: "INBOUND",
        status: "RECEIVED",
        receivedAt: new Date("2026-09-15T06:44:00.000Z"),
        sentAt: null,
        fromAddress: "finanzen@club.test",
        toAddresses: ["billing@sportclubevo.com"],
      },
    ]);

    const timeline = await getInvoiceBillingCommunicationTimeline("inv-key");
    expect(timeline[0]?.isOutbound).toBe(true);
    expect(timeline[0]?.statusLabel).toBe("Gesendet");
    expect(timeline[1]?.isOutbound).toBe(false);
    expect(timeline[1]?.statusLabel).toBe("Empfangen");
  });

  it("does not include unresolved mailbox rows (repository invoice filter only)", async () => {
    repoMocks.listBillingCommunicationsForInvoiceTenant.mockResolvedValue([]);
    const timeline = await getInvoiceBillingCommunicationTimeline("inv-key");
    expect(timeline).toEqual([]);
    expect(repoMocks.listBillingCommunicationsForInvoiceTenant).toHaveBeenCalledTimes(1);
  });
});

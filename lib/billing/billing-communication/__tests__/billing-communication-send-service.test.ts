import { beforeEach, describe, expect, it, vi } from "vitest";
import { NativeBillingValidationError } from "@/lib/billing/native-billing-types";
import { PLATFORM_INVOICE_EMAIL_BCC } from "@/lib/billing/invoice-delivery/billing-invoice-email-policy";

const mocks = vi.hoisted(() => ({
  findInvoiceByKey: vi.fn(),
  findInvoiceRecipientSnapshot: vi.fn(),
  findBillingContractById: vi.fn(),
  resolveBillingEmailIdentity: vi.fn(),
  sendBillingEmail: vi.fn(),
  createOutboundBillingCommunication: vi.fn(),
  findBillingCommunicationByIdForInvoiceTenant: vi.fn(),
  resolveTenantIdForBillingCustomer: vi.fn(),
  assertTenantMatchesBillingCustomer: vi.fn(),
}));

vi.mock("@/lib/billing/native-billing-commercial-repository", () => ({
  findInvoiceByKey: mocks.findInvoiceByKey,
  findInvoiceRecipientSnapshot: mocks.findInvoiceRecipientSnapshot,
  findBillingContractById: mocks.findBillingContractById,
}));

vi.mock("@/lib/billing/invoice-delivery/resolve-billing-email-identity", () => ({
  resolveBillingEmailIdentity: mocks.resolveBillingEmailIdentity,
}));

vi.mock("@/lib/billing/invoice-delivery/billing-email-transport", () => ({
  sendBillingEmail: mocks.sendBillingEmail,
  BillingEmailDryRunFailureError: class BillingEmailDryRunFailureError extends Error {
    name = "BillingEmailDryRunFailureError";
  },
}));

vi.mock("../billing-communication-repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../billing-communication-repository")>();
  return {
    ...actual,
    createOutboundBillingCommunication: mocks.createOutboundBillingCommunication,
    findBillingCommunicationByIdForInvoiceTenant:
      mocks.findBillingCommunicationByIdForInvoiceTenant,
  };
});

vi.mock("../billing-communication-tenant", () => ({
  resolveTenantIdForBillingCustomer: mocks.resolveTenantIdForBillingCustomer,
  assertTenantMatchesBillingCustomer: mocks.assertTenantMatchesBillingCustomer,
}));

const {
  sendInvoiceBillingCommunication,
  buildDefaultComposeSubject,
  resolveInvoiceBillingRecipientEmail,
} = await import("../billing-communication-send-service");

const invoice = {
  id: "inv-1",
  key: "inv-key",
  billingCustomerId: "cust-1",
  billingContractId: "contract-1",
  invoiceNumber: "2026-000010",
  status: "FINALIZED",
};

describe("billing-communication-send-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findInvoiceByKey.mockResolvedValue(invoice);
    mocks.resolveTenantIdForBillingCustomer.mockResolvedValue("tenant-a");
    mocks.assertTenantMatchesBillingCustomer.mockResolvedValue(undefined);
    mocks.findBillingContractById.mockResolvedValue({
      id: "contract-1",
      billingCustomerId: "cust-1",
    });
    mocks.resolveBillingEmailIdentity.mockResolvedValue({
      from: "SportClubEvo Billing <billing@sportclubevo.com>",
      replyTo: "billing@sportclubevo.com",
    });
    mocks.findInvoiceRecipientSnapshot.mockResolvedValue({
      invoiceEmail: "finanzen@example.test",
    });
    mocks.sendBillingEmail.mockResolvedValue({
      provider: "dry-run",
      messageId: "dry-run-test",
      from: "SportClubEvo Billing <billing@sportclubevo.com>",
    });
    mocks.createOutboundBillingCommunication.mockImplementation(async (input) => ({
      id: "comm-new",
      key: "key-new",
      tenantId: input.tenantId,
      direction: "OUTBOUND",
      channel: "EMAIL",
      status: input.status ?? "SENT",
      invoiceId: input.invoiceId,
      billingContractId: input.billingContractId,
      invoiceDeliveryId: null,
      senderAddress: input.senderAddress,
      toAddresses: input.toAddresses,
      ccAddresses: input.ccAddresses,
      bccAddresses: input.bccAddresses,
      subject: input.subject,
      textBody: input.textBody,
      htmlBody: input.htmlBody,
      sentAt: input.sentAt,
      receivedAt: null,
      provider: input.provider,
      providerMessageId: input.providerMessageId,
      internetMessageId: input.internetMessageId ?? null,
      inReplyTo: input.inReplyTo ?? null,
      referencesHeader: input.referencesHeader ?? null,
      parentCommunicationId: input.parentCommunicationId ?? null,
      createdAt: new Date("2026-09-19T12:00:00.000Z"),
      updatedAt: new Date("2026-09-19T12:00:00.000Z"),
    }));
  });

  it("uses default compose recipient and subject", async () => {
    expect(buildDefaultComposeSubject("2026-000010")).toBe(
      "Rechnung 2026-000010 – SportClubEvo",
    );
    expect(await resolveInvoiceBillingRecipientEmail("inv-1")).toBe("finanzen@example.test");

    await sendInvoiceBillingCommunication("inv-key", {
      mode: "compose",
      subject: "Rechnung 2026-000010 – SportClubEvo",
      message: "Hallo",
    });

    expect(mocks.sendBillingEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "finanzen@example.test",
        bcc: PLATFORM_INVOICE_EMAIL_BCC,
      }),
    );
    expect(mocks.createOutboundBillingCommunication).toHaveBeenCalledWith(
      expect.objectContaining({
        bccAddresses: [PLATFORM_INVOICE_EMAIL_BCC],
        status: "SENT",
      }),
    );
  });

  it("handles CC recipients and ignores client-controlled from/bcc", async () => {
    await sendInvoiceBillingCommunication("inv-key", {
      mode: "compose",
      to: ["finanzen@example.test"],
      cc: ["cc@example.test"],
      subject: "Betreff",
      message: "Text",
      fromAddress: "attacker@evil.test",
      bcc: ["hidden@evil.test"],
      tenantId: "other-tenant",
    });

    expect(mocks.sendBillingEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        cc: "cc@example.test",
        bcc: PLATFORM_INVOICE_EMAIL_BCC,
      }),
    );
    expect(mocks.createOutboundBillingCommunication).toHaveBeenCalledWith(
      expect.objectContaining({
        bccAddresses: [PLATFORM_INVOICE_EMAIL_BCC],
        toAddresses: ["finanzen@example.test"],
        ccAddresses: ["cc@example.test"],
      }),
    );
  });

  it("persists parentCommunicationId and reply subject for replies", async () => {
    mocks.findBillingCommunicationByIdForInvoiceTenant.mockResolvedValue({
      id: "parent-1",
      direction: "INBOUND",
      senderAddress: "kunde@example.test",
      toAddresses: ["billing@sportclubevo.com"],
      ccAddresses: [],
      subject: "Frage zur Rechnung",
      internetMessageId: "<parent@test>",
      referencesHeader: null,
    });

    await sendInvoiceBillingCommunication("inv-key", {
      mode: "reply",
      parentCommunicationId: "parent-1",
      subject: "Frage zur Rechnung",
      message: "Antworttext",
    });

    expect(mocks.createOutboundBillingCommunication).toHaveBeenCalledWith(
      expect.objectContaining({
        parentCommunicationId: "parent-1",
        subject: "Re: Frage zur Rechnung",
        inReplyTo: "<parent@test>",
      }),
    );
  });

  it("rejects cross-invoice parent communication", async () => {
    mocks.findBillingCommunicationByIdForInvoiceTenant.mockResolvedValue(null);
    await expect(
      sendInvoiceBillingCommunication("inv-key", {
        mode: "reply",
        parentCommunicationId: "foreign-parent",
        subject: "Re: Test",
        message: "Hi",
      }),
    ).rejects.toThrow(NativeBillingValidationError);
  });

  it("records failed delivery without false success", async () => {
    mocks.sendBillingEmail.mockRejectedValue(new Error("smtp failed"));
    await expect(
      sendInvoiceBillingCommunication("inv-key", {
        mode: "compose",
        to: ["finanzen@example.test"],
        subject: "Betreff",
        message: "Text",
      }),
    ).rejects.toThrow(NativeBillingValidationError);

    expect(mocks.createOutboundBillingCommunication).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "FAILED",
        providerMessageId: null,
      }),
    );
  });

  it("rejects header injection in subject", async () => {
    await expect(
      sendInvoiceBillingCommunication("inv-key", {
        mode: "compose",
        to: ["finanzen@example.test"],
        subject: "Evil\nBcc: x@test.com",
        message: "Text",
      }),
    ).rejects.toThrow(NativeBillingValidationError);
    expect(mocks.sendBillingEmail).not.toHaveBeenCalled();
  });
});

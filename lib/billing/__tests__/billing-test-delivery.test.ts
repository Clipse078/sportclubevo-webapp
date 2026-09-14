import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NativeBillingValidationError } from "../native-billing-types";

const mocks = vi.hoisted(() => ({
  findInvoiceByKey: vi.fn(),
  findInvoiceRecipientSnapshot: vi.fn(),
  findBillingCustomerById: vi.fn(),
  getInvoicePaymentInstruction: vi.fn(),
  generateNativeInvoicePdfBytes: vi.fn(),
  sendBillingEmail: vi.fn(),
  resolveBillingEmailIdentity: vi.fn(),
  createInvoiceDeliverySendingAttempt: vi.fn(),
}));

vi.mock("../native-billing-commercial-repository", () => ({
  findInvoiceByKey: mocks.findInvoiceByKey,
  findInvoiceRecipientSnapshot: mocks.findInvoiceRecipientSnapshot,
}));

vi.mock("../native-billing-repository", () => ({
  findBillingCustomerById: mocks.findBillingCustomerById,
}));

vi.mock("../invoice-payment-instruction-service", () => ({
  getInvoicePaymentInstruction: mocks.getInvoicePaymentInstruction,
}));

vi.mock("../invoice-pdf-service", () => ({
  generateNativeInvoicePdfBytes: mocks.generateNativeInvoicePdfBytes,
}));

vi.mock("../invoice-delivery/billing-email-transport", () => ({
  sendBillingEmail: mocks.sendBillingEmail,
}));

vi.mock("../invoice-delivery/resolve-billing-email-identity", () => ({
  resolveBillingEmailIdentity: mocks.resolveBillingEmailIdentity,
}));

vi.mock("../invoice-delivery/invoice-delivery-repository", () => ({
  createInvoiceDeliverySendingAttempt: mocks.createInvoiceDeliverySendingAttempt,
}));

const finalizedInvoice = {
  id: "inv-fca",
  key: "inv-key-fca",
  invoiceNumber: "2026-000002",
  legalEntityId: "le-1",
  billingCustomerId: "bc-fca",
  billingContractId: null,
  status: "FINALIZED",
  currency: "CHF",
  periodStart: new Date("2026-09-01"),
  periodEnd: new Date("2026-09-30"),
  invoiceDate: new Date("2026-09-01"),
  dueDate: new Date("2026-10-01"),
  grossTotalMinor: 10000,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function enableStageTestDelivery() {
  vi.stubEnv("APP_ENV", "stage");
  vi.stubEnv("BILLING_ALLOW_TEST_DELIVERY", "1");
  vi.stubEnv("BILLING_TEST_RECIPIENT", "billing-test@sportclubevo.test");
}

describe("billing invoice test delivery", () => {
  beforeEach(() => {
    mocks.findInvoiceByKey.mockResolvedValue(finalizedInvoice);
    mocks.findBillingCustomerById.mockResolvedValue({ defaultLanguage: "de" });
    mocks.getInvoicePaymentInstruction.mockResolvedValue({ id: "pi-1" });
    mocks.generateNativeInvoicePdfBytes.mockResolvedValue(Buffer.from("%PDF-test"));
    mocks.resolveBillingEmailIdentity.mockResolvedValue({
      from: "SportClubEvo Billing <billing@sportclubevo.com>",
      replyTo: "billing@sportclubevo.com",
    });
    mocks.sendBillingEmail.mockResolvedValue({
      provider: "infomaniak-smtp",
      messageId: "test-msg-1",
      from: "SportClubEvo Billing <billing@sportclubevo.com>",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("blocks test delivery outside STAGE", async () => {
    vi.stubEnv("APP_ENV", "prod");
    vi.stubEnv("BILLING_ALLOW_TEST_DELIVERY", "1");
    vi.stubEnv("BILLING_TEST_RECIPIENT", "billing-test@sportclubevo.test");

    const { isBillingTestDeliveryEnabled } = await import(
      "../invoice-delivery/billing-test-delivery-guards"
    );
    expect(isBillingTestDeliveryEnabled()).toBe(false);
  });

  it("blocks test delivery when flag is not set", async () => {
    enableStageTestDelivery();
    vi.stubEnv("BILLING_ALLOW_TEST_DELIVERY", "0");

    const { isBillingTestDeliveryEnabled } = await import(
      "../invoice-delivery/billing-test-delivery-guards"
    );
    expect(isBillingTestDeliveryEnabled()).toBe(false);
  });

  it("uses only BILLING_TEST_RECIPIENT and never snapshot email", async () => {
    enableStageTestDelivery();
    mocks.findInvoiceRecipientSnapshot.mockResolvedValue({
      invoiceEmail: "fca-real-customer@example.com",
    });

    const { executeBillingInvoiceTestDelivery } = await import(
      "../invoice-delivery/billing-test-delivery-service"
    );

    const result = await executeBillingInvoiceTestDelivery({
      invoiceKey: finalizedInvoice.key,
      actorUserId: "superadmin-1",
    });

    expect(result.recipientEmail).toBe("billing-test@sportclubevo.test");
    expect(result.recipientEmail).not.toBe("fca-real-customer@example.com");
    expect(mocks.findInvoiceRecipientSnapshot).not.toHaveBeenCalled();
    expect(mocks.sendBillingEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "billing-test@sportclubevo.test",
      }),
    );
  });

  it("does not create InvoiceDelivery or call sendNativeInvoiceEmail", async () => {
    enableStageTestDelivery();

    const { executeBillingInvoiceTestDelivery } = await import(
      "../invoice-delivery/billing-test-delivery-service"
    );

    await executeBillingInvoiceTestDelivery({
      invoiceKey: finalizedInvoice.key,
      actorUserId: "superadmin-1",
    });

    expect(mocks.createInvoiceDeliverySendingAttempt).not.toHaveBeenCalled();
  });

  it("generates PDF attachment and returns provider metadata", async () => {
    enableStageTestDelivery();

    const { executeBillingInvoiceTestDelivery } = await import(
      "../invoice-delivery/billing-test-delivery-service"
    );

    const result = await executeBillingInvoiceTestDelivery({
      invoiceKey: finalizedInvoice.key,
      actorUserId: "superadmin-1",
    });

    expect(mocks.generateNativeInvoicePdfBytes).toHaveBeenCalledWith(finalizedInvoice.key);
    expect(result.provider).toBe("infomaniak-smtp");
    expect(result.messageId).toBe("test-msg-1");
    expect(result.attachmentFilename).toContain("2026-000002");
    expect(result.kind).toBe("BILLING_INVOICE_TEST_DELIVERY");

    const sendPayload = mocks.sendBillingEmail.mock.calls[0]?.[0];
    expect(sendPayload?.attachments).toHaveLength(3);
    expect(sendPayload?.subject).toMatch(/^\[TEST DELIVERY\]/);
    expect(
      sendPayload?.attachments?.filter((item: { contentType: string }) => item.contentType === "image/png"),
    ).toHaveLength(2);
    expect(
      sendPayload?.attachments?.some(
        (item: { contentType: string }) => item.contentType === "application/pdf",
      ),
    ).toBe(true);
  });

  it("rejects when test delivery is disabled", async () => {
    vi.stubEnv("APP_ENV", "stage");
    vi.stubEnv("BILLING_ALLOW_TEST_DELIVERY", "0");

    const { executeBillingInvoiceTestDelivery } = await import(
      "../invoice-delivery/billing-test-delivery-service"
    );

    await expect(
      executeBillingInvoiceTestDelivery({
        invoiceKey: finalizedInvoice.key,
        actorUserId: "superadmin-1",
      }),
    ).rejects.toBeInstanceOf(NativeBillingValidationError);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NativeBillingConflictError,
  NativeBillingValidationError,
} from "../native-billing-types";
import { MailConfigurationError } from "@/lib/email/mailer";

const mocks = vi.hoisted(() => ({
  findInvoiceByKey: vi.fn(),
  findInvoiceRecipientSnapshot: vi.fn(),
  findBillingCustomerById: vi.fn(),
  getInvoicePaymentInstruction: vi.fn(),
  listInvoiceDeliveriesForInvoiceId: vi.fn(),
  getNextAttemptNumber: vi.fn(),
  hasInvoiceDeliveryInSending: vi.fn(),
  createInvoiceDeliverySendingAttempt: vi.fn(),
  markInvoiceDeliverySent: vi.fn(),
  markInvoiceDeliveryFailed: vi.fn(),
  generateNativeInvoicePdfBytes: vi.fn(),
  sendBillingEmail: vi.fn(),
  resolveBillingEmailIdentity: vi.fn(),
  logAction: vi.fn(),
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

vi.mock("../invoice-delivery/invoice-delivery-repository", () => ({
  listInvoiceDeliveriesForInvoiceId: mocks.listInvoiceDeliveriesForInvoiceId,
  getNextAttemptNumber: mocks.getNextAttemptNumber,
  hasInvoiceDeliveryInSending: mocks.hasInvoiceDeliveryInSending,
  createInvoiceDeliverySendingAttempt: mocks.createInvoiceDeliverySendingAttempt,
  markInvoiceDeliverySent: mocks.markInvoiceDeliverySent,
  markInvoiceDeliveryFailed: mocks.markInvoiceDeliveryFailed,
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

vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));

const { validateInvoiceForDelivery, sendNativeInvoiceEmail } = await import(
  "../invoice-delivery/invoice-delivery-service",
);
const { deriveInvoiceDeliveryAggregateStatus } = await import(
  "../invoice-delivery/invoice-delivery-summary",
);

const finalizedInvoice = {
  id: "inv-1",
  key: "inv-key",
  invoiceNumber: "2026-000002",
  legalEntityId: "le-1",
  billingCustomerId: "bc-1",
  billingContractId: null,
  status: "FINALIZED",
  currency: "CHF",
  periodStart: new Date("2026-09-01"),
  periodEnd: new Date("2026-09-30"),
  invoiceDate: new Date("2026-09-01"),
  dueDate: new Date("2026-10-01"),
  paymentTermsDays: 30,
  netTotalMinor: 19900,
  vatTotalMinor: 1612,
  grossTotalMinor: 21512,
  contractLabel: null,
  finalizedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const recipientWithEmail = {
  companyOrName: "FC Example",
  street: "Weg",
  houseNumber: "1",
  postalCode: "4144",
  city: "Arlesheim",
  countryCode: "CH",
  invoiceEmail: "billing@example-club.test",
};

function deliveryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "del-1",
    key: "del-key",
    invoiceId: "inv-1",
    channel: "EMAIL" as const,
    recipientEmail: "billing@example-club.test",
    status: "SENDING" as const,
    attemptNumber: 1,
    sentAt: null,
    failedAt: null,
    provider: null,
    providerMessageId: null,
    errorCode: null,
    errorMessage: null,
    subjectSnapshot: null,
    fromAddressSnapshot: null,
    replyToSnapshot: null,
    attachmentFilename: null,
    createdByUserId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("invoice delivery service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findInvoiceByKey.mockResolvedValue(finalizedInvoice);
    mocks.findInvoiceRecipientSnapshot.mockResolvedValue(recipientWithEmail);
    mocks.getInvoicePaymentInstruction.mockResolvedValue({ id: "pi-1" });
    mocks.findBillingCustomerById.mockResolvedValue({ defaultLanguage: "de" });
    mocks.listInvoiceDeliveriesForInvoiceId.mockResolvedValue([]);
    mocks.hasInvoiceDeliveryInSending.mockResolvedValue(false);
    mocks.getNextAttemptNumber.mockResolvedValue(1);
    mocks.createInvoiceDeliverySendingAttempt.mockImplementation(async (input) =>
      deliveryRow({
        key: input.key,
        attemptNumber: input.attemptNumber,
        recipientEmail: input.recipientEmail,
      }),
    );
    mocks.generateNativeInvoicePdfBytes.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));
    mocks.resolveBillingEmailIdentity.mockResolvedValue({
      from: "SportClubEvo Billing <noreply@mail.sportclubevo.com>",
      replyTo: "billing@sportclubevo.com",
    });
    mocks.sendBillingEmail.mockResolvedValue({
      provider: "resend",
      messageId: "msg-123",
      from: "SportClubEvo Billing <noreply@mail.sportclubevo.com>",
    });
    mocks.markInvoiceDeliverySent.mockImplementation(async (input) =>
      deliveryRow({
        id: input.deliveryId,
        status: "SENT",
        sentAt: new Date(),
        provider: input.provider,
        providerMessageId: input.providerMessageId,
        attachmentFilename: input.attachmentFilename,
      }),
    );
    mocks.markInvoiceDeliveryFailed.mockImplementation(async (input) =>
      deliveryRow({
        id: input.deliveryId,
        status: "FAILED",
        failedAt: new Date(),
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
      }),
    );
  });

  it("cannot send DRAFT invoice", async () => {
    mocks.findInvoiceByKey.mockResolvedValue({ ...finalizedInvoice, status: "DRAFT" });
    await expect(validateInvoiceForDelivery("inv-key")).rejects.toBeInstanceOf(
      NativeBillingValidationError,
    );
  });

  it("missing invoiceEmail blocks send", async () => {
    mocks.findInvoiceRecipientSnapshot.mockResolvedValue({
      ...recipientWithEmail,
      invoiceEmail: null,
    });
    await expect(validateInvoiceForDelivery("inv-key")).rejects.toThrow(
      "keine Rechnungs-E-Mail",
    );
  });

  it("successful provider response marks SENT with attachment", async () => {
    mocks.listInvoiceDeliveriesForInvoiceId
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([deliveryRow({ status: "SENT", attemptNumber: 1 })]);

    const result = await sendNativeInvoiceEmail({
      invoiceKey: "inv-key",
      actorUserId: "user-1",
      resend: false,
    });

    expect(result.delivery.status).toBe("SENT");
    expect(mocks.sendBillingEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "billing@example-club.test",
        attachments: [
          expect.objectContaining({
            filename: "SportClubEvo-Rechnung-2026-000002.pdf",
            contentType: "application/pdf",
          }),
        ],
      }),
    );
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "INVOICE_DELIVERY_SENT" }),
    );
  });

  it("provider failure results in failure audit", async () => {
    mocks.sendBillingEmail.mockRejectedValue(new MailConfigurationError("missing key"));
    await expect(
      sendNativeInvoiceEmail({
        invoiceKey: "inv-key",
        actorUserId: "user-1",
        resend: false,
      }),
    ).rejects.toThrow("nicht konfiguriert");
    expect(mocks.markInvoiceDeliveryFailed).toHaveBeenCalled();
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "INVOICE_DELIVERY_FAILED" }),
    );
  });

  it("PDF failure results in failure", async () => {
    mocks.generateNativeInvoicePdfBytes.mockResolvedValue(new Uint8Array());
    await expect(
      sendNativeInvoiceEmail({
        invoiceKey: "inv-key",
        actorUserId: "user-1",
        resend: false,
      }),
    ).rejects.toBeInstanceOf(NativeBillingValidationError);
    expect(mocks.markInvoiceDeliveryFailed).toHaveBeenCalled();
  });

  it("resend creates new attempt when resend flag set", async () => {
    mocks.listInvoiceDeliveriesForInvoiceId
      .mockResolvedValueOnce([
        deliveryRow({ status: "SENT", attemptNumber: 1, key: "old" }),
      ])
      .mockResolvedValueOnce([
        deliveryRow({ status: "SENT", attemptNumber: 2, key: "new" }),
      ]);
    mocks.getNextAttemptNumber.mockResolvedValue(2);
    mocks.createInvoiceDeliverySendingAttempt.mockImplementation(async (input) =>
      deliveryRow({ key: input.key, attemptNumber: 2 }),
    );

    await sendNativeInvoiceEmail({
      invoiceKey: "inv-key",
      actorUserId: "user-1",
      resend: true,
    });

    expect(mocks.createInvoiceDeliverySendingAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ attemptNumber: 2 }),
    );
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "INVOICE_DELIVERY_RESENT" }),
    );
  });

  it("blocks duplicate send without resend flag", async () => {
    mocks.listInvoiceDeliveriesForInvoiceId.mockResolvedValue([
      deliveryRow({ status: "SENT", attemptNumber: 1 }),
    ]);
    await expect(
      sendNativeInvoiceEmail({
        invoiceKey: "inv-key",
        actorUserId: "user-1",
        resend: false,
      }),
    ).rejects.toBeInstanceOf(NativeBillingConflictError);
    expect(mocks.sendBillingEmail).not.toHaveBeenCalled();
  });

  it("blocks concurrent sending", async () => {
    mocks.hasInvoiceDeliveryInSending.mockResolvedValue(true);
    await expect(
      sendNativeInvoiceEmail({
        invoiceKey: "inv-key",
        actorUserId: "user-1",
        resend: false,
      }),
    ).rejects.toBeInstanceOf(NativeBillingConflictError);
  });

  it("derives aggregate status without FCA hardcoding", () => {
    expect(
      deriveInvoiceDeliveryAggregateStatus([
        deliveryRow({ status: "FAILED", attemptNumber: 2 }),
        deliveryRow({ status: "SENT", attemptNumber: 1 }),
      ]),
    ).toBe("FAILED");
  });
});

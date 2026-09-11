import { beforeEach, describe, expect, it, vi } from "vitest";
import { NativeBillingConflictError } from "../native-billing-types";

const mocks = vi.hoisted(() => ({
  findInvoiceByKey: vi.fn(),
  findInvoiceById: vi.fn(),
  listInvoiceLines: vi.fn(),
  updateInvoiceDraftRecord: vi.fn(),
  findInvoiceTaxSnapshots: vi.fn(),
  findInvoiceIssuerSnapshot: vi.fn(),
  findInvoiceRecipientSnapshot: vi.fn(),
}));

vi.mock("../native-billing-commercial-repository", () => ({
  findInvoiceByKey: mocks.findInvoiceByKey,
  findInvoiceById: mocks.findInvoiceById,
  listInvoiceLines: mocks.listInvoiceLines,
  findInvoiceTaxSnapshots: mocks.findInvoiceTaxSnapshots,
  findInvoiceIssuerSnapshot: mocks.findInvoiceIssuerSnapshot,
  findInvoiceRecipientSnapshot: mocks.findInvoiceRecipientSnapshot,
  replaceInvoiceLines: vi.fn(),
  updateInvoiceDraftRecord: mocks.updateInvoiceDraftRecord,
  updateInvoiceRecord: mocks.updateInvoiceDraftRecord,
  listBillingContracts: vi.fn(),
  listInvoices: vi.fn(),
}));

vi.mock("../native-billing-repository", () => ({
  findBillingCustomerById: vi.fn(),
  findBillingProfileById: vi.fn(),
  findLegalEntityById: vi.fn(),
  listBillingProfilesForCustomer: vi.fn(),
}));

vi.mock("@/lib/audit/log-action", () => ({ logAction: vi.fn() }));

const { updateDraftInvoice } = await import("../native-billing-commercial-service");

describe("invoice immutability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects edits on finalized invoices", async () => {
    mocks.findInvoiceByKey.mockResolvedValue({
      id: "inv-1",
      key: "inv-key",
      status: "FINALIZED",
      currency: "CHF",
    });

    await expect(
      updateDraftInvoice({
        invoiceKey: "inv-key",
        periodStart: "2026-09-01",
        actorUserId: "u1",
      }),
    ).rejects.toBeInstanceOf(NativeBillingConflictError);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    invoicePaymentInstruction: {
      findFirst: mocks.findFirst,
    },
  },
}));

const { findInvoiceForCamt054QrrReference } = await import("../camt054-invoice-matcher");

describe("findInvoiceForCamt054QrrReference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes whitespace and scopes by legal entity and QRR reference", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "pi-1",
      invoiceId: "inv-1",
      currency: "CHF",
      invoice: {
        id: "inv-1",
        key: "inv-key",
        invoiceNumber: "2026-000004",
        legalEntityId: "le-1",
        currency: "CHF",
        grossTotalMinor: 21512,
        status: "FINALIZED",
      },
    });

    await findInvoiceForCamt054QrrReference(
      "2732 8202 6000 0040 3055 1312 759",
      "le-1",
    );

    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        referenceType: "QRR",
        reference: "273282026000004030551312759",
        invoice: { legalEntityId: "le-1" },
      },
      select: expect.any(Object),
    });
  });

  it("returns null for empty references", async () => {
    await expect(findInvoiceForCamt054QrrReference("   ", "le-1")).resolves.toBeNull();
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });
});

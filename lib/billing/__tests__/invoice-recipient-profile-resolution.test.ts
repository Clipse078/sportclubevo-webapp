import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillingProfileRecord } from "../native-billing-types";

const mocks = vi.hoisted(() => ({
  findBillingContractById: vi.fn(),
  findBillingProfileById: vi.fn(),
  listBillingProfilesForCustomer: vi.fn(),
}));

vi.mock("../native-billing-commercial-repository", () => ({
  findBillingContractById: mocks.findBillingContractById,
}));

vi.mock("../native-billing-repository", () => ({
  findBillingProfileById: mocks.findBillingProfileById,
  listBillingProfilesForCustomer: mocks.listBillingProfilesForCustomer,
}));

const { resolveInvoiceRecipientProfileForContract } = await import(
  "../invoice-recipient-profile-resolution"
);

function profile(overrides: Partial<BillingProfileRecord> & { id: string }): BillingProfileRecord {
  return {
    billingCustomerId: "cust-1",
    profileType: "BILLING",
    companyOrName: "Club",
    street: "Strasse",
    houseNumber: "1",
    postalCode: "4000",
    city: "Basel",
    countryCode: "CH",
    invoiceEmail: "billing@example.invalid",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("resolveInvoiceRecipientProfileForContract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefers the contract-linked invoice recipient profile", async () => {
    mocks.findBillingContractById.mockResolvedValue({
      id: "contract-1",
      invoiceRecipientProfileId: "profile-linked",
    });
    mocks.findBillingProfileById.mockResolvedValue(
      profile({
        id: "profile-linked",
        invoiceEmail: "finanzen@fcallschwil.ch",
      }),
    );
    mocks.listBillingProfilesForCustomer.mockResolvedValue([
      profile({ id: "profile-fallback", invoiceEmail: "other@example.invalid" }),
    ]);

    const resolved = await resolveInvoiceRecipientProfileForContract({
      billingCustomerId: "cust-1",
      billingContractId: "contract-1",
    });

    expect(resolved?.id).toBe("profile-linked");
    expect(mocks.listBillingProfilesForCustomer).not.toHaveBeenCalled();
  });

  it("falls back to customer BILLING profile when contract has no linkage", async () => {
    mocks.findBillingContractById.mockResolvedValue({
      id: "contract-1",
      invoiceRecipientProfileId: null,
    });
    mocks.listBillingProfilesForCustomer.mockResolvedValue([
      profile({ id: "delivery", profileType: "DELIVERY" }),
      profile({ id: "billing", profileType: "BILLING", invoiceEmail: "finanzen@fcallschwil.ch" }),
    ]);

    const resolved = await resolveInvoiceRecipientProfileForContract({
      billingCustomerId: "cust-1",
      billingContractId: "contract-1",
    });

    expect(resolved?.id).toBe("billing");
  });
});

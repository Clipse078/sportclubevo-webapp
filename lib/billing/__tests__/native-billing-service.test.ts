import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listBillingCustomers: vi.fn(),
  findBillingCustomerByKey: vi.fn(),
  createBillingCustomerRecord: vi.fn(),
  findActiveBillingCustomerTenantLink: vi.fn(),
  createBillingCustomerTenantLink: vi.fn(),
  findTenantIdByKey: vi.fn(),
  findLegalEntityByKey: vi.fn(),
  createBillingBankAccountRecord: vi.fn(),
  logAction: vi.fn(),
  allocateUniqueBillingKey: vi.fn(),
}));

vi.mock("../native-billing-repository", () => ({
  listBillingCustomers: mocks.listBillingCustomers,
  findBillingCustomerByKey: mocks.findBillingCustomerByKey,
  findBillingCustomerById: vi.fn(),
  createBillingCustomerRecord: mocks.createBillingCustomerRecord,
  updateBillingCustomerRecord: vi.fn(),
  listBillingCustomerTenantLinks: vi.fn(),
  findActiveBillingCustomerTenantLink: mocks.findActiveBillingCustomerTenantLink,
  createBillingCustomerTenantLink: mocks.createBillingCustomerTenantLink,
  reactivateBillingCustomerTenantLink: vi.fn(),
  deactivateBillingCustomerTenantLink: vi.fn(),
  listBillingProfilesForCustomer: vi.fn(),
  createBillingProfileRecord: vi.fn(),
  updateBillingProfileRecord: vi.fn(),
  findBillingProfileById: vi.fn(),
  listLegalEntities: vi.fn(),
  findLegalEntityByKey: mocks.findLegalEntityByKey,
  findLegalEntityById: vi.fn(),
  createLegalEntityRecord: vi.fn(),
  updateLegalEntityRecord: vi.fn(),
  listAllBillingBankAccounts: vi.fn(),
  findBillingBankAccountById: vi.fn(),
  createBillingBankAccountRecord: mocks.createBillingBankAccountRecord,
  updateBillingBankAccountRecord: vi.fn(),
  tenantExistsById: vi.fn(),
  findTenantIdByKey: mocks.findTenantIdByKey,
}));

vi.mock("../billing-business-key", () => ({
  allocateUniqueBillingKey: mocks.allocateUniqueBillingKey,
  slugifyBillingKey: vi.fn((v: string) => v),
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: mocks.logAction,
}));

const {
  createBillingCustomer,
  linkBillingCustomerToTenant,
  createBillingBankAccount,
} = await import("../native-billing-service");

describe("native billing service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logAction.mockResolvedValue(undefined);
    mocks.allocateUniqueBillingKey.mockResolvedValue("acme-ag");
  });

  it("creates billing customer without tenant", async () => {
    mocks.createBillingCustomerRecord.mockResolvedValue({
      id: "cust-1",
      key: "acme-ag",
      displayName: "Acme AG",
      legalName: null,
      status: "ACTIVE",
      defaultLanguage: null,
      defaultCurrency: null,
      primaryEmail: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const created = await createBillingCustomer({
      displayName: "Acme AG",
      actorUserId: "actor-1",
    });

    expect(created.key).toBe("acme-ag");
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "BILLING_CUSTOMER_CREATED" }),
    );
  });

  it("prevents duplicate active tenant link", async () => {
    mocks.findBillingCustomerByKey.mockResolvedValue({ id: "cust-1", key: "acme-ag" });
    mocks.findTenantIdByKey.mockResolvedValue("tenant-1");
    mocks.findActiveBillingCustomerTenantLink.mockResolvedValue({
      id: "link-1",
      billingCustomerId: "cust-1",
      tenantId: "tenant-1",
      linkRole: null,
      activeFrom: new Date(),
      activeUntil: null,
      createdAt: new Date(),
    });

    await expect(
      linkBillingCustomerToTenant({
        customerKey: "acme-ag",
        tenantKey: "fc-demo",
        actorUserId: "actor-1",
      }),
    ).rejects.toMatchObject({ name: "NativeBillingConflictError" });
  });

  it("stores bank account under legal entity without exposing full IBAN in audit", async () => {
    mocks.findLegalEntityByKey.mockResolvedValue({ id: "le-1", key: "issuer" });
    mocks.createBillingBankAccountRecord.mockResolvedValue({
      id: "ba-1",
      legalEntityId: "le-1",
      label: "Primary",
      bankName: null,
      currency: "CHF",
      iban: "CH9300762011623852957",
      qrIban: null,
      referenceStrategy: "NON",
      creditorName: "Issuer",
      creditorAddressLine1: "Main",
      creditorHouseNumber: null,
      creditorPostalCode: "4000",
      creditorCity: "Basel",
      creditorCountryCode: "CH",
      activeFrom: new Date(),
      activeUntil: null,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await createBillingBankAccount({
      legalEntityKey: "issuer",
      label: "Primary",
      iban: "CH93 0076 2011 6238 5295 7",
      creditorName: "Issuer",
      creditorAddressLine1: "Main",
      creditorPostalCode: "4000",
      creditorCity: "Basel",
      creditorCountryCode: "CH",
      actorUserId: "actor-1",
    });

    expect(mocks.createBillingBankAccountRecord).toHaveBeenCalledWith(
      expect.objectContaining({ iban: "CH9300762011623852957" }),
    );

    const auditCall = mocks.logAction.mock.calls[0]?.[0];
    expect(JSON.stringify(auditCall?.afterJson)).not.toContain("CH9300762011623852957");
    expect(auditCall?.afterJson?.ibanMasked).toBe("****2957");
  });
});

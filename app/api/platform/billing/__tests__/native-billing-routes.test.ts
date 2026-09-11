import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePlatformApiPermission: vi.fn(),
  getBillingCustomersOverview: vi.fn(),
  createBillingCustomer: vi.fn(),
  createBillingCustomerWithDetails: vi.fn(),
  listLegalEntitiesForPlatform: vi.fn(),
  createBillingBankAccount: vi.fn(),
  listBillingBankAccountsForPlatform: vi.fn(),
}));

vi.mock("@/lib/permissions/require-platform-api-permission", () => ({
  requirePlatformApiPermission: mocks.requirePlatformApiPermission,
}));

vi.mock("@/lib/billing/native-billing-service", () => ({
  getBillingCustomersOverview: mocks.getBillingCustomersOverview,
  createBillingCustomer: mocks.createBillingCustomer,
  createBillingCustomerWithDetails: mocks.createBillingCustomerWithDetails,
  getBillingCustomerDetail: vi.fn(),
  updateBillingCustomer: vi.fn(),
  linkBillingCustomerToTenant: vi.fn(),
  unlinkBillingCustomerFromTenant: vi.fn(),
  createBillingProfile: vi.fn(),
  listLegalEntitiesForPlatform: mocks.listLegalEntitiesForPlatform,
  createLegalEntity: vi.fn(),
  updateLegalEntity: vi.fn(),
  listBillingBankAccountsForPlatform: mocks.listBillingBankAccountsForPlatform,
  createBillingBankAccount: mocks.createBillingBankAccount,
  updateBillingBankAccount: vi.fn(),
}));

import { GET as listCustomers, POST as createCustomer } from "../customers/route";
import { GET as listBankAccounts, POST as createBankAccount } from "../bank-accounts/route";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { NativeBillingValidationError } from "@/lib/billing/native-billing-types";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePlatformApiPermission.mockResolvedValue({
    ok: true,
    status: 200,
    error: null,
    session: { user: { id: "platform-admin" } },
    actorUserId: "platform-admin",
  });
});

describe("native billing platform API authorization", () => {
  it("requires platform billing.view for customer list", async () => {
    mocks.getBillingCustomersOverview.mockResolvedValue([]);
    await listCustomers();
    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_VIEW);
  });

  it("requires platform billing.manage for customer create", async () => {
    mocks.createBillingCustomer.mockResolvedValue({
      id: "c1",
      key: "acme",
      displayName: "Acme",
      legalName: null,
      status: "ACTIVE",
      defaultLanguage: null,
      defaultCurrency: null,
      primaryEmail: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await createCustomer(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ displayName: "Acme" }),
      }),
    );

    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_MANAGE);
  });

  it("uses bootstrap create when billing profile or tenant link is provided", async () => {
    mocks.createBillingCustomerWithDetails.mockResolvedValue({
      customer: {
        id: "c1",
        key: "acme",
        displayName: "Acme",
        legalName: null,
        status: "ACTIVE",
        defaultLanguage: null,
        defaultCurrency: null,
        primaryEmail: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      profile: null,
      tenantLink: null,
    });

    await createCustomer(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          displayName: "Acme",
          billingProfile: {
            street: "Main",
            postalCode: "4000",
            city: "Basel",
            countryCode: "CH",
          },
          tenantKey: "fc-demo",
        }),
      }),
    );

    expect(mocks.createBillingCustomerWithDetails).toHaveBeenCalled();
    expect(mocks.createBillingCustomer).not.toHaveBeenCalled();
  });

  it("denies callers without platform permission", async () => {
    mocks.requirePlatformApiPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
      session: null,
      actorUserId: null,
    });

    const response = await listCustomers();
    expect(response.status).toBe(403);
    expect(mocks.getBillingCustomersOverview).not.toHaveBeenCalled();
  });
});

describe("native billing bank account API masking", () => {
  it("returns masked IBAN only", async () => {
    mocks.listBillingBankAccountsForPlatform.mockResolvedValue([
      {
        id: "ba-1",
        legalEntityId: "le-1",
        label: "Main",
        bankName: null,
        currency: "CHF",
        iban: "CH9300762011623852957",
        qrIban: null,
        referenceStrategy: "NON",
        creditorName: "Issuer",
        creditorAddressLine1: "Street",
        creditorHouseNumber: null,
        creditorPostalCode: "4000",
        creditorCity: "Basel",
        creditorCountryCode: "CH",
        activeFrom: new Date(),
        activeUntil: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const response = await listBankAccounts();
    const json = await response.json();
    expect(json.bankAccounts[0].ibanMasked).toBe("****2957");
    expect(JSON.stringify(json)).not.toContain("CH9300762011623852957");
  });

  it("masks IBAN on create response", async () => {
    mocks.createBillingBankAccount.mockResolvedValue({
      id: "ba-1",
      legalEntityId: "le-1",
      label: "Main",
      bankName: null,
      currency: "CHF",
      iban: "CH9300762011623852957",
      qrIban: null,
      referenceStrategy: "NON",
      creditorName: "Issuer",
      creditorAddressLine1: "Street",
      creditorHouseNumber: null,
      creditorPostalCode: "4000",
      creditorCity: "Basel",
      creditorCountryCode: "CH",
      activeFrom: new Date(),
      activeUntil: null,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await createBankAccount(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          legalEntityKey: "issuer",
          label: "Main",
          iban: "CH9300762011623852957",
          creditorName: "Issuer",
          creditorAddressLine1: "Street",
          creditorPostalCode: "4000",
          creditorCity: "Basel",
          creditorCountryCode: "CH",
        }),
      }),
    );

    const json = await response.json();
    expect(json.bankAccount.ibanMasked).toBe("****2957");
    expect(JSON.stringify(json)).not.toContain("CH9300762011623852957");
  });

  it("requires platform billing.manage for bank account create", async () => {
    mocks.createBillingBankAccount.mockResolvedValue({
      id: "ba-1",
      legalEntityId: "le-1",
      label: "Main",
      bankName: null,
      currency: "CHF",
      iban: "CH9300762011623852957",
      qrIban: null,
      referenceStrategy: "NON",
      qrrReferencePrefix: null,
      creditorName: "Issuer",
      creditorAddressLine1: "Street",
      creditorHouseNumber: null,
      creditorPostalCode: "4000",
      creditorCity: "Basel",
      creditorCountryCode: "CH",
      activeFrom: new Date(),
      activeUntil: null,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await createBankAccount(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          legalEntityKey: "issuer",
          label: "Main",
          iban: "CH9300762011623852957",
          creditorName: "Issuer",
          creditorAddressLine1: "Street",
          creditorPostalCode: "4000",
          creditorCity: "Basel",
          creditorCountryCode: "CH",
        }),
      }),
    );

    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_MANAGE);
  });

  it("returns German validation errors instead of internal error for bank create", async () => {
    mocks.createBillingBankAccount.mockRejectedValue(
      new NativeBillingValidationError("IBAN-Prüfziffer ungültig."),
    );

    const response = await createBankAccount(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          legalEntityKey: "issuer",
          label: "Main",
          iban: "CH9300762011623852957",
          qrIban: "CH0030049000000000049",
          referenceStrategy: "QRR",
          qrrReferencePrefix: "",
          creditorName: "Issuer",
          creditorAddressLine1: "Street",
          creditorPostalCode: "4000",
          creditorCity: "Basel",
          creditorCountryCode: "CH",
          isDefault: true,
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "IBAN-Prüfziffer ungültig." });
  });
});

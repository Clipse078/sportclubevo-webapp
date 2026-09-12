import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  hasPermission: vi.fn(),
  listLegalEntitiesForPlatform: vi.fn(),
  listBillingBankAccountsForPlatform: vi.fn(),
}));

vi.mock("@/lib/permissions/require-permission", () => ({
  requirePermission: mocks.requirePermission,
}));

vi.mock("@/lib/permissions/has-permission", () => ({
  hasPermission: mocks.hasPermission,
}));

vi.mock("@/lib/billing/native-billing-service", () => ({
  listLegalEntitiesForPlatform: mocks.listLegalEntitiesForPlatform,
  listBillingBankAccountsForPlatform: mocks.listBillingBankAccountsForPlatform,
}));

vi.mock("@/components/admin/billing/NativeBillingCreateBankAccountForm", () => ({
  default: ({ legalEntities }: { legalEntities: { key: string; label: string }[] }) => (
    <div data-testid="bank-account-form">
      {legalEntities.map((entity) => (
        <span key={entity.key}>{entity.label}</span>
      ))}
    </div>
  ),
}));

import { renderToStaticMarkup } from "react-dom/server";
import NativeBillingSettingsPage from "../page";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const platformLegalEntity = {
  id: "le-1",
  key: "sportclubevo-by-tulip-digital",
  displayName: "SportClubEvo by Tulip Digital",
  legalName: "Tulip Digital - Duijster",
  entityType: "COMPANY",
  uid: "CHE-228.036.135",
  vatId: "CHE-228.036.135 MWST",
  defaultCurrency: "CHF",
  status: "ACTIVE",
  addressLine1: "Binningerstrasse 46",
  houseNumber: null,
  postalCode: "4123",
  city: "Allschwil",
  countryCode: "CH",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePermission.mockResolvedValue({ user: { id: "platform-admin" } });
  mocks.hasPermission.mockReturnValue(true);
  mocks.listLegalEntitiesForPlatform.mockResolvedValue([platformLegalEntity]);
  mocks.listBillingBankAccountsForPlatform.mockResolvedValue([]);
});

describe("Native billing settings page", () => {
  it("requires platform billing.view", async () => {
    await NativeBillingSettingsPage();
    expect(mocks.requirePermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_VIEW);
  });

  it("still lists platform legal entities when bank account loading fails", async () => {
    mocks.listBillingBankAccountsForPlatform.mockRejectedValue(
      new Error("BillingBankAccount.qrrReferencePrefix does not exist"),
    );

    const page = await NativeBillingSettingsPage();
    const html = renderToStaticMarkup(page);

    expect(mocks.listLegalEntitiesForPlatform).toHaveBeenCalled();
    expect(mocks.listBillingBankAccountsForPlatform).toHaveBeenCalled();
    expect(html).toContain("SportClubEvo by Tulip Digital");
    expect(html).not.toContain(
      "Noch keine Rechtsträger für native SCE-Rechnungen erfasst.",
    );
    expect(html).toContain('data-testid="bank-account-form"');
  });

  it("loads legal entities and bank accounts independently on success", async () => {
    await NativeBillingSettingsPage();
    expect(mocks.listLegalEntitiesForPlatform).toHaveBeenCalled();
    expect(mocks.listBillingBankAccountsForPlatform).toHaveBeenCalled();
  });

  it("links legal entity rows to the detail page from settings", async () => {
    const page = await NativeBillingSettingsPage();
    const html = renderToStaticMarkup(page);

    expect(html).toContain(
      'href="/dashboard/admin/commercial/billing/settings/legal-entities/sportclubevo-by-tulip-digital"',
    );
    expect(html).toContain("SportClubEvo by Tulip Digital verwalten");
  });
});

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  hasPermission: vi.fn(),
  findLegalEntityByKey: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("@/lib/permissions/require-permission", () => ({
  requirePermission: mocks.requirePermission,
}));

vi.mock("@/lib/permissions/has-permission", () => ({
  hasPermission: mocks.hasPermission,
}));

vi.mock("@/lib/billing/native-billing-repository", () => ({
  findLegalEntityByKey: mocks.findLegalEntityByKey,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("@/components/admin/billing/NativeBillingDeleteLegalEntityButton", () => ({
  default: ({ entityKey }: { entityKey: string }) => (
    <div data-testid="delete-legal-entity">{entityKey}</div>
  ),
}));

import NativeBillingLegalEntityDetailPage from "../page";

const sampleEntity = {
  id: "le-1",
  key: "sportclubevo-by-tulip-digital",
  displayName: "SportClubEvo by Tulip Digital",
  legalName: "Tulip Digital - Duijster",
  entityType: "COMPANY" as const,
  uid: "CHE-228.036.135",
  vatId: "CHE-228.036.135 MWST",
  defaultCurrency: "CHF",
  status: "ACTIVE" as const,
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
  mocks.findLegalEntityByKey.mockResolvedValue(sampleEntity);
});

describe("Native billing legal entity detail page", () => {
  it("requires billing.view for detail access", async () => {
    await NativeBillingLegalEntityDetailPage({
      params: Promise.resolve({ entityKey: sampleEntity.key }),
    });
    expect(mocks.requirePermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_VIEW);
  });

  it("shows Gefahrenzone delete affordance only with billing.manage", async () => {
    mocks.hasPermission.mockReturnValue(true);
    const managePage = await NativeBillingLegalEntityDetailPage({
      params: Promise.resolve({ entityKey: sampleEntity.key }),
    });
    const manageHtml = renderToStaticMarkup(managePage);
    expect(manageHtml).toContain("Gefahrenzone");
    expect(manageHtml).toContain('data-testid="delete-legal-entity"');

    mocks.hasPermission.mockReturnValue(false);
    const viewPage = await NativeBillingLegalEntityDetailPage({
      params: Promise.resolve({ entityKey: sampleEntity.key }),
    });
    const viewHtml = renderToStaticMarkup(viewPage);
    expect(viewHtml).not.toContain("Gefahrenzone");
    expect(viewHtml).not.toContain('data-testid="delete-legal-entity"');
  });

  it("links back to billing settings", async () => {
    const page = await NativeBillingLegalEntityDetailPage({
      params: Promise.resolve({ entityKey: sampleEntity.key }),
    });
    const html = renderToStaticMarkup(page);
    expect(html).toContain('href="/dashboard/admin/commercial/billing/settings"');
  });
});

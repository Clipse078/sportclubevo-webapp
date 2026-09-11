import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePlatformApiPermission: vi.fn(),
  listLegalEntitiesForPlatform: vi.fn(),
  createLegalEntity: vi.fn(),
  findLegalEntityByKey: vi.fn(),
  updateLegalEntity: vi.fn(),
}));

vi.mock("@/lib/permissions/require-platform-api-permission", () => ({
  requirePlatformApiPermission: mocks.requirePlatformApiPermission,
}));

vi.mock("@/lib/billing/native-billing-service", () => ({
  listLegalEntitiesForPlatform: mocks.listLegalEntitiesForPlatform,
  createLegalEntity: mocks.createLegalEntity,
  updateLegalEntity: mocks.updateLegalEntity,
}));

vi.mock("@/lib/billing/native-billing-repository", () => ({
  findLegalEntityByKey: mocks.findLegalEntityByKey,
}));

import { GET as listLegalEntities, POST as createLegalEntityRoute } from "../legal-entities/route";
import { GET as getLegalEntity } from "../legal-entities/[key]/route";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const sampleEntity = {
  id: "le-1",
  key: "tulip",
  displayName: "SportClubEvo",
  legalName: "Tulip Digital",
  entityType: "OTHER" as const,
  uid: null,
  vatId: null,
  defaultCurrency: "CHF",
  status: "ACTIVE" as const,
  addressLine1: "Binningerstrasse",
  houseNumber: "46",
  postalCode: "4123",
  city: "Allschwil",
  countryCode: "CH",
  createdAt: new Date(),
  updatedAt: new Date(),
};

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

describe("native billing legal entity platform API", () => {
  it("requires billing.view for legal entity list", async () => {
    mocks.listLegalEntitiesForPlatform.mockResolvedValue([]);
    await listLegalEntities();
    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_VIEW);
  });

  it("requires billing.manage for legal entity create", async () => {
    mocks.createLegalEntity.mockResolvedValue(sampleEntity);
    await createLegalEntityRoute(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          displayName: "SportClubEvo",
          legalName: "Tulip Digital",
          addressLine1: "Binningerstrasse",
          postalCode: "4123",
          city: "Allschwil",
          countryCode: "CH",
        }),
      }),
    );
    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_MANAGE);
  });

  it("requires billing.view for legal entity detail", async () => {
    mocks.findLegalEntityByKey.mockResolvedValue(sampleEntity);
    await getLegalEntity(new NextRequest("http://localhost"), {
      params: Promise.resolve({ key: "tulip" }),
    });
    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_VIEW);
  });

  it("denies legal entity list without platform permission", async () => {
    mocks.requirePlatformApiPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
      session: null,
      actorUserId: null,
    });

    const response = await listLegalEntities();
    expect(response.status).toBe(403);
    expect(mocks.listLegalEntitiesForPlatform).not.toHaveBeenCalled();
  });

  it("returns validation errors from createLegalEntity service", async () => {
    mocks.createLegalEntity.mockRejectedValue(
      Object.assign(new Error("Anzeigename ist erforderlich."), { name: "NativeBillingValidationError" }),
    );

    const response = await createLegalEntityRoute(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ displayName: "", legalName: "X", addressLine1: "S", postalCode: "1", city: "B", countryCode: "CH" }),
      }),
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});

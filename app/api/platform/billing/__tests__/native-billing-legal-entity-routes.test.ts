import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePlatformApiPermission: vi.fn(),
  listLegalEntitiesForPlatform: vi.fn(),
  createLegalEntity: vi.fn(),
  findLegalEntityByKey: vi.fn(),
  updateLegalEntity: vi.fn(),
  deleteLegalEntity: vi.fn(),
}));

vi.mock("@/lib/permissions/require-platform-api-permission", () => ({
  requirePlatformApiPermission: mocks.requirePlatformApiPermission,
}));

vi.mock("@/lib/billing/native-billing-service", () => ({
  listLegalEntitiesForPlatform: mocks.listLegalEntitiesForPlatform,
  createLegalEntity: mocks.createLegalEntity,
  updateLegalEntity: mocks.updateLegalEntity,
  deleteLegalEntity: mocks.deleteLegalEntity,
}));

vi.mock("@/lib/billing/native-billing-repository", () => ({
  findLegalEntityByKey: mocks.findLegalEntityByKey,
}));

import { GET as listLegalEntities, POST as createLegalEntityRoute } from "../legal-entities/route";
import { GET as getLegalEntity, DELETE as deleteLegalEntityRoute } from "../legal-entities/[key]/route";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { NativeBillingConflictError, NativeBillingNotFoundError } from "@/lib/billing/native-billing-types";

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

  it("requires billing.manage for legal entity delete", async () => {
    mocks.deleteLegalEntity.mockResolvedValue(undefined);
    await deleteLegalEntityRoute(new NextRequest("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ key: "orphan" }),
    });
    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_MANAGE);
  });

  it("returns 204 when delete succeeds", async () => {
    mocks.deleteLegalEntity.mockResolvedValue(undefined);
    const response = await deleteLegalEntityRoute(new NextRequest("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ key: "orphan" }),
    });
    expect(response.status).toBe(204);
    expect(mocks.deleteLegalEntity).toHaveBeenCalledWith({
      entityKey: "orphan",
      actorUserId: "platform-admin",
    });
  });

  it("returns 403 when platform permission denied (tenant/club cannot delete)", async () => {
    mocks.requirePlatformApiPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
      session: null,
      actorUserId: null,
    });

    const response = await deleteLegalEntityRoute(new NextRequest("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ key: "orphan" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.deleteLegalEntity).not.toHaveBeenCalled();
  });

  it("returns 409 with dependency counts when blocked", async () => {
    mocks.deleteLegalEntity.mockRejectedValue(
      new NativeBillingConflictError(
        "Dieser Rechtsträger kann nicht gelöscht werden, da bereits Abrechnungsdaten damit verknüpft sind.",
        {
          dependencyCounts: {
            billingBankAccounts: 1,
            billingContracts: 0,
            invoices: 0,
            invoiceSequences: 0,
          },
        },
      ),
    );

    const response = await deleteLegalEntityRoute(new NextRequest("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ key: "blocked" }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.dependencies).toEqual({
      billingBankAccounts: 1,
      billingContracts: 0,
      invoices: 0,
      invoiceSequences: 0,
    });
    expect(JSON.stringify(body)).not.toMatch(/iban|qrIban/i);
  });

  it("returns 404 for missing entity on delete", async () => {
    mocks.deleteLegalEntity.mockRejectedValue(new NativeBillingNotFoundError("Legal Entity nicht gefunden."));

    const response = await deleteLegalEntityRoute(new NextRequest("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ key: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("billing.view alone cannot invoke delete handler without manage permission", async () => {
    mocks.requirePlatformApiPermission.mockImplementation(async (permission: string) => {
      if (permission === PERMISSIONS.BILLING_MANAGE) {
        return {
          ok: false,
          status: 403,
          error: "Forbidden",
          session: null,
          actorUserId: null,
        };
      }
      return {
        ok: true,
        status: 200,
        error: null,
        session: { user: { id: "viewer" } },
        actorUserId: "viewer",
      };
    });

    const response = await deleteLegalEntityRoute(new NextRequest("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ key: "orphan" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.deleteLegalEntity).not.toHaveBeenCalled();
  });
});

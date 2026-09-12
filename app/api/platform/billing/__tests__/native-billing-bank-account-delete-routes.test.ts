import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePlatformApiPermission: vi.fn(),
  deleteBillingBankAccount: vi.fn(),
}));

vi.mock("@/lib/permissions/require-platform-api-permission", () => ({
  requirePlatformApiPermission: mocks.requirePlatformApiPermission,
}));

vi.mock("@/lib/billing/native-billing-service", () => ({
  deleteBillingBankAccount: mocks.deleteBillingBankAccount,
  updateBillingBankAccount: vi.fn(),
}));

import { DELETE as deleteBankAccount } from "../bank-accounts/[accountId]/route";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { NativeBillingConflictError, NativeBillingNotFoundError } from "@/lib/billing/native-billing-types";

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

describe("bank account DELETE API", () => {
  it("requires billing.manage", async () => {
    mocks.deleteBillingBankAccount.mockResolvedValue(undefined);
    await deleteBankAccount(new NextRequest("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ accountId: "ba-1" }),
    });
    expect(mocks.requirePlatformApiPermission).toHaveBeenCalledWith(PERMISSIONS.BILLING_MANAGE);
  });

  it("returns 204 on successful delete", async () => {
    mocks.deleteBillingBankAccount.mockResolvedValue(undefined);
    const response = await deleteBankAccount(new NextRequest("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ accountId: "ba-1" }),
    });
    expect(response.status).toBe(204);
    expect(mocks.deleteBillingBankAccount).toHaveBeenCalledWith({
      accountId: "ba-1",
      actorUserId: "platform-admin",
    });
  });

  it("returns 409 when account is in use", async () => {
    mocks.deleteBillingBankAccount.mockRejectedValue(
      new NativeBillingConflictError("blocked", {
        bankAccountDependencyCounts: { paymentInstructions: 1 },
      }),
    );
    const response = await deleteBankAccount(new NextRequest("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ accountId: "ba-1" }),
    });
    expect(response.status).toBe(409);
  });

  it("returns 404 when account is missing", async () => {
    mocks.deleteBillingBankAccount.mockRejectedValue(
      new NativeBillingNotFoundError("Bankkonto nicht gefunden."),
    );
    const response = await deleteBankAccount(new NextRequest("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ accountId: "missing" }),
    });
    expect(response.status).toBe(404);
  });
});

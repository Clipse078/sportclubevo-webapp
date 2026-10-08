/**
 * SCE-PLANNER-UX-08-08B — facility mutation → planner revalidation boundary.
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateAfterSuccessfulFacilityMutation = vi.hoisted(() => vi.fn());

vi.mock("@/lib/planning-hub/facility-mutation-revalidation", () => ({
  revalidateAfterSuccessfulFacilityMutation,
}));

const facilityMocks = vi.hoisted(() => ({
  requireApiAnyPermission: vi.fn(),
  createFacility: vi.fn(),
  updateFacility: vi.fn(),
  getFacilityById: vi.fn(),
  createFacilityResource: vi.fn(),
  updateFacilityResource: vi.fn(),
  auth: vi.fn(),
  hasTenantDeletionAuthority: vi.fn(),
  logAction: vi.fn(),
  facilityFindUnique: vi.fn(),
  resourceFindUnique: vi.fn(),
  getFacilityDeletionImpact: vi.fn(),
  deleteFacilityPermanently: vi.fn(),
  getFacilityResourceDeletionImpact: vi.fn(),
  deleteFacilityResourcePermanently: vi.fn(),
}));

vi.mock("@/lib/permissions/require-api-any-permission", () => ({
  requireApiAnyPermission: facilityMocks.requireApiAnyPermission,
}));

vi.mock("@/lib/facilities/queries", () => ({
  createFacility: facilityMocks.createFacility,
  updateFacility: facilityMocks.updateFacility,
  getFacilityById: facilityMocks.getFacilityById,
  createFacilityResource: facilityMocks.createFacilityResource,
  updateFacilityResource: facilityMocks.updateFacilityResource,
  getFacilitiesForTenant: vi.fn(),
  getFacilityResourcesForFacility: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: facilityMocks.auth }));
vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    hasTenantDeletionAuthority: facilityMocks.hasTenantDeletionAuthority,
  }),
}));
vi.mock("@/lib/audit/log-action", () => ({ logAction: facilityMocks.logAction }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    facility: { findUnique: (...args: unknown[]) => facilityMocks.facilityFindUnique(...args) },
    facilityResource: {
      findUnique: (...args: unknown[]) => facilityMocks.resourceFindUnique(...args),
    },
  },
}));
vi.mock("@/lib/facilities/facility-delete-service", () => ({
  getFacilityDeletionImpact: facilityMocks.getFacilityDeletionImpact,
  deleteFacilityPermanently: facilityMocks.deleteFacilityPermanently,
  getFacilityResourceDeletionImpact: facilityMocks.getFacilityResourceDeletionImpact,
  deleteFacilityResourcePermanently: facilityMocks.deleteFacilityResourcePermanently,
}));

import { POST as postFacility } from "@/app/api/facilities/route";
import { PATCH as patchFacility } from "@/app/api/facilities/[facilityId]/route";
import { POST as postResource } from "@/app/api/facilities/[facilityId]/resources/route";
import { PATCH as patchResource } from "@/app/api/facilities/[facilityId]/resources/[resourceId]/route";
import { DELETE as deleteFacilityPermanent } from "@/app/api/facilities/[facilityId]/permanent/route";
import { DELETE as deleteResourcePermanent } from "@/app/api/facilities/[facilityId]/resources/[resourceId]/permanent/route";

const TENANT = "tenant-a";
const FACILITY_ID = "facility-1";
const RESOURCE_ID = "resource-1";

function authOk() {
  return {
    ok: true as const,
    status: 200,
    error: null,
    session: { user: { id: "u1", activeTenantId: TENANT } },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  facilityMocks.requireApiAnyPermission.mockResolvedValue(authOk());
  facilityMocks.createFacility.mockResolvedValue({ id: FACILITY_ID, name: "Test" });
  facilityMocks.updateFacility.mockResolvedValue(undefined);
  facilityMocks.getFacilityById.mockResolvedValue({ id: FACILITY_ID, tenantId: TENANT });
  facilityMocks.createFacilityResource.mockResolvedValue({
    id: RESOURCE_ID,
    tenantId: TENANT,
    facilityId: FACILITY_ID,
    code: "P1",
    name: "Pitch",
  });
  facilityMocks.updateFacilityResource.mockResolvedValue(undefined);
  facilityMocks.auth.mockResolvedValue({ user: { id: "u1" } });
  facilityMocks.hasTenantDeletionAuthority.mockResolvedValue(true);
  facilityMocks.logAction.mockResolvedValue(undefined);
  facilityMocks.facilityFindUnique.mockResolvedValue({
    id: FACILITY_ID,
    tenantId: TENANT,
    name: "F",
  });
  facilityMocks.resourceFindUnique.mockResolvedValue({
    id: RESOURCE_ID,
    tenantId: TENANT,
    facilityId: FACILITY_ID,
    name: "R",
    code: "R1",
  });
});

describe("08-08B facility mutation revalidation", () => {
  it("FACILITY create → revalidate", async () => {
    const res = await postFacility(
      new NextRequest("http://localhost/api/facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New", type: "PITCH" }),
      }),
    );
    expect(res.status).toBe(201);
    expect(revalidateAfterSuccessfulFacilityMutation).toHaveBeenCalledTimes(1);
  });

  it("FACILITY update → revalidate", async () => {
    const res = await patchFacility(
      new NextRequest(`http://localhost/api/facilities/${FACILITY_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Renamed" }),
      }),
      { params: Promise.resolve({ facilityId: FACILITY_ID }) },
    );
    expect(res.status).toBe(200);
    expect(revalidateAfterSuccessfulFacilityMutation).toHaveBeenCalledTimes(1);
  });

  it("FACILITY update validation failure → no revalidate", async () => {
    const res = await patchFacility(
      new NextRequest(`http://localhost/api/facilities/${FACILITY_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ facilityId: FACILITY_ID }) },
    );
    expect(res.status).toBe(400);
    expect(revalidateAfterSuccessfulFacilityMutation).not.toHaveBeenCalled();
  });

  it("RESOURCE create → revalidate", async () => {
    const res = await postResource(
      new NextRequest(`http://localhost/api/facilities/${FACILITY_ID}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Pitch", code: "P1", type: "FULL_PITCH" }),
      }),
      { params: Promise.resolve({ facilityId: FACILITY_ID }) },
    );
    expect(res.status).toBe(201);
    expect(revalidateAfterSuccessfulFacilityMutation).toHaveBeenCalledTimes(1);
  });

  it("RESOURCE rename pitch → revalidate", async () => {
    const res = await patchResource(
      new NextRequest(
        `http://localhost/api/facilities/${FACILITY_ID}/resources/${RESOURCE_ID}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Renamed pitch" }),
        },
      ),
      { params: Promise.resolve({ facilityId: FACILITY_ID, resourceId: RESOURCE_ID }) },
    );
    expect(res.status).toBe(200);
    expect(revalidateAfterSuccessfulFacilityMutation).toHaveBeenCalledTimes(1);
  });

  it("RESOURCE archive → revalidate", async () => {
    const res = await patchResource(
      new NextRequest(
        `http://localhost/api/facilities/${FACILITY_ID}/resources/${RESOURCE_ID}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ARCHIVED" }),
        },
      ),
      { params: Promise.resolve({ facilityId: FACILITY_ID, resourceId: RESOURCE_ID }) },
    );
    expect(res.status).toBe(200);
    expect(revalidateAfterSuccessfulFacilityMutation).toHaveBeenCalledTimes(1);
  });

  it("RESOURCE blocked lifecycle error → no revalidate", async () => {
    const { FacilityLifecycleError } = await import("@/lib/facilities/facility-lifecycle-errors");
    facilityMocks.updateFacilityResource.mockRejectedValue(
      new FacilityLifecycleError("DUPLICATE_RESOURCE", "dup"),
    );
    const res = await patchResource(
      new NextRequest(
        `http://localhost/api/facilities/${FACILITY_ID}/resources/${RESOURCE_ID}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: "DUP" }),
        },
      ),
      { params: Promise.resolve({ facilityId: FACILITY_ID, resourceId: RESOURCE_ID }) },
    );
    expect(res.status).toBe(409);
    expect(revalidateAfterSuccessfulFacilityMutation).not.toHaveBeenCalled();
  });

  it("FACILITY safe permanent delete → revalidate", async () => {
    facilityMocks.deleteFacilityPermanently.mockResolvedValue({
      facilityId: FACILITY_ID,
      name: "F",
      impact: { resources: 0, totalAllocationRefs: 0 },
    });
    const res = await deleteFacilityPermanent(
      new NextRequest(`http://localhost/api/facilities/${FACILITY_ID}/permanent?confirm=true`),
      { params: Promise.resolve({ facilityId: FACILITY_ID }) },
    );
    expect(res.status).toBe(200);
    expect(revalidateAfterSuccessfulFacilityMutation).toHaveBeenCalledTimes(1);
  });

  it("FACILITY delete preview → no revalidate", async () => {
    facilityMocks.getFacilityDeletionImpact.mockResolvedValue({
      resources: 1,
      totalAllocationRefs: 0,
      deletable: true,
    });
    const res = await deleteFacilityPermanent(
      new NextRequest(`http://localhost/api/facilities/${FACILITY_ID}/permanent`),
      { params: Promise.resolve({ facilityId: FACILITY_ID }) },
    );
    expect(res.status).toBe(200);
    expect(revalidateAfterSuccessfulFacilityMutation).not.toHaveBeenCalled();
  });

  it("FACILITY blocked delete → no revalidate", async () => {
    const { FacilityLifecycleError } = await import("@/lib/facilities/facility-lifecycle-errors");
    facilityMocks.deleteFacilityPermanently.mockRejectedValue(
      new FacilityLifecycleError("FACILITY_IN_USE", "blocked"),
    );
    const res = await deleteFacilityPermanent(
      new NextRequest(`http://localhost/api/facilities/${FACILITY_ID}/permanent?confirm=true`),
      { params: Promise.resolve({ facilityId: FACILITY_ID }) },
    );
    expect(res.status).toBe(409);
    expect(revalidateAfterSuccessfulFacilityMutation).not.toHaveBeenCalled();
  });

  it("RESOURCE safe permanent delete → revalidate", async () => {
    facilityMocks.deleteFacilityResourcePermanently.mockResolvedValue({
      resourceId: RESOURCE_ID,
      name: "R",
      code: "R1",
      impact: { totalAllocationRefs: 0 },
    });
    const res = await deleteResourcePermanent(
      new NextRequest(
        `http://localhost/api/facilities/${FACILITY_ID}/resources/${RESOURCE_ID}/permanent?confirm=true`,
      ),
      { params: Promise.resolve({ facilityId: FACILITY_ID, resourceId: RESOURCE_ID }) },
    );
    expect(res.status).toBe(200);
    expect(revalidateAfterSuccessfulFacilityMutation).toHaveBeenCalledTimes(1);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  orgUnit: { findFirst: vi.fn() },
  personAssignment: { findFirst: vi.fn(), create: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

import {
  ensureVlPersonOrgAssignment,
  VlPersonOrgAssignmentError,
} from "@/lib/admin/vl-onboarding/ensure-vl-person-org-assignment";

const TENANT_ID = "tenant-fca";
const PERSON_ID = "person-1";
const ORG_UNIT_ID = "org-vl";

describe("ensureVlPersonOrgAssignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.orgUnit.findFirst.mockResolvedValue({ id: ORG_UNIT_ID });
    prismaMock.personAssignment.findFirst.mockResolvedValue(null);
    prismaMock.personAssignment.create.mockResolvedValue({ id: "pa-new" });
  });

  it("rejects unconfirmed organisational function", async () => {
    await expect(
      ensureVlPersonOrgAssignment({ tenantId: TENANT_ID, personId: PERSON_ID }),
    ).rejects.toMatchObject({ code: "VL_ORG_FUNCTION_UNCONFIRMED" });
    expect(prismaMock.personAssignment.create).not.toHaveBeenCalled();
  });

  it("creates assignment when function key is confirmed", async () => {
    const result = await ensureVlPersonOrgAssignment({
      tenantId: TENANT_ID,
      personId: PERSON_ID,
      functionKey: "VORSTANDSMITGLIED",
    });
    expect(result.created).toBe(true);
    expect(prismaMock.personAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ functionKey: "VORSTANDSMITGLIED" }),
      }),
    );
  });

  it("throws when VL org unit is missing", async () => {
    prismaMock.orgUnit.findFirst.mockResolvedValue(null);
    await expect(
      ensureVlPersonOrgAssignment({
        tenantId: TENANT_ID,
        personId: PERSON_ID,
        functionKey: "KOORDINATOR",
      }),
    ).rejects.toBeInstanceOf(VlPersonOrgAssignmentError);
  });
});
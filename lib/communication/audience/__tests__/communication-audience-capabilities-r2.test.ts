import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  getEffectivePermissions: vi.fn(),
}));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    getEffectivePermissions: mocks.getEffectivePermissions,
  }),
}));

import { resolveCommunicationAudienceCapabilities } from "@/lib/communication/audience/communication-audience-capabilities";

describe("resolveCommunicationAudienceCapabilities (R2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TARGET_GROUP_MANAGEMENT — manager without communication send can see structural sources", async () => {
    mocks.getEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE],
    });
    const caps = await resolveCommunicationAudienceCapabilities({
      tenantId: "t1",
      userId: "u1",
      context: { kind: "ORGANISATION", tenantId: "t1" },
      discoverContext: "TARGET_GROUP_MANAGEMENT",
    });
    expect(caps.orgUnits).toBe(true);
    expect(caps.teams).toBe(true);
    expect(caps.roles).toBe(true);
    expect(caps.targetGroups).toBe(false);
    expect(caps.persons).toBe(true);
    expect(caps.externalContacts).toBe(true);
  });

  it("ORGANISATION send — requires club send for visibility (unchanged)", async () => {
    mocks.getEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE],
    });
    const caps = await resolveCommunicationAudienceCapabilities({
      tenantId: "t1",
      userId: "u1",
      context: { kind: "ORGANISATION", tenantId: "t1" },
      discoverContext: "ORGANISATION",
    });
    expect(caps.orgUnits).toBe(false);
    expect(caps.teams).toBe(false);
  });

  it("TARGET_GROUP_MANAGEMENT — explicit DENY on manage removes capabilities", async () => {
    mocks.getEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [],
    });
    const caps = await resolveCommunicationAudienceCapabilities({
      tenantId: "t1",
      userId: "u1",
      context: { kind: "ORGANISATION", tenantId: "t1" },
      discoverContext: "TARGET_GROUP_MANAGEMENT",
    });
    expect(caps.orgUnits).toBe(false);
  });
});

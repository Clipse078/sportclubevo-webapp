/**
 * SCE-SELECTOR-01R2 — communication audience discover authorization recovery
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getActiveTenant: vi.fn(),
  requireApiAnyPermission: vi.fn(),
  resolveCommunicationAudienceCapabilities: vi.fn(),
  discoverCommunicationAudienceTargets: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/tenants/active-tenant", () => ({ getActiveTenant: mocks.getActiveTenant }));
vi.mock("@/lib/permissions/require-api-any-permission", () => ({
  requireApiAnyPermission: mocks.requireApiAnyPermission,
}));
vi.mock("@/lib/communication/audience/communication-audience-capabilities", () => ({
  resolveCommunicationAudienceCapabilities: mocks.resolveCommunicationAudienceCapabilities,
}));
vi.mock("@/lib/communication/audience/communication-audience-search-service", () => ({
  discoverCommunicationAudienceTargets: mocks.discoverCommunicationAudienceTargets,
}));

import { GET } from "../route";
import { SCE_SELECTOR_DISCOVER_ERROR_FORBIDDEN } from "@/lib/sce/list-selector/selector-discover-api-errors";

describe("GET /api/communication/audience/discover (R2 authorization)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.getActiveTenant.mockResolvedValue({ id: "tenant-1", key: "fca" });
    mocks.requireApiAnyPermission.mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      session: { user: { id: "user-1" } },
    });
    mocks.resolveCommunicationAudienceCapabilities.mockResolvedValue({
      wholeOrganisation: false,
      orgUnits: true,
      teams: true,
      roles: true,
      targetGroups: false,
      persons: false,
      externalContacts: false,
    });
    mocks.discoverCommunicationAudienceTargets.mockResolvedValue([
      { kind: "orgUnit", heading: "Organisation", options: [{ id: "ou1", label: "OU" }] },
    ]);
  });

  it("Zielgruppen manager browse integration — TARGET_GROUP_MANAGEMENT returns 200", async () => {
    const req = new Request(
      "http://local/api/communication/audience/discover?context=TARGET_GROUP_MANAGEMENT&category=all&q=&sources=orgUnit,team,role",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mocks.requireApiAnyPermission).toHaveBeenCalledWith(
      expect.arrayContaining([PERMISSIONS.COMMUNICATION_ZIELGRUPPEN_MANAGE]),
      "tenant-1",
    );
    expect(mocks.resolveCommunicationAudienceCapabilities).toHaveBeenCalledWith(
      expect.objectContaining({ discoverContext: "TARGET_GROUP_MANAGEMENT" }),
    );
    expect(mocks.discoverCommunicationAudienceTargets).toHaveBeenCalledWith(
      expect.objectContaining({
        discoverContext: "TARGET_GROUP_MANAGEMENT",
        enabledKinds: ["orgUnit", "team", "role"],
      }),
    );
  });

  it("organisation composer still requires communication club permissions", async () => {
    const req = new Request(
      "http://local/api/communication/audience/discover?context=ORGANISATION&category=all&q=&sources=orgUnit",
    );
    await GET(req);
    expect(mocks.requireApiAnyPermission).toHaveBeenCalledWith(
      expect.arrayContaining([PERMISSIONS.COMMUNICATION_CLUB_SEND]),
      "tenant-1",
    );
  });

  it("returns German 403 body (not raw Forbidden)", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
      session: { user: { id: "user-1" } },
    });
    const req = new Request(
      "http://local/api/communication/audience/discover?context=TARGET_GROUP_MANAGEMENT&category=all&q=&sources=orgUnit",
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe(SCE_SELECTOR_DISCOVER_ERROR_FORBIDDEN);
    expect(body.error).not.toBe("Forbidden");
  });

  it("returns 400 for invalid context", async () => {
    const res = await GET(
      new Request(
        "http://local/api/communication/audience/discover?context=NOT_A_CONTEXT&category=all&q=",
      ),
    );
    expect(res.status).toBe(400);
  });
});

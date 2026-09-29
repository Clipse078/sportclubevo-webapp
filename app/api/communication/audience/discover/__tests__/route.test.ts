/**
 * SCE-SELECTOR-01R1 — communication audience discover route contract
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("GET /api/communication/audience/discover", () => {
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
      {
        kind: "orgUnit",
        heading: "Organisation",
        options: [{ id: "ou1", label: "OU" }],
      },
      {
        kind: "team",
        heading: "Teams",
        options: [{ id: "t1", label: "Team" }],
      },
      {
        kind: "role",
        heading: "Rollen",
        options: [{ id: "r1", label: "Role" }],
      },
    ]);
  });

  it("returns browse groups for empty query with sources=orgUnit,team,role", async () => {
    const req = new Request(
      "http://local/api/communication/audience/discover?context=ORGANISATION&category=all&q=&sources=orgUnit,team,role",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      groups: Array<{ kind: string; options: unknown[] }>;
      noAccess: boolean;
    };
    expect(body.noAccess).toBe(false);
    expect(body.groups.map((g) => g.kind)).toEqual(["orgUnit", "team", "role"]);
    expect(
      body.groups.reduce((sum, g) => sum + g.options.length, 0),
    ).toBeGreaterThanOrEqual(3);
    expect(mocks.discoverCommunicationAudienceTargets).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "",
        category: "all",
        enabledKinds: ["orgUnit", "team", "role"],
      }),
    );
  });

  it("returns 403 JSON for unauthorized API callers (no NEXT_REDIRECT)", async () => {
    mocks.requireApiAnyPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
      session: { user: { id: "user-1" } },
    });
    const req = new Request(
      "http://local/api/communication/audience/discover?context=ORGANISATION&category=all&q=&sources=orgUnit,team,role",
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe(SCE_SELECTOR_DISCOVER_ERROR_FORBIDDEN);
  });
});

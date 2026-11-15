import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../route";

const mocks = vi.hoisted(() => ({
  requireStrategicApiContext: vi.fn(),
  requireTargetAccess: vi.fn(),
  listTargetInitiativeLinks: vi.fn(),
  linkInitiativeTarget: vi.fn(),
  canActorSeeInitiative: vi.fn(),
}));

vi.mock("@/lib/permissions/require-strategic-api-context", () => ({
  requireStrategicApiContext: mocks.requireStrategicApiContext,
}));

vi.mock("@/lib/visibility/visibility-guards", () => ({
  requireTargetAccess: mocks.requireTargetAccess,
}));

vi.mock("@/lib/club-development/initiative-target-links", () => ({
  InitiativeTargetLinkError: class InitiativeTargetLinkError extends Error {},
  listTargetInitiativeLinks: mocks.listTargetInitiativeLinks,
  linkInitiativeTarget: mocks.linkInitiativeTarget,
  unlinkInitiativeTarget: vi.fn(),
}));

vi.mock("@/lib/club-development/strategy-overview", () => ({
  canActorSeeInitiative: mocks.canActorSeeInitiative,
}));

describe("GET /api/club-development/targets/[id]/initiative-links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireStrategicApiContext.mockResolvedValue({
      ok: true,
      context: { actor: { userId: "u1" }, tenantId: "tenant-1" },
    });
    mocks.requireTargetAccess.mockResolvedValue({ ok: true });
  });

  it("returns visible initiative links", async () => {
    mocks.listTargetInitiativeLinks.mockResolvedValue([
      {
        id: "link-1",
        initiative: { id: "init-1", slug: "a", title: "A", status: "PLANNED" },
      },
    ]);
    mocks.canActorSeeInitiative.mockResolvedValue(true);

    const res = await GET(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: "target-1" }),
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.links).toHaveLength(1);
  });

  it("denies when target access fails", async () => {
    mocks.requireTargetAccess.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    });

    const res = await GET(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: "target-1" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/club-development/targets/[id]/initiative-links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireStrategicApiContext.mockResolvedValue({
      ok: true,
      context: { actor: { userId: "u1" }, tenantId: "tenant-1" },
    });
    mocks.requireTargetAccess.mockResolvedValue({ ok: true });
    mocks.canActorSeeInitiative.mockResolvedValue(true);
  });

  it("creates canonical initiative link", async () => {
    mocks.linkInitiativeTarget.mockResolvedValue({
      id: "link-1",
      initiativeId: "init-1",
      initiative: { id: "init-1", slug: "a", title: "A", status: "PLANNED" },
    });

    const req = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ initiativeId: "init-1" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "target-1" }) });
    expect(res.status).toBe(201);
    expect(mocks.linkInitiativeTarget).toHaveBeenCalledWith("tenant-1", "init-1", "target-1");
  });

  it("rejects invisible initiative", async () => {
    mocks.canActorSeeInitiative.mockResolvedValue(false);
    const req = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ initiativeId: "init-x" }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "target-1" }) });
    expect(res.status).toBe(404);
    expect(mocks.linkInitiativeTarget).not.toHaveBeenCalled();
  });
});
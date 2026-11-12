import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/initiatives/queries", () => ({
  getInitiativeById: vi.fn(),
}));

describe("resolveMeetingAgendaInitiativeLink", () => {
  it("rejects invisible initiatives", async () => {
    const { getInitiativeById } = await import("@/lib/initiatives/queries");
    vi.mocked(getInitiativeById).mockResolvedValue(null);
    const { resolveMeetingAgendaInitiativeLink } = await import("@/lib/meetings/meeting-initiative-link");
    await expect(
      resolveMeetingAgendaInitiativeLink({ tenantId: "t1", userId: "u1", permissionKeys: [] } as never, "init-1"),
    ).rejects.toThrow(/nicht gefunden/);
  });

  it("returns snapshot for visible initiative", async () => {
    const { getInitiativeById } = await import("@/lib/initiatives/queries");
    vi.mocked(getInitiativeById).mockResolvedValue({
      id: "init-1",
      slug: "vorhaben-a",
      title: "Vorhaben A",
      status: "ACTIVE",
    } as never);
    const { resolveMeetingAgendaInitiativeLink } = await import("@/lib/meetings/meeting-initiative-link");
  const result = await resolveMeetingAgendaInitiativeLink(
      { tenantId: "t1", userId: "u1", permissionKeys: ["initiatives.view"] } as never,
      "init-1",
    );
    expect(result.initiativeId).toBe("init-1");
    expect(result.slug).toBe("vorhaben-a");
  });
});

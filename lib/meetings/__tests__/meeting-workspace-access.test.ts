import { describe, expect, it, vi } from "vitest";

/**
 * Ensures meeting workspace REST paths stay aligned with API routes (regression guard).
 */
describe("meeting workspace API surface", () => {
  it("exports mutation helpers for all sub-entities", async () => {
    const { meetingWorkspaceApi } = await import("@/lib/meetings/meeting-workspace-mutations");
    expect(meetingWorkspaceApi.agenda.create).toBeTypeOf("function");
    expect(meetingWorkspaceApi.participants.create).toBeTypeOf("function");
    expect(meetingWorkspaceApi.decisions.create).toBeTypeOf("function");
    expect(meetingWorkspaceApi.actions.create).toBeTypeOf("function");
  });

  it("postJson surfaces server errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Forbidden" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { postJson } = await import("@/lib/meetings/meeting-workspace-mutations");
    await expect(postJson("/api/meetings/x/agenda", "POST", { title: "T" })).rejects.toThrow("Forbidden");

    vi.unstubAllGlobals();
  });
});

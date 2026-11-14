import { describe, expect, it, vi, afterEach } from "vitest";
import { clubDevelopmentFetchJson } from "../client-fetch";

describe("clubDevelopmentFetchJson", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps 403 JSON errors without calling them network errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers: { get: () => "application/json" },
        json: async () => ({ error: "Forbidden" }),
      }),
    );

    const result = await clubDevelopmentFetchJson("/api/club-development/initiatives/backlog");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Berechtigung");
      expect(result.status).toBe(403);
    }
  });

  it("maps non-JSON responses separately from connection failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        headers: { get: () => "text/html" },
        text: async () => "<html>gateway</html>",
      }),
    );

    const result = await clubDevelopmentFetchJson("/api/initiatives");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Server");
      expect(result.status).toBe(502);
    }
  });

  it("reports connection failures distinctly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await clubDevelopmentFetchJson("/api/initiatives");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Verbindungsfehler");
      expect(result.status).toBeNull();
    }
  });
});
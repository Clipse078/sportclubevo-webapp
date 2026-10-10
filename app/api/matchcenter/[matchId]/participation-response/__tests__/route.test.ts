import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

describe("POST /api/matchcenter/[matchId]/participation-response", () => {
  it("rejects trainer match availability writes (R2.2 read-only trainer model)", async () => {
    const req = new NextRequest("http://localhost/api/matchcenter/m1/participation-response", {
      method: "POST",
      body: JSON.stringify({ personId: "p1", status: "YES" }),
    });
    const res = await POST(req, { params: Promise.resolve({ matchId: "m1" }) });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code?: string; error?: string };
    expect(body.code).toBe("MATCH_AVAILABILITY_TRAINER_WRITE_DISABLED");
    expect(body.error).toMatch(/Spieler/);
  });
});

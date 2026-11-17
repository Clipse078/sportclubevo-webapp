import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MEETING_CANONICAL_STAGE_APP_URL } from "@/lib/meetings/meeting-deployment-urls";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("meeting outcome delete policy", () => {
  it("aligns DELETE with PATCH: requireMeetingAccess write + canEditMeetingDocumentation", () => {
    const decisionDelete = read("app/api/meetings/[id]/decisions/[decisionId]/route.ts");
    const actionDelete = read("app/api/meetings/[id]/actions/[actionId]/route.ts");
    for (const src of [decisionDelete, actionDelete]) {
      expect(src).toContain('requireMeetingAccess({ actor, id, access: "write" }');
      expect(src).toContain("canEditMeetingDocumentation");
      expect(src).not.toContain("MEETINGS_DELETE");
    }
    expect(read("lib/meetings/meeting-workspace-lock.ts")).toContain("canEditMeetingDocumentation");
  });

  it("uses tenant scope on meeting lookup for cross-tenant isolation", () => {
    const decisionDelete = read("app/api/meetings/[id]/decisions/[decisionId]/route.ts");
    expect(decisionDelete).toContain("tenantId: actor.tenantId");
    expect(decisionDelete).toContain("meeting: { tenantId: actor.tenantId }");
  });

  it("documents canonical STAGE host separately from preview acceptance", () => {
    expect(MEETING_CANONICAL_STAGE_APP_URL).toBe("https://fcallschwil.sportclubevo.com");
  });
});
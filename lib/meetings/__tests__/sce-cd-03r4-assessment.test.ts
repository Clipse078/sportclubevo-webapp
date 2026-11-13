import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE-CD-03R4 assessment artifacts", () => {
  it("documents decision vs action documentation gaps", () => {
    const doc = read("docs/roadmap/SCE-CD-03R4-DECISION-ACTION-DOCUMENTATION.md");
    expect(doc).toContain("MeetingDecision");
    expect(doc).toContain("MeetingAction");
    expect(doc).toContain("persistence approval");
  });

  it("meeting decisions already expose description editing", () => {
    const sections = read("components/admin/meetings/workspace/MeetingWorkspaceSections.tsx");
    expect(sections).toContain("descriptionDraft");
    expect(sections).toContain("Beschreibung bearbeiten");
  });

  it("schema shows action without description fields (pre-migration)", () => {
    const schema = read("prisma/schema.prisma");
    const actionBlock = schema.slice(
      schema.indexOf("model MeetingAction {"),
      schema.indexOf("model Task {"),
    );
    expect(actionBlock).not.toMatch(/expectedOutcome/);
    expect(actionBlock).not.toMatch(/description\s+String/);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSrc(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("meeting workspace anchor section navigation", () => {
  it("exposes accessible collapse controls and preserves panel content when hidden", () => {
    const section = readSrc("components/admin/meetings/workspace/MeetingWorkspaceCollapsibleSection.tsx");
    expect(section).toContain("aria-expanded");
    expect(section).toContain("aria-controls");
    expect(section).toContain("hidden={!expanded}");
    expect(section).toContain("motion-reduce:transition-none");
  });

  it("keeps section provider hash sync without exclusive tab panels", () => {
    const ctx = readSrc("components/admin/meetings/workspace/MeetingWorkspaceSectionsContext.tsx");
    expect(ctx).toContain("hashchange");
    expect(ctx).toContain("pushState");
    expect(ctx).toContain("IntersectionObserver");
    expect(ctx).toContain("ResizeObserver");
    expect(ctx).not.toContain("requestClose");
    expect(ctx).not.toContain("router.push");
  });

  it("defers Pendenzen panel mount until first expansion", () => {
    const workspace = readSrc("components/admin/meetings/workspace/MeetingWorkspace.tsx");
    expect(workspace).toMatch(/sectionId="pendenzen"[\s\S]*lazy/);
    expect(workspace).not.toContain("fetch(`/api/meetings/${meeting.id}/pendenzen`)");
  });
});
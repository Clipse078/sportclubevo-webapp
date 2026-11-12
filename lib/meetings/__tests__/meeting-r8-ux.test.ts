import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSrc(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("SCE-CD-02R8 meetings list navigation UX", () => {
  it("uses stretch link with pointer-events-none content shell", () => {
    const list = readSrc("components/admin/vereinsleitung/VereinsleitungMeetingsList.tsx");
    expect(list).toContain('data-testid="vereinsleitung-meeting-card-link"');
    expect(list).toContain("absolute inset-0");
    expect(list).toContain("pointer-events-none");
    expect(list).toContain('data-testid="vereinsleitung-meeting-card-edit"');
    expect(list).toContain("pointer-events-auto");
    expect(list).toContain('href={detailHref}');
    expect(list).not.toMatch(/href=\{`\$\{detailHref\}`\}[^>]*>[\s\S]*href=\{`\$\{detailHref\}`\}/);
  });

  it("sorts meetings for list via shared helper", () => {
    const queries = readSrc("lib/meetings/queries.ts");
    expect(queries).toContain("sortMeetingsForList");
    expect(readSrc("lib/meetings/meeting-list-sort.ts")).toContain("sortMeetingsForList");
  });

  it("gates Bearbeiten behind meetings manage permission on list page", () => {
    const page = readSrc("app/(admin)/vereinsleitung/meetings/page.tsx");
    expect(page).toContain("PERMISSIONS.MEETINGS_MANAGE");
    expect(page).toContain("canManage={canManage}");
  });
});

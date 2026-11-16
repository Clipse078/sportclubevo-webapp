import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

function readSrc(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("Meeting deletion UI/API policy alignment", () => {
  it("uses MEETINGS_DELETE in page and permanent route", () => {
    const page = readSrc("app/(admin)/vereinsleitung/meetings/[slug]/page.tsx");
    const route = readSrc("app/api/meetings/[id]/permanent/route.ts");
    expect(PERMISSIONS.MEETINGS_DELETE).toBe("meetings.delete");
    expect(page).toContain("PERMISSIONS.MEETINGS_DELETE");
    expect(page).toContain("hasTenantDeletionAuthority");
    expect(route).toContain("PERMISSIONS.MEETINGS_DELETE");
    expect(route).toContain("hasTenantDeletionAuthority");
  });

  it("labels permanent delete distinctly from lifecycle cancel", () => {
    const deleteCopy = readSrc("lib/meetings/meeting-deletion-confirm-copy.ts");
    const lifecycle = readSrc("app/api/meetings/[id]/lifecycle/route.ts");
    expect(deleteCopy).toContain("Sitzung");
    expect(deleteCopy).not.toContain("abgesagt");
    expect(lifecycle).toContain('case "cancel"');
    expect(lifecycle).toContain("MeetingStatus.CANCELLED");
  });

  it("shows list feedback after permanent delete via status query param", () => {
    const listPage = readSrc("app/(admin)/vereinsleitung/meetings/page.tsx");
    const deleteUi = readSrc("components/admin/meetings/MeetingDeleteButton.tsx");
    expect(listPage).toContain('status === "deleted"');
    expect(listPage).toContain("Sitzung wurde gelöscht.");
    expect(deleteUi).toContain("/vereinsleitung/meetings?status=deleted");
  });
});
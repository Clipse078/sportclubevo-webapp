import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyClubEventMaterialChanges } from "@/lib/club-events/composer/club-event-material-change";
import { createEmptyClubEventComposerDraft } from "@/lib/club-events/composer/club-event-composer-draft-types";
import { clubEventPublishedVisibilityWhere } from "@/lib/events/club-event-published-visibility";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { validateActivityGovernanceConfiguration } from "@/lib/sce/activity-governance/configuration-validation";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01C — Club Event reference adoption", () => {
  it("production /new route adopts SceActivityComposer", () => {
    const page = read("app/(admin)/dashboard/veranstaltungen/new/page.tsx");
    const form = read("components/admin/veranstaltungen/VeranstaltungCreateForm.tsx");
    expect(form).toContain("SceActivityComposer");
    expect(page).toContain("loadClubEventEffectiveGovernanceForSession");
  });

  it("does not introduce generic Activity entity migration", () => {
    const migration = read(
      "prisma/migrations/20261013143000_sce_activity_create_01c_club_event/migration.sql",
    );
    expect(migration).not.toMatch(/CREATE TABLE "Activity"/);
    expect(existsSync(join(root, "app/api/activity/route.ts"))).toBe(false);
  });

  it("seeds club event approve permission key", () => {
    expect(PERMISSIONS.ACTIVITIES_CLUB_EVENT_APPROVE).toBe("activities.club_event.approve");
  });

  it("published visibility excludes non-published review stages", () => {
    expect(clubEventPublishedVisibilityWhere().reviewStage).toEqual({
      in: ["APPROVED", "PUBLISHED"],
    });
  });

  it("material change classifier detects schedule edits", () => {
    const base = createEmptyClubEventComposerDraft();
    const changed = {
      ...base,
      schedule: { ...base.schedule, startDate: "2026-11-01" },
    };
    expect(classifyClubEventMaterialChanges(base, changed)).toContain("SCHEDULE");
  });

  it("blocks approval-required without validators", () => {
    const issues = validateActivityGovernanceConfiguration({
      tenantId: "t1",
      activityTypes: [
        {
          activityType: "CLUB_EVENT",
          defaultPublicationAuthority: "DIRECT_PUBLISH",
          validatorPersonIds: [],
          creatorPolicies: [
            { personId: "p1", publicationAuthority: "APPROVAL_REQUIRED" },
          ],
        },
      ],
    });
    expect(issues.length).toBeGreaterThan(0);
  });

  it("provides validator review surface", () => {
    expect(existsSync(join(root, "app/(admin)/dashboard/veranstaltungen/freigaben/page.tsx"))).toBe(
      true,
    );
  });
});

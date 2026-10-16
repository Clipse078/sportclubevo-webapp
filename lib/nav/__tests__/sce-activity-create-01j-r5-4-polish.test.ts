/**
 * SCE-ACTIVITY-CREATE-01J-R5.4 — programme borders, publishing IA, planner detail contracts.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import {
  buildAppNavigationModelForUser,
  isDomainPanelSecondaryItemRouteActive,
  resolveActiveAppNavigation,
  resolveDomainSecondaryNavItems,
  resolveSecondaryNavItemModuleLocalChildren,
} from "@/lib/nav/app-navigation-model";
import { PUBLISHING_TARGET_L2_GROUPS } from "@/lib/nav/nav-ia-v2/target-ia-matrix";
import {
  SCE_PROGRAMME_ACTIVITY_CARD_EMPHASIS_CLASS,
  SCE_PROGRAMME_ACTIVITY_CARD_SHELL_CLASS,
} from "@/lib/sporting-activity-presentation/canonical/activity-card-programme-shell";
import { CALENDAR_MIN_ACTIVITY_WIDTH_PX } from "@/lib/planning-hub/scheduler/calendar-day-layout";
import { resolvePlannerActivityBlockDensity } from "@/lib/planning-hub/planner-activity-block-density";

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS) as PermissionKey[];

function readRelative(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01J-R5.4 programme border hierarchy", () => {
  it("uses neutral programme shell borders without nested accent rings", () => {
    expect(SCE_PROGRAMME_ACTIVITY_CARD_SHELL_CLASS).toContain("border-[var(--sce-surface-border-elevated)]");
    expect(SCE_PROGRAMME_ACTIVITY_CARD_SHELL_CLASS).not.toContain("sce-primary");
    expect(SCE_PROGRAMME_ACTIVITY_CARD_EMPHASIS_CLASS).toContain("--border-strong");
    expect(SCE_PROGRAMME_ACTIVITY_CARD_EMPHASIS_CLASS).not.toContain("sce-primary");
  });

  it("removes day-group accent rings from PersonalProgrammeFeed", () => {
    const feed = readRelative("components/ui/dashboard/PersonalProgrammeFeed.tsx");
    const row = readRelative("components/ui/dashboard/PersonalProgrammeCanonicalAgendaRow.tsx");
    expect(feed).not.toContain("ring-[color-mix(in_srgb,var(--sce-primary)");
    expect(row).toContain("SCE_PROGRAMME_ACTIVITY_CARD_EMPHASIS_CLASS");
    expect(SCE_PROGRAMME_ACTIVITY_CARD_EMPHASIS_CLASS).not.toContain("sce-primary");
  });

  it("keeps shared programme shell on programme surfaces", () => {
    for (const path of [
      "components/programme/ProgrammeSceActivityCard.tsx",
      "components/ui/dashboard/PersonalProgrammeCanonicalAgendaRow.tsx",
    ]) {
      expect(readRelative(path)).toContain("SceProgrammeActivityCardShell");
    }
  });
});

describe("SCE-ACTIVITY-CREATE-01J-R5.4 Publizieren channel IA", () => {
  it("defines channel-oriented L2 groups without Inhalte", () => {
    const labels = PUBLISHING_TARGET_L2_GROUPS.filter((g) => g.headerVisible).map((g) => g.label);
    expect(labels).toEqual(["Website", "Infoboard", "Mobile App", "Medien"]);
    expect(labels).not.toContain("Inhalte");
    expect(labels).not.toContain("Kanäle");
  });

  it("orders Website L3 with News first", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const publishing = model.domains.find((d) => d.id === "publishing")!;
    const websiteL2 = resolveDomainSecondaryNavItems(publishing).find((item) => item.key === "website")!;
    const children = resolveSecondaryNavItemModuleLocalChildren(publishing, websiteL2);
    expect(children[0]?.key).toBe("website-news");
    expect(children.map((c) => c.key)).not.toContain("website-media");
  });

  it("scopes Medien L3 to the media route only", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const publishing = model.domains.find((d) => d.id === "publishing")!;
    const medienL2 = resolveDomainSecondaryNavItems(publishing).find((item) => item.label === "Medien")!;
    const children = resolveSecondaryNavItemModuleLocalChildren(publishing, medienL2);
    expect(children.map((c) => c.key)).toEqual(["website-media"]);
  });

  it("marks active publishing path for Website → News without treating browse as active", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const publishing = model.domains.find((d) => d.id === "publishing")!;
    const secondary = resolveDomainSecondaryNavItems(publishing);
    const active = resolveActiveAppNavigation("/dashboard/website/news", model);
    expect(active.activeDomainId).toBe("publishing");
    expect(active.activeChildKey).toBe("website-news");

    const websiteRow = secondary.find((item) => item.key === "website")!;
    expect(
      isDomainPanelSecondaryItemRouteActive(
        "/dashboard/website/news",
        publishing,
        websiteRow,
        active.activeDestinationKey,
        active.activeChildKey,
        secondary,
      ),
    ).toBe(true);

    const infoboardRow = secondary.find((item) => item.key === "infoboard")!;
    expect(
      isDomainPanelSecondaryItemRouteActive(
        "/dashboard/website/news",
        publishing,
        infoboardRow,
        active.activeDestinationKey,
        active.activeChildKey,
        secondary,
      ),
    ).toBe(false);
  });
});

describe("SCE-ACTIVITY-CREATE-01J-R5.4 Wochenplaner detail + density", () => {
  it("removes visible planner info-button affordance", () => {
    const surface = readRelative("components/admin/planning-hub/PlanningHubActivityClippedDetailSurface.tsx");
    expect(surface).not.toContain("planning-hub-activity-detail-touch-trigger");
    expect(surface).not.toContain("<Info");
    expect(surface).toContain("useHover");
    expect(surface).toContain("useFocus");
  });

  it("defines progressive density tiers and readable calendar minimum width", () => {
    expect(CALENDAR_MIN_ACTIVITY_WIDTH_PX).toBeGreaterThanOrEqual(84);
    expect(resolvePlannerActivityBlockDensity(200)).toBe("WIDE");
    expect(resolvePlannerActivityBlockDensity(100)).toBe("MEDIUM");
    expect(resolvePlannerActivityBlockDensity(70)).toBe("NARROW");
    expect(resolvePlannerActivityBlockDensity(48)).toBe("VERY_NARROW");
  });
});

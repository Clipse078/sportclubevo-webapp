/**
 * @vitest-environment jsdom
 *
 * SCE-ACTIVITY-CREATE-01J-R5.4.1 — PO UAT corrections (automated structural guards).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import {
  buildAppNavigationModelForUser,
  isDomainPanelSecondaryItemRouteActive,
  resolveActiveAppNavigation,
  resolveDomainSecondaryNavItems,
} from "@/lib/nav/app-navigation-model";
import { getNavDestinationSceIconName } from "@/lib/nav/nav-destination-sce-icons";
import {
  PLANNER_ACTIVITY_BLOCK_DENSITY_MEDIUM_MIN_PX,
  PLANNER_ACTIVITY_BLOCK_DENSITY_NARROW_MIN_PX,
  PLANNER_ACTIVITY_BLOCK_DENSITY_WIDE_MIN_PX,
  plannerActivityBlockShowsInlineManipulationEdit,
  plannerActivityBlockShowsTypePill,
  plannerAggregateBlockShowsIdentityPreview,
  resolvePlannerActivityBlockDensity,
} from "@/lib/planning-hub/planner-activity-block-density";
import PlanningHubActivityBlock from "@/components/admin/planning-hub/PlanningHubActivityBlock";
import PlanningHubCalendarClusterBlock from "@/components/admin/planning-hub/PlanningHubCalendarClusterBlock";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";
import { vi } from "vitest";

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS) as PermissionKey[];

function readRelative(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const PITCH = {
  facilityResourceId: "res-1",
  facilityId: "fac-hf",
  code: "STADION_A",
  name: "Hauptfeld A",
  facilityName: "Hauptfeld",
  resourceType: "HALF_PITCH" as const,
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

function training(id: string): WeekplannerTrainingItem {
  const start = new Date("2026-09-15T10:00:00.000Z");
  const end = new Date(start.getTime() + 90 * 60_000);
  return {
    id,
    tenantId: "tenant",
    type: "TRAINING",
    startAt: start,
    endAt: end,
    canonicalStartAt: start,
    canonicalEndAt: end,
    timeOverridden: false,
    title: "Training",
    teamNames: ["FCA Senioren"],
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    trainingSeriesId: "s1",
    trainingSessionId: id,
    teamSeasonId: "ts1",
  };
}

describe("SCE-ACTIVITY-CREATE-01J-R5.4.1 Mobile App channel icon", () => {
  it("maps mobile-app to an approved SCE destination icon (same registry as Website/Infoboard/Medien)", () => {
    expect(getNavDestinationSceIconName("website")).toBe("website");
    expect(getNavDestinationSceIconName("infoboard")).toBe("infoboard");
    expect(getNavDestinationSceIconName("mobile-app")).toBe("contact");
    expect(getNavDestinationSceIconName("website-media")).toBe("media-library");
  });

  it("does not special-case Mobile App in the domain panel component", () => {
    const panel = readRelative("components/sce/navigation/SceDomainNavigationPanel.tsx");
    expect(panel).not.toContain("Mobile App");
  });
});

describe("SCE-ACTIVITY-CREATE-01J-R5.4.1 impersonation shell order", () => {
  it("mounts impersonation safety chrome before AppShellNavigation inside sticky shell", () => {
    const layout = readRelative("app/(admin)/layout.tsx");
    expect(layout.indexOf("<ImpersonationSafetyChrome")).toBeLessThan(
      layout.indexOf("<AppShellNavigation"),
    );
    expect(layout.indexOf("sce-authenticated-safety-chrome-stack")).toBeLessThan(
      layout.indexOf("<AppShellNavigation"),
    );
  });
});

describe("SCE-ACTIVITY-CREATE-01J-R5.4.1 planner adaptive density contract", () => {
  it("derives density tiers from layout width thresholds tied to calendar geometry", () => {
    expect(PLANNER_ACTIVITY_BLOCK_DENSITY_WIDE_MIN_PX).toBe(128);
    expect(PLANNER_ACTIVITY_BLOCK_DENSITY_MEDIUM_MIN_PX).toBeGreaterThanOrEqual(84);
    expect(PLANNER_ACTIVITY_BLOCK_DENSITY_NARROW_MIN_PX).toBe(56);
    expect(resolvePlannerActivityBlockDensity(200)).toBe("WIDE");
    expect(resolvePlannerActivityBlockDensity(100)).toBe("MEDIUM");
    expect(resolvePlannerActivityBlockDensity(70)).toBe("NARROW");
    expect(resolvePlannerActivityBlockDensity(48)).toBe("MICRO");
  });

  it("hides type pills and inline reschedule at NARROW/MICRO widths", () => {
    expect(plannerActivityBlockShowsTypePill("NARROW")).toBe(false);
    expect(plannerActivityBlockShowsTypePill("MICRO")).toBe(false);
    expect(plannerActivityBlockShowsInlineManipulationEdit("NARROW", 70)).toBe(false);
    expect(plannerActivityBlockShowsInlineManipulationEdit("MICRO", 48)).toBe(false);
  });

  it("renders representative wide vs narrow activity compositions", () => {
    const item = training("density-wide");
    const { rerender, container } = render(
      <PlanningHubActivityBlock
        item={item}
        locale="de-CH"
        timezone="UTC"
        onActivate={vi.fn()}
        onOpenManipulationEdit={vi.fn()}
        manipulationEditLabel="Termin ändern"
        blockLayoutPx={{ width: 180, height: 96 }}
        style={{ width: 180, height: 96 }}
      />,
    );
    expect(container.querySelector('[data-planning-hub-density="WIDE"]')).toBeTruthy();
    expect(screen.getByTestId("planning-hub-manipulation-edit-trigger")).toBeInTheDocument();
    expect(container.querySelector("[data-activity-type-pill]")).toBeTruthy();

    rerender(
      <PlanningHubActivityBlock
        item={item}
        locale="de-CH"
        timezone="UTC"
        compact
        onActivate={vi.fn()}
        onOpenManipulationEdit={vi.fn()}
        manipulationEditLabel="Termin ändern"
        blockLayoutPx={{ width: 62, height: 72 }}
        style={{ width: 62, height: 72 }}
      />,
    );
    expect(container.querySelector('[data-planning-hub-density="NARROW"]')).toBeTruthy();
    expect(screen.queryByTestId("planning-hub-manipulation-edit-trigger")).not.toBeInTheDocument();
    expect(container.querySelector("[data-activity-type-pill]")).toBeNull();
    expect(container.querySelector('[data-planning-hub-compact-type="true"]')).toBeTruthy();
  });

  it("uses minimal aggregate composition at MICRO width", () => {
    const items = Array.from({ length: 4 }, (_, i) => training(`agg-${i}`));
    const { container } = render(
      <PlanningHubCalendarClusterBlock
        items={items}
        dayKey="2026-09-15"
        locale="de-CH"
        timezone="UTC"
        onOpenItem={vi.fn()}
        blockLayoutPx={{ width: 48, height: 64 }}
        style={{ width: 48, height: 64 }}
      />,
    );
    expect(container.querySelector('[data-planning-hub-density="MICRO"]')).toBeTruthy();
    expect(plannerAggregateBlockShowsIdentityPreview("MICRO")).toBe(false);
    expect(screen.getByText("4 Trainings")).toBeInTheDocument();
  });
});

describe("SCE-ACTIVITY-CREATE-01J-R5.4.1 Publizieren regression", () => {
  it("keeps channel L2 order and Website → News active path", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const publishing = model.domains.find((d) => d.id === "publishing")!;
    const secondary = resolveDomainSecondaryNavItems(publishing);
    expect(secondary.map((item) => item.label)).toEqual([
      "Website",
      "Infoboard",
      "Mobile App",
      "Medien",
    ]);

    const active = resolveActiveAppNavigation("/dashboard/website/news", model);
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
  });
});

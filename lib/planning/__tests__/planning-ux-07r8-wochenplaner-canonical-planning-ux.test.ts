import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const WOCHENPLANNER_ACTIVE_SURFACES = [
  "components/admin/planner/WeekplannerPlanningSheet.tsx",
  "components/admin/planner/WeekplannerOperationalPlanningSheet.tsx",
  "components/admin/planner/WeekplannerAllocationOverrideEditor.tsx",
  "components/admin/planner/WeekplannerPlanCreateDialog.tsx",
  "components/admin/planner/WeekplannerPlanBar.tsx",
  "components/admin/planning-hub/AggregatedActivityInspectionDialog.tsx",
  "components/admin/planning-hub/PlanningHubConflictSheet.tsx",
];

describe("PLANNING-UX-07R8 Wochenplaner canonical planning UX", () => {
  describe("A — RESOURCE UX", () => {
    it("canonical and operational editors use WeekplannerPlanningResourceSection", () => {
      for (const file of [
        "components/admin/planner/WeekplannerPlanningSheet.tsx",
        "components/admin/planner/WeekplannerOperationalPlanningSheet.tsx",
      ]) {
        const source = read(file);
        expect(source).toContain("WeekplannerPlanningResourceSection");
        expect(source).not.toContain("VisualResourceAvailabilityPicker");
        expect(source).not.toContain("VisualDressingRoomPicker");
        expect(source).not.toContain("Empfohlene Spielfelder");
      }
    });

    it("override editor uses canonical section and semantic icons", () => {
      const editor = read("components/admin/planner/WeekplannerAllocationOverrideEditor.tsx");
      expect(editor).toContain("WeekplannerPlanningResourceSection");
      expect(editor).toContain("PlanningResourceSemanticIconTile");
      expect(editor).not.toContain("VisualResourceAvailabilityPicker");
    });

    it("shared section wires PlanningResourcePicker on demand", () => {
      const section = read("components/admin/planner/WeekplannerPlanningResourceSection.tsx");
      expect(section).toContain("PlanningResourcePicker");
      expect(section).toContain("PlanningResourceAssignment");
      expect(section).toContain("PlanningResourceSemanticIconTile");
    });

    it("recommendations are metadata in compact picker, not a parallel gallery", () => {
      const picker = read("components/admin/shared/planning/CompactOperationalResourceSelector.tsx");
      expect(picker).toContain("Empfohlen");
      expect(picker).toContain("recommendedResourceIds");
      const section = read("components/admin/planner/WeekplannerPlanningResourceSection.tsx");
      expect(section).toContain("recommendFreeFacilityResourceIds");
    });
  });

  describe("B — OCCUPANCY", () => {
    it("compact selector uses shared occupancy presentation", () => {
      const selector = read("components/admin/shared/planning/CompactOperationalResourceSelector.tsx");
      expect(selector).toContain("formatResourceOccupancyPrimaryLine");
      expect(selector).toContain("resolveResourceOccupancyPresentationKind");
      expect(selector).toContain("Erneut tippen, um trotz Belegung zu wählen");
    });
  });

  describe("C — ENGINE", () => {
    it("editors keep useFacilityAvailability and weekplanner plan exclusions", () => {
      const canonical = read("components/admin/planner/WeekplannerPlanningSheet.tsx");
      expect(canonical).toContain("useFacilityAvailability");
      const operational = read("components/admin/planner/WeekplannerOperationalPlanningSheet.tsx");
      expect(operational).toContain("useFacilityAvailability");
      expect(operational).toContain("weekplannerPlanId");
      expect(read("hooks/use-facility-availability.ts")).toContain("/api/facilities/availability");
      expect(read("lib/facilities/availability-service.ts")).toContain("getResourceAvailability");
    });
  });

  describe("D — MODALS", () => {
    it("sheet overlays use canonical SceModalOverlay backdrop family", () => {
      const sheet = read("components/ui/Sheet.tsx");
      expect(sheet).toContain("SceModalOverlay");
      expect(sheet).toContain("useSceModalDialog");
      expect(sheet).not.toContain("bg-black/65");
    });

    it("plan dialogs use shared Dialog primitive", () => {
      expect(read("components/admin/planner/WeekplannerPlanCreateDialog.tsx")).toContain('from "@/components/ui/Dialog"');
      expect(read("components/admin/planner/WeekplannerPlanBar.tsx")).toContain('from "@/components/ui/Dialog"');
    });

    it("conflict cluster modal uses SceModalOverlay", () => {
      const dialog = read("components/admin/planning-hub/AggregatedActivityInspectionDialog.tsx");
      expect(dialog).toContain("SceModalOverlay");
      expect(dialog).toContain("gleichzeitige Aktivitäten");
    });

    it("no active wochenplaner route file keeps legacy visual pitch card picker", () => {
      for (const file of WOCHENPLANNER_ACTIVE_SURFACES) {
        const source = read(file);
        expect(source).not.toContain("VisualResourceAvailabilityPicker");
      }
    });
  });

  describe("E — CONFLICT MODAL", () => {
    it("preserves search, filter, sort, detail, and actions", () => {
      const dialog = read("components/admin/planning-hub/AggregatedActivityInspectionDialog.tsx");
      expect(dialog).toContain("Konflikte");
      expect(dialog).toContain("searchQuery");
      expect(dialog).toContain("sortKey");
      expect(dialog).toContain("Öffnen");
      expect(dialog).toContain("Bearbeiten");
    });
  });

  describe("F — PLAN SEMANTICS", () => {
    it("operational sheet preserves plan override mutations", () => {
      const operational = read("components/admin/planner/WeekplannerOperationalPlanningSheet.tsx");
      expect(operational).toContain("replaceAllocationOverrides");
      expect(operational).toContain("isCanonicalAllocationGroupState");
    });
  });
});

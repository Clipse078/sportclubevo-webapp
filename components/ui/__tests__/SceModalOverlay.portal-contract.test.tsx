/**
 * @vitest-environment jsdom
 *
 * SCE-RESPONSIVE-01G — portalled fixed overlay contract (no document-flow fallback).
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { SceModalOverlay } from "@/components/ui/SceModalOverlay";
import AggregatedActivityInspectionDialog from "@/components/admin/planning-hub/AggregatedActivityInspectionDialog";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readGlobalsCss(): string {
  return readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
}

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SceModalOverlay portal contract SCE-RESPONSIVE-01G", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("A — portalled overlay is not a descendant of planner content", () => {
    const planner = document.createElement("div");
    planner.setAttribute("data-testid", "planner-root");
    document.body.appendChild(planner);

    render(
      <SceModalOverlay open testId="portal-contract-overlay">
        <div>Panel</div>
      </SceModalOverlay>,
      { container: planner },
    );

    const overlay = screen.getByTestId("portal-contract-overlay");
    expect(planner.contains(overlay)).toBe(false);
    expect(overlay.parentElement).toBe(document.body);
  });

  it("B — overlay source never renders inline fallback before portal target exists", () => {
    const source = readSource("components/ui/SceModalOverlay.tsx");
    expect(source).toContain("createPortal");
    expect(source).toMatch(/if \(!open \|\| !portalTarget\) return null/);
    expect(source).not.toMatch(/return overlay;/);
    expect(source).not.toMatch(/\?\s*overlay\s*:/);
  });

  it("C — fixed root geometry classes remain authoritative in CSS", () => {
    const css = readGlobalsCss();
    const rootBlock = css.match(/\.sce-modal-overlay-root\s*\{[^}]+\}/)?.[0] ?? "";
    const viewportBlock = css.match(/\.sce-modal-overlay-content-viewport\s*\{[^}]+\}/)?.[0] ?? "";
    expect(rootBlock).toMatch(/position:\s*fixed/);
    expect(rootBlock).toMatch(/inset:\s*0/);
    expect(rootBlock).not.toMatch(/left:\s*var\(--sce-sidebar-effective-width\)/);
    expect(viewportBlock).toMatch(/left:\s*var\(--sce-sidebar-effective-width\)/);
    expect(viewportBlock).toMatch(/align-items:\s*center/);
    expect(viewportBlock).toMatch(/justify-content:\s*center/);
  });

  it("D — canonical dimmed backdrop token with blur scrim", () => {
    const css = readGlobalsCss();
    expect(css).toContain("--sce-modal-backdrop: rgb(2 6 15 / 42%);");
    const block = css.match(/\.sce-modal-overlay-backdrop\s*\{[^}]+\}/)?.[0] ?? "";
    expect(block).toMatch(/backdrop-filter:\s*blur\(10px\)/);
  });

  it("E — aggregate inspection dialog does not expand planner layout tree", () => {
    const planner = document.createElement("div");
    planner.setAttribute("data-testid", "calendar-planner");
    document.body.appendChild(planner);

    const item = {
      tenantId: "t",
      id: "training:0",
      type: "TRAINING",
      startAt: new Date("2026-09-16T16:45:00.000Z"),
      endAt: new Date("2026-09-16T18:15:00.000Z"),
      canonicalStartAt: new Date("2026-09-16T16:45:00.000Z"),
      canonicalEndAt: new Date("2026-09-16T18:15:00.000Z"),
      timeOverridden: false,
      title: "Training",
      teamNames: ["A"],
      pitchAllocations: [],
      dressingRoomAllocations: [],
      canonicalPitchAllocations: [],
      canonicalDressingRoomAllocations: [],
      pitchOverridden: false,
      dressingRoomOverridden: false,
      conflicts: [],
      dressingRoomOccupancyMode: "DEFAULT",
      dressingRoomOccupancyBeforeMinutes: null,
      dressingRoomOccupancyAfterMinutes: null,
      dressingRoomResolvedBeforeMinutes: 0,
      dressingRoomResolvedAfterMinutes: 0,
      trainingSeriesId: "s",
      trainingSessionId: "sess",
      teamSeasonId: "ts",
    } as WeekplannerItem;

    render(
      <AggregatedActivityInspectionDialog
        open
        onClose={() => {}}
        items={[item]}
        dayKey="2026-09-16"
        locale="de-CH"
        timezone="Europe/Zurich"
        onOpenItem={() => {}}
      />,
      { container: planner },
    );

    const overlay = screen.getByTestId("aggregated-activity-inspection-dialog");
    expect(planner.contains(overlay)).toBe(false);
    expect(planner.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.contains(overlay)).toBe(true);
  });

  it("F — action buttons remain in portalled workspace", () => {
    const item = {
      tenantId: "t",
      id: "training:0",
      type: "TRAINING",
      startAt: new Date("2026-09-16T16:45:00.000Z"),
      endAt: new Date("2026-09-16T18:15:00.000Z"),
      canonicalStartAt: new Date("2026-09-16T16:45:00.000Z"),
      canonicalEndAt: new Date("2026-09-16T18:15:00.000Z"),
      timeOverridden: false,
      title: "Training",
      teamNames: ["A"],
      pitchAllocations: [],
      dressingRoomAllocations: [],
      canonicalPitchAllocations: [],
      canonicalDressingRoomAllocations: [],
      pitchOverridden: false,
      dressingRoomOverridden: false,
      conflicts: [],
      dressingRoomOccupancyMode: "DEFAULT",
      dressingRoomOccupancyBeforeMinutes: null,
      dressingRoomOccupancyAfterMinutes: null,
      dressingRoomResolvedBeforeMinutes: 0,
      dressingRoomResolvedAfterMinutes: 0,
      trainingSeriesId: "s",
      trainingSessionId: "sess",
      teamSeasonId: "ts",
    } as WeekplannerItem;

    render(
      <AggregatedActivityInspectionDialog
        open
        onClose={() => {}}
        items={[item]}
        dayKey="2026-09-16"
        locale="de-CH"
        timezone="Europe/Zurich"
        onOpenItem={() => {}}
        onEditItem={() => {}}
        canEditItem={() => true}
      />,
    );

    expect(screen.getByTestId("aggregate-inspection-open")).toBeInTheDocument();
    expect(screen.getByTestId("aggregate-inspection-edit")).toBeInTheDocument();
  });
});

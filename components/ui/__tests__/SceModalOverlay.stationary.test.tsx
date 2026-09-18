/**
 * @vitest-environment jsdom
 *
 * SCE-RESPONSIVE-01D — stationary modal open contract (no document scroll on focus/lock).
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useRef } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { SceModalOverlay } from "@/components/ui/SceModalOverlay";
import { useSceModalDialog } from "@/lib/ui/use-sce-modal-dialog";
import AggregatedActivityInspectionDialog from "@/components/admin/planning-hub/AggregatedActivityInspectionDialog";
import { applyShellLayoutVarsToDocument } from "@/lib/shell/shell-layout-vars";
import { SIDEBAR_WIDTH_DEFAULT } from "@/lib/shell/sidebar-width";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

function FocusProbeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useSceModalDialog({ open, onClose, panelRef, initialFocusRef: titleRef });

  if (!open) return null;

  return (
    <SceModalOverlay open testId="focus-probe-overlay">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="probe-title" tabIndex={-1}>
        <h2 ref={titleRef} id="probe-title" tabIndex={-1}>
          Probe
        </h2>
      </div>
    </SceModalOverlay>
  );
}

describe("SceModalOverlay stationary contract SCE-RESPONSIVE-01D", () => {
  const scrollToSpy = vi.fn();

  beforeEach(() => {
    document.body.innerHTML = "";
    vi.spyOn(window, "scrollTo").mockImplementation(scrollToSpy);
    Object.defineProperty(window, "scrollY", { value: 1200, writable: true, configurable: true });
    Object.defineProperty(window, "scrollX", { value: 0, writable: true, configurable: true });
    applyShellLayoutVarsToDocument({
      sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
      collapsed: false,
      viewportWidthPx: 1536,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  });

  it("A — portals overlay root to document.body", () => {
    render(
      <SceModalOverlay open testId="portal-overlay">
        <div>Panel</div>
      </SceModalOverlay>,
    );
    const overlay = screen.getByTestId("portal-overlay");
    expect(overlay.parentElement).toBe(document.body);
  });

  it("B — overlay root uses viewport-fixed positioning class", () => {
    render(
      <SceModalOverlay open testId="fixed-overlay">
        <div>Panel</div>
      </SceModalOverlay>,
    );
    expect(screen.getByTestId("fixed-overlay").classList.contains("sce-modal-overlay-root")).toBe(
      true,
    );
  });

  it("C — content viewport uses sidebar-inset region class", () => {
    render(
      <SceModalOverlay open testId="inset-overlay">
        <div>Panel</div>
      </SceModalOverlay>,
    );
    const viewport = screen
      .getByTestId("inset-overlay")
      .querySelector(".sce-modal-overlay-content-viewport");
    expect(viewport).toBeTruthy();
  });

  it("E — opening activates document scroll lock without changing scrollY", async () => {
    const { rerender } = render(<FocusProbeDialog open={false} onClose={() => {}} />);
    scrollToSpy.mockClear();
    rerender(<FocusProbeDialog open onClose={() => {}} />);

    await waitFor(() => {
      expect(document.documentElement.style.overflow).toBe("hidden");
    });
    expect(window.scrollY).toBe(1200);
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("F/G — initial dialog focus uses preventScroll (regression: portal focus scroll jump)", async () => {
    const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
    render(<Dialog open onClose={() => {}} title="Test" description="Desc" />);

    await waitFor(() => {
      expect(focusSpy).toHaveBeenCalled();
    });

    const preventScrollCall = focusSpy.mock.calls.find(
      (call) => typeof call[0] === "object" && call[0]?.preventScroll === true,
    );
    expect(preventScrollCall).toBeTruthy();
    expect(window.scrollY).toBe(1200);
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("J — workspace dialog exposes modal semantics", () => {
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
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "aggregated-activity-inspection-title");
  });

  it("K — marks background roots inert while open", () => {
    const root = document.createElement("div");
    root.setAttribute("data-sce-modal-background", "");
    document.body.appendChild(root);

    const { unmount } = render(
      <SceModalOverlay open testId="inert-overlay">
        <div>Panel</div>
      </SceModalOverlay>,
    );

    expect(root.hasAttribute("inert")).toBe(true);
    unmount();
    expect(root.hasAttribute("inert")).toBe(false);
  });

  it("P — planning dialog source has no planner scroll hacks", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const source = readFileSync(
      join(process.cwd(), "components/admin/planning-hub/AggregatedActivityInspectionDialog.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/window\.scrollTo/);
    expect(source).not.toMatch(/scrollIntoView/);
    expect(source).not.toMatch(/body\.style\.position/);
  });

  it("Q — standard Dialog retains size preset classes", () => {
    render(<Dialog open onClose={() => {}} title="Small" size="sm" />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toMatch(/max-w-/);
    expect(dialog.className).not.toContain("SCE_DIALOG_WORKSPACE_PANEL");
  });
});

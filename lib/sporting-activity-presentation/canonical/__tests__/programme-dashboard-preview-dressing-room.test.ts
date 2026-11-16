import { describe, expect, it } from "vitest";
import { formatProgrammeDashboardPreviewDressingRoomLabel } from "../programme-dashboard-preview-dressing-room";

describe("formatProgrammeDashboardPreviewDressingRoomLabel", () => {
  it("prefixes short room codes with Garderobe", () => {
    expect(formatProgrammeDashboardPreviewDressingRoomLabel("E1")).toBe("Garderobe E1");
  });

  it("preserves labels that already name the dressing room", () => {
    expect(formatProgrammeDashboardPreviewDressingRoomLabel("Garderobe 4")).toBe("Garderobe 4");
    expect(formatProgrammeDashboardPreviewDressingRoomLabel("Kabine 2")).toBe("Kabine 2");
  });
});
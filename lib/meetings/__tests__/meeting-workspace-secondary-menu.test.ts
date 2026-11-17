import { describe, expect, it } from "vitest";
import {
  hasMeetingSecondaryMenuItems,
  meetingShowsCloseInSecondaryMenu,
} from "@/lib/meetings/meeting-workspace-secondary-menu";

describe("meeting-workspace-secondary-menu", () => {
  it("hides menu when user cannot manage", () => {
    expect(hasMeetingSecondaryMenuItems({ canManage: false })).toBe(false);
    expect(hasMeetingSecondaryMenuItems({ canManage: true })).toBe(true);
  });

  it("shows close only for PLANNED meetings", () => {
    expect(meetingShowsCloseInSecondaryMenu("PLANNED")).toBe(true);
    expect(meetingShowsCloseInSecondaryMenu("COMPLETED")).toBe(false);
    expect(meetingShowsCloseInSecondaryMenu("CANCELLED")).toBe(false);
  });
});
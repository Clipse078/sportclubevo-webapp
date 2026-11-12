import { describe, expect, it } from "vitest";
import { meetingShowsGovernanceBanner } from "@/components/admin/meetings/MeetingGovernanceBanner";

describe("meeting governance banner visibility", () => {
  it("hides banner for default draft without four-eye", () => {
    expect(
      meetingShowsGovernanceBanner({
        id: "1",
        title: "Test",
        reviewStage: "DRAFT",
        requiresFourEyeReview: false,
        reviewedAt: null,
      }),
    ).toBe(false);
  });

  it("shows banner when four-eye required", () => {
    expect(
      meetingShowsGovernanceBanner({
        id: "1",
        title: "Test",
        reviewStage: "DRAFT",
        requiresFourEyeReview: true,
        reviewedAt: null,
      }),
    ).toBe(true);
  });
});

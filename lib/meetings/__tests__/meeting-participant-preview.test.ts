import { describe, expect, it } from "vitest";
import { formatMeetingParticipantsCollapsedPreview } from "@/lib/meetings/meeting-participant-preview";

describe("formatMeetingParticipantsCollapsedPreview", () => {
  it("joins names and truncates overflow count", () => {
    expect(
      formatMeetingParticipantsCollapsedPreview(["Alice", "Bob", "Carol", "Dan", "Eve"], {
        maxNames: 3,
      }),
    ).toBe("Alice, Bob, Carol +2");
  });

  it("returns null for empty input", () => {
    expect(formatMeetingParticipantsCollapsedPreview([])).toBeNull();
    expect(formatMeetingParticipantsCollapsedPreview(["  ", ""])).toBeNull();
  });
});
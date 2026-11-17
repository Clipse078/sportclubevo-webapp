import { describe, expect, it } from "vitest";
import { resolveMeetingAgendaTopicBackground } from "@/lib/meetings/meeting-agenda-topic-context";

describe("meeting agenda topic context", () => {
  it("uses initiative summary before description", () => {
    expect(
      resolveMeetingAgendaTopicBackground({
        initiative: {
          summary: " Erste Sitzung in neuer Zusammensetzung.",
          description: "Should not win",
        } as never,
      }),
    ).toBe("Erste Sitzung in neuer Zusammensetzung.");
  });

  it("does not conflate with protocol notes field", () => {
    expect(resolveMeetingAgendaTopicBackground({ initiative: null })).toBeNull();
  });
});
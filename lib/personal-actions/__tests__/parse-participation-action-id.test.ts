import { describe, expect, it } from "vitest";
import { buildParticipationPersonalActionId } from "../identity";
import { parseParticipationPersonalActionId } from "../parse-participation-action-id";

describe("AUFGABEN-05-PARTICIPATION — parse participation PersonalAction id", () => {
  it("round-trips training identity", () => {
    const id = buildParticipationPersonalActionId("person-1", {
      eventKind: "TRAINING",
      trainingSessionId: "sess-1",
    });
    expect(parseParticipationPersonalActionId(id)).toEqual({
      personId: "person-1",
      event: { eventKind: "TRAINING", trainingSessionId: "sess-1" },
    });
  });

  it("rejects unsupported event kinds", () => {
    expect(parseParticipationPersonalActionId("participation:p:CLUB_EVENT:e1")).toBeNull();
    expect(parseParticipationPersonalActionId("task:abc")).toBeNull();
  });
});

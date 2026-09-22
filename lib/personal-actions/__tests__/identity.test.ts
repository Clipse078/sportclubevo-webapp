import { describe, expect, it } from "vitest";
import {
  buildParticipationPersonalActionId,
  buildRequirementPersonalActionId,
  buildTaskPersonalActionId,
} from "../identity";

describe("AUFGABEN-05 — PersonalAction stable identity", () => {
  it("TASK — task:{taskId}", () => {
    expect(buildTaskPersonalActionId("abc")).toBe("task:abc");
  });

  it("REQUIREMENT — requirement:{requirementRecipientId}", () => {
    expect(buildRequirementPersonalActionId("recip-99")).toBe("requirement:recip-99");
  });

  it("TRAINING — participation:{personId}:TRAINING:{trainingSessionId}", () => {
    expect(
      buildParticipationPersonalActionId("person-1", {
        eventKind: "TRAINING",
        trainingSessionId: "ts-1",
      }),
    ).toBe("participation:person-1:TRAINING:ts-1");
  });

  it("MATCH — participation:{personId}:MATCH:{eventId}", () => {
    expect(
      buildParticipationPersonalActionId("person-1", {
        eventKind: "MATCH",
        eventId: "match-1",
      }),
    ).toBe("participation:person-1:MATCH:match-1");
  });

  it("TOURNAMENT — participation:{personId}:TOURNAMENT:{eventId}", () => {
    expect(
      buildParticipationPersonalActionId("person-2", {
        eventKind: "TOURNAMENT",
        eventId: "t-1",
      }),
    ).toBe("participation:person-2:TOURNAMENT:t-1");
  });
});

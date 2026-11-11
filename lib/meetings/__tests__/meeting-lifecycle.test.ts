import { describe, expect, it } from "vitest";
import { getMeetingLifecyclePresentation, getMeetingPrimaryAction } from "@/lib/meetings/meeting-lifecycle";

const base = {
  status: "PLANNED" as const,
  meetingDate: new Date("2026-12-01T18:00:00Z"),
  participantCount: 0,
  agendaCount: 0,
  decisionCount: 0,
  actionCount: 0,
};

describe("meeting lifecycle (SCE-CD-02R3)", () => {
  it("labels empty planned meetings as Entwurf", () => {
    expect(getMeetingLifecyclePresentation(base).lifecycleLabel).toBe("Entwurf");
  });

  it("suggests adding participants first", () => {
    expect(getMeetingPrimaryAction(base).label).toBe("Teilnehmer hinzufügen");
  });

  it("suggests agenda when participants exist", () => {
    const action = getMeetingPrimaryAction({ ...base, participantCount: 2 });
    expect(action.label).toBe("Traktandum hinzufügen");
  });

  it("marks completed meetings", () => {
    expect(
      getMeetingLifecyclePresentation({ ...base, status: "COMPLETED" }).lifecycleLabel,
    ).toBe("Abgeschlossen");
  });
});

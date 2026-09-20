import { describe, expect, it } from "vitest";
import type { PersonalAction } from "../types";
import { mapPersonalActionToListItem } from "../presentation";

const fmtCfg = { locale: "de-CH", timezone: "Europe/Zurich" };

describe("AUFGABEN-05-UI — personal action presentation", () => {
  it("M — attendance href null stays non-link row", () => {
    const action: PersonalAction = {
      id: "pa-att-1",
      sourceType: "ATTENDANCE_RESPONSE",
      sourceId: null,
      subject: { personId: "child-1", displayName: "James" },
      title: "Training F2",
      subtitle: "Training · F2",
      dueAt: null,
      status: "ACTIONABLE",
      href: null,
      actionKind: "PARTICIPATION_RESPONSE",
      context: {
        teamDisplayName: "F2",
        eventTitle: "Training F2",
        eventStartAt: "2026-09-21T15:00:00.000Z",
        eventKind: "TRAINING",
      },
      inlineActions: {
        participation: {
          teamSeasonId: "ts-1",
          eventKind: "TRAINING",
          trainingSessionId: "sess-1",
          allowedResponses: ["YES", "NO", "MAYBE"],
        },
      },
    };

    const item = mapPersonalActionToListItem(action, fmtCfg, "de-CH", "Europe/Zurich");
    expect(item.title).toBe("Teilnahme für James bestätigen");
    expect(item.href).toBeNull();
    expect(item.inlineParticipationReady).toBe(true);
    expect(item.metaLine).toMatch(/·/);
    expect(item.metaLine).not.toMatch(/Fällig/i);
  });

  it("N — task href uses canonical workspace path", () => {
    const action: PersonalAction = {
      id: "pa-task-1",
      sourceType: "TASK",
      sourceId: "task-99",
      title: "Website aktualisieren",
      subtitle: null,
      dueAt: "2026-09-20T12:00:00.000Z",
      status: "ACTIONABLE",
      href: "/dashboard/aufgaben/task-99",
      actionKind: "TASK",
      createdAt: "2026-09-01T00:00:00.000Z",
      priority: "NORMAL",
    };

    const item = mapPersonalActionToListItem(action, fmtCfg, "de-CH", "Europe/Zurich");
    expect(item.href).toBe("/dashboard/aufgaben/task-99");
    expect(item.sourceLabel).toBe("Aufgabe");
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatMeetingWorkspaceTabLabel,
  buildMeetingWorkspaceTabNavigationConfig,
} from "@/lib/nav/meeting-workspace-tab-config";
import { getMeetingPrimaryAction } from "@/lib/meetings/meeting-lifecycle";

describe("SCE-MTG-UX-01R2 meeting workspace refinement", () => {
  const counts = {
    traktanden: 3,
    beschluesse: 1,
    massnahmen: 1,
    aufgaben: 0,
    teilnehmer: 2,
  };

  it("formats tab labels with parenthetical counts and dual Massnahmen/Aufgaben", () => {
    expect(formatMeetingWorkspaceTabLabel("traktanden", counts)).toBe("Traktanden (3)");
    expect(formatMeetingWorkspaceTabLabel("beschluesse", counts)).toBe("Beschlüsse (1)");
    expect(formatMeetingWorkspaceTabLabel("massnahmen", counts)).toBe(
      "Massnahmen (1) · Aufgaben (0)",
    );
    expect(formatMeetingWorkspaceTabLabel("teilnehmer", counts)).toBe("Teilnehmer (2)");
    expect(formatMeetingWorkspaceTabLabel("details", counts)).toBe("Sitzungsdetails");
  });

  it("does not embed duplicate numeric tab counts in config entries", () => {
    const config = buildMeetingWorkspaceTabNavigationConfig(counts);
    expect(config.tabs.find((t) => t.key === "traktanden")?.label).toBe("Traktanden (3)");
    expect(config.tabs.every((t) => t.count === undefined)).toBe(true);
  });

  it("meeting Aufgaben uses inline collapsible create card", () => {
    const panel = readFileSync(
      join(process.cwd(), "components/admin/aufgaben/contextual/ContextRelatedTasksPanelView.tsx"),
      "utf8",
    );
    expect(panel).toContain("ContextualTaskInlineCreateCard");
    expect(panel).toContain("meeting-open-inline-task-create");
    expect(panel).not.toMatch(/import ContextualTaskCreateDialog/);
  });

  it("surfaces conduct as single header primary when prerequisites met", () => {
    const primary = getMeetingPrimaryAction({
      status: "PLANNED",
      meetingDate: new Date("2026-06-01"),
      participantCount: 2,
      agendaCount: 3,
      decisionCount: 0,
      actionCount: 0,
      conductedAt: null,
    });
    expect(primary.lifecycleAction).toBe("conduct");
    expect(primary.label).toBe("Als durchgeführt markieren");
  });
});

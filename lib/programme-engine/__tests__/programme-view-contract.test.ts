import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01I — list/calendar contract", () => {
  it("team and club programme pages share queryProgramme before view branch", () => {
    const teamPage = readRelative("app/(admin)/dashboard/teams/[teamId]/programm/page.tsx");
    const clubPage = readRelative("app/(admin)/dashboard/programm/page.tsx");
    expect(teamPage).toContain("queryProgramme");
    expect(clubPage).toContain("queryProgramme");
    expect(teamPage).toContain("ProgrammeListeView");
    expect(teamPage).toContain("ProgrammeCalendarView");
    expect(clubPage).toContain("ProgrammeListeView");
    expect(clubPage).toContain("ProgrammeCalendarView");
  });

  it("uses canonical Sce* cards without team/club-specific card families", () => {
    const card = readRelative("components/programme/ProgrammeSceActivityCard.tsx");
    expect(card).toContain("SceTrainingCard");
    expect(card).toContain("SceMatchCard");
    expect(card).toContain("SceTournamentCard");
    expect(card).toContain("SceClubEventCard");
    expect(card).not.toMatch(/TeamProgramme.*Card/);
    expect(card).not.toMatch(/ClubProgramme.*Card/);
  });
});

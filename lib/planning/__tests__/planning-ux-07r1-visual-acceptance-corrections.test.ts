import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveMatchPublicationDefaultsForCreate } from "@/lib/publishing/policy/match-publication-defaults";
import { resolveTournamentPublicationDefaultsForCreate } from "@/lib/publishing/policy/tournament-publication-defaults";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("PLANNING-UX-07R1 visual acceptance corrections", () => {
  it("match HOME create defaults are all five ON", () => {
    expect(resolveMatchPublicationDefaultsForCreate("HOME")).toEqual({
      websiteVisible: true,
      infoboardVisible: true,
      wochenplanVisible: true,
      homepageVisible: true,
      teamPageVisible: true,
    });
  });

  it("match AWAY create defaults respect home-facility channel restrictions", () => {
    expect(resolveMatchPublicationDefaultsForCreate("AWAY")).toEqual({
      websiteVisible: true,
      infoboardVisible: false,
      wochenplanVisible: false,
      homepageVisible: true,
      teamPageVisible: true,
    });
  });

  it("tournament create defaults are all five ON", () => {
    expect(resolveTournamentPublicationDefaultsForCreate()).toMatchObject({
      websiteVisible: true,
      infoboardVisible: true,
      homepageVisible: true,
      wochenplanVisible: true,
      teamPageVisible: true,
    });
  });

  it("POST /api/events applies canonical tournament and match publication defaults", () => {
    const route = read("app/api/events/route.ts");
    expect(route).toContain("resolveTournamentPublicationDefaultsForCreate");
    expect(route).toContain("matchPublicationDefaults.homepageVisible");
    expect(route).toContain("matchPublicationDefaults.teamPageVisible");
  });

  it("SFV schedule update path documents publication preservation", () => {
    const persistence = read("lib/integrations/sfv/sync/schedule-persistence.ts");
    expect(persistence).toContain("NEVER modifies locally managed Event fields");
    expect(persistence).toContain("websiteVisible");
    expect(persistence).toContain("matchPublicationDefaults.homepageVisible");
  });

  it("TournamentCenter edit exposes pitch and per-team dressing-room allocation in Ressourcen", () => {
    const workspace = read("components/admin/tournamentcenter/record/TurniereTournamentRecordWorkspace.tsx");
    expect(workspace).toContain("turniere-record-section-resources");
    expect(workspace).toContain("TournamentResourceAllocationEditor");
    expect(workspace).toContain("TournamentParticipantDressingRoomPanel");
    expect(workspace).toContain("hideDressingRoomAllocation");
  });

  it("only one canonical tournament team participant section is mounted on edit route", () => {
    const page = read("app/(admin)/dashboard/tournamentcenter/[tournamentId]/edit/page.tsx");
    expect(page).toContain("turniere-edit-rsvp-participants-section");
    expect(page).not.toContain("turniere-edit-participants-section");
    expect(page).toContain('teams={[]}');
    const workspace = read("components/admin/tournamentcenter/record/TurniereTournamentRecordWorkspace.tsx");
    expect(workspace).toContain("turniere-canonical-participants-section");
    expect(workspace).not.toContain("PlanningParticipantsList");
  });

  it("veranstaltung team selector avoids clipped compact height override", () => {
    const editor = read("components/admin/veranstaltungen/ClubEventParticipationAudienceEditor.tsx");
    expect(editor).toContain("teamSelectPlaceholder");
    expect(editor).not.toContain("h-8");
    expect(editor).toContain("min-h-[2.375rem]");
  });

  it("tournament record primary column uses operational section spacing primitive", () => {
    const workspace = read("components/admin/tournamentcenter/record/TurniereTournamentRecordWorkspace.tsx");
    expect(workspace).toContain('className="space-y-6"');
  });
});

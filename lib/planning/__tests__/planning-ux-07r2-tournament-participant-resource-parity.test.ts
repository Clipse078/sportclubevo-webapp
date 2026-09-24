import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("PLANNING-UX-07R2 tournament participant and resource parity", () => {
  it("Saisonplaner tournament edit mounts exactly one canonical participant section", () => {
    const ops = read("components/admin/planner/PlannerTournamentOperationalSections.tsx");
    const workspace = read("components/admin/planner/PlannerTournamentCanonicalWorkspace.tsx");

    expect(workspace).toContain('testId="turniere-canonical-participants-section"');
    expect(workspace).toContain("TournamentParticipantsEditor");
    expect(ops).not.toContain("PlanningEditorParticipantsSection");
    expect(ops).not.toContain("PlanningParticipantsList");
    expect(ops).not.toContain("loadTournamentPlanningParticipants");
  });

  it("simplified read-only PlanningParticipantsList is not used for Saisonplaner tournament teams", () => {
    const list = read("components/admin/shared/planning-editor/PlanningParticipantsList.tsx");
    const ops = read("components/admin/planner/PlannerTournamentOperationalSections.tsx");
    expect(list).toContain("AdminAvatar");
    expect(ops).not.toContain("PlanningParticipantsList");
  });

  it("canonical participant rows use bare club crest via TournamentTeamLogo", () => {
    const editor = read("components/admin/tournamentcenter/TournamentParticipantsEditor.tsx");
    const logos = read("components/admin/tournamentcenter/tournament-semantic-icons.tsx");
    expect(editor).toContain("TournamentTeamLogo");
    expect(logos).toContain('<ClubLogo logoUrl={logoUrl} name={name} size={size} bare');
    expect(editor).not.toMatch(/TournamentTeamLogo[\s\S]*rounded-full/);
  });

  it("Saisonplaner exposes pitch and per-team dressing-room allocation directly", () => {
    const workspace = read("components/admin/planner/PlannerTournamentCanonicalWorkspace.tsx");
    expect(workspace).toContain("TournamentResourceAllocationEditor");
    expect(workspace).toContain("TournamentParticipantDressingRoomPanel");
    expect(workspace).toContain("planner-tournament-resources-section");
    expect(workspace).not.toContain("Plätze, Hallen und Garderoben im Turniercenter verwalten");
    expect(workspace).not.toMatch(/Im Turniercenter bearbeiten[\s\S]*required/i);
  });

  it("Saisonplaner and TournamentCenter share allocation editors and persistence APIs", () => {
    const planner = read("components/admin/planner/PlannerTournamentCanonicalWorkspace.tsx");
    const center = read("components/admin/tournamentcenter/record/TurniereTournamentRecordWorkspace.tsx");
    for (const symbol of [
      "TournamentResourceAllocationEditor",
      "TournamentParticipantDressingRoomPanel",
      "TournamentParticipantsEditor",
      "hideDressingRoomAllocation",
    ]) {
      expect(planner).toContain(symbol);
      expect(center).toContain(symbol);
    }
    expect(planner).toContain("/api/tournaments/");
  });

  it("planner tournament participation config lives in the operational rail", () => {
    const page = read("app/(admin)/dashboard/planner/edit/[eventId]/page.tsx");
    expect(page).toContain("PlannerTournamentOperationalRail");
    expect(page).toContain("operationalRailExtensions");
    const ops = read("components/admin/planner/PlannerTournamentOperationalSections.tsx");
    expect(ops).not.toContain("ParticipationRequestConfigEditor");
  });

  it("TournamentCenter canonical participant section remains mounted", () => {
    const workspace = read("components/admin/tournamentcenter/record/TurniereTournamentRecordWorkspace.tsx");
    expect(workspace).toContain("turniere-canonical-participants-section");
    expect(workspace).toContain("TournamentParticipantsEditor");
  });
});

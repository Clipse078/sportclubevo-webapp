import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("PLANNING-UX-06 publication + action parity", () => {
  it("shared PlanningPublicationPanel is used on active operational surfaces", () => {
    const surfaces = [
      "components/admin/matchcenter/record/SpieleMatchRecordWorkspace.tsx",
      "components/admin/tournamentcenter/record/TurniereTournamentRecordWorkspace.tsx",
      "components/admin/veranstaltungen/VeranstaltungEditForm.tsx",
      "components/admin/veranstaltungen/VeranstaltungCreateForm.tsx",
      "components/admin/matchcenter/MatchCreateForm.tsx",
      "components/admin/tournamentcenter/TournamentCreateForm.tsx",
      "app/(admin)/dashboard/training/sessions/[sessionId]/edit/page.tsx",
      "components/admin/training/TrainingSeriesCreateForm.tsx",
    ];
    for (const file of surfaces) {
      expect(read(file), file).toContain("PlanningPublicationPanel");
    }
  });

  it("match record exposes canonical publication toggles in the right rail", () => {
    const workspace = read("components/admin/matchcenter/record/SpieleMatchRecordWorkspace.tsx");
    expect(workspace).toContain("spiele-record-publication-panel");
    expect(workspace).toContain("MatchPublicationToggles");
    expect(workspace).toContain("suppressPublicationUI");
  });

  it("match PATCH route persists extended publication fields", () => {
    const route = read("app/api/matchcenter/[matchId]/route.ts");
    expect(route).toContain("homepageVisible");
    expect(route).toContain("wochenplanVisible");
    expect(route).toContain("teamPageVisible");
  });

  it("record layout uses desktop right rail grid (not ultra-wide-only)", () => {
    const layout = read("components/admin/shared/planning-editor/planning-editor-layout.ts");
    expect(layout).toMatch(/lg:grid-cols-\[minmax\(0,1fr\)_minmax/);
    expect(layout).not.toContain("min-[105rem]:grid-cols");
  });

  it("planning task create actions avoid duplicate plus in label strings", () => {
    const offenders = [
      "components/admin/aufgaben/contextual/ContextRelatedTasksPanelView.tsx",
      "components/admin/workspace/WorkspaceCommandBar.tsx",
      "components/admin/workspace/inspector/WorkspaceDocumentInspectorView.tsx",
      "app/(admin)/dashboard/veranstaltungen/[eventId]/edit/page.tsx",
    ];
    for (const file of offenders) {
      const src = read(file);
      expect(src, file).not.toMatch(/label="\+"?\s*\+?\s*Aufgabe"/);
      expect(src, file).not.toContain('label="+ Aufgabe"');
    }
    const trigger = read("components/admin/aufgaben/contextual/ContextualTaskCreateTrigger.tsx");
    expect(trigger).toContain("<Plus");
    const panel = read("components/admin/aufgaben/contextual/ContextRelatedTasksPanelView.tsx");
    expect(panel).toContain('createTask');
  });

  it("veranstaltung team audience selector uses canonical i18n placeholder", () => {
    const editor = read("components/admin/veranstaltungen/ClubEventParticipationAudienceEditor.tsx");
    expect(editor).toContain("teamSelectPlaceholder");
    expect(editor).not.toContain("Team wählen");
    expect(editor).not.toContain("h-8");
    expect(read("messages/de.json")).toContain("Team auswählen");
    expect(read("messages/en.json")).toContain("Select team");
  });
});

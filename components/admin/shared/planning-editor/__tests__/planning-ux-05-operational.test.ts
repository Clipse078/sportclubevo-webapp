import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MATCH_PUBLICATION_CHANNELS,
  TOURNAMENT_PUBLICATION_CHANNELS,
  VERANSTALTUNG_PUBLICATION_CHANNELS,
} from "@/lib/planning/planning-publication-channels";
import { resolvePlanningCollaborationTarget } from "@/lib/planning/planning-collaboration-target";
import { isSupportedCommunicationTargetType } from "@/lib/communication/target-resolver";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("PLANNING-UX-05 operational primitives", () => {
  it("publication channels use switch controls, not checkboxes", () => {
    const controls = read(
      "components/admin/shared/planning-editor/PlanningEditorPublicationControls.tsx",
    );
    expect(controls).toContain("SwitchThumb");
    expect(controls).not.toContain('type="checkbox"');
  });

  it("Zeitstandard link uses internal facilities route", () => {
    const link = read("components/admin/shared/planning-editor/PlanningEditorZeitstandardLink.tsx");
    expect(link).toContain('"/dashboard/admin/facilities"');
    expect(link).not.toMatch(/vercel\.app/i);
  });

  it("match/tournament/event publication channel sets are defined", () => {
    expect(MATCH_PUBLICATION_CHANNELS.length).toBeGreaterThan(0);
    expect(TOURNAMENT_PUBLICATION_CHANNELS.length).toBeGreaterThan(0);
    expect(VERANSTALTUNG_PUBLICATION_CHANNELS.length).toBeGreaterThan(0);
  });

  it("planning collaboration resolves MATCH/TRAINING/TOURNAMENT targets", () => {
    expect(resolvePlanningCollaborationTarget("MATCH", "evt-1")).toEqual({
      supported: true,
      targetType: "MATCH",
      targetId: "evt-1",
    });
    expect(resolvePlanningCollaborationTarget("CLUB_EVENT", "evt-2")).toEqual({
      supported: true,
      targetType: "CLUB_EVENT",
      targetId: "evt-2",
    });
  });

  it("communication target resolver supports planning event types", () => {
    expect(isSupportedCommunicationTargetType("MATCH")).toBe(true);
    expect(isSupportedCommunicationTargetType("TRAINING")).toBe(true);
    expect(isSupportedCommunicationTargetType("TOURNAMENT")).toBe(true);
    expect(isSupportedCommunicationTargetType("CLUB_EVENT")).toBe(true);
  });

  it("training create exposes operational control bar and pre-persist work sections", () => {
    const form = read("components/admin/training/TrainingSeriesCreateForm.tsx");
    expect(form).toContain("training-create-publication-panel");
    expect(form).toContain("training-create-work-section");
    expect(form).toContain("PlanningEditorWorkSection");
  });

  it("training session edit exposes top control bar", () => {
    const page = read("app/(admin)/dashboard/training/sessions/[sessionId]/edit/page.tsx");
    expect(page).toContain("training-session-edit-publication-panel");
  });

  it("tournament create places publication in operational secondary rail (UX-06)", () => {
    const form = read("components/admin/tournamentcenter/TournamentCreateForm.tsx");
    expect(form).toContain("tournament-create-publication-panel");
    expect(form).toContain("tournament-create-operational-workspace");
    expect(form).not.toContain("turniere-create-section-publication");
  });

  it("match record publication is owned by the record workspace right rail (UX-06)", () => {
    const workspace = read("components/admin/matchcenter/record/SpieleMatchRecordWorkspace.tsx");
    expect(workspace).toContain("spiele-record-publication-panel");
    expect(workspace).toContain("suppressPublicationUI");
  });
});

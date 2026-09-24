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
    expect(resolvePlanningCollaborationTarget("CLUB_EVENT", "evt-2").supported).toBe(false);
  });

  it("communication target resolver supports planning event types", () => {
    expect(isSupportedCommunicationTargetType("MATCH")).toBe(true);
    expect(isSupportedCommunicationTargetType("TRAINING")).toBe(true);
    expect(isSupportedCommunicationTargetType("TOURNAMENT")).toBe(true);
  });

  it("tournament create places publication in control bar near top", () => {
    const form = read("components/admin/tournamentcenter/TournamentCreateForm.tsx");
    const controlIdx = form.indexOf("tournament-create-control-bar");
    const resourcesIdx = form.indexOf("turniere-create-section-resources");
    expect(controlIdx).toBeGreaterThan(-1);
    expect(resourcesIdx).toBeGreaterThan(controlIdx);
    expect(form).not.toContain("turniere-create-section-publication");
  });

  it("match record operational renders publication before preparation/resources", () => {
    const operational = read("components/admin/matchcenter/MatchcenterDetailOperational.tsx");
    const pubIdx = operational.indexOf("spiele-record-section-publication");
    const prepIdx = operational.indexOf("spiele-record-section-preparation");
    expect(pubIdx).toBeGreaterThan(-1);
    expect(prepIdx).toBeGreaterThan(pubIdx);
  });
});

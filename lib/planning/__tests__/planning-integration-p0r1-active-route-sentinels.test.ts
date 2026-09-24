import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * PLANNING-INTEGRATION-P0R1 — proves canonical create/edit routes wire the
 * accepted shared planning editor (not legacy light-card shells).
 */

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

type RouteContract = {
  domain: string;
  routeFile: string;
  mustContain: string[];
  mustNotContain?: string[];
};

const ROUTES: RouteContract[] = [
  {
    domain: "TRAINING_CREATE",
    routeFile: "app/(admin)/dashboard/training/new/page.tsx",
    mustContain: ["TrainingRecordWorkspaceShell", "TrainingSeriesCreateForm"],
  },
  {
    domain: "TRAINING_SESSION_EDIT",
    routeFile: "app/(admin)/dashboard/training/sessions/[sessionId]/edit/page.tsx",
    mustContain: [
      "PlanningEditorShell",
      "TrainingSessionEditHeader",
      "PlanningEditorWorkSection",
      "PlanningEditorCollaborationSection",
      "ContextRelatedRequirementsPanel",
    ],
    mustNotContain: ["border-gray-200", "bg-white"],
  },
  {
    domain: "MATCH_CREATE",
    routeFile: "app/(admin)/dashboard/matchcenter/new/page.tsx",
    mustContain: ["SpieleRecordWorkspaceShell", "MatchCreateForm"],
  },
  {
    domain: "MATCH_EDIT",
    routeFile: "app/(admin)/dashboard/matchcenter/[matchId]/page.tsx",
    mustContain: ["MatchcenterDetail"],
  },
  {
    domain: "TOURNAMENT_CREATE",
    routeFile: "app/(admin)/dashboard/tournamentcenter/new/page.tsx",
    mustContain: ["TournamentCreateForm"],
  },
  {
    domain: "TOURNAMENT_EDIT",
    routeFile: "app/(admin)/dashboard/tournamentcenter/[tournamentId]/edit/page.tsx",
    mustContain: [
      "TournamentEditForm",
      "ContextRelatedRequirementsPanel",
      "PlanningEditorCollaborationSection",
    ],
  },
  {
    domain: "VERANSTALTUNG_CREATE",
    routeFile: "app/(admin)/dashboard/veranstaltungen/new/page.tsx",
    mustContain: ["PlanningEditorShell", "VeranstaltungCreateForm"],
  },
  {
    domain: "VERANSTALTUNG_EDIT",
    routeFile: "app/(admin)/dashboard/veranstaltungen/[eventId]/edit/page.tsx",
    mustContain: [
      "PlanningEditorShell",
      "ContextRelatedRequirementsPanel",
      "ClubEventParticipationAudienceEditor",
      "PlanningEditorCollaborationSection",
    ],
  },
];

describe("PLANNING-INTEGRATION-P0R1 active route sentinels", () => {
  it.each(ROUTES)("$domain canonical route wiring", ({ routeFile, mustContain, mustNotContain }) => {
    const source = readRelative(routeFile);
    for (const token of mustContain) {
      expect(source, `${routeFile} missing ${token}`).toContain(token);
    }
    for (const token of mustNotContain ?? []) {
      expect(source, `${routeFile} must not contain legacy ${token}`).not.toContain(token);
    }
  });
});

describe("PLANNING-INTEGRATION-P0R1 create/edit parity — shared planning primitives", () => {
  const paritySources = {
    trainingCreate: readRelative("components/admin/training/TrainingSeriesCreateForm.tsx"),
    trainingEdit: readRelative(
      "app/(admin)/dashboard/training/sessions/[sessionId]/edit/page.tsx",
    ),
    matchCreate: readRelative("components/admin/matchcenter/MatchCreateForm.tsx"),
    matchEdit: readRelative("components/admin/matchcenter/MatchcenterDetail.tsx"),
    tournamentCreate: readRelative("components/admin/tournamentcenter/TournamentCreateForm.tsx"),
    tournamentEdit: readRelative(
      "components/admin/tournamentcenter/record/TurniereTournamentRecordWorkspace.tsx",
    ),
    eventCreate: readRelative("components/admin/veranstaltungen/VeranstaltungCreateForm.tsx"),
    eventEdit: readRelative("app/(admin)/dashboard/veranstaltungen/[eventId]/edit/page.tsx"),
  };

  it("all four domains expose work (Aufgaben/Anforderungen) on persisted edit or pre-persist on create", () => {
    expect(paritySources.trainingCreate).toContain("PlanningEditorWorkSection");
    expect(paritySources.trainingEdit).toContain("PlanningEditorWorkSection");
    expect(paritySources.matchCreate).toContain("PlanningEditorWorkSection");
    expect(paritySources.matchEdit).toContain("relatedRequirementsPanel");
    expect(paritySources.tournamentCreate).toContain("PlanningEditorWorkSection");
    expect(paritySources.tournamentEdit).toContain("PlanningEditorWorkSection");
    expect(paritySources.eventCreate).toContain("PlanningEditorWorkSection");
    expect(paritySources.eventEdit).toContain("PlanningEditorWorkSection");
  });

  it("active edit surfaces wire publication panel in canonical layout (UX-06)", () => {
    expect(readRelative("components/admin/matchcenter/record/SpieleMatchRecordWorkspace.tsx")).toContain(
      "spiele-record-publication-panel",
    );
    expect(paritySources.tournamentEdit).toContain("turniere-record-publication-panel");
    expect(paritySources.eventCreate).toContain("veranstaltung-create-publication-panel");
    expect(readRelative("components/admin/veranstaltungen/VeranstaltungEditForm.tsx")).toContain(
      "veranstaltung-edit-publication-panel",
    );
  });

  it("operational CRUD surfaces keep compact resource selectors (05R2 / 07R4), not PitchVisual", () => {
    for (const [label, source] of [
      ["matchCreate", paritySources.matchCreate],
      ["tournamentCreate", paritySources.tournamentCreate],
      ["trainingCreate", paritySources.trainingCreate],
    ] as const) {
      const usesCompactPlanningResources =
        source.includes("CompactOperationalResourceSelector") ||
        source.includes("PlanningSingleResourceAssignment") ||
        source.includes("PlanningSubjectDressingRoomAssignments") ||
        source.includes("PlanningMatchDressingRoomAssignments");
      expect(usesCompactPlanningResources, label).toBe(true);
      expect(source, label).not.toContain("PitchVisual");
    }
  });
});

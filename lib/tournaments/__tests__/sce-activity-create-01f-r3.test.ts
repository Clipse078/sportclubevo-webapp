import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createEmptyTournamentComposerDraft } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import { buildTournamentCreateReviewSummary } from "@/lib/tournaments/tournament-create-review-summary";
import {
  buildTournamentLobbyParticipantIdentity,
  buildTournamentLobbyParticipantIdentities,
  isDuplicateTournamentParticipant,
  resolveTournamentLobbyGridDensity,
} from "@/lib/tournaments/tournament-participant-presentation";
import { normalizeTimeInput, parseDisplayDateInput } from "@/lib/sce/activity-datetime/sce-activity-datetime";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01F-R3 — tournament lobby + 1:n own teams", () => {
  it("exposes canonical lobby components", () => {
    expect(read("components/sce/tournament/SceTournamentParticipantLobby.tsx")).toContain(
      "SceTournamentParticipantLobby",
    );
    expect(read("components/sce/tournament/SceTournamentParticipantTile.tsx")).toContain("ClubCrest");
    expect(read("components/admin/tournamentcenter/TournamentCreateForm.tsx")).toContain(
      "TournamentOwnTeamsSection",
    );
    expect(read("components/admin/tournamentcenter/TournamentCreateReviewPanel.tsx")).toContain(
      "tournament-create-review-participant-lobby",
    );
  });

  it("composer exposes direct own-team and external-club add actions (R4)", () => {
    const own = read("components/admin/tournamentcenter/TournamentOwnTeamsSection.tsx");
    const external = read("components/admin/tournamentcenter/TournamentExternalClubsSection.tsx");
    expect(own).toContain("Eigenes Team hinzufügen");
    expect(own).toContain('mode="TEAM_ONLY"');
    expect(external).toContain("Verein hinzufügen");
    expect(external).toContain('mode="CLUB_ONLY"');
    expect(external).not.toContain('mode="CLUB_THEN_TEAM"');
  });

  it("allows multiple distinct tenant teams as participants", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.participants = [
      {
        localId: "a",
        kind: "TEAM",
        teamId: "t1",
        displayName: "FC Allschwil F1",
        subLabel: null,
        dressingRooms: [],
      },
      {
        localId: "b",
        kind: "TEAM",
        teamId: "t2",
        displayName: "FC Allschwil F2",
        subLabel: null,
        dressingRooms: [],
      },
    ];
    const identities = buildTournamentLobbyParticipantIdentities({
      participants: draft.participants,
      tenantClubName: "FC Allschwil",
      tenantLogoUrl: "/images/logos/fc-allschwil.png",
    });
    expect(identities).toHaveLength(2);
    expect(identities[0]?.designationLine).not.toBe(identities[1]?.designationLine);
    expect(identities.every((i) => i.kindBadge === "EIGENES TEAM")).toBe(true);
  });

  it("keeps tenant team designation identifiable when crest is shared", () => {
    const identity = buildTournamentLobbyParticipantIdentity({
      participant: {
        localId: "a",
        kind: "TEAM",
        teamId: "t1",
        displayName: "FC Allschwil F1",
        subLabel: null,
        dressingRooms: [],
      },
      tenantClubName: "FC Allschwil",
      tenantLogoUrl: "/images/logos/fc-allschwil.png",
    });
    expect(identity.clubLine).toBe("FC Allschwil");
    expect(identity.designationLine).toBe("F1");
    expect(identity.identity.logoUrl).toBe("/images/logos/fc-allschwil.png");
  });

  it("external clubs coexist with multiple tenant teams", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.participants = [
      { localId: "1", kind: "TEAM", teamId: "t1", displayName: "F1", subLabel: null, dressingRooms: [] },
      { localId: "2", kind: "EXTERNAL_CLUB", externalClubId: "c1", displayName: "FC Basel", subLabel: null, dressingRooms: [], externalClubLogoUrl: "/x.png" },
    ];
    expect(isDuplicateTournamentParticipant(draft.participants, { kind: "TEAM", teamId: "t2" })).toBe(false);
    expect(
      isDuplicateTournamentParticipant(draft.participants, { kind: "EXTERNAL_CLUB", externalClubId: "c2" }),
    ).toBe(false);
  });

  it("prevents duplicate club and manual participants; allows duplicate source teams with local display names", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.participants = [
      { localId: "1", kind: "TEAM", teamId: "t1", displayName: "F1", subLabel: null, dressingRooms: [] },
      { localId: "2", kind: "EXTERNAL_CLUB", externalClubId: "c1", displayName: "FC Basel", subLabel: null, dressingRooms: [] },
      { localId: "3", kind: "MANUAL", manualLabel: "Gast", displayName: "Gast", subLabel: null, dressingRooms: [] },
    ];
    expect(isDuplicateTournamentParticipant(draft.participants, { kind: "TEAM", teamId: "t1" })).toBe(false);
    expect(isDuplicateTournamentParticipant(draft.participants, { kind: "EXTERNAL_CLUB", externalClubId: "c1" })).toBe(
      true,
    );
    expect(isDuplicateTournamentParticipant(draft.participants, { kind: "MANUAL", manualLabel: "gast" })).toBe(true);
  });

  it("does not introduce Match HOME/AWAY participant semantics in lobby", () => {
    const lobby = read("components/sce/tournament/SceTournamentParticipantLobby.tsx");
    expect(lobby).not.toContain("VS");
    expect(lobby).not.toContain("homeAway");
    expect(lobby).not.toContain("MatchClubPair");
  });

  it("scales lobby density by participant count", () => {
    expect(resolveTournamentLobbyGridDensity(3)).toBe("spacious");
    expect(resolveTournamentLobbyGridDensity(6)).toBe("balanced");
    expect(resolveTournamentLobbyGridDensity(12)).toBe("dense");
  });

  it("final review summary includes meaningful sections", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.title = "Hallenturnier";
    draft.startAt = "2026-10-17T09:30";
    draft.endAt = "2026-10-17T16:00";
    draft.meetingTime = "09:00";
    draft.location = "Halle 1";
    draft.participants = [
      { localId: "1", kind: "TEAM", teamId: "t1", displayName: "F1", subLabel: null, dressingRooms: [] },
    ];
    const summary = buildTournamentCreateReviewSummary({
      payload: draft,
      organizer: { id: "o1", name: "FC Allschwil", shortName: null },
      pitchHallFacilityGroups: [],
      dressingRoomFacilityGroups: [],
    });
    expect(summary.title).toBe("Hallenturnier");
    expect(summary.participantCount).toBe(1);
    expect(summary.organiserLabel).toBe("FC Allschwil");
    expect(summary.meetingTimeLabel).toBe("09:00");
    expect(summary.locationLabel).toBe("Halle 1");
  });

  it("registers SCE-TOURNAMENT-PLANNER-01 roadmap contract", () => {
    const doc = read("docs/roadmap/SCE-TOURNAMENT-PLANNER-01.md");
    expect(doc).toContain("SCE-TOURNAMENT-PLANNER-01A");
    expect(doc).toContain("ADR-014");
    expect(doc).toContain("SCE-TOURNAMENT-PLANNER-01B");
    expect(doc).toMatch(/IN PROGRESS/);
    expect(doc).toContain("**WHO** plays whom");
    expect(doc).toContain("Per E-Mail senden");
    expect(doc).toContain("PDF herunterladen");
  });

  it("preserves R1 compact date/time parsing", () => {
    const date = parseDisplayDateInput("17102026");
    expect(date.ok).toBe(true);
    if (date.ok) expect(date.isoDateKey).toBe("2026-10-17");
    expect(normalizeTimeInput("930")).toEqual({ ok: true, normalized: "09:30" });
    expect(normalizeTimeInput("0930")).toEqual({ ok: true, normalized: "09:30" });
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createEmptyTournamentComposerDraft } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import {
  buildTournamentLobbyParticipantIdentities,
  buildTournamentResourceDressingRoomSubjectPresentation,
  buildTournamentResourceDressingRoomSubjectPresentations,
} from "@/lib/tournaments/tournament-participant-presentation";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01F-R6 — resource step participant identity consistency", () => {
  const tenantClubName = "FC Allschwil";
  const tenantLogoUrl = "/images/logos/fc-allschwil.png";

  it("ressourcen step wires canonical compact crest + labels (no parallel resolver)", () => {
    const form = read("components/admin/tournamentcenter/TournamentCreateForm.tsx");
    expect(form).toContain("buildTournamentResourceDressingRoomSubjectPresentations");
    expect(form).toContain("SceTournamentResourceParticipantCrest");
    expect(form).not.toMatch(/externalClubLogoUrl[\s\S]{0,120}renderRessourcenPanel/);
    expect(form).not.toContain("TournamentTeamLogo");
    expect(read("components/sce/tournament/SceTournamentResourceParticipantCrest.tsx")).toContain('density="compact"');
  });

  it("own-team resource row receives tenant crest identity and visible designation", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.participants = [
      {
        localId: "own-1",
        kind: "TEAM",
        teamId: "team-frauen-1",
        displayName: "Frauen 1 · Women",
        subLabel: tenantClubName,
        dressingRooms: [],
      },
      {
        localId: "own-2",
        kind: "TEAM",
        teamId: "team-u16",
        displayName: "U16 · Boys",
        subLabel: tenantClubName,
        dressingRooms: [],
      },
    ];
    const rows = buildTournamentResourceDressingRoomSubjectPresentations({
      participants: draft.participants,
      tenantClubName,
      tenantLogoUrl,
    });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.identity.logoUrl === tenantLogoUrl)).toBe(true);
    expect(rows[0]?.subjectLabel).toBe(tenantClubName);
    expect(rows[1]?.subjectLabel).toBe(tenantClubName);
    expect(rows[0]?.subjectSecondary).toBe("Frauen 1");
    expect(rows[1]?.subjectSecondary).toBe("U16");
    expect(rows[0]?.subjectSecondary).not.toBe(rows[1]?.subjectSecondary);
  });

  it("external-club resource row receives external crest URL and club name", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.participants = [
      {
        localId: "ext-rossoneri",
        kind: "EXTERNAL_CLUB",
        externalClubId: "club-rossoneri",
        displayName: "AC Rossoneri",
        subLabel: "Externer Verein",
        externalClubLogoUrl: "/external/ac-rossoneri.png",
        dressingRooms: [],
      },
    ];
    const [row] = buildTournamentResourceDressingRoomSubjectPresentations({
      participants: draft.participants,
      tenantClubName,
      tenantLogoUrl,
    });
    expect(row?.subjectLabel).toBe("AC Rossoneri");
    expect(row?.subjectSecondary).toBeNull();
    expect(row?.identity.logoUrl).toBe("/external/ac-rossoneri.png");
  });

  it("manual participant keeps neutral fallback identity and textual label", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.participants = [
      {
        localId: "manual-1",
        kind: "MANUAL",
        manualLabel: "Gastmannschaft Nord",
        displayName: "Gastmannschaft Nord",
        subLabel: "Manuell",
        dressingRooms: [],
      },
    ];
    const [row] = buildTournamentResourceDressingRoomSubjectPresentations({
      participants: draft.participants,
      tenantClubName,
      tenantLogoUrl,
    });
    expect(row?.subjectLabel).toBe("Gastmannschaft Nord");
    expect(row?.subjectSecondary).toBeNull();
    expect(row?.identity.fallbackIdentity.kind).toBe("neutral-icon");
  });

  it("multiple participants resolve independently by localId", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.participants = [
      {
        localId: "own-1",
        kind: "TEAM",
        teamId: "t1",
        displayName: "1. Mannschaft",
        subLabel: tenantClubName,
        dressingRooms: [{ facilityResourceId: "room-a", facilityResourceName: "G1", facilityName: "Trakt" }],
      },
      {
        localId: "ext-1",
        kind: "EXTERNAL_CLUB",
        externalClubId: "c1",
        displayName: "FC Amicitia Riehen",
        subLabel: "Externer Verein",
        externalClubLogoUrl: "/ext/amicitia.png",
        dressingRooms: [],
      },
    ];
    const rows = buildTournamentResourceDressingRoomSubjectPresentations({
      participants: draft.participants,
      tenantClubName,
      tenantLogoUrl,
    });
    const byId = new Map(rows.map((r) => [r.localId, r]));
    expect(byId.get("own-1")?.identity.logoUrl).toBe(tenantLogoUrl);
    expect(byId.get("ext-1")?.identity.logoUrl).toBe("/ext/amicitia.png");
    expect(byId.get("own-1")?.subjectSecondary).toBe("1. Mannschaft");
    expect(byId.get("ext-1")?.subjectLabel).toBe("FC Amicitia Riehen");
  });

  it("dressing-room subjects still address participant localId in composer form", () => {
    const form = read("components/admin/tournamentcenter/TournamentCreateForm.tsx");
    expect(form).toContain("resourceDressingRoomPresentationByLocalId.get(p.localId)");
    expect(form).toContain("p.localId === subjectId");
  });

  it("teams, ressourcen, and übersicht share lobby identity resolution", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.participants = [
      {
        localId: "p1",
        kind: "EXTERNAL_CLUB",
        externalClubId: "c1",
        displayName: "CD Español Basel",
        subLabel: "Externer Verein",
        externalClubLogoUrl: "/ext/español.png",
        dressingRooms: [],
      },
    ];
    const lobby = buildTournamentLobbyParticipantIdentities({
      participants: draft.participants,
      tenantClubName,
      tenantLogoUrl,
    });
    const resource = buildTournamentResourceDressingRoomSubjectPresentations({
      participants: draft.participants,
      tenantClubName,
      tenantLogoUrl,
    });
    expect(resource[0]?.identity).toEqual(lobby[0]?.identity);
    expect(resource[0]?.subjectLabel).toBe(lobby[0]?.clubLine);
    const review = read("components/admin/tournamentcenter/TournamentCreateReviewPanel.tsx");
    expect(review).toContain("buildTournamentLobbyParticipantIdentities");
    const teams = read("components/admin/tournamentcenter/TournamentCreateForm.tsx");
    expect(teams).toContain("buildTournamentLobbyParticipantIdentities");
  });

  it("resource presentation helper is a pure projection of lobby identity", () => {
    const identity = buildTournamentLobbyParticipantIdentities({
      participants: [
        {
          localId: "x",
          kind: "TEAM",
          teamId: "t1",
          displayName: "Frauen 1 · Women",
          subLabel: tenantClubName,
          dressingRooms: [],
        },
      ],
      tenantClubName,
      tenantLogoUrl,
    })[0]!;
    const row = buildTournamentResourceDressingRoomSubjectPresentation(identity);
    expect(row.localId).toBe(identity.localId);
    expect(row.identity).toBe(identity.identity);
    expect(row.accessibleLabel).toBe(identity.accessibleLabel);
  });
});

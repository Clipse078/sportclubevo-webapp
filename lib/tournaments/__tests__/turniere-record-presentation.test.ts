import { describe, expect, it } from "vitest";
import type { TournamentDto } from "../types";
import {
  formatTurniereRecordDateLine,
  resolveTurniereRecordHomeAwayLabel,
  resolveTurniereRecordResourcePresentation,
} from "../turniere-record-presentation";

const BASE: TournamentDto = {
  id: "t-1",
  tenantId: "tenant-a",
  title: "PlayMore Turnier",
  description: null,
  status: "SCHEDULED",
  source: "MANUAL",
  startAt: "2026-09-19T08:00:00.000Z",
  endAt: "2026-09-19T12:00:00.000Z",
  meetingTime: null,
  location: "Im Brüel",
  organizerName: "FC Allschwil",
  organizerLogoUrl: "https://example.com/crest.png",
  organizerExternalClubId: null,
  competitionLabel: "Hallenturnier",
  resultLabel: null,
  remarks: null,
  season: null,
  team: null,
  teamLogoUrl: null,
  homeAway: "HOME",
  participants: [
    {
      id: "p1",
      tournamentId: "t-1",
      kind: "TEAM",
      displayName: "Junioren G",
      logoUrl: null,
      team: {
        id: "team-1",
        name: "Junioren G",
        slug: "junioren-g",
        category: "JUNIOREN",
        genderGroup: null,
        ageGroup: "G",
      },
      externalTeam: null,
      externalClub: null,
      manualLabel: null,
      displayOrder: 0,
      dressingRoomAllocations: [
        {
          id: "a1",
          facilityResourceId: "dr-1",
          facilityResourceCode: "O1",
          facilityResourceName: "O1",
          facilityResourceType: "DRESSING_ROOM",
          facilityId: "f1",
          facilityName: "Im Brüel",
          notes: null,
          displayOrder: 0,
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  resourceAllocations: [
    {
      id: "r1",
      facilityResourceId: "pitch-1",
      facilityResourceCode: "KR2",
      facilityResourceName: "Kunstrasen 2",
      facilityResourceType: "FULL_PITCH",
      facilityId: "f1",
      facilityName: "Im Brüel",
      notes: null,
      displayOrder: 0,
    },
  ],
  visibility: {
    websiteVisible: true,
    infoboardVisible: false,
    homepageVisible: false,
    wochenplanVisible: true,
    teamPageVisible: false,
  },
  reviewStage: "APPROVED",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

describe("turniere-record-presentation", () => {
  it("formats date line for record header", () => {
    const line = formatTurniereRecordDateLine(BASE.startAt, BASE.endAt, "de-CH", "Europe/Zurich");
    expect(line).toMatch(/Sep/i);
    expect(line).toMatch(/10:00/);
  });

  it("maps home/away to semantic hosted labels", () => {
    expect(resolveTurniereRecordHomeAwayLabel("HOME")).toBe("Eigenes Turnier");
    expect(resolveTurniereRecordHomeAwayLabel("AWAY")).toBe("Externes Turnier");
  });

  it("derives compact resource chips from canonical allocations", () => {
    const presentation = resolveTurniereRecordResourcePresentation(BASE);
    expect(presentation.facilityName).toBe("Im Brüel");
    expect(presentation.pitchCodes).toEqual(["KR2"]);
    expect(presentation.dressingRoomCodes).toEqual(["O1"]);
  });
});

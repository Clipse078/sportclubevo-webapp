import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ClubEvent } from "@/lib/events/club-events-service";
import { resolveSceClubEventPresentation } from "../adapters/club-event";
import { formatSceClubEventTimeLabel } from "../club-event-schedule-presentation";

const repoRoot = process.cwd();

function createClubEvent(overrides: Partial<ClubEvent> = {}): ClubEvent {
  return {
    id: "ev-club-1",
    title: "Clubabend",
    description: null,
    location: "Im Brüel · Clubhaus",
    startAt: new Date("2026-10-24T16:00:00.000Z"),
    endAt: new Date("2026-10-24T20:00:00.000Z"),
    allDay: false,
    organizerName: "FC Allschwil",
    remarks: null,
    status: "SCHEDULED",
    reviewStage: "APPROVED",
    source: "MANUAL",
    websiteVisible: true,
    infoboardVisible: false,
    homepageVisible: false,
    wochenplanVisible: false,
    trainingsplanVisible: false,
    teamPageVisible: false,
    tenantId: "t1",
    seasonId: null,
    teamId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    season: null,
    ...overrides,
  };
}

describe("SCE-UI-ROLLOUT-01G — architecture guardrails", () => {
  it("documents canonical Club Event card in SCE-DESIGN-SYSTEM.md", () => {
    const doc = readFileSync(join(repoRoot, "docs/design/SCE-DESIGN-SYSTEM.md"), "utf8");
    expect(doc).toContain("SceClubEventCard");
    expect(doc).toContain("Canonical Club Event card family");
  });

  it("uses SceActivityPresentationModel — no parallel ClubEventCardModel", () => {
    const source = readFileSync(
      join(repoRoot, "components/sporting-activity/SceClubEventCard.tsx"),
      "utf8",
    );
    expect(source).toContain("SceClubEventPresentationModel");
    expect(source).not.toContain("ClubEventCardModel");
    expect(source).not.toContain("EventPresentationModelV2");
    expect(source).toContain("data-sce-club-event-density");
    expect(source).not.toContain("fixture");
    expect(source).not.toMatch(/\bhomeLeftAwayRight\b/);
    expect(source).not.toContain(" VS ");
    expect(source).not.toContain("hauptteam");
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("canonical label VERANSTALTUNG and CLUB_EVENT discriminant", () => {
    const model = resolveSceClubEventPresentation({ event: createClubEvent() });
    expect(model.kind).toBe("CLUB_EVENT");
    expect(model.typeLabel).toBe("VERANSTALTUNG");
  });

  it("preserves all-day semantics without fake midnight ranges", () => {
    const model = resolveSceClubEventPresentation({
      event: createClubEvent({
        allDay: true,
        startAt: new Date("2026-10-24T00:00:00.000Z"),
        endAt: new Date("2026-10-25T00:00:00.000Z"),
      }),
    });
    expect(model.schedule.allDay).toBe(true);
    const timeLabel = formatSceClubEventTimeLabel(model, {
      locale: "de-CH",
      timezone: "Europe/Zurich",
    });
    expect(timeLabel).toBe("Ganztägig");
    expect(timeLabel).not.toMatch(/00:00/);
  });

  it("representative consumer imports SceClubEventCard", () => {
    const src = readFileSync(
      join(repoRoot, "components/admin/veranstaltungen/VeranstaltungListRow.tsx"),
      "utf8",
    );
    expect(src).toContain("SceClubEventCard");
    expect(src).toContain("resolveSceClubEventPresentation");
    expect(src).toContain("veranstaltung-row-context-zone");
    expect(src).toContain("VERANSTALTUNGEN_ROW_DESKTOP_GRID");
  });

  it("does not introduce new binary checkboxes in 01G club event card sources", () => {
    const paths = [
      "components/sporting-activity/SceClubEventCard.tsx",
      "components/admin/veranstaltungen/VeranstaltungListRow.tsx",
    ];
    for (const relativePath of paths) {
      const file = readFileSync(join(repoRoot, relativePath), "utf8");
      expect(file, relativePath).not.toMatch(/type=["']checkbox["']/);
    }
  });

  it("ActivityTypePill exposes club-event-violet for EVENT", () => {
    const pill = readFileSync(
      join(repoRoot, "lib/sporting-activity-presentation/activity-type-pill.ts"),
      "utf8",
    );
    expect(pill).toContain("club-event-violet");
    expect(pill).toContain("EVENT: \"club-event-violet\"");
  });
});

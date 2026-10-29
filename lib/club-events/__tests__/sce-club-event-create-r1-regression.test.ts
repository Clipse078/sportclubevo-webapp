import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { clubEventOrganisationalAudienceEditorToApiPayload } from "@/lib/events/club-event-organisational-audience-api";
import { clubEventRecurrenceEditorToApiPayload } from "@/lib/events/club-event-recurrence-editor-payload";
import {
  formatClubEventComposerScheduleReviewLine,
  parseClubEventScheduleInput,
  zonedDateKeyFromInstant,
} from "@/lib/events/club-event-scheduling";

const root = process.cwd();
const TZ = "Europe/Zurich";
const LOCALE = "de-CH";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-CLUB-EVENT-CREATE-R1 — server/client boundary + all-day semantics", () => {
  it("commit service imports audience and recurrence mappers from lib/events only", () => {
    const commit = read("lib/club-events/composer/club-event-commit-service.ts");
    expect(commit).toContain("@/lib/events/club-event-organisational-audience-api");
    expect(commit).toContain("@/lib/events/club-event-recurrence-editor-payload");
    expect(commit).not.toMatch(/@\/components\/admin\/veranstaltungen\//);
  });

  it("server-safe audience mapper strips UI labels and preserves scope/targets", () => {
    expect(
      clubEventOrganisationalAudienceEditorToApiPayload({
        scope: "CLUB_WIDE",
        targets: [],
      }),
    ).toEqual({ scope: "CLUB_WIDE", targets: [] });

    expect(
      clubEventOrganisationalAudienceEditorToApiPayload({
        scope: "SELECTED_ORG_UNITS",
        targets: [
          { kind: "TEAM", id: "team-1", label: "U17" },
          { kind: "ORG_UNIT", id: "ou-1", label: "Vorstand" },
        ],
      }),
    ).toEqual({
      scope: "SELECTED_ORG_UNITS",
      targets: [
        { kind: "TEAM", id: "team-1" },
        { kind: "ORG_UNIT", id: "ou-1" },
      ],
    });
  });

  it("recurrence editor mapper matches wizard disabled/enabled shapes", () => {
    expect(clubEventRecurrenceEditorToApiPayload({ enabled: false } as never)).toEqual({
      enabled: false,
    });
    const payload = clubEventRecurrenceEditorToApiPayload({
      enabled: true,
      frequency: "WEEKLY",
      intervalCount: 2,
      weekday: "TUESDAY",
      monthlyPatternKind: "DAY_OF_MONTH",
      monthDay: 1,
      monthOrdinal: "FIRST",
      endMode: "AFTER_COUNT",
      endDate: "",
      occurrenceCount: 5,
    });
    expect(payload).toEqual({
      enabled: true,
      frequency: "WEEKLY",
      intervalCount: 2,
      weekday: "TUESDAY",
      monthlyPatternKind: undefined,
      monthDay: 1,
      monthOrdinal: undefined,
      endMode: "AFTER_COUNT",
      endDate: undefined,
      occurrenceCount: 5,
    });
  });

  it("all-day composer review line shows Ganztägig and never leaks default start time", () => {
    const line = formatClubEventComposerScheduleReviewLine(
      {
        allDay: true,
        startDate: "2026-10-31",
        endDate: "2026-10-31",
        startTime: "18:00",
        endTime: "20:00",
      },
      LOCALE,
      TZ,
    );
    expect(line).toBeTruthy();
    expect(line).toContain("Ganztägig");
    expect(line).not.toMatch(/18:00/);
    expect(line).toMatch(/31\.10\.2026/);
  });

  it("timed composer review line exposes actual wall time", () => {
    const line = formatClubEventComposerScheduleReviewLine(
      {
        allDay: false,
        startDate: "2026-10-31",
        endDate: "",
        startTime: "18:00",
        endTime: "20:00",
      },
      LOCALE,
      TZ,
    );
    expect(line).toMatch(/31\.10\.2026/);
    expect(line).toMatch(/18:00/);
    expect(line).toMatch(/20:00/);
    expect(line).not.toContain("Ganztägig");
  });

  it("all-day schedule keeps calendar date stable through parse (timezone safety)", () => {
    const parsed = parseClubEventScheduleInput(
      {
        allDay: true,
        startDate: "2026-10-31",
        endDate: "2026-10-31",
        startTime: "18:00",
      },
      TZ,
    );
    expect(zonedDateKeyFromInstant(parsed.startAt, TZ)).toBe("2026-10-31");
  });

  it("guards against reintroducing client-only mapper imports in server composer modules", () => {
    const serverComposerDir = join(root, "lib/club-events/composer");
    for (const file of ["club-event-commit-service.ts", "club-event-approval-service.ts"]) {
      const path = join(serverComposerDir, file);
      if (!existsSync(path)) continue;
      const src = readFileSync(path, "utf8");
      expect(src).not.toMatch(
        /from "@\/components\/admin\/veranstaltungen\/ClubEventOrganisationalAudienceEditor"/,
      );
      expect(src).not.toMatch(
        /from "@\/components\/admin\/veranstaltungen\/VeranstaltungRecurrenceFields"/,
      );
    }
  });
});

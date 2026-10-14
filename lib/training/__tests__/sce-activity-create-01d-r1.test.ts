import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildTrainingCreateTabNavigationConfig, normalizeTrainingCreateTabParam } from "@/lib/training/training-create-workflow-config";
import {
  computeTrainingCreateTabErrors,
  firstInvalidTrainingCreateTab,
} from "@/lib/training/training-create-validation";
import { createEmptyTrainingComposerDraft } from "@/lib/training/composer/training-composer-draft-types";
import { resolveTrainingComposerDateWindow } from "@/lib/training/composer/create-training-series-from-composer";
import { generateTrainingSessionOccurrences } from "@/lib/training/recurrence";
import { resolveContextTabFromSearchParams } from "@/lib/context-tabs/url";
import { buildClubEventCreateTabNavigationConfig } from "@/lib/veranstaltungen/club-event-create-workflow-config";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01D-R1 — PO UAT corrections", () => {
  it("Training composer exposes five tabs without Publikation", () => {
    const config = buildTrainingCreateTabNavigationConfig();
    expect(config.tabs.map((t) => t.key)).toEqual([
      "team",
      "termin",
      "wiederholung",
      "ressourcen",
      "pruefen",
    ]);
    const form = read("components/admin/training/TrainingCreateForm.tsx");
    expect(form).not.toContain('key: "publikation"');
    expect(form).not.toContain("PlanningPublicationPanel");
  });

  it("obsolete tab=publikation resolves to a valid Training tab", () => {
    expect(normalizeTrainingCreateTabParam("publikation")).toBe("pruefen");
    expect(normalizeTrainingCreateTabParam("uebersicht")).toBe("team");
    const config = buildTrainingCreateTabNavigationConfig();
    const resolved = resolveContextTabFromSearchParams({
      tabParam: config.resolveTabParam?.("publikation") ?? "publikation",
      defaultTab: config.defaultTab,
      visibleTabs: config.tabs,
    });
    expect(resolved).toBe("pruefen");
  });

  it("full-page /training/new does not duplicate composer creation heading", () => {
    const page = read("app/(admin)/dashboard/training/new/page.tsx");
    expect(page).not.toContain("Training erstellen");
    expect(page).not.toContain("Team, Termin, Wiederholung und Ressourcen im Composer erfassen");
    expect(page).toContain("TrainingRecordWorkspaceShell");
    expect(page).not.toMatch(/header=\{/);
  });

  it("overlay create trigger remains wired", () => {
    expect(read("components/sce/activity-create/SceActivityCreateMenu.tsx")).toContain('containerMode="overlay"');
  });

  it("first-invalid-tab order excludes removed Publikation tab", () => {
    const draft = {
      ...createEmptyTrainingComposerDraft(),
      title: "Ok",
      teamSeasonId: "ts-1",
      validFrom: "2026-03-10",
      weekdaySchedules: [{ weekday: "TUESDAY", startsAt: "18:00", endsAt: "19:30" }],
    };
    expect(firstInvalidTrainingCreateTab(computeTrainingCreateTabErrors(draft))).toBeNull();
    const broken = { ...draft, recurrenceEnabled: true, validUntil: "2026-03-01" };
    expect(firstInvalidTrainingCreateTab(computeTrainingCreateTabErrors(broken))).toBe("wiederholung");
  });

  describe("recurrence semantics (domain unchanged)", () => {
    it("single occurrence uses validFrom..validFrom+1 window", () => {
      const payload = {
        ...createEmptyTrainingComposerDraft(),
        validFrom: "2026-03-10",
        recurrenceEnabled: false,
        weekdaySchedules: [{ weekday: "TUESDAY", startsAt: "18:00", endsAt: "19:30" }],
      };
      const window = resolveTrainingComposerDateWindow(payload);
      expect(window.validFrom.toISOString().slice(0, 10)).toBe("2026-03-10");
      expect(window.validUntil.toISOString().slice(0, 10)).toBe("2026-03-11");
      const occurrences = generateTrainingSessionOccurrences(
        {
          validFrom: window.validFrom,
          validUntil: window.validUntil,
          weekdays: ["TUESDAY"],
          timezone: "Europe/Zurich",
          startsAt: "18:00",
          endsAt: "19:30",
        },
        { from: window.validFrom, to: window.validUntil },
      );
      expect(occurrences.map((o) => o.dateKey)).toEqual(["2026-03-10"]);
    });

    it("recurring: start Tuesday, only Wednesday — first session is Wednesday same week", () => {
      const validFrom = new Date("2026-03-10T00:00:00.000Z");
      const validUntil = new Date("2026-03-31T00:00:00.000Z");
      const occurrences = generateTrainingSessionOccurrences(
        {
          validFrom,
          validUntil,
          weekdays: ["WEDNESDAY"],
          timezone: "Europe/Zurich",
          startsAt: "17:00",
          endsAt: "18:30",
        },
        { from: validFrom, to: validUntil },
      );
      expect(occurrences[0]?.dateKey).toBe("2026-03-11");
    });

    it("recurring: multiple weekdays with per-day times", () => {
      const validFrom = new Date("2026-03-10T00:00:00.000Z");
      const validUntil = new Date("2026-03-17T00:00:00.000Z");
      const occurrences = generateTrainingSessionOccurrences(
        {
          validFrom,
          validUntil,
          weekdays: ["TUESDAY", "THURSDAY"],
          timezone: "Europe/Zurich",
          startsAt: "18:00",
          endsAt: "19:00",
          weekdayTimes: {
            TUESDAY: { startsAt: "17:00", endsAt: "18:00" },
            THURSDAY: { startsAt: "18:30", endsAt: "20:00" },
          },
        },
        { from: validFrom, to: validUntil },
      );
      expect(occurrences.map((o) => o.dateKey)).toEqual(["2026-03-10", "2026-03-12", "2026-03-17"]);
    });

    it("end date before first selected weekday yields no occurrences in window", () => {
      const validFrom = new Date("2026-03-10T00:00:00.000Z");
      const validUntil = new Date("2026-03-10T00:00:00.000Z");
      const occurrences = generateTrainingSessionOccurrences(
        {
          validFrom,
          validUntil,
          weekdays: ["WEDNESDAY"],
          timezone: "Europe/Zurich",
          startsAt: "18:00",
          endsAt: "19:00",
        },
        { from: validFrom, to: validUntil },
      );
      expect(occurrences).toHaveLength(0);
    });
  });

  it("draft roundtrip fields remain in composer payload shape", () => {
    const draft = {
      ...createEmptyTrainingComposerDraft(),
      recurrenceEnabled: true,
      validFrom: "2026-04-01",
      validUntil: "2026-06-01",
      weekdaySchedules: [
        { weekday: "MONDAY", startsAt: "18:00", endsAt: "19:30" },
        { weekday: "WEDNESDAY", startsAt: "17:00", endsAt: "18:30" },
      ],
    };
    expect(draft.recurrenceEnabled).toBe(true);
    expect(draft.weekdaySchedules).toHaveLength(2);
  });

  it("01C Club Event tab model unchanged (still includes Publikation)", () => {
    const clubTabs = buildClubEventCreateTabNavigationConfig().tabs.map((t) => t.key);
    expect(clubTabs).toContain("publikation");
  });

  it("uses SwitchToggle for recurrence binary control", () => {
    expect(read("components/admin/training/TrainingCreateForm.tsx")).toContain("SwitchToggle");
    expect(read("components/admin/training/TrainingCreateForm.tsx")).not.toMatch(
      /type=\"checkbox\"[\s\S]*Wöchentliche Wiederholung/,
    );
  });
});

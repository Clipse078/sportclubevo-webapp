import { describe, expect, it } from "vitest";
import { buildClubEventCreateTabNavigationConfig } from "@/lib/veranstaltungen/club-event-create-workflow-config";
import { resolveContextTabFromSearchParams } from "@/lib/context-tabs/url";
import { listAllVisibleTabs } from "@/lib/context-tabs/registry";
import {
  computeClubEventCreateTabErrors,
  firstInvalidClubEventCreateTab,
} from "@/lib/veranstaltungen/club-event-create-validation";

describe("club event create workflow tabs", () => {
  it("uses canonical five-tab configuration", () => {
    const config = buildClubEventCreateTabNavigationConfig();
    expect(config.contextKind).toBe("CLUB_EVENT_CREATE");
    expect(config.defaultTab).toBe("uebersicht");
    expect(listAllVisibleTabs(config).map((t) => t.key)).toEqual([
      "uebersicht",
      "gueltigkeit",
      "termin",
      "ressourcen",
      "publikation",
    ]);
  });

  it("resolves URL tab continuity", () => {
    const config = buildClubEventCreateTabNavigationConfig();
    const tab = resolveContextTabFromSearchParams({
      tabParam: "termin",
      defaultTab: config.defaultTab,
      visibleTabs: listAllVisibleTabs(config),
    });
    expect(tab).toBe("termin");
  });

  it("marks invalid tabs and picks first for navigation", () => {
    const errors = computeClubEventCreateTabErrors({
      seasonId: "",
      title: "",
      schedule: {
        allDay: false,
        startDate: "",
        endDate: "",
        startTime: "18:00",
        endTime: "20:00",
      },
      audience: { scope: "SELECTED_ORG_UNITS", targets: [] },
      recurrenceEnabled: true,
      recurrenceEndDate: "",
      recurrenceOccurrenceCount: "",
      recurrenceEndMode: "ON_DATE",
    });
    expect(errors.uebersicht).toBe(true);
    expect(errors.gueltigkeit).toBe(true);
    expect(errors.termin).toBe(true);
    expect(firstInvalidClubEventCreateTab(errors)).toBe("uebersicht");
  });
});

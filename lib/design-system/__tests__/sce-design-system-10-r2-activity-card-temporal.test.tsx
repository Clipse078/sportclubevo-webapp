/**
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import {
  SCE_DESIGN_SYSTEM_10_GOVERNANCE,
  SCE_DESIGN_SYSTEM_10_R2_ACTIVITY_CARD_TEMPORAL,
} from "@/lib/design-system/sce-design-system-10-meta";
import { SCE_DESIGN_SYSTEM_04_GOVERNANCE } from "@/lib/design-system/sce-design-system-04-meta";
import VeranstaltungListRow from "@/components/admin/veranstaltungen/VeranstaltungListRow";
import type { ClubEvent } from "@/lib/events/club-events-service";
import { applyClubEventOrganisationalAudienceTestDefaults } from "@/lib/events/club-event-test-defaults";
import {
  SCE_ACTIVITY_DATE_BLOCK_CONTRACT,
  SCE_ACTIVITY_TEMPORAL_INFORMATION_GRAMMAR,
} from "@/lib/sporting-activity-presentation/canonical/activity-card-temporal-grammar";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function createEvent(overrides: Partial<ClubEvent> = {}): ClubEvent {
  return applyClubEventOrganisationalAudienceTestDefaults({
    id: "ev-r2-1",
    title: "118. Mitgliederversammlung",
    description: null,
    location: "Clubhaus",
    startAt: new Date("2026-10-24T17:00:00.000Z"),
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
  });
}

describe("SCE-DESIGN-SYSTEM-10-R2 — activity card temporal consistency", () => {
  it("records DS-10 R2 governance and shared date-block contract", () => {
    expect(SCE_DESIGN_SYSTEM_10_R2_ACTIVITY_CARD_TEMPORAL.VERANSTALTUNG_DATE_BLOCK_TIME_REMOVED).toBe(
      "YES",
    );
    expect(SCE_DESIGN_SYSTEM_10_R2_ACTIVITY_CARD_TEMPORAL.VERANSTALTUNG_TIME_INFORMATION_PRESERVED).toBe(
      "YES",
    );
    expect(SCE_ACTIVITY_DATE_BLOCK_CONTRACT.DATE_BLOCK_TIME_ALLOWED).toBe("NO");
    expect(SCE_ACTIVITY_TEMPORAL_INFORMATION_GRAMMAR.DATE_AND_TIME_SEMANTICS_SEPARATED).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE).toBe("PASS");
  });

  it("Veranstaltung management date block is date-only; time stays in context zone", () => {
    render(<VeranstaltungListRow event={createEvent()} canManage />);

    const dateBlock = screen.getByTestId("veranstaltung-row-date-block");
    expect(dateBlock).toHaveAttribute("data-sce-activity-date-block", "date-only");
    expect(screen.queryByTestId("veranstaltung-row-date-time")).toBeNull();

    const dateText = dateBlock.textContent ?? "";
    expect(dateText).not.toMatch(/\d{1,2}:\d{2}/);

    const context = screen.getByTestId("veranstaltung-row-context-zone");
    expect(within(context).getByTestId("veranstaltung-row-context-time").textContent).toMatch(/19:00/);
  });

  it("Turniere management date block remains date-only (reference contract)", () => {
    const row = readSrc("components/admin/tournamentcenter/TurniereManagementRow.tsx");
    const dateBlockRegion = row.slice(
      row.indexOf('data-testid="turniere-row-date-block"'),
      row.indexOf("turniere-row-identity"),
    );
    expect(dateBlockRegion).not.toContain("timeLabel");
    expect(dateBlockRegion).not.toContain("Clock");
  });

  it("Veranstaltung list row source does not render time inside date block", () => {
    const src = readSrc("components/admin/veranstaltungen/VeranstaltungListRow.tsx");
    expect(src).toContain('data-sce-activity-date-block="date-only"');
    expect(src).not.toContain("veranstaltung-row-date-time");
    expect(src).not.toContain("formatClubEventTimingLabel");
  });

  it("preserves match home/away grammar and activity semantic colours", () => {
    const matchRow = readSrc("components/admin/matchcenter/SpieleManagementMatchRow.tsx");
    expect(matchRow).toMatch(/home|away|VS/i);
    expect(readSrc("components/sporting-activity/SceMatchCard.tsx")).toContain('activityKind="MATCH"');
    expect(readSrc("components/sporting-activity/SceTrainingCard.tsx")).toContain(
      'activityKind="TRAINING"',
    );
    expect(readSrc("components/sporting-activity/SceTournamentCard.tsx")).toContain(
      "tournament-orange",
    );
    expect(readSrc("lib/sporting-activity-presentation/activity-type-pill.ts")).toContain(
      "club-event-violet",
    );
  });

  it("preserves training card presentation and DS-04 multi-selection pattern", () => {
    expect(readSrc("components/sporting-activity/SceTrainingCard.tsx")).toContain(
      "SceTrainingCard",
    );
    expect(SCE_DESIGN_SYSTEM_04_GOVERNANCE.MULTI_SELECTION_PATTERN).toContain("MULTI_SELECT");
  });

  it("documents temporal grammar in SCE-DESIGN-SYSTEM.md", () => {
    const doc = readFileSync(join(ROOT, "docs/design/SCE-DESIGN-SYSTEM.md"), "utf8");
    expect(doc).toContain("SCE_ACTIVITY_DATE_BLOCK_CONTRACT");
    expect(doc).toContain("date-only block");
  });
});

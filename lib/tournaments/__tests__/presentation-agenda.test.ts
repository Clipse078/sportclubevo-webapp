import { describe, expect, it } from "vitest";
import {
  formatTournamentAgendaDateHeading,
  formatTournamentAgendaMonthHeading,
} from "@/lib/tournaments/presentation";

describe("tournament agenda headings", () => {
  it("formats date groups for operational scanning", () => {
    const label = formatTournamentAgendaDateHeading("2026-09-19", "de-CH", "Europe/Zurich");
    expect(label).toMatch(/·/);
    expect(label).toContain("19");
    expect(label.toUpperCase()).toBe(label);
  });

  it("formats month groups in uppercase", () => {
    const label = formatTournamentAgendaMonthHeading("2026-09", "de-CH", "Europe/Zurich");
    expect(label).toContain("2026");
    expect(label.toUpperCase()).toBe(label);
  });
});

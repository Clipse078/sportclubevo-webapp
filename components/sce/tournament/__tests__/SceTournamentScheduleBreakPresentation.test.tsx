/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SceTournamentScheduleBreakPresentation from "../SceTournamentScheduleBreakPresentation";
import { SCE_TOURNAMENT_SCHEDULE_BREAK_MARKER } from "@/lib/sce/tournament/sce-tournament-schedule-break-semantics";
import { SCE_TOURNAMENT_FIXTURE_COMPACT_SHELL_CLASS } from "@/lib/sce/tournament/sce-tournament-surface-layout";

describe("SceTournamentScheduleBreakPresentation — R7.7A pause semantic", () => {
  it("normal Spielplan — Pause label, time, canonical marker", () => {
    render(
      <SceTournamentScheduleBreakPresentation
        layout="spielplan-all-pitches"
        label="Pause"
        timeLabel="11:00–11:15"
        testId="spielplan-all-pitches-break"
      />,
    );
    const block = screen.getByTestId("spielplan-all-pitches-break");
    expect(block).toHaveAttribute("data-sce-schedule-break", SCE_TOURNAMENT_SCHEDULE_BREAK_MARKER);
    expect(screen.getByText("Pause")).toBeInTheDocument();
    expect(screen.getByText("11:00–11:15")).toBeInTheDocument();
  });

  it("edit board — ALL_PITCHES band with scope meta", () => {
    render(
      <SceTournamentScheduleBreakPresentation
        layout="board-all-pitches"
        label="Pause"
        timeLabel="11:00–11:15"
        scopeLabel="Alle Felder"
        testId="planung-board-all-pitches-break-inner"
      />,
    );
    const band = screen.getByTestId("planung-board-all-pitches-break-inner");
    expect(band).toHaveAttribute("data-sce-schedule-break", SCE_TOURNAMENT_SCHEDULE_BREAK_MARKER);
    expect(screen.getByText("Pause")).toBeInTheDocument();
    expect(screen.getByText("11:00–11:15 · Alle Felder")).toBeInTheDocument();
  });

  it("selected pitch cell uses same semantic family", () => {
    render(
      <SceTournamentScheduleBreakPresentation
        layout="board-pitch"
        label="Pause"
        timeLabel="11:00–11:15"
        testId="planung-board-pitch-break-p1"
      />,
    );
    expect(screen.getByTestId("planung-board-pitch-break-p1")).toHaveAttribute(
      "data-sce-schedule-break",
      SCE_TOURNAMENT_SCHEDULE_BREAK_MARKER,
    );
  });

  it("fixture compact shell is not applied to break presentation", () => {
    render(
      <SceTournamentScheduleBreakPresentation
        layout="spielplan-all-pitches"
        label="Pause"
        timeLabel="11:00–11:15"
        testId="break-only"
      />,
    );
    const block = screen.getByTestId("break-only");
    expect(block.className).not.toContain("--sce-match-card-surface");
    expect(block.className).not.toContain("hover:bg-[var(--sce-surface-elevated)]/15");
    expect(SCE_TOURNAMENT_FIXTURE_COMPACT_SHELL_CLASS).toContain("--sce-match-card-surface");
  });
});

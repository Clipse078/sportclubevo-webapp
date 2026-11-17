/** @vitest-environment jsdom */
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  MeetingAgendaTimerProvider,
  useMeetingAgendaTimer,
} from "@/components/admin/meetings/workspace/MeetingAgendaTimerProvider";

const countdownSpy = vi.fn();
const completionSpy = vi.fn();
const stopSpy = vi.fn();

vi.mock("@/lib/meetings/sitzungsmodus/meeting-agenda-timer-chime", () => ({
  playMeetingAgendaTimerCountdownCue: () => countdownSpy(),
  playMeetingAgendaTimerCompletionCue: () => completionSpy(),
  stopMeetingAgendaTimerAudio: () => stopSpy(),
}));

vi.mock("@/lib/meetings/sitzungsmodus/meeting-agenda-timer-storage", () => ({
  loadMeetingAgendaTimerState: () => ({
    v: 3,
    scope: { meetingId: "m1", tenantId: "t1", userId: "u1" },
    modeActive: true,
    activeAgendaItemId: "a1",
    phase: "running",
    remainingAtAnchorSec: 10.5,
    anchorMs: Date.now() - 500,
    budgetSec: 60,
    temporaryDurationSec: null,
    topicSnapshots: {},
    chimeEnabled: true,
    chimedMilestonesByTopicId: {},
    activeTopicHasStarted: true,
  }),
  saveMeetingAgendaTimerState: vi.fn(),
}));

function Probe() {
  const timer = useMeetingAgendaTimer();
  return <div data-testid="remaining">{timer?.remainingSec ?? "—"}</div>;
}

describe("MeetingAgendaTimerProvider chime scheduling", () => {
  it("schedules a single provider-side cue (sticky/focus share context)", async () => {
    countdownSpy.mockClear();
    render(
      <MeetingAgendaTimerProvider
        scope={{ meetingId: "m1", tenantId: "t1", userId: "u1" }}
        canManage
        agendaItems={[
          {
            id: "a1",
            title: "TOP 1",
            durationMin: 1,
            owner: null,
            meetingId: "m1",
            notes: null,
            position: 0,
          },
        ]}
        displayOrder={new Map([["a1", 0]])}
      >
        <Probe />
      </MeetingAgendaTimerProvider>,
    );

    await waitFor(() => expect(countdownSpy).toHaveBeenCalledTimes(1));
  });
});
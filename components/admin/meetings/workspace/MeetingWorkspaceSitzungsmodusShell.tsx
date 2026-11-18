"use client";

import type { ReactNode } from "react";
import { useMeetingAgendaTimer } from "@/components/admin/meetings/workspace/MeetingAgendaTimerProvider";
import { MeetingSitzungsmodusFocusExperience } from "@/components/admin/meetings/workspace/MeetingSitzungsmodusFocusExperience";
import type { MeetingSitzungsmodusFocusExperienceProps } from "@/components/admin/meetings/workspace/MeetingSitzungsmodusFocusExperience";

type Props = {
  children: ReactNode;
  focusProps: Omit<MeetingSitzungsmodusFocusExperienceProps, "canManage">;
  canManage: boolean;
};

export function MeetingWorkspaceSitzungsmodusShell({ children, focusProps, canManage }: Props) {
  const timer = useMeetingAgendaTimer();
  const showFocus = Boolean(timer?.focusPresentationActive && timer.state.modeActive);

  if (showFocus) {
    return (
      <MeetingSitzungsmodusFocusExperience {...focusProps} canManage={canManage} />
    );
  }

  return <>{children}</>;
}
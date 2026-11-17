"use client";

import { forwardRef } from "react";
import type { ContextualTaskCreateDialogProps } from "./ContextualTaskCreateDialog";
import ContextualTaskInlineCreateCard, {
  type ContextualTaskInlineCreateCardHandle,
} from "./ContextualTaskInlineCreateCard";

export type MeetingContextualTaskInlineCreateCardHandle = ContextualTaskInlineCreateCardHandle;

type Props = Omit<ContextualTaskCreateDialogProps, "open" | "onOpenChange"> & {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onCreated?: () => void;
  initialTitle?: string;
  successMode?: "refresh" | "navigate";
};

const MeetingContextualTaskInlineCreateCard = forwardRef<
  MeetingContextualTaskInlineCreateCardHandle,
  Props
>(function MeetingContextualTaskInlineCreateCard({ initialTitle, successMode, ...props }, ref) {
  return (
    <ContextualTaskInlineCreateCard
      ref={ref}
      {...props}
      initialTitle={initialTitle}
      successMode={successMode}
      panelDomId="meeting-contextual-task-create-panel"
      formDomId="meeting-contextual-task-create-form"
      cardTestId="meeting-contextual-task-inline-create-card"
      collapseToggleTestId="meeting-contextual-task-create-collapse"
    />
  );
});

export default MeetingContextualTaskInlineCreateCard;

"use client";

import type { TaskContextType } from "@prisma/client";
import type { AgendaLinkedTaskSummary } from "@/lib/meetings/agenda-item-ergebnisse";
import type { ContextualTaskCreateDialogProps } from "@/components/admin/aufgaben/contextual/ContextualTaskCreateDialog";
import MeetingContextualTaskInlineCreateCard from "@/components/admin/aufgaben/contextual/MeetingContextualTaskInlineCreateCard";

export type MeetingTraktandumTaskCreateBaseProps = Omit<
  ContextualTaskCreateDialogProps,
  "open" | "onOpenChange" | "contextType" | "contextId"
>;

type Props = {
  meetingId: string;
  agendaItemId: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  contextType: TaskContextType;
  contextId: string;
  createBase: MeetingTraktandumTaskCreateBaseProps;
  initialTitle?: string;
  onCreated?: (summary: AgendaLinkedTaskSummary) => void;
  testIdPrefix: string;
};

export function MeetingTraktandumAufgabeCreate({
  meetingId,
  agendaItemId,
  expanded,
  onExpandedChange,
  contextType,
  contextId,
  createBase,
  initialTitle,
  onCreated,
}: Props) {
  return (
    <MeetingContextualTaskInlineCreateCard
      meetingId={meetingId}
      agendaItemId={agendaItemId}
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      contextType={contextType}
      contextId={contextId}
      presentation={createBase.presentation}
      orgUnitOptions={createBase.orgUnitOptions}
      timeZone={createBase.timeZone}
      tenantWideVisibility={createBase.tenantWideVisibility}
      initialTitle={initialTitle}
      onCreated={(summary) => {
        onCreated?.(summary);
      }}
    />
  );
}
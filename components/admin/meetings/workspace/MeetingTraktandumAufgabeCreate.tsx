"use client";

import { useRouter } from "next/navigation";
import type { TaskContextType } from "@prisma/client";
import type { ContextualTaskCreateDialogProps } from "@/components/admin/aufgaben/contextual/ContextualTaskCreateDialog";
import MeetingContextualTaskInlineCreateCard from "@/components/admin/aufgaben/contextual/MeetingContextualTaskInlineCreateCard";

export type MeetingTraktandumTaskCreateBaseProps = Omit<
  ContextualTaskCreateDialogProps,
  "open" | "onOpenChange" | "contextType" | "contextId"
>;

type Props = {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  contextType: TaskContextType;
  contextId: string;
  createBase: MeetingTraktandumTaskCreateBaseProps;
  initialTitle?: string;
  onCreated?: () => void;
  testIdPrefix: string;
};

export function MeetingTraktandumAufgabeCreate({
  expanded,
  onExpandedChange,
  contextType,
  contextId,
  createBase,
  initialTitle,
  onCreated,
}: Props) {
  const router = useRouter();
  return (
    <MeetingContextualTaskInlineCreateCard
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      contextType={contextType}
      contextId={contextId}
      presentation={createBase.presentation}
      orgUnitOptions={createBase.orgUnitOptions}
      timeZone={createBase.timeZone}
      tenantWideVisibility={createBase.tenantWideVisibility}
      initialTitle={initialTitle}
      successMode="refresh"
      onCreated={() => {
        onCreated?.();
        router.refresh();
      }}
    />
  );
}
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import type { TaskWorkspaceBundle } from "@/lib/tasks/workspace-service";

export type TaskWorkspaceViewProps = {
  bundle: TaskWorkspaceBundle;
  assigneeOptions: TaskAssigneeOption[];
  orgUnitOptions: TaskOrgUnitPickerOption[];
  orgUnitDisplayLabel: string;
  locale: string;
  timeZone: string;
  backHref: string;
  presentation: "page" | "modal";
  currentUserId: string;
  onClose?: () => void;
};

export type TaskWorkspaceCreateProps = {
  assigneeOptions: TaskAssigneeOption[];
  locale: string;
  timeZone: string;
  backHref: string;
  presentation: "page" | "modal";
  onClose?: () => void;
};

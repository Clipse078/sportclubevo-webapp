import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import type { TaskWorkspaceBundle } from "@/lib/tasks/workspace-service";

export type TaskWorkspaceViewProps = {
  bundle: TaskWorkspaceBundle;
  assigneeOptions: TaskAssigneeOption[];
  locale: string;
  timeZone: string;
  backHref: string;
  presentation: "page" | "modal";
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

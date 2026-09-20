"use client";

import { useRouter } from "next/navigation";
import { TaskWorkspaceModal } from "@/components/admin/aufgaben/TaskWorkspace";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import type { TaskWorkspaceBundle } from "@/lib/tasks/workspace-service";

type Props = {
  bundle: TaskWorkspaceBundle;
  assigneeOptions: TaskAssigneeOption[];
  locale: string;
  timeZone: string;
  backHref: string;
};

export default function TaskWorkspaceInterceptClient(props: Props) {
  const router = useRouter();
  return (
    <TaskWorkspaceModal
      {...props}
      presentation="modal"
      onClose={() => router.back()}
    />
  );
}

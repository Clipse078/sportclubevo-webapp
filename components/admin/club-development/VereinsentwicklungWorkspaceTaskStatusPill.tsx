import type { TaskStatus } from "@prisma/client";
import { vereinsentwicklungTaskStatusBadgeClass } from "@/lib/club-development/vereinsentwicklung-task-status-presentation";

type Props = {
  status: TaskStatus;
  label: string;
};

export default function VereinsentwicklungWorkspaceTaskStatusPill({ status, label }: Props) {
  return <span className={vereinsentwicklungTaskStatusBadgeClass(status)}>{label}</span>;
}
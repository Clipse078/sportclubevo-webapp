import type { ReactNode } from "react";
import type { DevelopmentSprintStatus } from "@prisma/client";
import DevelopmentSprintWorkspaceHeader from "./DevelopmentSprintWorkspaceHeader";
import { loadSprintProgressStats } from "@/lib/club-development/sprints/sprint-workspace-stats";
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";

type Props = {
  tenantId: string;
  actorUserId: string;
  sprint: {
    id: string;
    slug: string;
    title: string;
    goal: string | null;
    status: DevelopmentSprintStatus;
    owner: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
    startedAt: Date | null;
  };
  canManage: boolean;
  activeTab: "planung" | "board" | "rueckblick";
  children: ReactNode;
};

export default async function DevelopmentSprintWorkspaceShell({
  tenantId,
  actorUserId,
  sprint,
  canManage,
  activeTab,
  children,
}: Props) {
  const taskCtx = await buildTaskServiceContextForActor(actorUserId, tenantId);
  const stats = taskCtx
    ? await loadSprintProgressStats(taskCtx, sprint.id)
    : { total: 0, completed: 0 };

  return (
    <div className="space-y-6" data-testid="sprint-workspace-shell">
      <DevelopmentSprintWorkspaceHeader
        sprintId={sprint.id}
        slug={sprint.slug}
        goal={sprint.goal}
        status={sprint.status}
        owner={sprint.owner}
        startsAt={sprint.startsAt?.toISOString() ?? null}
        endsAt={sprint.endsAt?.toISOString() ?? null}
        startedAt={sprint.startedAt?.toISOString() ?? null}
        completedCount={stats.completed}
        totalCount={stats.total}
        canManage={canManage}
        activeTab={activeTab}
      />
      {children}
    </div>
  );
}
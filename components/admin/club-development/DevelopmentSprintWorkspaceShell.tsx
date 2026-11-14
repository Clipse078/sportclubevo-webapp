import type { ReactNode } from "react";
import type { DevelopmentSprintStatus } from "@prisma/client";
import DevelopmentSprintWorkspaceHeader from "./DevelopmentSprintWorkspaceHeader";
import { loadSprintProgressStats } from "@/lib/club-development/sprints/sprint-workspace-stats";

type Props = {
  tenantId: string;
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
  sprint,
  canManage,
  activeTab,
  children,
}: Props) {
  const stats = await loadSprintProgressStats(tenantId, sprint.id);

  return (
    <div className="space-y-6" data-testid="sprint-workspace-shell">
      <DevelopmentSprintWorkspaceHeader
        sprintId={sprint.id}
        slug={sprint.slug}
        title={sprint.title}
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
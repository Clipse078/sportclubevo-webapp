import { Kanban } from "lucide-react";
import type { InitiativeStatus, TaskStatus } from "@prisma/client";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { loadVorhabenWorkspace } from "@/lib/club-development/vorhaben-workspace";
import { listInitiativeBacklog } from "@/lib/club-development/initiative-backlog";
import {
  hasSprintManagePermission,
  listDevelopmentSprints,
} from "@/lib/club-development/sprints/queries";
import VorhabenUndUmsetzungWorkspaceClient from "@/components/admin/club-development/VorhabenUndUmsetzungWorkspaceClient";
import {
  CD_WORKSPACE_PRIORITAETEN_QUERY,
  CD_NAV_WORKSPACE_LABELS,
} from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import { CD_VORHABEN_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";

type PageProps = {
  searchParams?: Promise<{
    ansicht?: string;
    targetId?: string;
    initiativeId?: string;
    search?: string;
    initiativeStatus?: string;
    taskStatus?: string;
    returnTo?: string;
    prioritaeten?: string;
  }>;
};

function parseInitiativeStatus(raw: string | undefined): InitiativeStatus | undefined {
  if (!raw) return undefined;
  const values = new Set([
    "PLANNED",
    "IN_PROGRESS",
    "ON_TRACK",
    "ON_HOLD",
    "COMPLETED",
    "CANCELLED",
  ]);
  return values.has(raw) ? (raw as InitiativeStatus) : undefined;
}

function parseTaskStatus(raw: string | undefined): TaskStatus | undefined {
  if (!raw) return undefined;
  const values = new Set(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]);
  return values.has(raw) ? (raw as TaskStatus) : undefined;
}

export default async function VorhabenUndUmsetzungPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const query = (await searchParams) ?? {};
  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);

  const filters = {
    search: query.search?.trim() || undefined,
    initiativeId: query.initiativeId?.trim() || undefined,
    targetId: query.targetId?.trim() || undefined,
    initiativeStatus: parseInitiativeStatus(query.initiativeStatus),
    taskStatus: parseTaskStatus(query.taskStatus),
  };

  const backlogTargetId = query.targetId?.trim() || undefined;
  const showPrioritaetenDefault = query[CD_WORKSPACE_PRIORITAETEN_QUERY] === "1";

  const [snapshot, initiatives, sprints] = await Promise.all([
    loadVorhabenWorkspace(actor, filters, {
      returnToPath: query.returnTo?.trim() || "/vereinsleitung/vorhaben-und-umsetzung",
    }),
    listInitiativeBacklog(actor, { targetId: backlogTargetId }),
    listDevelopmentSprints(actor),
  ]);

  const canManageInitiatives = actor.permissionKeys.includes(PERMISSIONS.INITIATIVES_MANAGE);
  const canViewInitiatives =
    canManageInitiatives || actor.permissionKeys.includes(PERMISSIONS.INITIATIVES_VIEW);

  const initialInitiatives = initiatives.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    status: row.status,
    owner: row.owner,
    expectedOutcome: row.expectedOutcome,
    backlogPriority: row.backlogPriority,
    disposition: row.disposition,
    dueDate: row.dueDate?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }));

  const sprintItems = sprints.map((sprint) => ({
    id: sprint.id,
    slug: sprint.slug,
    title: sprint.title,
    goal: sprint.goal,
    status: sprint.status,
    owner: sprint.owner,
    startsAt: sprint.startsAt?.toISOString() ?? null,
    endsAt: sprint.endsAt?.toISOString() ?? null,
  }));

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Vereinsentwicklung"
        title={CD_NAV_WORKSPACE_LABELS.vorhabenUndUmsetzung}
        description={CD_VORHABEN_WORKSPACE_COPY.intro}
        breadcrumbs={[
          { label: "Verein", href: "/vereinsleitung" },
          { label: "Vereinsentwicklung", href: "/vereinsleitung/club-entwicklung" },
          { label: CD_NAV_WORKSPACE_LABELS.vorhabenUndUmsetzung },
        ]}
        emptyIcon={<Kanban className="h-10 w-10" />}
      >
        <VorhabenUndUmsetzungWorkspaceClient
          snapshot={snapshot}
          initialTargetId={filters.targetId ?? null}
          initialInitiativeId={filters.initiativeId ?? null}
          backlogInitiatives={initialInitiatives}
          backlogCanManage={canManageInitiatives}
          backlogCanView={canViewInitiatives}
          backlogTargetId={backlogTargetId ?? null}
          sprints={sprintItems}
          canManageSprints={hasSprintManagePermission(actor)}
          showPrioritaetenDefault={showPrioritaetenDefault}
        />
      </ListPagePattern>
    </PageShell>
  );
}
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import {
  getDevelopmentSprintBySlug,
  hasSprintManagePermission,
} from "@/lib/club-development/sprints/queries";
import DevelopmentSprintBoard from "@/components/admin/club-development/DevelopmentSprintBoard";
import DevelopmentSprintWorkspaceShell from "@/components/admin/club-development/DevelopmentSprintWorkspaceShell";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { CD_SPRINT_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import { buildDevelopmentSprintBreadcrumbs } from "@/lib/club-development/sprint-workspace-chrome";
import { resolveSprintDeleteAuthority } from "@/lib/club-development/sprints/sprint-delete-authority";

type PageProps = { params: Promise<{ slug: string }> };

export default async function DevelopmentSprintBoardPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const sprint = await getDevelopmentSprintBySlug(slug, actor);
  if (!sprint) notFound();

  const canManage = hasSprintManagePermission(actor);
  const tenantId = actor.tenantId;
  const userId = session.user.id ?? "";
  const canDelete =
    tenantId && userId ? await resolveSprintDeleteAuthority(userId, tenantId) : false;

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow={CD_SPRINT_WORKSPACE_COPY.taskBoardTitle}
        title={sprint.title}
        description={CD_SPRINT_WORKSPACE_COPY.boardPageDescription}
        breadcrumbs={buildDevelopmentSprintBreadcrumbs(sprint.slug, sprint.title, "board")}
        headerActions={
          <Link
            href="/vereinsleitung/sprints"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3.5 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Zurück
          </Link>
        }
      >
        {tenantId ? (
          <DevelopmentSprintWorkspaceShell
            tenantId={tenantId}
            actorUserId={session.user.id ?? ""}
            sprint={sprint}
            canManage={canManage}
            canDelete={canDelete}
            activeTab="board"
          >
            <DevelopmentSprintBoard
              sprintId={sprint.id}
              canManage={canManage}
              currentUserId={session.user.id ?? null}
            />
          </DevelopmentSprintWorkspaceShell>
        ) : null}
      </ListPagePattern>
    </PageShell>
  );
}
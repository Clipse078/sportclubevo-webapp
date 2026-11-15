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
import {
  CD_NAV_COPY,
  CD_SPRINT_WORKSPACE_COPY,
} from "@/lib/club-development/product-copy";

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

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow={CD_SPRINT_WORKSPACE_COPY.taskBoardTitle}
        title={sprint.title}
        description="Kanban nach Aufgabenstatus — Offen, In Arbeit, Erledigt."
        breadcrumbs={[
          { label: "Verein", href: "/vereinsleitung" },
          { label: CD_NAV_COPY.implementationPlanning, href: "/vereinsleitung/sprints" },
          { label: sprint.title, href: `/vereinsleitung/sprints/${sprint.slug}` },
          { label: CD_SPRINT_WORKSPACE_COPY.tabTaskBoard },
        ]}
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
            activeTab="board"
          >
            <DevelopmentSprintBoard
              sprintId={sprint.id}
              sprintTitle={sprint.title}
              canManage={canManage}
              currentUserId={session.user.id ?? null}
            />
          </DevelopmentSprintWorkspaceShell>
        ) : null}
      </ListPagePattern>
    </PageShell>
  );
}
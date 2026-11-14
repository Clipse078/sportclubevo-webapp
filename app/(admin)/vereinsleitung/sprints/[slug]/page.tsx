import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { TaskStatus } from "@prisma/client";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import {
  getDevelopmentSprintBySlug,
  hasSprintManagePermission,
} from "@/lib/club-development/sprints/queries";
import { listActiveSprintMemberships } from "@/lib/club-development/sprints/sprint-service";
import { prisma } from "@/lib/db/prisma";
import DevelopmentSprintDetailWorkspace from "@/components/admin/club-development/DevelopmentSprintDetailWorkspace";
import DevelopmentSprintWorkspaceShell from "@/components/admin/club-development/DevelopmentSprintWorkspaceShell";
import { PageShell } from "@/components/ui/page";
import { DetailPagePattern } from "@/components/ui/patterns";

type PageProps = { params: Promise<{ slug: string }> };

export default async function DevelopmentSprintDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const sprint = await getDevelopmentSprintBySlug(slug, actor);
  if (!sprint) notFound();

  const canManage = hasSprintManagePermission(actor);
  const tenantId = actor.tenantId;
  let initialMemberships: {
    membershipId: string;
    taskId: string;
    title: string;
    statusLabel: string;
    status: TaskStatus;
    assigneeLabels: string[];
    initiativeTitle: string | null;
    priorityLabel: string | null;
    dueLabel: string | null;
    addedAfterSprintStart: boolean;
  }[] = [];

  if (tenantId) {
    const memberships = await listActiveSprintMemberships(tenantId, sprint.id);
    const taskIds = memberships.map((m) => m.taskId);
    const tasks =
      taskIds.length > 0
        ? await prisma.task.findMany({
            where: { tenantId, id: { in: taskIds } },
            select: { id: true, title: true, status: true, priority: true, dueAt: true },
          })
        : [];
    const titleById = new Map(tasks.map((t) => [t.id, t.title]));
    const metaById = new Map(tasks.map((t) => [t.id, t]));
    initialMemberships = memberships.map((m) => {
      const meta = metaById.get(m.taskId);
      return {
        membershipId: m.id,
        taskId: m.taskId,
        title: titleById.get(m.taskId) ?? "Aufgabe",
        statusLabel: meta?.status === TaskStatus.DONE ? "Erledigt" : meta?.status === TaskStatus.IN_PROGRESS ? "In Arbeit" : "Offen",
        status: meta?.status ?? TaskStatus.OPEN,
        assigneeLabels: [],
        initiativeTitle: null,
        priorityLabel: meta?.priority ?? null,
        dueLabel: meta?.dueAt
          ? new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" }).format(meta.dueAt)
          : null,
        addedAfterSprintStart: m.addedAfterSprintStart,
      };
    });
  }

  return (
    <PageShell fullWidth>
      <DetailPagePattern
        eyebrow="Sprint-Planung"
        title={sprint.title}
        breadcrumbs={[
          { label: "Verein", href: "/vereinsleitung" },
          { label: "Sprints", href: "/vereinsleitung/sprints" },
          { label: sprint.title },
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
            sprint={sprint}
            canManage={canManage}
            activeTab="planung"
          >
            <DevelopmentSprintDetailWorkspace
              sprintId={sprint.id}
              sprintSlug={sprint.slug}
              status={sprint.status}
              canManage={canManage}
              initialMemberships={initialMemberships}
            />
          </DevelopmentSprintWorkspaceShell>
        ) : null}
      </DetailPagePattern>
    </PageShell>
  );
}
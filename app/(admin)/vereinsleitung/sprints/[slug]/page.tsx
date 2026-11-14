import Link from "next/link";
import { ArrowLeft, Calendar, Kanban } from "lucide-react";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import {
  getDevelopmentSprintBySlug,
  hasSprintManagePermission,
} from "@/lib/club-development/sprints/queries";
import { listActiveSprintMemberships } from "@/lib/club-development/sprints/sprint-service";
import { prisma } from "@/lib/db/prisma";
import DevelopmentSprintDetailWorkspace from "@/components/admin/club-development/DevelopmentSprintDetailWorkspace";
import { SprintBoardQuickLink } from "@/components/admin/club-development/DevelopmentSprintList";
import { PageShell, SectionCard } from "@/components/ui/page";
import { DetailPagePattern } from "@/components/ui/patterns";
import { Badge } from "@/components/ui";
import { PropertyGrid } from "@/components/ui/PropertyGrid";

type PageProps = { params: Promise<{ slug: string }> };

const STATUS_LABELS = {
  PLANNED: "Geplant",
  ACTIVE: "Aktiv",
  COMPLETED: "Abgeschlossen",
} as const;

function formatSwissDate(date: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

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
    assigneeLabels: string[];
    initiativeTitle: string | null;
    addedAfterSprintStart: boolean;
  }[] = [];

  if (tenantId) {
    const memberships = await listActiveSprintMemberships(tenantId, sprint.id);
    const taskIds = memberships.map((m) => m.taskId);
    const tasks =
      taskIds.length > 0
        ? await prisma.task.findMany({
            where: { tenantId, id: { in: taskIds } },
            select: { id: true, title: true },
          })
        : [];
    const titleById = new Map(tasks.map((t) => [t.id, t.title]));
    initialMemberships = memberships.map((m) => ({
      membershipId: m.id,
      taskId: m.taskId,
      title: titleById.get(m.taskId) ?? "Aufgabe",
      statusLabel: "—",
      assigneeLabels: [],
      initiativeTitle: null,
      addedAfterSprintStart: m.addedAfterSprintStart,
    }));
  }

  const statusLabel = STATUS_LABELS[sprint.status];

  return (
    <PageShell fullWidth>
      <DetailPagePattern
        eyebrow="Sprints"
        title={sprint.title}
        description={sprint.goal ?? undefined}
        headerBadge={<Badge variant="info">{statusLabel}</Badge>}
        breadcrumbs={[
          { label: "Verein", href: "/vereinsleitung" },
          { label: "Vereinsentwicklung", href: "/vereinsleitung" },
          { label: "Sprints", href: "/vereinsleitung/sprints" },
          { label: sprint.title },
        ]}
        headerActions={
          <div className="flex items-center gap-2">
            <SprintBoardQuickLink slug={sprint.slug} />
            <Link
              href="/vereinsleitung/sprints"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3.5 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Zurück
            </Link>
          </div>
        }
        sidebar={
          <SectionCard title="Details">
            <PropertyGrid
              columns={1}
              items={[
                { label: "Verantwortlich", value: sprint.owner, emptyText: "Nicht erfasst" },
                {
                  label: "Zeitraum",
                  value:
                    sprint.startsAt || sprint.endsAt
                      ? `${formatSwissDate(sprint.startsAt) ?? "—"} – ${formatSwissDate(sprint.endsAt) ?? "—"}`
                      : null,
                  icon: <Calendar className="h-3.5 w-3.5" />,
                  emptyText: "Kein Zeitraum",
                },
                { label: "Status", value: statusLabel, icon: <Kanban className="h-3.5 w-3.5" /> },
              ]}
            />
          </SectionCard>
        }
      >
        <DevelopmentSprintDetailWorkspace
          sprintId={sprint.id}
          sprintSlug={sprint.slug}
          status={sprint.status}
          canManage={canManage}
          initialMemberships={initialMemberships}
        />
      </DetailPagePattern>
    </PageShell>
  );
}

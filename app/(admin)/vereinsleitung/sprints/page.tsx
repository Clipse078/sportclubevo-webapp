import { Kanban } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import {
  hasSprintManagePermission,
  listDevelopmentSprints,
} from "@/lib/club-development/sprints/queries";
import DevelopmentSprintCreateCard from "@/components/admin/club-development/DevelopmentSprintCreateCard";
import DevelopmentSprintList from "@/components/admin/club-development/DevelopmentSprintList";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";

export default async function DevelopmentSprintsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const sprints = await listDevelopmentSprints(actor);
  const canManage = hasSprintManagePermission(actor);

  const listItems = sprints.map((sprint) => ({
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
        eyebrow="Sprints"
        title="Entwicklungssprints"
        description="Zeitlich gebundene Umsetzungsphasen mit Aufgaben und Kanban-Board."
        breadcrumbs={[
          { label: "Verein", href: "/vereinsleitung" },
          { label: "Vereinsentwicklung", href: "/vereinsleitung" },
          { label: "Sprints" },
        ]}
        isEmpty={listItems.length === 0}
        emptyIcon={<Kanban className="h-10 w-10" />}
        emptyHeading="Keine Sprints"
        emptyDescription="Legen Sie den ersten Entwicklungssprint an."
      >
        <div className="space-y-4">
          <DevelopmentSprintCreateCard canCreate={canManage} />
          <DevelopmentSprintList sprints={listItems} />
        </div>
      </ListPagePattern>
    </PageShell>
  );
}

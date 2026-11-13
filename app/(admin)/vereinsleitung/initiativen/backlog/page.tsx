import { ClipboardList } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { listInitiativeBacklog } from "@/lib/club-development/initiative-backlog";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import InitiativeBacklogWorkspace from "@/components/admin/club-development/InitiativeBacklogWorkspace";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";

export default async function InitiativeBacklogPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const initiatives = await listInitiativeBacklog(actor);
  const canManage = actor.permissionKeys.includes(PERMISSIONS.INITIATIVES_MANAGE);

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

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Initiativen"
        title="Initiativen-Backlog"
        description="Priorisierte Vorhaben mit Disposition, Outcome und Filtern für die Umsetzungsplanung."
        breadcrumbs={[
          { label: "Verein", href: "/vereinsleitung" },
          { label: "Vereinsentwicklung", href: "/vereinsleitung" },
          { label: "Initiativen-Backlog" },
        ]}
        isEmpty={initialInitiatives.length === 0}
        emptyIcon={<ClipboardList className="h-10 w-10" />}
        emptyHeading="Backlog ist leer"
        emptyDescription="Noch keine Initiativen oder keine sichtbaren Einträge."
      >
        <InitiativeBacklogWorkspace initialInitiatives={initialInitiatives} canManage={canManage} />
      </ListPagePattern>
    </PageShell>
  );
}

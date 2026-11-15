import { ClipboardList } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { listInitiativeBacklog } from "@/lib/club-development/initiative-backlog";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import InitiativeBacklogWorkspace from "@/components/admin/club-development/InitiativeBacklogWorkspace";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { CD_NAV_COPY, CD_SPRINT_WORKSPACE_COPY, CD_TARGET_COPY } from "@/lib/club-development/product-copy";

type PageProps = {
  searchParams?: Promise<{ targetId?: string }>;
};

export default async function InitiativeBacklogPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const query = (await searchParams) ?? {};
  const targetId = query.targetId?.trim() || undefined;

  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const initiatives = await listInitiativeBacklog(actor, { targetId });
  const canManage = actor.permissionKeys.includes(PERMISSIONS.INITIATIVES_MANAGE);
  const canView =
    canManage || actor.permissionKeys.includes(PERMISSIONS.INITIATIVES_VIEW);

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
        eyebrow={CD_NAV_COPY.initiativesEyebrow}
        title={CD_NAV_COPY.initiativeBacklog}
        description={`${CD_TARGET_COPY.backlogDescriptionEinordnung}, ${CD_SPRINT_WORKSPACE_COPY.expectedResult} und Filtern für die Umsetzungsplanung.`}
        breadcrumbs={[
          { label: "Verein", href: "/vereinsleitung" },
          { label: "Vereinsentwicklung", href: "/vereinsleitung" },
          { label: CD_NAV_COPY.initiativeBacklog },
        ]}
        emptyIcon={<ClipboardList className="h-10 w-10" />}
      >
        <InitiativeBacklogWorkspace
          initialInitiatives={initialInitiatives}
          canManage={canManage}
          canView={canView}
          initialTargetId={targetId ?? null}
        />
      </ListPagePattern>
    </PageShell>
  );
}

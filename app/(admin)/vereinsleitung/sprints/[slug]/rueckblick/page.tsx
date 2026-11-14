import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import {
  getDevelopmentSprintBySlug,
  hasSprintManagePermission,
} from "@/lib/club-development/sprints/queries";
import DevelopmentSprintReviewWorkspace from "@/components/admin/club-development/DevelopmentSprintReviewWorkspace";
import DevelopmentSprintWorkspaceShell from "@/components/admin/club-development/DevelopmentSprintWorkspaceShell";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";

type PageProps = { params: Promise<{ slug: string }> };

export default async function DevelopmentSprintReviewPage({ params }: PageProps) {
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
        eyebrow="Sprint-Rückblick"
        title={sprint.title}
        description="Historische Sprintergebnisse und Scope-Änderungen"
        breadcrumbs={[
          { label: "Verein", href: "/vereinsleitung" },
          { label: "Sprints", href: "/vereinsleitung/sprints" },
          { label: sprint.title, href: `/vereinsleitung/sprints/${sprint.slug}` },
          { label: "Rückblick" },
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
            activeTab="rueckblick"
          >
            <DevelopmentSprintReviewWorkspace sprintId={sprint.id} sprintStatus={sprint.status} />
          </DevelopmentSprintWorkspaceShell>
        ) : null}
      </ListPagePattern>
    </PageShell>
  );
}
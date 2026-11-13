import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { getDevelopmentSprintBySlug } from "@/lib/club-development/sprints/queries";
import DevelopmentSprintBoard from "@/components/admin/club-development/DevelopmentSprintBoard";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";

type PageProps = { params: Promise<{ slug: string }> };

export default async function DevelopmentSprintBoardPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const sprint = await getDevelopmentSprintBySlug(slug, actor);
  if (!sprint) notFound();

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Sprint-Board"
        title={`Board: ${sprint.title}`}
        description="Kanban nach Aufgabenstatus — Spalten Offen, In Arbeit, Erledigt."
        breadcrumbs={[
          { label: "Verein", href: "/vereinsleitung" },
          { label: "Vereinsentwicklung", href: "/vereinsleitung" },
          { label: "Sprints", href: "/vereinsleitung/sprints" },
          { label: sprint.title, href: `/vereinsleitung/sprints/${sprint.slug}` },
          { label: "Board" },
        ]}
        headerActions={
          <Link
            href={`/vereinsleitung/sprints/${sprint.slug}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3.5 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Sprintdetails
          </Link>
        }
      >
        <DevelopmentSprintBoard sprintId={sprint.id} sprintTitle={sprint.title} />
      </ListPagePattern>
    </PageShell>
  );
}

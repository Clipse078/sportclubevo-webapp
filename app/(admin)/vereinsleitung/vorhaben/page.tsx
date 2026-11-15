import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { loadVorhabenWorkspace } from "@/lib/club-development/vorhaben-workspace";
import VorhabenAufgabenWorkspace from "@/components/admin/club-development/VorhabenAufgabenWorkspace";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { CD_NAV_COPY, CD_VORHABEN_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import type { InitiativeStatus, TaskStatus } from "@prisma/client";

type PageProps = {
  searchParams?: Promise<{
    targetId?: string;
    initiativeId?: string;
    search?: string;
    initiativeStatus?: string;
    taskStatus?: string;
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

export default async function VorhabenAufgabenPage({ searchParams }: PageProps) {
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

  const snapshot = await loadVorhabenWorkspace(actor, filters, {
    returnToPath: "/vereinsleitung/vorhaben",
  });

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Vereinsentwicklung"
        title={CD_NAV_COPY.initiativesAndTasksHub}
        description={CD_VORHABEN_WORKSPACE_COPY.intro}
        breadcrumbs={[
          { label: "Verein" },
          { label: "Vereinsentwicklung", href: "/vereinsleitung/club-entwicklung" },
          { label: CD_NAV_COPY.initiativesAndTasksHub },
        ]}
      >
        <VorhabenAufgabenWorkspace
          initialSnapshot={snapshot}
          initialTargetId={filters.targetId ?? null}
          initialInitiativeId={filters.initiativeId ?? null}
        />
      </ListPagePattern>
    </PageShell>
  );
}
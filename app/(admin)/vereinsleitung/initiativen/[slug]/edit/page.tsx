import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getInitiativeBySlug } from "@/lib/initiatives/queries";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import InitiativeForm from "@/components/admin/initiatives/InitiativeForm";
import { ClubDevelopmentFormWorkflowShell } from "@/components/sce/club-development/ClubDevelopmentFormWorkflowShell";
import type { VisibilityScopeValue } from "@/components/admin/shared/VisibilityScopeSelect";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";

type PageProps = { params: Promise<{ slug: string }> };

export default async function EditInitiativePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const initiative = await getInitiativeBySlug(slug, actor);

  if (!initiative) notFound();

  function parseStringArray(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((v): v is string => typeof v === "string");
  }

  const defaultValues = {
    title: initiative.title,
    summary: initiative.summary ?? "",
    description: initiative.description ?? "",
    status: initiative.status,
    owner: initiative.owner ?? "",
    ownerPersonId: initiative.ownerPersonId ?? undefined,
    dueDate: initiative.dueDate ? new Date(initiative.dueDate).toISOString().slice(0, 10) : "",
    visibilityScope: initiative.visibilityScope as VisibilityScopeValue,
    visibleOrgUnitRefs: parseStringArray(initiative.visibleOrgUnitRefs),
    visibleRoleRefs: parseStringArray(initiative.visibleRoleRefs),
    visibleUserRefs: parseStringArray(initiative.visibleUserRefs),
  };

  return (
    <PageShell fullWidth>
      <FormPagePattern
        eyebrow="Initiativen"
        title="Initiative bearbeiten"
        description={`Bearbeite: ${initiative.title}`}
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Initiativen", href: "/vereinsleitung/initiativen" },
          { label: initiative.title, href: `/vereinsleitung/initiativen/${slug}` },
          { label: "Bearbeiten" },
        ]}
      >
        <ClubDevelopmentFormWorkflowShell>
          <InitiativeForm mode="edit" initiativeId={initiative.id} defaultValues={defaultValues} />
        </ClubDevelopmentFormWorkflowShell>
      </FormPagePattern>
    </PageShell>
  );
}
